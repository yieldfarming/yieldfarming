$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YFT_POOL_2 = new ethers.Contract(YFT_POOL_2_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFT_DAI_BALANCER_POOL = new ethers.Contract(YFT_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFT_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(YFT_DAI_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const YFT_YCRV_BALANCER_POOL = new ethers.Contract(YFT_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);


    const stakedBPTAmount = await YFT_POOL_2.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFT = await YFT_POOL_2.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFT_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFT_DAI_BPT_TOKEN_CONTRACT.balanceOf(YFT_POOL_2_ADDR) / 1e18;
    const totalYFTAmount = await YFT_DAI_BALANCER_POOL.getBalance(YFT_TOKEN_ADDR) / 1e18;
    const totalDAIAmount = await YFT_DAI_BALANCER_POOL.getBalance(DAI_TOKEN_ADDR) / 1e18;

    const YFTPerBPT = totalYFTAmount / totalBPTAmount;
    const DAIPerBPT = totalDAIAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YFT_POOL_2);
    const nextHalving = await getPeriodFinishForReward(YFT_POOL_2);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;


    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices["dai"].usd;
    const YFTPrice = (await YFT_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,YFT_TOKEN_ADDR) / 1e18) * DAIPrice;
    const YFTPrice2 = (await YFT_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR, YFT_TOKEN_ADDR) / 1e18) * YVirtualPrice;


    const BPTPrice = YFTPerBPT * YFTPrice + DAIPerBPT * DAIPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFT  = ${toDollar(YFTPrice)} or ${toDollar(YFTPrice2)} in yCRV pool.` );
    _print(`1 DAI   = $${DAIPrice}\n`);
    _print(`1 BPT   = [${YFTPerBPT} YFT, ${DAIPerBPT} DAI]`);
    _print(`        = ${toDollar(YFTPerBPT * YFTPrice + DAIPerBPT * DAIPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFT DAI Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in YFT's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFTPerBPT * stakedBPTAmount} YFT, ${DAIPerBPT * stakedBPTAmount} DAI]`);
    _print(`                  = ${toDollar(YFTPerBPT * stakedBPTAmount * YFTPrice + DAIPerBPT * stakedBPTAmount * DAIPrice)}\n`);

    // YFT REWARDS
    _print("======== YFT REWARDS ========")
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedYFT, 4)} YFT = ${toDollar(earnedYFT * YFTPrice)}`);
    const YFTWeeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(YFTWeeklyEstimate / (7 * 24), 4)} YFT = ${toDollar((YFTWeeklyEstimate / (7 * 24)) * YFTPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} YFT)`)
    _print(`Daily estimate    : ${toFixed(YFTWeeklyEstimate / 7, 4)} YFT = ${toDollar((YFTWeeklyEstimate / 7) * YFTPrice)} (out of total  ${toFixed(weekly_reward / 7, 2)} YFT)`)
    _print(`Weekly estimate   : ${toFixed(YFTWeeklyEstimate, 4)} YFT = ${toDollar(YFTWeeklyEstimate * YFTPrice)} (out of total ${weekly_reward} YFT)`)
    const YFTWeeklyROI = (rewardPerToken * YFTPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFTWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(YFTWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(YFTWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(YFTWeeklyROI * 52, 4)}% \n`);

    // BAL REWARDS
    _print("======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    hideLoading();

}