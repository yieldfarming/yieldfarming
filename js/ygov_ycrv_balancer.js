$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_2_BPT_POOL = new ethers.Contract(YGOV_BPT_2_STAKING_POOL_ADDR, YGOV_BPT_2_STAKING_POOL_ABI, App.provider);
    const YFI_YCRV_BALANCER_POOL = new ethers.Contract(YFI_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFI_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(YFI_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    // const YFI_TOKEN_CONTRACT = new ethers.Contract(YFI_TOKEN_ADDR, ERC20_ABI, App.provider);
    // const YFI_TOKEN_STAKING_POOL = new ethers.Contract(YFI_STAKING_POOL_ADDR, YFI_STAKING_POOL_ABI, App.provider);
    // const Y_TOKEN_CONTRACT = new ethers.Contract(Y_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YGOV_2_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFI_raw = await YGOV_2_BPT_POOL.earned(App.YOUR_ADDRESS);

    const earnedYFI = earnedYFI_raw / 1e18;
    const totalBPTAmount = await YFI_YCRV_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YGOV_BPT_2_STAKING_POOL_ADDR) / 1e18;
    const totalYFIAmount = await YFI_YCRV_BALANCER_POOL.getBalance(YFI_TOKEN_ADDR) / 1e18;
    const totalYAmount = await YFI_YCRV_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;
    const voteLockBlock = await YGOV_2_BPT_POOL.voteLock(App.YOUR_ADDRESS);
    const currentBlock = await App.provider.getBlockNumber();
    const currentBlockTime = await getBlockTime();

    const isBPTLocked = voteLockBlock > currentBlock;

    let BPTLockedMessage = "NO";
    let _print_BPTLocked = _print;
    if (isBPTLocked) {
        let timeUntilFree = forHumans((voteLockBlock - currentBlock) * currentBlockTime);
        BPTLockedMessage = "YES - locked for approx. " + timeUntilFree;
        _print_BPTLocked = _print_bold;
    }

    // ycrv rewards
    // const stakedYFIAmount = await YFI_TOKEN_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    //const totalStakedYFIAmount = await YFI_TOKEN_CONTRACT.balanceOf(YFI_STAKING_POOL_ADDR) / 1e18;
    // const earnedYCRV = await YFI_TOKEN_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    // const weekly_yCRV_reward = await get_synth_weekly_rewards(YFI_TOKEN_STAKING_POOL);
    // const yCRVRewardPerToken = weekly_yCRV_reward / totalStakedYFIAmount;

    const YFIPerBPT = totalYFIAmount / totalBPTAmount;
    const YPerBPT = totalYAmount / totalBPTAmount;

    // const currentYFI = await YFI_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS);

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(YGOV_2_BPT_POOL);
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    // Find out underlying assets of Y
    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["yearn-finance"]);
    const YFIPrice = prices["yearn-finance"].usd;

    const BPTPrice = YFIPerBPT * YFIPrice + YPerBPT * YVirtualPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFI  = ${toDollar(YFIPrice)}`);
    _print(`1 yCRV = ${toDollar(YVirtualPrice)}`);
    _print(`1 BPT  = [${YFIPerBPT} YFI, ${YPerBPT} yCRV]`);
    _print(`       = ${toDollar(YFIPerBPT * YFIPrice + YPerBPT * YVirtualPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFI-yCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in Ygov's BPT staking pool. `);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFIPerBPT * stakedBPTAmount} YFI, ${YPerBPT * stakedBPTAmount} yCRV]`);
    _print(`                  = ${toDollar(YFIPerBPT * stakedBPTAmount * YFIPrice + YPerBPT * stakedBPTAmount * YVirtualPrice)}\n`);
    _print_BPTLocked(`Is BPT locked?    : ${BPTLockedMessage}\n`);

    // YFI REWARDS
    _print("======== YFI REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedYFI, 4)} YFI = ${toDollar(earnedYFI * YFIPrice)}`);
    _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} YFI = ${toDollar(rewardPerToken * stakedBPTAmount * YFIPrice)} (out of total ${weekly_reward} YFI)`)
    const YFIWeeklyROI = (rewardPerToken * YFIPrice) * 100 / (BPTPrice);
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    // BAL REWARDS
    _print("======= BAL REWARDS ? =======")
    _print(`    Not whitelisted yet?`);
    _print(`    Check http://www.predictions.exchange/balancer/ for latest update \n`)

    // CRV REWARDS
    _print("======== CRV REWARDS ========")
    _print(`    Not distributed yet\n`);

    /**
    // CRV REWARDS
    _print("======== ycrv REWARDS ========")
    _print_href("Official UI", "https://ygov.finance/")
    _print_bold("\nRequirements :")
    _print_bold(`    1. You must have voted in proposals.`);
    _print_bold(`    2. You must have at least 1000 BPT staked in this pool.`);

    _print(`There are total   : ${totalStakedYFIAmount} YFI staked in Ygov's BPT staking pool. `);
    _print(`                  = ${toDollar(totalStakedYFIAmount * YFIPrice)}\n`);
    _print(`You are staking   : ${stakedYFIAmount} YFI (${toFixed(stakedYFIAmount * 100 / totalStakedYFIAmount, 3)}% of the pool)`);
    _print(`                  = ${toDollar(stakedYFIAmount * YFIPrice)}\n`);

    _print(`Claimable Rewards : ${toFixed(earnedYCRV, 4)} yCRV = ${toDollar(earnedYCRV * YVirtualPrice)}`);
    _print(`Weekly estimate   : ${toFixed(yCRVRewardPerToken * stakedYFIAmount, 2)} yCRV = ${toDollar(yCRVRewardPerToken * stakedYFIAmount * YVirtualPrice)} (out of total ${weekly_yCRV_reward} yCRV)`)
    const YCRVWeeklyROI = (yCRVRewardPerToken * YVirtualPrice) * 100 / (YFIPrice);
    _print(`Weekly ROI in USD : ${toFixed(YCRVWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YCRVWeeklyROI * 52, 4)}% \n`)

    const approveYFIAndStake = async function () {

        const signer = App.provider.getSigner();

        const YFI_TOKEN_CONTRACT = new ethers.Contract(YFI_TOKEN_ADDR, YFI_TOKEN_ABI, signer);
        const YFI_TOKEN_STAKING_POOL = new ethers.Contract(YFI_STAKING_POOL_ADDR, YFI_STAKING_POOL_ABI, signer);

        const currentYFI = await YFI_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS);
        const allowedYFI = await YFI_TOKEN_CONTRACT.allowance(App.YOUR_ADDRESS, YFI_STAKING_POOL_ADDR);

        console.log(allowedYFI);

        let allow = Promise.resolve();

        if (allowedYFI < currentYFI) {
            allow = YFI_TOKEN_CONTRACT.increaseAllowance(YFI_STAKING_POOL_ADDR, currentYFI.sub(allowedYFI), {gasLimit: 50000})
                .then(function(t) {
                    return App.provider.waitForTransaction(t.hash);
                });
        }

        if (currentYFI > 0) {
            allow.then(function() {
                YFI_TOKEN_STAKING_POOL.stake(currentYFI)
            });
        } else {
            alert("You have no YFI!!");
        }
    }

    const claimYFI = async function () {
        const signer = App.provider.getSigner();

        const YGOV_2_BPT_POOL2 = new ethers.Contract(YGOV_BPT_2_STAKING_POOL_ADDR, YGOV_BPT_2_STAKING_POOL_ABI, signer);
        return YGOV_2_BPT_POOL2.getReward({gasLimit: 177298}).then(function(t) {
            return App.provider.waitForTransaction(t.hash);
        });
    }

    const claimYFIAndStake = async function() {
        claimYFI().then(function() {
            approveYFIAndStake();
        });
    }

    _print_link(`Claim ${toFixed(earnedYFI, 4)} YFI and stake`, claimYFIAndStake);
    _print_link(`Stake ${toFixed(currentYFI / 1e18, 4)} YFI in your wallet`, approveYFIAndStake);
     **/

    hideLoading();

}