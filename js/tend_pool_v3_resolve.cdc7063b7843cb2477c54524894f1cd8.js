/*!
* YieldFarming
* Boilerplate for a Static website using EJS and SASS
* https://yieldfarming.info
* @author Jongseung Lim -- https://yieldfarming.info
* Copyright 2020. MIT Licensed.
*/

$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");
    _print_href("TEND Holders list", `https://etherscan.io/token/${TEND_TOKEN_ADDR}#balances`);
    _print_href("weebTEND-V3 Etherscan", `https://etherscan.io/address/${WEEBTEND_V3_TOKEN_ADDR}#readContract`)
    _print("");

    const WEEBTEND_RESOLVE_ADDR = "0x974892e4a0e761098F4238549518af3Fa738872C"
    const WEEBTEND_RESOLVE_ABI = [ { "constant": true, "inputs": [ { "internalType": "address", "name": "a", "type": "address" } ], "name": "getDidBurn", "outputs": [ { "internalType": "bool", "name": "b", "type": "bool" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "recordBurn", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "internalType": "address", "name": "a", "type": "address" } ], "name": "recordBurnOther", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "internalType": "address", "name": "a", "type": "address" } ], "name": "removeBurn", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" } ];

    const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, App.provider);
    const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, App.provider);
    const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, App.provider);
    const RESOLVE = new ethers.Contract(WEEBTEND_RESOLVE_ADDR, WEEBTEND_RESOLVE_ABI, App.provider);

    // SYNTH Staking Pool
    const totalTENDSupply = await TEND_TOKEN.totalSupply();
    const totalStakedTEND = await WEEBTEND_V3_TOKEN.totalStakedTendies() / 2e18;
    const rawYourWeebTendV3Amount = await WEEBTEND_V3_TOKEN.balanceOf(App.YOUR_ADDRESS);
    const yourWeebTendV3Amount = rawYourWeebTendV3Amount / 1e18;

    const yourWeebTendV2Amount = await WEEBTEND_V2_TOKEN.balanceOf(App.YOUR_ADDRESS);

    let weebTendV3PricePerFullShare = 0;
    try {
        weebTendV3PricePerFullShare = await WEEBTEND_V3_TOKEN.getPricePerFullShare();
    } catch {}
    const weebTendV2TotalSupply = await WEEBTEND_V3_TOKEN.totalSupply() / 1e18;
    const yourStakedTEND = (yourWeebTendV3Amount * weebTendV3PricePerFullShare / 1e18) / 2;

    const unclaimedReward = await WEEBTEND_V3_TOKEN.getTotalAvailableReward();

    const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);

    const slaveCount = await WEEBTEND_V3_TOKEN.slaveCount();

    let burned_precheck = await RESOLVE.getDidBurn(App.YOUR_ADDRESS);

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["tendies"]);

    const TENDPrice = prices.tendies.usd;
    const WEEBTENDPrice = TENDPrice * weebTendV3PricePerFullShare / 1e18;

    _print("========== PRICES ==========")
    _print(`1 TEND            = $${TENDPrice}`);
    _print(`1 weebTEND-V3     = $0\n`);

    _print("========= STAKING ==========")
    _print(`There are total   : ${totalTENDSupply / 1e18} TEND in the world`);
    _print(`There are total   : 0 TEND staked in the community pool (split to ${slaveCount} contracts)`);
    _print(`                  = 0 \n`);

    if (!burned_precheck) {
        _print(`You are staking   : ${yourWeebTendV3Amount} weebTEND-V3 = (${toFixed(yourWeebTendV3Amount * 100 / weebTendV2TotalSupply, 2)}% of the pool)`);
        _print(`                  = ${yourStakedTEND} TEND`);
        _print(`                  = ${toDollar(yourStakedTEND * TENDPrice)}\n`);
    }

    let signer = null;

    const approveTENDAndStake = async function () {

        if (!signer)
            signer = App.provider.getSigner();

        const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, signer);
        const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, signer);

        const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedTEND = await TEND_TOKEN.allowance(App.YOUR_ADDRESS, WEEBTEND_V3_TOKEN_ADDR);

        console.log(currentTEND);

        let allow = Promise.resolve();

        if ( (allowedTEND / 1e18) < (currentTEND / 1e18)) {
            showLoading();
            allow = TEND_TOKEN.increaseAllowance(WEEBTEND_V3_TOKEN_ADDR, currentTEND.sub(allowedTEND))
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if ((currentTEND / 1e18) > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_V3_TOKEN.mint(currentTEND, {gasLimit: 309396}).then(function(t) {
                    App.provider.waitForTransaction(t.hash).then(function() {
                        hideLoading();
                    });
                }).catch(function() {
                    hideLoading();
                });
            });
        } else {
            alert("You have no TEND!!");
        }
    };

    const unstakeWeebTEND = async function() {
        if (!signer)
            signer = App.provider.getSigner();

        const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, signer);

        showLoading();

        const RESOLVE = new ethers.Contract(WEEBTEND_RESOLVE_ADDR, WEEBTEND_RESOLVE_ABI, signer);

        let allow = RESOLVE.recordBurn()
            .then(function(t) {
                if (!burned_precheck) {
                    WEEBTEND_V3_TOKEN.burn(rawYourWeebTendV3Amount.div(2), {gasLimit: 393346}).then(function (t) {
                        App.provider.waitForTransaction(t.hash).then(function () {
                            hideLoading();
                        });
                        burned_precheck = true;
                    }).catch(function (e) {
                        hideLoading();
                        console.log(e);
                    });
                }
            }).catch(function() {
                hideLoading();
                return Promise.reject();
            });
    };

    const harvest = async function() {
        if (!signer)
            signer = App.provider.getSigner();

        const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_V3_TOKEN.harvest().then(function(t) {
            App.provider.waitForTransaction(t.hash).then(function() {
                hideLoading();
            });
        }).catch(function() {
            hideLoading();
        });
    };

    const convert = async function() {
        if (!signer)
            signer = App.provider.getSigner();

        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);
        const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, signer);

        const currentWeebTENDV2 = await WEEBTEND_V2_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedWeebTENDV2 = await WEEBTEND_V2_TOKEN.allowance(App.YOUR_ADDRESS, WEEBTEND_V3_TOKEN_ADDR);

        let allow = Promise.resolve();

        if ((allowedWeebTENDV2 / 1e18) < (currentWeebTENDV2 / 1e18)) {
            showLoading();
            allow = WEEBTEND_V2_TOKEN.increaseAllowance(WEEBTEND_V3_TOKEN_ADDR, currentWeebTENDV2.sub(allowedWeebTENDV2))
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentWeebTENDV2 > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_V3_TOKEN.convert({gasLimit: 453346}).then(function(t) {
                    App.provider.waitForTransaction(t.hash).then(function() {
                        hideLoading();
                    });
                }).catch(function() {
                    hideLoading();
                });
            });
        } else {
            alert("You have no weebTEND-V2!!");
        }
    };

    alert("Depositing in V3 is NOT safe due to a double counting bug. Please withdraw all your tokens ASAP.");

    // if (yourWeebTendV2Amount > 0) {
    //     _print_link(`Convert your ${toFixed(yourWeebTendV2Amount / 1e18, 4)} weebTEND-V2 to weebTEND-V3`, convert);
    //     _print("")
    // }

    //_print_link(`Stake ${toFixed(currentTEND / 1e18, 4)} TEND and mint weebTEND-V3`, approveTENDAndStake);

    if (!burned_precheck) {
        _print_link(`Burn ${toFixed(yourWeebTendV3Amount, 4)} weebTEND-V3 and unstake ${toFixed(yourStakedTEND * 0.9995, 2)} TEND`, unstakeWeebTEND);
    }

    _print("\n============== ARCHIVE =============");
    _print_href("Link to v2 pool", "https://yieldfarming.info/funzone/tendies/v2.html");
    _print_href("Link to v1 pool", "https://yieldfarming.info/funzone/tendies/old.html");

    hideLoading();
}
