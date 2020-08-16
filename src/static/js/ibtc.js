$(function() {
    consoleInit();
    start(main);
});

async function main() {
    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const SYNTH_iBTC_POOL = new ethers.Contract(SYNTH_iBTC_STAKING_POOL_ADDR, SYNTH_iBTC_STAKING_POOL_ABI, App.provider);
    const iBTC_CONTRACT = new ethers.Contract(iBTC_TOKEN_ADDR, ERC20_ABI, App.provider);

    const yourStakedIBTCAmount = await SYNTH_iBTC_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_iBTC_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalIBTCAmount = await iBTC_CONTRACT.totalSupply() / 1e18;
    const totalStakedIBTCAmount = await iBTC_CONTRACT.balanceOf(SYNTH_iBTC_STAKING_POOL_ADDR) / 1e18;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(SYNTH_iBTC_POOL);
    const rewardPerToken = weekly_reward / totalStakedIBTCAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["havven", "ibtc"]);
    const SNXPrice = prices.havven.usd;
    const iBTCPrice = prices.ibtc.usd;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 SNX = ${toDollar(SNXPrice)}`);
    _print(`1 iBTC = ${toDollar(iBTCPrice)}\n`);

    _print("===== STAKING & REWARDS ====")
    _print(`There are total   : ${totalIBTCAmount} iBTC given out by Synthetix.`);
    _print(`There are total   : ${totalStakedIBTCAmount} iBTC staked in Synthetix's pool. `);
    _print(`                  = ${toDollar(totalStakedIBTCAmount * iBTCPrice)}\n`);
    _print(`You are staking   : ${yourStakedIBTCAmount} iBTC (${toFixed(yourStakedIBTCAmount * 100 / totalStakedIBTCAmount, 3)}% of the pool)`);
    _print(`                  = ${toDollar(yourStakedIBTCAmount * iBTCPrice)}\n`);

    _print(`Claimable Rewards : ${toFixed(earnedSNX, 2)} SNX = $${toFixed(earnedSNX * SNXPrice, 2)}`);
    _print(`Weekly estimate   : ${toFixed(rewardPerToken * yourStakedIBTCAmount, 2)} SNX = ${toDollar(rewardPerToken * yourStakedIBTCAmount * SNXPrice)} (out of total ${weekly_reward} SNX)`)
    const SNXWeeklyROI = (rewardPerToken * SNXPrice) * 100 / iBTCPrice;
    _print(`Weekly ROI        : ${toFixed(SNXWeeklyROI, 4)}%`)
    _print(`APR (Unstable)    : ${toFixed(SNXWeeklyROI * 52, 4)}%`)

    hideLoading();
}