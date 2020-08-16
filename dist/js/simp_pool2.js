$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const rewardPoolAddr = "0x85cb8Bdc86A2f1CE8D8D54EBc4d4ebf760C5ef31";
    const rewardTokenAddr = "0x28cb7e841ee97947a86B06fA4090C8451f64c0be";
    const balancerPoolTokenAddr = "0xc7062D899dd24b10BfeD5AdaAb21231a1e7708fE";
    const rewardTokenTicker = "YFL";

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts... \n");
    _print_href(`https://pools.balancer.exchange/#/pool/${balancerPoolTokenAddr}`, `https://pools.balancer.exchange/#/pool/${balancerPoolTokenAddr}`);
    _print(`${rewardTokenTicker} Address: ${rewardTokenAddr}`);
    _print(`Reward Pool Address: ${rewardPoolAddr}\n`);

    const YFFI_POOL_2 = new ethers.Contract(rewardPoolAddr, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFFI_DAI_BALANCER_POOL = new ethers.Contract(balancerPoolTokenAddr, BALANCER_POOL_ABI, App.provider);
    const YFFI_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(balancerPoolTokenAddr, ERC20_ABI, App.provider);
    // const YFFI_YCRV_BALANCER_POOL = new ethers.Contract(YFFI_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    // const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);


    const stakedBPTAmount = await YFFI_POOL_2.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFFI = await YFFI_POOL_2.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFFI_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFFI_DAI_BPT_TOKEN_CONTRACT.balanceOf(rewardPoolAddr) / 1e18;
    const totalYFFIAmount = await YFFI_DAI_BALANCER_POOL.getBalance(rewardTokenAddr) / 1e18;
    const totalDAIAmount = await YFFI_DAI_BALANCER_POOL.getBalance(LINK_TOKEN_ADDR) / 1e18;

    const YFFIPerBPT = totalYFFIAmount / totalBPTAmount;
    const DAIPerBPT = totalDAIAmount / totalBPTAmount;

    const unstakedY = await YFFI_DAI_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YFFI_POOL_2);
    const nextHalving = await getPeriodFinishForReward(YFFI_POOL_2);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    // const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;


    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["chainlink"]);
    const DAIPrice = prices["chainlink"].usd;
    const YFFIPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR,rewardTokenAddr) / 1e18) * DAIPrice;
    // const YFFIPrice2 = (await YFFI_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, YFFI_TOKEN_ADDR) / 1e18) * YVirtualPrice;


    const BPTPrice = YFFIPerBPT * YFFIPrice + DAIPerBPT * DAIPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 ${rewardTokenTicker}  = ${toDollar(YFFIPrice)}` );
    _print(`1 DAI   = $${DAIPrice}\n`);
    _print(`1 BPT   = [${YFFIPerBPT} ${rewardTokenTicker}, ${DAIPerBPT} DAI]`);
    _print(`        = ${toDollar(YFFIPerBPT * YFFIPrice + DAIPerBPT * DAIPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by ${rewardTokenTicker} DAI Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in ${rewardTokenTicker}'s BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFFIPerBPT * stakedBPTAmount} ${rewardTokenTicker}, ${DAIPerBPT * stakedBPTAmount} DAI]`);
    _print(`                  = ${toDollar(YFFIPerBPT * stakedBPTAmount * YFFIPrice + DAIPerBPT * stakedBPTAmount * DAIPrice)}\n`);

    // YFII REWARDS
    _print(`======== ${rewardTokenTicker} REWARDS ========`)
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedYFFI, 4)} ${rewardTokenTicker} = ${toDollar(earnedYFFI * YFFIPrice)}`);
    const YFFIWeeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(YFFIWeeklyEstimate / (7 * 24), 4)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / (7 * 24)) * YFFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} ${rewardTokenTicker})`)
    _print(`Daily estimate    : ${toFixed(YFFIWeeklyEstimate / 7, 4)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / 7) * YFFIPrice)} (out of total  ${toFixed(weekly_reward / 7, 2)} ${rewardTokenTicker})`)
    _print(`Weekly estimate   : ${toFixed(YFFIWeeklyEstimate, 4)} ${rewardTokenTicker} = ${toDollar(YFFIWeeklyEstimate * YFFIPrice)} (out of total ${weekly_reward} ${rewardTokenTicker})`)
    const YFFIWeeklyROI = (rewardPerToken * YFFIPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFFIWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(YFFIWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(YFFIWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(YFFIWeeklyROI * 52, 4)}% \n`);

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    const approveTENDAndStake = async function () {

        const signer = App.provider.getSigner();

        const BPT_TOKEN = new ethers.Contract(balancerPoolTokenAddr, ERC20_ABI, signer);
        const REWARD_POOL_CONTRACT = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        const currentBPT = await BPT_TOKEN.balanceOf(App.YOUR_ADDRESS);
        const allowedBPT = await BPT_TOKEN.allowance(App.YOUR_ADDRESS, rewardPoolAddr);

        console.log(currentBPT);

        let allow = Promise.resolve();

        if (allowedBPT < currentBPT) {
            showLoading();
            allow = BPT_TOKEN.approve(rewardPoolAddr, currentBPT)
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                    hideLoading();
                });
        }

        if (currentBPT > 0) {
            showLoading();
            allow.then(async function() {
                REWARD_POOL_CONTRACT.stake(currentBPT).then(function(t) {
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

        const REWARD_POOL = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, signer);

        if (earnedYFFI > 0) {
            showLoading();
            REWARD_POOL.getReward()
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                }).catch(function() {
                hideLoading();
            });
        }
    };

    _print_link(`Stake ${unstakedY} BPT`, approveTENDAndStake);
    _print_link(`Unstake ${stakedBPTAmount} BPT`, unstake);
    _print_link(`Claim ${earnedYFFI} ${rewardTokenTicker}`, claim);
    _print("");


    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)

    // BAL REWARDS
    _print("======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    hideLoading();

}