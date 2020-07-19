$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_BPT_POOL = new ethers.Contract(YGOV_BPT_STAKING_POOL_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFI_DAI_BALANCER_POOL = new ethers.Contract(YFI_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFI_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(YFI_DAI_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YGOV_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFI = await YGOV_BPT_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFI_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFI_DAI_BPT_TOKEN_CONTRACT.balanceOf(YGOV_BPT_STAKING_POOL_ADDR) / 1e18;
    const totalYFIAmount = await YFI_DAI_BALANCER_POOL.getBalance(YFI_TOKEN_ADDR) / 1e18;
    const totalDAIAmount = await YFI_DAI_BALANCER_POOL.getBalance(DAI_TOKEN_ADDR) / 1e18;

    const YFIPerBPT = totalYFIAmount / totalBPTAmount;
    const DAIPerBPT = totalDAIAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YGOV_BPT_POOL);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["yearn-finance", "dai"]);
    const YFIPrice = prices["yearn-finance"].usd;
    const DAIPrice = prices["dai"].usd;

    const BPTPrice = YFIPerBPT * YFIPrice + DAIPerBPT * DAIPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFI  = $${YFIPrice}`);
    _print(`1 DAI  = $${DAIPrice}\n`);
    _print(`1 BPT  = [${YFIPerBPT} YFI, ${DAIPerBPT} DAI]`);
    _print(`       = $${YFIPerBPT * YFIPrice + DAIPerBPT * DAIPrice}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFI DAI Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in Ygov's BPT staking pool. \n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFIPerBPT * stakedBPTAmount} YFI, ${DAIPerBPT * stakedBPTAmount} DAI]`);
    _print(`                  = $${toFixed(YFIPerBPT * stakedBPTAmount * YFIPrice + DAIPerBPT * stakedBPTAmount * DAIPrice, 2)}\n`);

    // YFI REWARDS
    _print("======== YFI REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedYFI, 2)} YFI = $${toFixed(earnedYFI * YFIPrice, 2)}`);
    _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} YFI = $${toFixed(rewardPerToken * stakedBPTAmount * YFIPrice, 2)} (out of total ${weekly_reward} YFI)`)
    const YFIWeeklyROI = (rewardPerToken * YFIPrice) * 100 / (BPTPrice);
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)
}