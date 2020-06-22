$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const SYNTH_BPT_POOL = new ethers.Contract(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR, SYNTH_USDC_SNX_BPT_STAKING_POOL_ABI, App.provider);
    const SNX_USDC_BALANCER_POOL = new ethers.Contract(BALANCER_USDC_SNX_POOL_ADDRESS, BALANCER_USDC_SNX_POOL_ABI, App.provider);
    const SNX_USDC_BPT_TOKEN_CONTRACT = new ethers.Contract(SNX_USDC_BPT_ADDRESS, ERC20_ABI, App.provider);
    const SNX_CONTRACT = new ethers.Contract(SNX_TOKEN_ADDRESS, ERC20_ABI, App.provider);

    const stakedBPTAmount = await SYNTH_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_BPT_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await SNX_USDC_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await SNX_USDC_BPT_TOKEN_CONTRACT.balanceOf(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR) / 1e18;
    const totalSNXAmount = await SNX_USDC_BALANCER_POOL.getBalance(SNX_TOKEN_ADDRESS) / 1e18;
    const totalUSDCAmount = await SNX_USDC_BALANCER_POOL.getBalance(USDC_ADDRESS) / 1e6;

    const SNXperBPT = totalSNXAmount / totalBPTAmount;
    const USDCperBPT = totalUSDCAmount / totalBPTAmount;

    // Query the filter
    const eventFilter = SNX_CONTRACT.filters.Transfer(PDAO_ADDRESS, SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["havven", "usd-coin"]);
    const SNXprice = prices.havven.usd;
    const USDCprice = prices["usd-coin"].usd;

    // Finished. Start printing

    console.log("========== PRICES ==========")
    console.log(`1 SNX = $${SNXprice}`);
    console.log(`1 USDC = $${USDCprice}\n`);
    console.log(`1 BPT = [${SNXperBPT} SNX, ${USDCperBPT} USDC]`);
    console.log(`      = $${SNXperBPT * SNXprice + USDCperBPT * USDCprice}\n`);

    console.log("========== STAKING =========")
    console.log(`There are total   : ${totalBPTAmount} BPT in the Balancer Contract.`);
    console.log(`There are total   : ${totalStakedBPTAmount} BPT staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    console.log(`                  = [${SNXperBPT * stakedBPTAmount} SNX, ${USDCperBPT * stakedBPTAmount} USDC]`);
    console.log(`                  = $${toFixed(SNXperBPT * stakedBPTAmount * SNXprice + USDCperBPT * stakedBPTAmount * USDCprice, 2)}\n`);

    // SNX REWARDS
    console.log("======== SNX REWARDS ========")
    console.log(`Claimable Rewards : ${toFixed(earnedSNX, 2)} SNX = $${toFixed(earnedSNX * SNXprice, 2)}`);
    console.log(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} SNX = $${toFixed(rewardPerToken * stakedBPTAmount * SNXprice, 2)} (out of total ${weekly_reward} SNX)`)
    console.log(`Weekly ROI in USD : ${toFixed((rewardPerToken * SNXprice) * 100 / (SNXperBPT * SNXprice + USDCperBPT * USDCprice), 4)}%\n`)

    // BAL REWARDS
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
}