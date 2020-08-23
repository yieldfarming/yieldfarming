$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`)
    _print('Reading smart contracts...\n')
    _print(`Reward Pool Address: ${CREAM_BPT_POOL_ADDR}\n`)

    const CREAM_STAKING_POOL = new ethers.Contract(CREAM_BPT_POOL_ADDR, CREAM_REWARD_POOL_ABI, App.provider)
    const CREAM_TOKEN = new ethers.Contract(CREAM_TOKEN_ADDR, ERC20_ABI, App.provider)
    const WETH_TOKEN = new ethers.Contract(WETH_TOKEN_ADDR, ERC20_ABI, App.provider)
    const CREAM_WETH_BPT_TOKEN = new ethers.Contract(CREAM_WETH_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider)

    const stakedAmount = (await CREAM_STAKING_POOL.balanceOf(App.YOUR_ADDRESS)) / 1e18;
    const earnedCREAM = (await CREAM_STAKING_POOL.earned(App.YOUR_ADDRESS)) / 1e18;
    const totalBPTAmount = (await CREAM_WETH_BPT_TOKEN.totalSupply()) / 1e18;
    const totalStakedBPTAmount = (await CREAM_WETH_BPT_TOKEN.balanceOf(CREAM_BPT_POOL_ADDR)) / 1e18;
    const totalCREAMAmount = (await CREAM_TOKEN.balanceOf(CREAM_WETH_BPT_TOKEN_ADDR)) / 1e18;
    const totalWETHAmount = (await WETH_TOKEN.balanceOf(CREAM_WETH_BPT_TOKEN_ADDR)) / 1e18;

    const CREAMPerBPT = totalCREAMAmount / totalBPTAmount;
    const WETHPerBPT = totalWETHAmount / totalBPTAmount;
    
    const weekly_reward = await get_synth_weekly_rewards(CREAM_STAKING_POOL);
    const nextHalving = await getPeriodFinishForReward(CREAM_STAKING_POOL)

    const unstakedBPT = await CREAM_WETH_BPT_TOKEN.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    const prices = await lookUpPrices(["cream-2", "ethereum"]);
    const CREAMPrice = prices["cream-2"].usd;
    const ETHPrice = prices["ethereum"].usd;

    const BPTPrice = CREAMPerBPT * CREAMPrice + WETHPerBPT * ETHPrice;

    _print("========== PRICES ==========")
    _print(`1 CREAM  = $${CREAMPrice}`);
    _print(`1 ETH   = $${ETHPrice}\n`);
    _print(`1 BPT   = [${CREAMPerBPT} CREAM, ${WETHPerBPT} ETH]`);
    _print(`        = ${toDollar(BPTPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by CREAM ETH Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in CREAM's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedAmount} BPT (${toFixed(stakedAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${CREAMPerBPT * stakedAmount} CREAM, ${WETHPerBPT * stakedAmount} ETH]`);
    _print(`                  = ${toDollar(CREAMPerBPT * stakedAmount * CREAMPrice + WETHPerBPT * stakedAmount * ETHPrice)}\n`);

    // CREAM REWARDS
    _print("======== CREAM REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedCREAM, 4)} CREAM = ${toDollar(earnedCREAM * CREAMPrice)}`);
    const CREAMWeeklyEstimate = rewardPerToken * stakedAmount;

    _print(`Hourly estimate   : ${toFixed(CREAMWeeklyEstimate / (24 * 7), 4)} CREAM = ${toDollar((CREAMWeeklyEstimate / (24 * 7)) * CREAMPrice)} (out of total ${toFixed(weekly_reward / (7 * 24), 2)} CREAM)`)
    _print(`Daily estimate    : ${toFixed(CREAMWeeklyEstimate / 7, 2)} CREAM = ${toDollar((CREAMWeeklyEstimate / 7) * CREAMPrice)} (out of total ${toFixed(weekly_reward / 7, 2)} CREAM)`)
    _print(`Weekly estimate   : ${toFixed(CREAMWeeklyEstimate, 2)} CREAM = ${toDollar(CREAMWeeklyEstimate * CREAMPrice)} (out of total ${weekly_reward} CREAM)`)
    const CREAMWeeklyROI = (rewardPerToken * CREAMPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((CREAMWeeklyROI / 7) / 24, 4)}%`)
    _print(`Daily ROI in USD  : ${toFixed(CREAMWeeklyROI / 7, 4)}%`)
    _print(`Weekly ROI in USD : ${toFixed(CREAMWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(CREAMWeeklyROI * 52, 4)}% \n`)

    const timeTilHalving = nextHalving - Date.now() / 1000

    _print(`Reward ending     : in ${forHumans(timeTilHalving)} \n`)

    const resetApprove = async function() {
        return rewardsContract_resetApprove(CREAM_WETH_BPT_TOKEN_ADDR, CREAM_BPT_POOL_ADDR, App);
    };

    const approveTENDAndStake = async function () {
        return rewardsContract_stake(CREAM_WETH_BPT_TOKEN_ADDR, CREAM_BPT_POOL_ADDR, App);
    };

    const unstake = async function() {
        return rewardsContract_unstake(CREAM_BPT_POOL_ADDR, App);
    };

    const claim = async function() {
        return rewardsContract_claim(CREAM_BPT_POOL_ADDR, App);
    };

    const exit = async function() {
        return rewardsContract_exit(CREAM_BPT_POOL_ADDR, App);
    };

    print_warning();

    _print_link(`Reset approval to 0`, resetApprove);
    _print_link(`Stake ${unstakedBPT} BPT`, approveTENDAndStake);
    _print_link(`Unstake ${stakedAmount} BPT`, unstake);
    _print_link(`Claim ${earnedCREAM} CREAM`, claim);
    _print_link(`Exit`, exit);

    // await _print24HourPrice("cream2", "CREAM");

    hideLoading();
}
