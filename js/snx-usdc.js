
async function main() {

    console.log("***************** 👨‍🌾 UNOFFICIAL SNX-USDC YIELD FARMING CALCULATOR 👨‍🌾 *****************");
    console.log("INFO: https://blog.synthetix.io/balancer-snx-usdc-liquidity-trial/");
    console.log("POOL: https://pools.balancer.exchange/#/pool/0x815F8eF4863451f4Faf34FBc860034812E7377d9");
    console.log("STAKE: https://mintr.synthetix.io/")
    console.log("***************************************************************************************\n");

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const SYNTH_BPT_POOL = new ethers.Contract(STAKING_POOL_ADDRESS, STAKING_POOL_ABI, App.provider);
    const SNX_USDC_BALANCER_POOL = new ethers.Contract(BALANCER_USDC_SNX_POOL_ADDRESS, BALANCER_USDC_SNX_POOL_ABI, App.provider);
    const SNX_USDC_BPT_TOKEN_CONTRACT = new ethers.Contract(SNX_USDC_BPT_ADDRESS, ERC20_ABI, App.provider);
    const SNX_CONTRACT = new ethers.Contract(SNX_TOKEN_ADDRESS, ERC20_ABI, App.provider);

    const stakedBPTAmount = await SYNTH_BPT_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_BPT_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await SNX_USDC_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await SNX_USDC_BPT_TOKEN_CONTRACT.balanceOf(STAKING_POOL_ADDRESS) / 1e18;
    const totalSNXAmount = await SNX_USDC_BALANCER_POOL.getBalance(SNX_TOKEN_ADDRESS) / 1e18;
    const totalUSDCAmount = await SNX_USDC_BALANCER_POOL.getBalance(USDC_ADDRESS) / 1e6;

    const SNXperBPT = totalSNXAmount / totalBPTAmount;
    const USDCperBPT = totalUSDCAmount / totalBPTAmount;

    // Query the filter
    const eventFilter = SNX_CONTRACT.filters.Transfer(PDAO_ADDRESS, STAKING_POOL_ADDRESS);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedBPTAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await $.ajax({
        url: "https://api.coingecko.com/api/v3/simple/price?ids=havven%2Cusd-coin&vs_currencies=usd",
        type: 'GET'
    });

    const SNXprice = prices.havven.usd;
    const USDCprice = prices["usd-coin"].usd;

    // Finished. Start printing

    console.log("========== PRICES ==========")
    console.log(`1 SNX = $${SNXprice}`);
    console.log(`1 USDC = $${USDCprice}\n`);
    console.log(`1 BPT = [${SNXperBPT} SNX, ${USDCperBPT} USDC]`);
    console.log(`      = $${SNXperBPT * SNXprice + USDCperBPT * USDCprice}\n`);

    console.log("===== STAKING & REWARDS ====")
    console.log(`There are total   : ${totalBPTAmount} BPT in the Balancer Contract.`);
    console.log(`There are total   : ${totalStakedBPTAmount} BPT staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    console.log(`                  = [${SNXperBPT * stakedBPTAmount} SNX, ${USDCperBPT * stakedBPTAmount} USDC]`);
    console.log(`                  = $${toFixed(SNXperBPT * stakedBPTAmount * SNXprice + USDCperBPT * stakedBPTAmount * USDCprice, 2)}\n`);

    console.log(`Claimable Rewards : ${toFixed(earnedSNX, 2)} SNX = $${toFixed(earnedSNX * SNXprice, 2)}`);
    console.log(`Weekly estimate   : ${toFixed(rewardPerToken * stakedBPTAmount, 2)} SNX = $${toFixed(rewardPerToken * stakedBPTAmount * SNXprice, 2)} (out of total ${weekly_reward} SNX)`)
}

// HELPER

(function () {
    var old = console.log;
    var logger = document.getElementById('log');
    console.log = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] == 'object') {
                logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
            } else {
                logger.innerHTML += arguments[i] + '<br />';
            }
        }
    }

    main().then().catch((e)=> {
        console.log(e);
        console.error(e);
        console.log("Oops something went wrong.")
    });

})();