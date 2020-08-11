$(function() {
    consoleInit();
    start(main);
});

async function main() {
    
    const stakingToken = LINK_TOKEN_ADDR;
    const rewardPoolAddr = "0x2bee9fd7d942be58004400da26c9155f6abd8fe9";
    const rewardTokenAddr = "0x28cb7e841ee97947a86B06fA4090C8451f64c0be";
    const balancerPoolTokenAddr = "0xc7062D899dd24b10BfeD5AdaAb21231a1e7708fE";
    const rewardTokenTicker = "YFL";

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...\n");
    _print(`${rewardTokenTicker} Address: ${rewardTokenAddr}`);
    _print(`Reward Pool Address: ${rewardPoolAddr}\n`);

    const Y_STAKING_POOL = new ethers.Contract(rewardPoolAddr, Y_STAKING_POOL_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const Y_TOKEN = new ethers.Contract(stakingToken, ERC20_ABI, App.provider);
    const YFFI_DAI_BALANCER_POOL = new ethers.Contract(balancerPoolTokenAddr, BALANCER_POOL_ABI, App.provider);

    const stakedYAmount = await Y_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFFI = await Y_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalSupplyY = await Y_TOKEN.totalSupply() / 1e18;
    const totalStakedYAmount = await Y_TOKEN.balanceOf(rewardPoolAddr) / 1e18;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(Y_STAKING_POOL);
    const nextHalving = await getPeriodFinishForReward(Y_STAKING_POOL);

    // const weekly_reward = 0;

    const rewardPerToken = weekly_reward / totalStakedYAmount;

    // Find out underlying assets of Y
    // const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;
    const unstakedY = await Y_TOKEN.balanceOf(App.YOUR_ADDRESS) / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    // const prices = await lookUpPrices(["yearn-finance"]);
    // const YFIPrice = prices["yearn-finance"].usd;
    const prices = await lookUpPrices(["chainlink"]);
    const LINKPrice = prices["chainlink"].usd;
    const YFFIPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR, rewardTokenAddr) / 1e18) * LINKPrice;


    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFL   = $${YFFIPrice}`);
    _print(`1 LINK  = $${LINKPrice}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalSupplyY} yCRV issued by Y Curve Pool.`);
    _print(`There are total   : ${totalStakedYAmount} yCRV staked in ${rewardTokenTicker}'s yCRV staking pool.`);
    _print(`                  = ${toDollar(totalStakedYAmount * LINKPrice)}\n`);
    _print(`You are staking   : ${stakedYAmount} yCRV (${toFixed(stakedYAmount * 100 / totalStakedYAmount, 3)}% of the pool)`);
    _print(`                  = ${toDollar(stakedYAmount * LINKPrice)}\n`);

    // YFII REWARDS
    _print(`======== ${rewardTokenTicker} REWARDS ========`)
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedYFFI, 4)} ${rewardTokenTicker} = $${toFixed(earnedYFFI * YFFIPrice, 2)}`);
    const YFFIWeeklyEstimate = rewardPerToken * stakedYAmount;


    _print(`Hourly estimate   : ${toFixed(YFFIWeeklyEstimate / (24 * 7), 4)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / (24 * 7)) * YFFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} ${rewardTokenTicker})`)
    _print(`Daily estimate    : ${toFixed(YFFIWeeklyEstimate / 7, 2)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / 7) * YFFIPrice)} (out of total ${toFixed(weekly_reward / 7, 2)} ${rewardTokenTicker})`)
    _print(`Weekly estimate   : ${toFixed(YFFIWeeklyEstimate, 2)} ${rewardTokenTicker} = ${toDollar(YFFIWeeklyEstimate * YFFIPrice)} (out of total ${weekly_reward} ${rewardTokenTicker})`)
    const YFIWeeklyROI = (rewardPerToken * YFFIPrice) * 100 / (LINKPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFIWeeklyROI / 7) / 24, 4)}%`)
    _print(`Daily ROI in USD  : ${toFixed(YFIWeeklyROI / 7, 4)}%`)
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`);

    const approveTENDAndStake = async function () {

        const signer = App.provider.getSigner();

        const TEND_TOKEN = new ethers.Contract(stakingToken, ERC20_ABI, signer);
        const WEEBTEND_V2_TOKEN = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        const currentTEND = await TEND_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedTEND = await TEND_TOKEN.allowance(App.YOUR_ADDRESS, rewardPoolAddr);

        console.log(currentTEND);

        let allow = Promise.resolve();

        if (allowedTEND < currentTEND) {
            showLoading();
            allow = TEND_TOKEN.approve(rewardPoolAddr, currentTEND)
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentTEND > 0) {
            showLoading();
            allow.then(async function() {
                WEEBTEND_V2_TOKEN.stake(currentTEND).then(function(t) {
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

    const unstake = async function() {
        const signer = App.provider.getSigner();

        const REWARD_POOL = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        if (earnedYFFI > 0) {
            showLoading();
            REWARD_POOL.exit()
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                hideLoading();
            });
        }
    };

    const claim = async function() {
        const signer = App.provider.getSigner();

        const WEEBTEND_V2_TOKEN = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        if (true) {
            showLoading();
            WEEBTEND_V2_TOKEN.getReward()
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }
    };

    const exit = async function() {
        const signer = App.provider.getSigner();

        const WEEBTEND_V2_TOKEN = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        if (earnedYFFI > 0) {
            showLoading();
            WEEBTEND_V2_TOKEN.exit()
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                hideLoading();
            });
        }
    };

    _print_link(`Stake ${unstakedY} YCRV`, approveTENDAndStake);
    _print_link(`Unstake ${stakedYAmount} YCRV`, unstake);
    _print_link(`Claim ${earnedYFFI} ${rewardTokenTicker}`, claim);
    _print_link(`Exit`, exit);


    // CRV REWARDS
    _print("\n======== CRV REWARDS ========")
    _print(`    Not distributed yet`);

    hideLoading();

}
