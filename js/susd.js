$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const CURVE_SUSD_POOL = new ethers.Contract(CURVE_SUSD_POOL_ADDR, CURVE_SUSD_POOL_ABI, App.provider);
    const SYNTH_crvPlain3andSUSD_POOL = new ethers.Contract(SYNTH_crvPlain3andSUSD_STAKING_POOL_ADDR, SYNTH_crvPlain3andSUSD_STAKING_POOL_ABI, App.provider);
    const crvPlain3andSUSD_TOKEN_CONTRACT = new ethers.Contract(crvPlain3andSUSD_TOKEN_ADDR, ERC20_ABI, App.provider);
    const SNX_CONTRACT = new ethers.Contract(SNX_TOKEN_ADDRESS, ERC20_ABI, App.provider);

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

    // Query the filter
    const eventFilter = SNX_CONTRACT.filters.Transfer(SYNTH_DISTRIBUTOR_ADDR, SYNTH_crvPlain3andSUSD_STAKING_POOL_ADDR);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedCrvPlain3andSUSDAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

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

    console.log("========== PRICES ==========")
    console.log(`1 SNX  = $${SNXPrice}\n`);

    console.log(`1 DAI  = $${DAIPrice}`);
    console.log(`1 USDC = $${USDCPrice}`);
    console.log(`1 USDT = $${USDTPrice}`);
    console.log(`1 sUSD = $${sUSDPrice}\n`);

    console.log("========= STAKING ==========")
    console.log(`There are total   : ${totalCrvPlain3andSUSDSupply} crvPlain3andSUSD given out by Curve.`);
    console.log(`There are total   : ${totalStakedCrvPlain3andSUSDAmount} crvPlain3andSUSD staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${stakedCRVAmount} crvPlain3andSUSD (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    console.log(`                  ≈ $${toFixed(crvPlain3andSUSDPricePerToken * stakedCRVAmount, 2)} (Averaged)\n`);

    console.log("======== SNX REWARDS =======")
    console.log(`Claimable Rewards : ${earnedSNX} SNX`);
    console.log(`                  = $${toFixed(earnedSNX * SNXPrice, 2)}\n`)

    console.log(`Weekly estimate   : ${rewardPerToken * stakedCRVAmount} SNX (out of total ${weekly_reward} SNX)`)
    console.log(`                  = $${toFixed((rewardPerToken * stakedCRVAmount) * SNXPrice , 2)}`)
    console.log(`Weekly ROI        : ${toFixed(rewardPerToken * SNXPrice * 100 / crvPlain3andSUSDPricePerToken, 4)}%\n`)

    console.log("======== CRV REWARDS ========")
    console.log(`    Not distributed yet`);
}