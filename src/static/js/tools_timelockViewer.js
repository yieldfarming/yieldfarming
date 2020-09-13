$(function() {
    start(main);
});

let App;

const ABIs = {};
const decoders = {};

function getMethodCalled(decodedData) {
    let methodCalled = decodedData.method + '(';
    for (let k = 0; k < decodedData.types.length; k++) {
        if (k > 0) {
            methodCalled += ', ';
        }
        methodCalled += `${decodedData.types[k]} ${decodedData.names[k]}`;
    }
    methodCalled += ')'

    return methodCalled;
}

async function loadTimelockInfo() {
    _clear();
    _print(new Date().toString());
    _print(`\nInitialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    let timelockAddress = $(`#timelockViewer_address`).val();

    if (!ethers.utils.isAddress(timelockAddress)) {
        alert(`${timelockAddress} is not a valid address`);
    }

    const transactions = (await getTransactionHistory(timelockAddress)).result;

    const timelockArgDecoder = new InputDataDecoder(TIMELOCK_ABI);

    // Start printing info
    _print(`\n=================== TIMELOCK INFO ====================\n`)
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const decodedData = timelockArgDecoder.decodeData(transaction.input)
        const methodCalled = getMethodCalled(decodedData);

        _print_bold(`${new Date(parseInt(transaction.timeStamp + "000")).toString()}\n`);
        _print(`Called by     : ${transaction.from}`);
        _print(`Method called : ${methodCalled}\n`)

        for (let j = 0; j < decodedData.names.length; j++) {
            const paramName = decodedData.names[j];
            if (paramName === "data" && decodedData.names[0] === "target") {
                const addr = "0x" + decodedData.inputs[0].toString();
                if (!ABIs.hasOwnProperty(addr)) {
                    const targetABI = JSON.parse((await getContractABI(addr)).result);
                    ABIs[addr] = targetABI;
                    decoders[addr] = new InputDataDecoder(targetABI);
                }
                const targetDecoder = decoders[addr];

                let functionCallData = "";
                if (decodedData.inputs[2].toString().length > 0) {
                    functionCallData = ethers.utils.id(decodedData.inputs[2].toString()).substring(2,10) + decodedData.inputs[j].toString('hex');
                }
                functionCallData += decodedData.inputs[j].toString('hex');

                const decodedTargetData = targetDecoder.decodeData(functionCallData);

                const targetMethodCalled = getMethodCalled(decodedTargetData);

                _print(`${trimOrFillTo("data", 10)} : ${targetMethodCalled}`)
                for (let l = 0; l < decodedTargetData.names.length; l++) {
                    _print(`${trimOrFillTo("", 10)}   ${trimOrFillTo(decodedTargetData.names[l], 15)} : ${decodedTargetData.inputs[l].toString()}`)
                }

            } else {
                _print(`${trimOrFillTo(paramName, 10)} : ${decodedData.inputs[j].toString()}`)
            }
        }
        _print("\n------------------------------------------------------\n");
    }
}

async function main() {
    $("form").submit(function (e) {
        e.preventDefault();
    });

    App = await init_ethers();

    const timelockAddress = getUrlParameter('contractAddress')

    if (timelockAddress) {
        $(`#timelockViewer_address`).val(timelockAddress);
        await loadTimelockInfo();
    }

    $('#timelockViewer_address').keypress(async function (e) {
        if (e.which === 13) {
            await loadTimelockInfo();
            return false;
        }
    });
}

