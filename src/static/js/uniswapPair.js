$(function() {
    start(main);
});

let App;

async function loadUniswapPairInfo() {
    _clear();
    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    let pairAddress = $(`#uniswapPair_address`).val();
    let pairAmount = parseFloat($(`#uniswapPair_amount`).val());

    let isToken0WETH = false;
    let isToken1WETH = false;

    if (isNaN(pairAmount)) {
        $(`#uniswapPair_amount`).val(0);
        pairAmount = 0;
    }

    const prices = await lookUpPrices(["ethereum"]);
    const ethUSDPrice = prices[`ethereum`].usd;

    const PAIR_TOKEN = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, App.provider);
    const pairTokenSymbol = await PAIR_TOKEN.symbol();
    const pairTokenName = await PAIR_TOKEN.name();
    const pairTokenTotalSupply = await PAIR_TOKEN.totalSupply();

    const pairToken0Addr = ethers.utils.getAddress(await PAIR_TOKEN.token0());
    const pairToken1Addr = ethers.utils.getAddress(await PAIR_TOKEN.token1());

    isToken0WETH = (pairToken0Addr === WETH_TOKEN_ADDR);
    isToken1WETH = (pairToken1Addr === WETH_TOKEN_ADDR);

    const PAIR_TOKEN_0 = new ethers.Contract(pairToken0Addr, ERC20_ABI, App.provider);
    const PAIR_TOKEN_1 = new ethers.Contract(pairToken1Addr, ERC20_ABI, App.provider);

    const token0Symbol = await PAIR_TOKEN_0.symbol();
    const token0Name = await PAIR_TOKEN_0.name();
    const token0Decimals = await PAIR_TOKEN_0.decimals();

    const token1Symbol = await PAIR_TOKEN_1.symbol();
    const token1Name = await PAIR_TOKEN_1.name();
    const token1Decimals = await PAIR_TOKEN_1.decimals();

    const reserves = await PAIR_TOKEN.getReserves();
    const reserve0 = reserves[`_reserve0`];
    const reserve1 = reserves[`_reserve1`];

    const token0AmountPerPair = reserve0.mul(String(1e18)).div(pairTokenTotalSupply)
    const token1AmountPerPair = reserve1.mul(String(1e18)).div(pairTokenTotalSupply)

    // Start printing info
    _print(`\n=================== PAIR INFO ====================`)
    _print(`\n${pairTokenSymbol} (${pairTokenName}) @ ${pairAddress}`)
    _print(`- ${token0Symbol} (${token0Name}) @ ${pairToken0Addr}`)
    _print(`- ${token1Symbol} (${token1Name}) @ ${pairToken1Addr}\n`)

    let leftSideString = `1 ` + pairTokenSymbol;
    _print(`${leftSideString} = [${token0AmountPerPair / (10 ** token0Decimals)} ${token0Symbol}, ${token1AmountPerPair / (10 ** token1Decimals)} ${token1Symbol}]`);

    let totalUSDValue = null;

    if (isToken0WETH) {
        totalUSDValue = (token0AmountPerPair / (10 ** token0Decimals)) * ethUSDPrice * 2;
    } else if (isToken1WETH) {
        totalUSDValue = (token1AmountPerPair / (10 ** token1Decimals)) * ethUSDPrice * 2;
    }

    if (totalUSDValue) {
        _print(`${trimOrFillTo("", leftSideString.length)} = ${toDollar(totalUSDValue)}`);
    }

    if (pairAmount > 0) {
        _print("")
        let leftSideString = `${pairAmount} ` + pairTokenSymbol;
        _print(`${leftSideString} = [${pairAmount * token0AmountPerPair / (10 ** token0Decimals)} ${token0Symbol}, ${pairAmount * token1AmountPerPair / (10 ** token1Decimals)} ${token1Symbol}]`);
        if (totalUSDValue) {
            _print(`${trimOrFillTo("", leftSideString.length)} = ${toDollar(totalUSDValue * pairAmount)}`);
        }
    }

    _print("")
    if (totalUSDValue === null) {
        _print("Non ETH pair not supported.");
    }
}

async function main() {

    App = await init_ethers();

    const pairAddress = getUrlParameter('pairAddress')
    const pairAmount = getUrlParameter('pairAmount')

    if (pairAddress) {
        $(`#uniswapPair_address`).val(pairAddress);
        if (pairAmount) {
            $(`#uniswapPair_amount`).val(pairAmount);
        }
        await loadUniswapPairInfo();
    }

    $('#uniswapPair_address').keypress(async function (e) {
        if (e.which === 13) {
            await loadUniswapPairInfo();
            return false;
        }
    });

    $('#uniswapPair_amount').keypress(async function (e) {
        if (e.which === 13) {
            await loadUniswapPairInfo();
            return false;
        }
    });
}

