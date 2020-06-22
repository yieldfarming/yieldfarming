$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const CURVE_BTC_POOL = new ethers.Contract(CURVE_BTC_POOL_ADDR, CURVE_BTC_POOL_ABI, App.provider);
    const SYNTH_CRV_POOL = new ethers.Contract(SYNTH_crvRenWSBTC_STAKING_POOL_ADDR, SYNTH_crvRenWSBTC_STAKING_POOL_ABI, App.provider);
    const BALANCER_SNX_REN_POOL = new ethers.Contract(BALANCER_SNX_REN_POOL_ADDR, BALANCER_SNX_REN_POOL_ABI, App.provider);
    const SNX_REN_BPT_TOKEN_CONTRACT = new ethers.Contract(SNX_REN_BPT_TOKEN_ADDRESS, ERC20_ABI, App.provider);
    const crvRenWSBTC_TOKEN_CONTRACT = new ethers.Contract(crvRenWSBTC_TOKEN_ADDR, ERC20_ABI, App.provider);

    // Curve
    const rawStakedCRVAmount = await SYNTH_CRV_POOL.balanceOf(App.YOUR_ADDRESS);
    const stakedCRVAmount = rawStakedCRVAmount / 1e18;

    const totalRenBTCAmount = await CURVE_BTC_POOL.balances(0) / 1e8;
    const totalWBTCAmount = await CURVE_BTC_POOL.balances(1) / 1e8;
    const totalSBTCAmount = await CURVE_BTC_POOL.balances(2) / 1e18;
    const totalCrvRenWSBTCSupply = await crvRenWSBTC_TOKEN_CONTRACT.totalSupply() / 1e18;

    const renBTCamountPerToken = totalRenBTCAmount * (1 / totalCrvRenWSBTCSupply);
    const wBTCamountPerToken = totalWBTCAmount * (1 / totalCrvRenWSBTCSupply);
    const sBTCamountPerToken = totalSBTCAmount * (1 / totalCrvRenWSBTCSupply);

    // Balancer
    const earnedBPT = await SYNTH_CRV_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await BALANCER_SNX_REN_POOL.totalSupply() / 1e18;
    const totalSNXAmount = await BALANCER_SNX_REN_POOL.getBalance(SNX_TOKEN_ADDRESS) / 1e18;

    const totalStakedCrvRenWSBTCAmount = await crvRenWSBTC_TOKEN_CONTRACT.balanceOf(SYNTH_crvRenWSBTC_STAKING_POOL_ADDR) / 1e18;
    const totalRENAmount = await BALANCER_SNX_REN_POOL.getBalance(REN_ADDRESS) / 1e18;

    const SNXperBPT = totalSNXAmount / totalBPTAmount;
    const RENperBPT = totalRENAmount / totalBPTAmount;

    // Query the filter
    const eventFilter = SNX_REN_BPT_TOKEN_CONTRACT.filters.Transfer(PDAO_ADDRESS, SYNTH_crvRenWSBTC_STAKING_POOL_ADDR);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_REN_BPT_TOKEN_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedCrvRenWSBTCAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "republic-protocol", "wrapped-bitcoin", "sbtc", "renbtc"]);

    const SNXprice = prices.havven.usd;
    const RENprice = prices["republic-protocol"].usd;
    const BPTprice = SNXperBPT * SNXprice + RENperBPT * RENprice;

    const renBTCPrice = prices.renbtc.usd;
    const wBTCPrice = prices["wrapped-bitcoin"].usd;
    const SBTCPrice = prices.sbtc.usd;
    const crvRenWSBTCPricePerToken = toFixed(renBTCamountPerToken * renBTCPrice + wBTCamountPerToken * wBTCPrice + sBTCamountPerToken * SBTCPrice, 2);

    console.log("========== PRICES ==========")
    console.log(`1 SNX = $${SNXprice}`);
    console.log(`1 REN = $${RENprice}\n`);
    console.log(`1 BPT (79.82% SNX, 20.17% REN) = [${SNXperBPT} SNX, ${RENperBPT} REN]`);
    console.log(`      = $${BPTprice}\n`);

    console.log(`1 renBTC = $${renBTCPrice}`);
    console.log(`1 wBTC = $${wBTCPrice}`);
    console.log(`1 sBTC = $${SBTCPrice}\n`);

    console.log("========= STAKING ==========")
    console.log(`There are total   : ${totalCrvRenWSBTCSupply} crvRenWSBTC given out by Curve.`);
    console.log(`There are total   : ${totalStakedCrvRenWSBTCAmount} crvRenWSBTC staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${stakedCRVAmount} crvRenWSBTC (${toFixed(100 * stakedCRVAmount / totalStakedCrvRenWSBTCAmount, 3)}% of the pool)`);
    console.log(`                  ≈ $${toFixed(crvRenWSBTCPricePerToken * stakedCRVAmount, 2)} (Averaged)\n`);

    console.log("====== SNX/REN REWARDS =====")
    console.log(`Claimable Rewards : ${earnedBPT} BPT`);
    console.log(`                  = [${earnedBPT * SNXperBPT} SNX + ${earnedBPT * RENperBPT} REN]`);
    console.log(`                  = $${toFixed(earnedBPT * BPTprice, 2)}\n`)

    console.log(`Weekly estimate   : ${rewardPerToken * stakedCRVAmount} BPT (out of total ${weekly_reward} BPT)`)
    console.log(`                  = $${toFixed((rewardPerToken * stakedCRVAmount) * BPTprice , 2)}`)
    console.log(`Weekly ROI        : ${toFixed(rewardPerToken * BPTprice * 100 / crvRenWSBTCPricePerToken, 4)}%\n`)

    console.log("======== BAL REWARDS ========")
    console.log(`WARNING: This is your total BAL rewards across all of your contribution to Balancer.`);
    console.log(`WARNING: BAL is not distributed yet.\n`);

    // Load BAL distribution
    const bal_earnings = await getBALEarnings(App.YOUR_ADDRESS);

    let total_bal = 0;

    for (let i = 0; i < BAL_DISTRIBUTION_WEEK ; i++) {
        if (bal_earnings[i]) {
            console.log(`Week ${i + 1}: ${toFixed(bal_earnings[i], 5)} BAL`);
            total_bal += bal_earnings[i];
        } else {
            console.log(`Week ${i + 1}: Data not available yet.`);
        }
    }
    console.log(`--------------------`)
    console.log(`Total : ${toFixed(total_bal, 5)} BAL\n`);

    console.log("======== CRV REWARDS ========")
    console.log(`    Not distributed yet`);
}