$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_BPT_POOL = new ethers.Contract(YFFI_POOL_2_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFFI_DAI_BALANCER_POOL = new ethers.Contract(YFFI_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFFI_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(YFFI_DAI_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YGOV_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFFI = await YGOV_BPT_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFFI_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFFI_DAI_BPT_TOKEN_CONTRACT.balanceOf(YFFI_POOL_2_ADDR) / 1e18;
    const totalYFFIAmount = await YFFI_DAI_BALANCER_POOL.getBalance(YFFI_TOKEN_ADDR) / 1e18;
    const totalDAIAmount = await YFFI_DAI_BALANCER_POOL.getBalance(DAI_TOKEN_ADDR) / 1e18;

    const YFFIPerBPT = totalYFFIAmount / totalBPTAmount;
    const DAIPerBPT = totalDAIAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YGOV_BPT_POOL);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["dai"]);
    const DAIPrice = prices["dai"].usd;
    const YFFIPrice = (await YFFI_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,YFFI_TOKEN_ADDR) / 1e18) * DAIPrice;

    const BPTPrice = YFFIPerBPT * YFFIPrice + DAIPerBPT * DAIPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFFI  = $${YFFIPrice}`);
    _print(`1 DAI   = $${DAIPrice}\n`);
    _print(`1 BPT   = [${YFFIPerBPT} YFII, ${DAIPerBPT} DAI]`);
    _print(`        = ${toDollar(YFFIPerBPT * YFFIPrice + DAIPerBPT * DAIPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFFI DAI Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in YFFI's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFFIPerBPT * stakedBPTAmount} YFFI, ${DAIPerBPT * stakedBPTAmount} DAI]`);
    _print(`                  = ${toDollar(YFFIPerBPT * stakedBPTAmount * YFFIPrice + DAIPerBPT * stakedBPTAmount * DAIPrice)}\n`);

    // YFII REWARDS
    _print("======== YFII REWARDS ========")
    // _print(" (Temporarily paused until further emission model is voted by the community) ");
    _print(`Claimable Rewards : ${toFixed(earnedYFFI, 4)} YFFI = ${toDollar(earnedYFFI * YFFIPrice)}`);
    const YFFIWeeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(YFFIWeeklyEstimate / (7 * 24), 4)} YFFI = ${toDollar((YFFIWeeklyEstimate / (7 * 24)) * YFFIPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} YFII)`)
    _print(`Daily estimate    : ${toFixed(YFFIWeeklyEstimate / 7, 4)} YFFI = ${toDollar((YFFIWeeklyEstimate / 7) * YFFIPrice)} (out of total  ${toFixed(weekly_reward / 7, 2)} YFII)`)
    _print(`Weekly estimate   : ${toFixed(YFFIWeeklyEstimate, 4)} YFFI = ${toDollar(YFFIWeeklyEstimate * YFFIPrice)} (out of total ${weekly_reward} YFII)`)
    const YFFIWeeklyROI = (rewardPerToken * YFFIPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((YFFIWeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(YFFIWeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(YFFIWeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(YFFIWeeklyROI * 52, 4)}% \n`);

    // BAL REWARDS
    _print("======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    hideLoading();

}