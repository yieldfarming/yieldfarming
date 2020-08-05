$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YFT_POOL_3 = new ethers.Contract(YFT_POOL_3_ADDR, YFT_REWARD_CONTRACT_ABI, App.provider);
    const YFT_YCRV_BALANCER_POOL = new ethers.Contract(YFT_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFI_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(YFT_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const YFT_DAI_BALANCER_POOL = new ethers.Contract(YFT_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);

    const stakedBPTAmount = await YFT_POOL_3.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFT_raw = await YFT_POOL_3.earned(App.YOUR_ADDRESS);

    const earnedYFT = earnedYFT_raw / 1e18;
    const totalBPTAmount = await YFT_YCRV_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YFT_POOL_3_ADDR) / 1e18;
    const totalYFTAmount = await YFT_YCRV_BALANCER_POOL.getBalance(YFT_TOKEN_ADDR) / 1e18;
    const totalYAmount = await YFT_YCRV_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;

    // const yourUnstakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const YFTPerBPT = totalYFTAmount / totalBPTAmount;
    const YPerBPT = totalYAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YFT_POOL_3);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    // Find out underlying assets of Y
    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices.dai.usd;


    const YFTPrice = (await YFT_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,YFT_TOKEN_ADDR) / 1e18) * DAIPrice;
    const YFTPrice2 = (await YFT_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, YFT_TOKEN_ADDR) / 1e18) * YVirtualPrice;

    const BPTPrice = YFTPerBPT * YFTPrice + YPerBPT * YVirtualPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFT  = ${toDollar(YFTPrice)} or ${toDollar(YFTPrice2)} in yCRV pool.` );
    _print(`1 yCRV  = ${toDollar(YVirtualPrice)}`);
    _print(`1 BPT   = [${YFTPerBPT} YFT, ${YPerBPT} yCRV]`);
    _print(`        = ${toDollar(YFTPerBPT * YFTPrice + YPerBPT * YVirtualPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFT-yCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in BPT staking pool 3. `);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFTPerBPT * stakedBPTAmount} YFT, ${YPerBPT * stakedBPTAmount} yCRV]`);
    _print(`                  = ${toDollar(YFTPerBPT * stakedBPTAmount * YFTPrice + YPerBPT * stakedBPTAmount * YVirtualPrice)}\n`);


    _print(`\n======== YFT REWARDS ========`)
    _print(`Claimable Rewards : ${toFixed(earnedYFT, 4)} YFT = ${toDollar(earnedYFT * YFTPrice)}`);
    const weeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(weeklyEstimate / (24 * 7), 2)} YFT = ${toDollar((weeklyEstimate / (24 * 7)) * YFTPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} YFT)`)
    _print(`Daily estimate    : ${toFixed(weeklyEstimate / 7, 2)} YFT = ${toDollar(weeklyEstimate * YFTPrice / 7)} (out of total ${toFixed(weekly_reward / 7, 2)} YFT)`)
    _print(`Weekly estimate   : ${toFixed(weeklyEstimate, 2)} YFT = ${toDollar(weeklyEstimate * YFTPrice)} (out of total ${weekly_reward} YFT)`)
    const YFTWeeklyROI = (rewardPerToken * YFTPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFTWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(YFTWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(YFTWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(YFTWeeklyROI * 52, 4)}% \n`);

    // BAL REWARDS
    _print("\n======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    // CRV REWARDS
    _print("======== CRV REWARDS ========")
    _print(`    Not distributed yet\n`);

    hideLoading();
}