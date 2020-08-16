$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const CURVE_SUSD_POOL = new ethers.Contract(CURVE_SUSD_POOL_ADDR, CURVE_SUSD_POOL_ABI, App.provider);
    const SYNTH_crvPlain3andSUSD_POOL = new ethers.Contract(SYNTH_crvPlain3andSUSD_STAKING_POOL_ADDR, SYNTH_crvPlain3andSUSD_STAKING_POOL_ABI, App.provider);
    const crvPlain3andSUSD_TOKEN_CONTRACT = new ethers.Contract(crvPlain3andSUSD_TOKEN_ADDR, ERC20_ABI, App.provider);

    // SYNTH Staking pool
    const rawStakedCRVAmount = await SYNTH_crvPlain3andSUSD_POOL.balanceOf(App.YOUR_ADDRESS);
    const stakedCRVAmount = rawStakedCRVAmount / 1e18;
    const earnedSNX = await SYNTH_crvPlain3andSUSD_POOL.earned(App.YOUR_ADDRESS) / 1e18;

    // Curve susd pool
    const totalCrvPlain3andSUSDSupply = await crvPlain3andSUSD_TOKEN_CONTRACT.totalSupply() / 1e18;
    const totalStakedCrvPlain3andSUSDAmount = await crvPlain3andSUSD_TOKEN_CONTRACT.balanceOf(SYNTH_crvPlain3andSUSD_STAKING_POOL_ADDR) / 1e18;
    const stakingPoolPercentage = 100 * stakedCRVAmount / totalStakedCrvPlain3andSUSDAmount;

    const totalDaiAmount = await CURVE_SUSD_POOL.balances(0) / 1e18;
    const totalUSDCAmount = await CURVE_SUSD_POOL.balances(1) / 1e6;
    const totalUSDTAmount = await CURVE_SUSD_POOL.balances(2) / 1e6;
    const totalSUSDAmount = await CURVE_SUSD_POOL.balances(3) / 1e18;

    const DAIPerToken = totalDaiAmount / totalCrvPlain3andSUSDSupply;
    const USDCPerToken = totalUSDCAmount  / totalCrvPlain3andSUSDSupply;
    const USDTPerToken = totalUSDTAmount / totalCrvPlain3andSUSDSupply;
    const sUSDPerToken = totalSUSDAmount / totalCrvPlain3andSUSDSupply;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(SYNTH_crvPlain3andSUSD_POOL);
    const rewardPerToken = weekly_reward / totalStakedCrvPlain3andSUSDAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "dai", "usd-coin", "tether", "nusd"]);

    const SNXPrice = prices.havven.usd;
    const DAIPrice = prices.dai.usd;
    const USDCPrice = prices["usd-coin"].usd;
    const USDTPrice = prices.tether.usd
    const sUSDPrice = prices.nusd.usd;

    const crvPlain3andSUSDPricePerToken = toFixed(
        DAIPerToken * DAIPrice +
        USDCPerToken * USDCPrice +
        USDTPerToken * USDTPrice +
        sUSDPerToken * sUSDPrice, 2);

    _print("========== PRICES ==========")
    _print(`1 SNX  = $${SNXPrice}\n`);

    _print(`1 DAI  = $${DAIPrice}`);
    _print(`1 USDC = $${USDCPrice}`);
    _print(`1 USDT = $${USDTPrice}`);
    _print(`1 sUSD = $${sUSDPrice}\n`);

    _print("========= STAKING ==========")
    _print(`There are total   : ${totalCrvPlain3andSUSDSupply} crvPlain3andSUSD given out by Curve.`);
    _print(`There are total   : ${totalStakedCrvPlain3andSUSDAmount} crvPlain3andSUSD staked in Synthetix's pool.`);
    _print(`                  = ${toDollar(totalStakedCrvPlain3andSUSDAmount * crvPlain3andSUSDPricePerToken)} \n`);
    _print(`You are staking   : ${stakedCRVAmount} crvPlain3andSUSD (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    _print(`                  ≈ ${toDollar(crvPlain3andSUSDPricePerToken * stakedCRVAmount)} (Averaged)\n`);

    _print("======== SNX REWARDS =======")
    _print(`Claimable Rewards : ${earnedSNX} SNX`);
    _print(`                  = ${toDollar(earnedSNX * SNXPrice)}\n`)

    _print(`Weekly estimate   : ${rewardPerToken * stakedCRVAmount} SNX (out of total ${weekly_reward} SNX)`)
    _print(`                  = ${toDollar((rewardPerToken * stakedCRVAmount) * SNXPrice)}`)
    const SNXWeeklyROI = rewardPerToken * SNXPrice * 100 / crvPlain3andSUSDPricePerToken;
    _print(`Weekly ROI in USD : ${toFixed(SNXWeeklyROI, 4)}%`)
    _print(`APR (unstable)    : ${toFixed(SNXWeeklyROI * 52, 4)}% \n`)

    _print("======== CRV REWARDS ========")
    _print(`    Not distributed yet`);
    hideLoading();

}