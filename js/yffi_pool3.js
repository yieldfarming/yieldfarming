$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YFFI_POOL_3 = new ethers.Contract(YFFI_POOL_3_ADDR, YFFI_REWARD_CONTRACT_ABI, App.provider);
    const YFFI_YCRV_BALANCER_POOL = new ethers.Contract(YFFI_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFI_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(YFFI_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const YFFI_DAI_BALANCER_POOL = new ethers.Contract(YFFI_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);

    const stakedBPTAmount = await YFFI_POOL_3.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFFI_raw = await YFFI_POOL_3.earned(App.YOUR_ADDRESS);

    const startTime = await YFFI_POOL_3.starttime();

    const earnedYFFI = earnedYFFI_raw / 1e18;
    const totalBPTAmount = await YFFI_YCRV_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YFFI_POOL_3_ADDR) / 1e18;
    const totalYFFIAmount = await YFFI_YCRV_BALANCER_POOL.getBalance(YFFI_TOKEN_ADDR) / 1e18;
    const totalYAmount = await YFFI_YCRV_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;

    // const yourUnstakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const YFFIPerBPT = totalYFFIAmount / totalBPTAmount;
    const YPerBPT = totalYAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YFFI_POOL_3);
    const nextHalving = await getPeriodFinishForReward(YFFI_POOL_3);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    // Find out underlying assets of Y
    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices.dai.usd;


    const YFFIPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,YFFI_TOKEN_ADDR) / 1e18) * DAIPrice;
    const YFFIPrice2 = (await YFFI_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, YFFI_TOKEN_ADDR) / 1e18) * YVirtualPrice;

    const BPTPrice = YFFIPerBPT * YFFIPrice + YPerBPT * YVirtualPrice;

    // Get Time Until reward Starts
    const timeUntil = startTime - (Date.now() / 1000);

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFFI  = ${toDollar(YFFIPrice)} or ${toDollar(YFFIPrice2)} in yCRV pool.` );
    _print(`1 yCRV  = ${toDollar(YVirtualPrice)}`);
    _print(`1 BPT   = [${YFFIPerBPT} YFFI, ${YPerBPT} yCRV]`);
    _print(`        = ${toDollar(YFFIPerBPT * YFFIPrice + YPerBPT * YVirtualPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFFI-yCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in BPT staking pool 3. `);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFFIPerBPT * stakedBPTAmount} YFFI, ${YPerBPT * stakedBPTAmount} yCRV]`);
    _print(`                  = ${toDollar(YFFIPerBPT * stakedBPTAmount * YFFIPrice + YPerBPT * stakedBPTAmount * YVirtualPrice)}\n`);


    // YFI REWARDS
    if (timeUntil > 0) {
        _print_bold(`Starts in ${forHumans(timeUntil)}`)
    }

    _print(`\n======== YFFI REWARDS ========`)
    _print(`Claimable Rewards : ${toFixed(earnedYFFI, 4)} YFFI = ${toDollar(earnedYFFI * YFFIPrice)}`);
    const weeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(weeklyEstimate / (24 * 7), 2)} YFFI = ${toDollar((weeklyEstimate / (24 * 7)) * YFFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} YFFI)`)
    _print(`Daily estimate    : ${toFixed(weeklyEstimate / 7, 2)} YFFI = ${toDollar(weeklyEstimate * YFFIPrice / 7)} (out of total ${toFixed(weekly_reward / 7, 2)} YFFI)`)
    _print(`Weekly estimate   : ${toFixed(weeklyEstimate, 2)} YFFI = ${toDollar(weeklyEstimate * YFFIPrice)} (out of total ${weekly_reward} YFFI)`)
    const YFFIWeeklyROI = (rewardPerToken * YFFIPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFFIWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(YFFIWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(YFFIWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(YFFIWeeklyROI * 52, 4)}% \n`);

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)

    // BAL REWARDS
    _print("\n======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    // CRV REWARDS
    _print("======== CRV REWARDS ========")
    _print(`    Not distributed yet\n`);

    hideLoading();
}