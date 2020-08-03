$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");
    _print_href("TEND Holders list", "https://etherscan.io/token/0x1453dbb8a29551ade11d89825ca812e05317eaeb#balances");
    _print_href("weebTEND-V2 Etherscan", "https://etherscan.io/address/0xaa567ec215c286784f4349610da20b518b466198#readContract")
    _print("");

    const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, App.provider);
    const WEEBTEND_V1_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, App.provider);
    const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, App.provider);

    // SYNTH Staking Pool
    const totalTENDSupply = await TEND_TOKEN.totalSupply();
    const totalStakedTEND = await WEEBTEND_V2_TOKEN.totalStakedTendies() / 1e18;
    const rawYourWeebTendV2Amount = await WEEBTEND_V2_TOKEN.balanceOf(App.YOUR_ADDRESS);
    const yourWeebTendV2Amount = rawYourWeebTendV2Amount / 1e18;

    const yourWeebTendV1Amount = await WEEBTEND_V1_TOKEN.balanceOf(App.YOUR_ADDRESS);

    let weebTendV2PricePerFullShare = 0;
    try {
        weebTendV2PricePerFullShare = await WEEBTEND_V2_TOKEN.getPricePerFullShare();
    } catch {}
    const weebTendV2TotalSupply = await WEEBTEND_V2_TOKEN.totalSupply() / 1e18;
    const yourStakedTEND = yourWeebTendV2Amount * weebTendV2PricePerFullShare / 1e18;

    const unclaimedReward = await TEND_TOKEN.unclaimedRewards(WEEBTEND_V2_TOKEN_ADDR);
    const grillAmount = await TEND_TOKEN.getGrillAmount();

    const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);

    const slaveCount = await WEEBTEND_V2_TOKEN.slaveCount();

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["tendies"]);

    const TENDPrice = prices.tendies.usd;
    const WEEBTENDPrice = TENDPrice * weebTendV2PricePerFullShare / 1e18;

    _print("========== PRICES ==========")
    _print(`1 TEND            = $${TENDPrice}`);
    _print(`1 weebTEND-V2     = $${WEEBTENDPrice}\n`);

    _print("========= STAKING ==========")
    _print(`There are total   : ${totalTENDSupply / 1e18} TEND in the world`);
    _print(`There are total   : ${totalStakedTEND} TEND staked in the community pool (split to ${slaveCount} contracts)`);
    _print(`                  = ${toDollar(totalStakedTEND * TENDPrice)} \n`);
    _print(`You are staking   : ${yourWeebTendV2Amount} weebTEND-V2 = (${toFixed(yourWeebTendV2Amount * 100 / weebTendV2TotalSupply, 2)}% of the pool)`);
    _print(`                  = ${yourStakedTEND} TEND`);
    _print(`                  = ${toDollar(yourStakedTEND * TENDPrice)}\n`);

    let signer = null;

    const approveTENDAndStake = async function () {

        if (!signer)
            signer = App.provider.getSigner();

        const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, signer);
        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, signer);

        const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedTEND = await TEND_TOKEN.allowance(App.YOUR_ADDRESS, WEEBTEND_V2_TOKEN_ADDR);

        console.log(currentTEND);

        let allow = Promise.resolve();

        if (allowedTEND < currentTEND) {
            showLoading();
            allow = TEND_TOKEN.increaseAllowance(WEEBTEND_V2_TOKEN_ADDR, currentTEND.sub(allowedTEND))
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentTEND > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_V2_TOKEN.mint(currentTEND, {gasLimit: 309396}).then(function(t) {
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

        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_V2_TOKEN.burn(rawYourWeebTendV2Amount, {gasLimit: 393346}).then(function(t) {
            App.provider.waitForTransaction(t.hash).then(function() {
                hideLoading();
            });
        }).catch(function() {
            hideLoading();
        });

    };

    const grill = async function() {
        if (!signer)
            signer = App.provider.getSigner();

        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_V2_TOKEN.grillPool().then(function(t) {
            App.provider.waitForTransaction(t.hash).then(function() {
                hideLoading();
            });
        }).catch(function() {
            hideLoading();
        });

    };

    const claim = async function() {
        if (!signer)
            signer = App.provider.getSigner();

        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_V2_TOKEN.claimRewards().then(function(t) {
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

        const WEEBTEND_V1_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);
        const WEEBTEND_V2_TOKEN = new ethers.Contract(WEEBTEND_V2_TOKEN_ADDR, WEEBTEND_V2_TOKEN_ABI, signer);

        const currentWeebTENDV1 = await WEEBTEND_V1_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedWeebTENDV1 = await WEEBTEND_V1_TOKEN.allowance(App.YOUR_ADDRESS, WEEBTEND_V2_TOKEN_ADDR);

        let allow = Promise.resolve();

        if (allowedWeebTENDV1 < currentWeebTENDV1) {
            showLoading();
            allow = WEEBTEND_V1_TOKEN.increaseAllowance(WEEBTEND_V2_TOKEN_ADDR, currentWeebTENDV1.sub(allowedWeebTENDV1))
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentWeebTENDV1 > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_V2_TOKEN.convert(currentWeebTENDV1, {gasLimit: 393346}).then(function(t) {
                    App.provider.waitForTransaction(t.hash).then(function() {
                        hideLoading();
                    });
                }).catch(function() {
                    hideLoading();
                });
            });
        } else {
            alert("You have no weebTEND!!");
        }
    };

    if (yourWeebTendV1Amount > 0) {
        _print("Looking for your v1 tokens? You can convert it to weebTEND-V2, which accures TEND much faster than V1.");
        _print_link(`Convert your ${toFixed(yourWeebTendV1Amount / 1e18, 4)} weebTEND to weebTEND-V2`, convert);
        _print_href("Link to v1 pool", "https://yieldfarming.info/funzone/tendies/old.html/");
        _print("")
    }

    _print_link(`Stake ${toFixed(currentTEND / 1e18, 4)} TEND and mint weebTEND-V2`, approveTENDAndStake);
    _print_link(`Burn ${toFixed(yourWeebTendV2Amount, 4)} weebTEND-V2 and unstake ${toFixed(yourStakedTEND * 0.9995, 2)} TEND`, unstakeWeebTEND);

    _print("\nBy staking your TEND, you get weebTEND-V2 as a proof of staking. You can always \n" +
        "burn this token to get back your original TEND + bonus TEND the pool has been collecting. \n");

    _print_link(`Grill ${toFixed(grillAmount / 1e18, 4)} TEND and deposit ${toFixed(grillAmount * 0.01 / 1e18, 4)} into the community pool`, grill);
    _print_link(`Claim ${toFixed(unclaimedReward / 1e18, 4)} TEND for the pool`, claim);

    hideLoading();
}