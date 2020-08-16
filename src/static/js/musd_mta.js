$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const MUSD_MTA_BALANCER_POOL = new ethers.Contract(MUSD_MTA_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const MUSD_MTA_BPT_TOKEN_CONTRACT = new ethers.Contract(MUSD_MTA_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const BPT_STAKING_POOL = new ethers.Contract(MUSD_MTA_BPT_TOKEN_STAKING_ADDR, MSTABLE_REWARDS_POOL_ABI, App.provider);

    const totalBPTAmount = await MUSD_MTA_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await MUSD_MTA_BPT_TOKEN_CONTRACT.balanceOf(MUSD_MTA_BPT_TOKEN_STAKING_ADDR) / 1e18;
    const yourBPTAmount = await BPT_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const totalMTAAmount = await MUSD_MTA_BALANCER_POOL.getBalance(MTA_TOKEN_ADDR) / 1e18;
    const totalMUSDAmount = await MUSD_MTA_BALANCER_POOL.getBalance(MUSD_TOKEN_ADDR) / 1e18;

    const MTAPerBPT = totalMTAAmount / totalBPTAmount;
    const MUSDPerBPT = totalMUSDAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(BPT_STAKING_POOL);
    const MTARewardPerBPT = weekly_reward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["musd", "meta"]);
    const MTAPrice = prices["meta"].usd;
    const MUSDPrice = prices["musd"].usd;

    const BPTPrice = MTAPerBPT * MTAPrice + MUSDPerBPT * MUSDPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 MTA  = $${MTAPrice}`);
    _print(`1 mUSD = $${MUSDPrice}\n`);
    _print(`1 BPT  = [${MTAPerBPT} MTA, ${MUSDPerBPT} mUSD]`);
    _print(`       = ${toDollar(BPTPrice)}\n`);

    _print("========== STAKING =========");
    _print(`There are total   : ${totalBPTAmount} BPT issued by mUSD-MTA (20/80) Balancer Pool.`);
    _print(`                  = ${toDollar(totalBPTAmount * BPTPrice)}`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${yourBPTAmount} BPT (${toFixed(yourBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${MTAPerBPT * yourBPTAmount} MTA, ${MUSDPerBPT * yourBPTAmount} mUSD]`);
    _print(`                  = ${toDollar(yourBPTAmount * BPTPrice)}\n`);

    // MTA REWARDS
    _print("======== MTA REWARDS ========")
    const weeklyEstimate = MTARewardPerBPT * yourBPTAmount;

    _print(`Daily estimate    : ${toFixed(weeklyEstimate / 7, 2)} MTA = ${toDollar(weeklyEstimate * (1/7) * MTAPrice)} (out of total ${toFixed(weekly_reward / 7, 2)} MTA)`)
    _print(`Weekly estimate   : ${toFixed(weeklyEstimate, 2)} MTA = ${toDollar(weeklyEstimate * MTAPrice)} (out of total ${weekly_reward} MTA)\n`)
    const YFIWeeklyROI = (MTARewardPerBPT * MTAPrice) * 100 / (BPTPrice);
    _print(`Daily ROI in USD  : ${toFixed(YFIWeeklyROI / 7, 4)}%`)
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    // BAL REWARDS
    _print("======== BAL REWARDS ========")
    _print_href(`Check http://www.predictions.exchange/balancer/ for accurate %`, "https://www.predictions.exchange/balancer/")

    hideLoading();

}