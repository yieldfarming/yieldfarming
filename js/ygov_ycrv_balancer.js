$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_2_BPT_POOL = new ethers.Contract(YGOV_BPT_2_STAKING_POOL_ADDR, YGOV_BPT_2_STAKING_POOL_ABI, App.provider);
    const Y_DAI_BALANCER_POOL = new ethers.Contract(Y_DAI_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const Y_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(Y_DAI_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);
    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const YFI_TOKEN_CONTRACT = new ethers.Contract(YFI_TOKEN_ADDR, ERC20_ABI, App.provider);
    const YFI_TOKEN_STAKING_POOL = new ethers.Contract(YFI_STAKING_POOL_ADDR, YFI_STAKING_POOL_ABI, App.provider);
    const Y_TOKEN_CONTRACT = new ethers.Contract(Y_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YGOV_2_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFI_raw = await YGOV_2_BPT_POOL.earned(App.YOUR_ADDRESS);

    const earnedYFI = earnedYFI_raw / 1e18;
    const totalBPTAmount = await Y_DAI_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await Y_DAI_BPT_TOKEN_CONTRACT.balanceOf(YGOV_BPT_2_STAKING_POOL_ADDR) / 1e18;
    const totalYFIAmount = await Y_DAI_BALANCER_POOL.getBalance(YFI_TOKEN_ADDR) / 1e18;
    const totalYAmount = await Y_DAI_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;

    // yCRV rewards
    const stakedYFIAmount = await YFI_TOKEN_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const totalStakedYFIAmount = await YFI_TOKEN_CONTRACT.balanceOf(YFI_STAKING_POOL_ADDR) / 1e18;
    const earnedYCRV = await YFI_TOKEN_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const weekly_yCRV_reward = await get_synth_weekly_rewards(YGOV_2_BPT_POOL);
    const yCRVRewardPerToken = weekly_yCRV_reward / totalStakedYFIAmount;

    const YFIPerBPT = totalYFIAmount / totalBPTAmount;
    const YPerBPT = totalYAmount / totalBPTAmount;

    const currentYFI = await YFI_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS);

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
    _print(`1 YFI  = $${YFIPrice}`);
    _print(`1 yCRV = $${YVirtualPrice}`);
    _print(`1 BPT  = [${YFIPerBPT} YFI, ${YPerBPT} yCRV]`);
    _print(`       = $${YFIPerBPT * YFIPrice + YPerBPT * YVirtualPrice}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFI-yCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in Ygov's BPT staking pool. `);
    _print(`                  = $${toFixed(totalStakedBPTAmount * BPTPrice, 2)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFIPerBPT * stakedBPTAmount} YFI, ${YPerBPT * stakedBPTAmount} yCRV]`);
    _print(`                  = $${toFixed(YFIPerBPT * stakedBPTAmount * YFIPrice + YPerBPT * stakedBPTAmount * YVirtualPrice, 2)}\n`);

    // YFI REWARDS
    _print("======== YFI REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedYFI, 4)} YFI = $${toFixed(earnedYFI * YFIPrice, 2)}`);
    _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} YFI = $${toFixed(rewardPerToken * stakedBPTAmount * YFIPrice, 2)} (out of total ${weekly_reward} YFI)`)
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

    // CRV REWARDS
    _print("======== yCRV REWARDS ========")
    _print_bold("Requirements :")
    _print_bold(`    1. You must have voted in proposals.`);
    _print_bold(`    2. You must have at least 1000 BPT staked in this pool.`);
    _print_bold(`    3. You must stake YFI in the rewards pool.\n`);

    _print(`There are total   : ${totalStakedYFIAmount} YFI staked in Ygov's BPT staking pool. `);
    _print(`                  = $${toFixed(totalStakedYFIAmount * YFIPrice, 2)}\n`);
    _print(`You are staking   : ${stakedYFIAmount} YFI (${toFixed(stakedYFIAmount * 100 / totalStakedYFIAmount, 3)}% of the pool)`);
    _print(`                  = $${toFixed(stakedYFIAmount * YFIPrice, 2)}\n`);

    _print(`Claimable Rewards : ${toFixed(earnedYCRV, 4)} yCRV = $${toFixed(earnedYCRV * YVirtualPrice, 2)}`);
    _print(`Weekly estimate   : ${toFixed(yCRVRewardPerToken * stakedYFIAmount, 2)} yCRV = $${toFixed(yCRVRewardPerToken * stakedYFIAmount * YVirtualPrice, 2)} (out of total ${weekly_yCRV_reward} yCRV)`)
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
}