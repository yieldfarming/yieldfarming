$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const SYNTH_BPT_POOL = new ethers.Contract(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR, SYNTH_USDC_SNX_BPT_STAKING_POOL_ABI, App.provider);
    const SNX_USDC_BALANCER_POOL = new ethers.Contract(BALANCER_USDC_SNX_POOL_ADDRESS, BALANCER_POOL_ABI, App.provider);
    const SNX_USDC_BPT_TOKEN_CONTRACT = new ethers.Contract(SNX_USDC_BPT_ADDRESS, ERC20_ABI, App.provider);

    const stakedBPTAmount = await SYNTH_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_BPT_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await SNX_USDC_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await SNX_USDC_BPT_TOKEN_CONTRACT.balanceOf(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR) / 1e18;
    const totalSNXAmount = await SNX_USDC_BALANCER_POOL.getBalance(SNX_TOKEN_ADDRESS) / 1e18;
    const totalUSDCAmount = await SNX_USDC_BALANCER_POOL.getBalance(USDC_ADDRESS) / 1e6;

    const SNXperBPT = totalSNXAmount / totalBPTAmount;
    const USDCperBPT = totalUSDCAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(SYNTH_BPT_POOL);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["havven", "usd-coin", "balancer"]);
    const SNXPrice = prices.havven.usd;
    const USDCPrice = prices["usd-coin"].usd;
    const BALPrice = prices.balancer.usd;

    const BPTPrice = SNXperBPT * SNXPrice + USDCperBPT * USDCPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 SNX  = $${SNXPrice}`);
    _print(`1 USDC = $${USDCPrice}\n`);
    _print(`1 BPT  = [${SNXperBPT} SNX, ${USDCperBPT} USDC]`);
    _print(`       = $${SNXperBPT * SNXPrice + USDCperBPT * USDCPrice}\n`);
    _print(`1 BAL  = $${BALPrice}\n`)

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT in the Balancer Contract.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in Synthetix's pool. \n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${SNXperBPT * stakedBPTAmount} SNX, ${USDCperBPT * stakedBPTAmount} USDC]`);
    _print(`                  = $${toFixed(SNXperBPT * stakedBPTAmount * SNXPrice + USDCperBPT * stakedBPTAmount * USDCPrice, 2)}\n`);

    // SNX REWARDS
    _print("======== SNX REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedSNX, 2)} SNX = $${toFixed(earnedSNX * SNXPrice, 2)}`);
    _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} SNX = $${toFixed(rewardPerToken * stakedBPTAmount * SNXPrice, 2)} (out of total ${weekly_reward} SNX)`)
    const SNXWeeklyROI = (rewardPerToken * SNXPrice) * 100 / (BPTPrice);
    _print(`Weekly ROI in USD : ${toFixed(SNXWeeklyROI, 4)}%`)
    _print(`APR (unstable)    : ${toFixed(SNXWeeklyROI * 52, 4)}% \n`)

    // BAL REWARDS
    _print("======== BAL REWARDS ========")
    _print("WARNING: This estimate is based on last week's reward and current pool liquidity amount.")
    _print("       : **It will be MUCH higher than what you actually get at the end of this week.** \n")

    const totalBALAmount = await getLatestTotalBALAmount(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR);
    const BALPerToken = totalBALAmount * (1 / totalBPTAmount);
    const yourBALEarnings = BALPerToken * stakedBPTAmount;

    _print(`Weekly estimate   : ${toFixed(yourBALEarnings, 4)} BAL = $${toFixed(yourBALEarnings * BALPrice, 2)} (out of total ${toFixed(totalBALAmount, 4)} BAL)`);
    const BALWeeklyROI = (BALPerToken * BALPrice) * 100 / BPTPrice;
    _print(`Weekly ROI in USD : ${toFixed(BALWeeklyROI, 4)}%`);
    _print(`APR (unstable)    : ${toFixed(BALWeeklyROI * 52, 4)}% \n`)

    hideLoading();

}