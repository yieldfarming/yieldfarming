$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, App.provider);
    const WEEBTEND_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, App.provider);

    // SYNTH Staking Pool
    const totalTENDSupply = await TEND_TOKEN.totalSupply();
    const totalStakedTEND = await WEEBTEND_TOKEN.getTotalStakedTendies() / 1e18;
    const rawYourWeebTendAmount = await WEEBTEND_TOKEN.balanceOf(App.YOUR_ADDRESS);
    const yourWeebTendAmount = rawYourWeebTendAmount / 1e18;

    let weebTendPricePerFullShare = 0;
    try {
     weebTendPricePerFullShare = await WEEBTEND_TOKEN.getPricePerFullShare();
    } catch {}
    const weebTendTotalSupply = await WEEBTEND_TOKEN.totalSupply() / 1e18;
    const yourStakedTEND = yourWeebTendAmount * weebTendPricePerFullShare / 1e18;

    const unclaimedReward = await TEND_TOKEN.unclaimedRewards(WEEBTEND_TOKEN_ADDR);
    const grillAmount = await TEND_TOKEN.getGrillAmount();

    const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);

    // Uniswap V1 sETH-ETH Pool

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["tendies"]);

    const TENDPrice = prices.tendies.usd;
    const WEEBTENDPrice = TENDPrice * weebTendPricePerFullShare / 1e18;

    _print("========== PRICES ==========")
    _print(`1 TEND            = $${TENDPrice}`);
    _print(`1 weebTEND        = $${WEEBTENDPrice}\n`);

    _print("========= STAKING ==========")
    _print(`There are total   : ${totalTENDSupply / 1e18} TEND in the world`);
    _print(`There are total   : ${totalStakedTEND} TEND staked in the community pool.`);
    _print(`                  = ${toDollar(totalStakedTEND * TENDPrice)} \n`);
    _print(`You are staking   : ${yourWeebTendAmount} weebTEND = (${toFixed(yourWeebTendAmount * 100 / weebTendTotalSupply, 2)}% of the pool)`);
    _print(`                  = ${yourStakedTEND} TEND`);
    _print(`                  = ${toDollar(yourStakedTEND * TENDPrice)}\n`);

    let signer = null;

    const approveTENDAndStake = async function () {

        if (!signer)
            signer = App.provider.getSigner();

        const TEND_TOKEN = new ethers.Contract(TEND_TOKEN_ADDR, TEND_TOKEN_ABI, signer);
        const WEEBTEND_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);

        const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedTEND = await TEND_TOKEN.allowance(App.YOUR_ADDRESS, WEEBTEND_TOKEN_ADDR);

        console.log(currentTEND);

        let allow = Promise.resolve();

        if (allowedTEND < currentTEND) {
            showLoading();
            allow = TEND_TOKEN.increaseAllowance(WEEBTEND_TOKEN_ADDR, currentTEND.sub(allowedTEND))
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentTEND > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_TOKEN.mint(currentTEND).then(function(t) {
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

        const WEEBTEND_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_TOKEN.burn(rawYourWeebTendAmount).then(function(t) {
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

        const WEEBTEND_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_TOKEN.grillPool().then(function(t) {
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

        const WEEBTEND_TOKEN = new ethers.Contract(WEEBTEND_TOKEN_ADDR, WEEBTEND_TOKEN_ABI, signer);

        showLoading();

        WEEBTEND_TOKEN.claimRewards().then(function(t) {
            App.provider.waitForTransaction(t.hash).then(function() {
                hideLoading();
            });
        }).catch(function() {
            hideLoading();
        });
    };

    _print_link(`Stake ${toFixed(currentTEND / 1e18, 4)} TEND and mint weebTEND`, approveTENDAndStake);
    _print_link(`Burn ${toFixed(yourWeebTendAmount, 4)} weebTEND`, unstakeWeebTEND);
    _print("");
    _print_link(`Grill ${toFixed(grillAmount / 1e18, 4)} TEND and deposit ${toFixed(grillAmount * 0.01 / 1e18, 4)} into the community pool`, grill);
    _print_link(`Claim ${toFixed(unclaimedReward / 1e18, 4)} TEND for the pool`, claim);

    hideLoading();
}