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

    const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, App.provider);
    const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, App.provider);
    const WEEBTEND_V3_TOKEN = new ethers.Contract(WEEBTEND_V3_TOKEN_ADDR, WEEBTEND_V3_TOKEN_ABI, App.provider);

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

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["tendies"]);

    const TENDPrice = prices.tendies.usd;
    const WEEBTENDPrice = TENDPrice * weebTendV3PricePerFullShare / 1e18;

    _print("========== PRICES ==========")
    _print(`1 TEND            = $${TENDPrice}`);
    _print(`1 weebTEND-V3     = $${WEEBTENDPrice}\n`);

    _print("========= STAKING ==========")
    _print(`There are total   : ${totalTENDSupply / 1e18} TEND in the world`);
    _print(`There are total   : ${totalStakedTEND} TEND staked in the community pool (split to ${slaveCount} contracts)`);
    _print(`                  = ${toDollar(totalStakedTEND * TENDPrice)} \n`);
    // _print(`You are staking   : ${yourWeebTendV3Amount} weebTEND-V3 = (${toFixed(yourWeebTendV3Amount * 100 / weebTendV2TotalSupply, 2)}% of the pool)`);
    // _print(`                  = ${yourStakedTEND} TEND`);
    // _print(`                  = ${toDollar(yourStakedTEND * TENDPrice)}\n`);

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

        WEEBTEND_V3_TOKEN.burn(rawYourWeebTendV3Amount, {gasLimit: 393346}).then(function(t) {
            App.provider.waitForTransaction(t.hash).then(function() {
                hideLoading();
            });
        }).catch(function() {
            hideLoading();
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

    alert("Depositing in V3 is NOT safe due to a double counting bug. Please proceed with extreme caution.");

    // if (yourWeebTendV2Amount > 0) {
    //     _print_link(`Convert your ${toFixed(yourWeebTendV2Amount / 1e18, 4)} weebTEND-V2 to weebTEND-V3`, convert);
    //     _print("")
    // }

    // _print_link(`Stake ${toFixed(currentTEND / 1e18, 4)} TEND and mint weebTEND-V3`, approveTENDAndStake);
    // _print_link(`Burn ${toFixed(yourWeebTendV3Amount, 4)} weebTEND-V3 and unstake ${toFixed(yourStakedTEND * 0.9995, 2)} TEND`, unstakeWeebTEND);

    _print("\nBy staking your TEND, you get weebTEND-V3 as a proof of staking. You can always \n" +
        "burn this token to get back your original TEND + bonus TEND the pool has been collecting. \n");

    _print_link(`Harvest ${toFixed(unclaimedReward / 1e18, 4)} TEND for the pool`, harvest);

    _print("\n============== ARCHIVE =============");
    _print_href("Link to v2 pool", "https://yieldfarming.info/funzone/tendies/v2.html");
    _print_href("Link to v1 pool", "https://yieldfarming.info/funzone/tendies/old.html");

    hideLoading();
}