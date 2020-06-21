$(function() {
    consoleInit();
    start(main);
});

async function main() {
    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const SYNTH_iETH_POOL = new ethers.Contract(SYNTH_iETH_STAKING_POOL_ADDR, SYNTH_iETH_STAKING_POOL_ABI, App.provider);
    const SNX_CONTRACT = new ethers.Contract(SNX_TOKEN_ADDRESS, ERC20_ABI, App.provider);
    const iETH_CONTRACT = new ethers.Contract(iETH_TOKEN_ADDR, ERC20_ABI, App.provider);

    const yourStakedIETHAmount = await SYNTH_iETH_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_iETH_POOL.earned(App.YOUR_ADDRESS) / 1e18;
    const totalIETHAmount = await iETH_CONTRACT.totalSupply() / 1e18;
    const totalStakedIETHAmount = await iETH_CONTRACT.balanceOf(SYNTH_iETH_STAKING_POOL_ADDR) / 1e18;

    // Query the filter
    const eventFilter = SNX_CONTRACT.filters.Transfer(PDAO_ADDRESS, SYNTH_iETH_STAKING_POOL_ADDR);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedIETHAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["havven", "ieth"]);
    const SNXprice = prices.havven.usd;
    const iETHprice = prices.ieth.usd;

    // Finished. Start printing

    console.log("========== PRICES ==========")
    console.log(`1 SNX = $${SNXprice}`);
    console.log(`1 iETH = $${iETHprice}\n`);

    console.log("===== STAKING & REWARDS ====")
    console.log(`There are total   : ${totalIETHAmount} iETH given out by Synthetix.`);
    console.log(`There are total   : ${totalStakedIETHAmount} iETH staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${yourStakedIETHAmount} iETH (${toFixed(yourStakedIETHAmount * 100 / totalStakedIETHAmount, 3)}% of the pool)`);
    console.log(`                  = $${toFixed(yourStakedIETHAmount * iETHprice, 2)}\n`);

    console.log(`Claimable Rewards : ${toFixed(earnedSNX, 2)} SNX = $${toFixed(earnedSNX * SNXprice, 2)}`);
    console.log(`Weekly estimate   : ${toFixed(rewardPerToken * yourStakedIETHAmount, 2)} SNX = $${toFixed(rewardPerToken * yourStakedIETHAmount * SNXprice, 2)} (out of total ${weekly_reward} SNX)`)
    console.log(`Weekly ROI        : ${toFixed((rewardPerToken * SNXprice) * 100 / iETHprice, 4)}%`)
}