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
    const stakingTokenAddr = SCRV_TOKEN_ADDR;
    const stakingTokenTicker = "sCRV";
    const rewardPoolAddr = "0x5BB622ba7b2F09BF23F1a9b509cd210A818c53d7";
    const rewardTokenAddr = BASED_TOKEN_ADDR;
    const rewardTokenTicker = "BASED";

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...\n");
    _print(`${rewardTokenTicker} Address: ${rewardTokenAddr}`);
    _print(`Reward Pool Address: ${rewardPoolAddr}\n`);

    const REWARD_POOL = new ethers.Contract(rewardPoolAddr, YFFI_REWARD_CONTRACT_ABI, App.provider);
    const CURVE_S_POOL = new ethers.Contract(CURVE_SUSD_POOL_ADDR, CURVE_SUSD_POOL_ABI, App.provider);
    const STAKING_TOKEN = new ethers.Contract(stakingTokenAddr, ERC20_ABI, App.provider);

    // const BASED_TOKEN = new ethers.Contract(YAM_TOKEN_ADDR, YAM_TOKEN_ABI, App.provider);

    // const totalSUSDInUniswapPair = await STAKING_TOKEN.balanceOf(YAM_YCRV_UNI_TOKEN_ADDR) / 1e18;
    // const totalBASEDInUniswapPair = await BASED_TOKEN.balanceOf(YAM_YCRV_UNI_TOKEN_ADDR) / 1e18;

    const stakedYAmount = await REWARD_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFFI = await REWARD_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalSupplyOfStakingToken = await STAKING_TOKEN.totalSupply() / 1e18;
    const totalStakedYAmount = await STAKING_TOKEN.balanceOf(rewardPoolAddr) / 1e18;

    // Find out reward rate
    const weekly_reward = (await get_synth_weekly_rewards(REWARD_POOL));

    console.log(weekly_reward);

    const nextHalving = await getPeriodFinishForReward(REWARD_POOL);

    const startTime = await REWARD_POOL.starttime();
    const timeUntil = startTime - (Date.now() / 1000);

    const rewardPerToken = weekly_reward / totalStakedYAmount;

    // Find out underlying assets of Y
    const SVirtualPrice = await CURVE_S_POOL.get_virtual_price() / 1e18;
    const unstakedY = await STAKING_TOKEN.balanceOf(App.YOUR_ADDRESS) / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["based-money"]);
    const stakingTokenPrice = SVirtualPrice;

    // const rewardTokenPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR, rewardTokenAddr) / 1e18) * stakingTokenPrice;
    const rewardTokenPrice = prices["based-money"].usd;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 ${rewardTokenTicker}   = $${rewardTokenPrice}`);
    _print(`1 ${stakingTokenTicker}    = $${stakingTokenPrice}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalSupplyOfStakingToken} ${stakingTokenTicker}.`);
    _print(`There are total   : ${totalStakedYAmount} ${stakingTokenTicker} staked in ${rewardTokenTicker}'s ${stakingTokenTicker} staking pool.`);
    _print(`                  = ${toDollar(totalStakedYAmount * stakingTokenPrice)}\n`);
    _print(`You are staking   : ${stakedYAmount} ${stakingTokenTicker} (${toFixed(stakedYAmount * 100 / totalStakedYAmount, 3)}% of the pool)`);
    _print(`                  = ${toDollar(stakedYAmount * stakingTokenPrice)}\n`);


    if (timeUntil > 0) {
        _print_bold(`Reward starts in ${forHumans(timeUntil)}\n`);
    }

    // REWARDS
    _print(`======== ${rewardTokenTicker} REWARDS ========`)
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedYFFI, 4)} ${rewardTokenTicker} = $${toFixed(earnedYFFI * rewardTokenPrice, 2)}`);
    const YFFIWeeklyEstimate = rewardPerToken * stakedYAmount;

    _print(`Hourly estimate   : ${toFixed(YFFIWeeklyEstimate / (24 * 7), 4)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / (24 * 7)) * rewardTokenPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} ${rewardTokenTicker})`)
    _print(`Daily estimate    : ${toFixed(YFFIWeeklyEstimate / 7, 2)} ${rewardTokenTicker} = ${toDollar((YFFIWeeklyEstimate / 7) * rewardTokenPrice)} (out of total ${toFixed(weekly_reward / 7, 2)} ${rewardTokenTicker})`)
    _print(`Weekly estimate   : ${toFixed(YFFIWeeklyEstimate, 2)} ${rewardTokenTicker} = ${toDollar(YFFIWeeklyEstimate * rewardTokenPrice)} (out of total ${weekly_reward} ${rewardTokenTicker})`)
    const YFIWeeklyROI = (rewardPerToken * rewardTokenPrice) * 100 / (stakingTokenPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFIWeeklyROI / 7) / 24, 4)}%`)
    _print(`Daily ROI in USD  : ${toFixed(YFIWeeklyROI / 7, 4)}%`)
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Reward halving    : in ${forHumans(timeTilHalving)} \n`);

    const resetApprove = async function() {
        return rewardsContract_resetApprove(stakingTokenAddr, rewardPoolAddr, App);
    };

    const approveTENDAndStake = async function () {
        return rewardsContract_stake(stakingTokenAddr, rewardPoolAddr, App);
    };

    const unstake = async function() {
        return rewardsContract_unstake(rewardPoolAddr, App);
    };

    const claim = async function() {
        console.log("clicked claim");
        return rewardsContract_claim(rewardPoolAddr, App);
    };

    const exit = async function() {
        return rewardsContract_exit(rewardPoolAddr, App);
    };

    print_warning();

    _print_link(`Reset approval to 0`, resetApprove);
    _print_link(`Stake ${unstakedY} ${stakingTokenTicker}`, approveTENDAndStake);
    _print_link(`Unstake ${stakedYAmount} ${stakingTokenTicker}`, unstake);
    _print_link(`Claim ${earnedYFFI} ${rewardTokenTicker}`, claim);
    _print_link(`Exit`, exit);

    await _print24HourPrice("based-money", rewardTokenTicker);

    hideLoading();
}
