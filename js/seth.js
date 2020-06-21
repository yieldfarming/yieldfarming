$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const SYNTH_UNIV1_SETH_STAKING_POOL = new ethers.Contract(SYNTH_UNIV1_SETH_STAKING_POOL_ADDR, SYNTH_UNIV1_SETH_STAKING_POOL_ABI, App.provider);
    const UNISWAPV1_SETH_ETH_POOL = new ethers.Contract(UNISWAP_SETH_ETH_POOL_ADDR, UNISWAP_SETH_ETH_POOL_ABI, App.provider);
    const SETH_CONTRACT = new ethers.Contract(SETH_TOKEN_ADDR, ERC20_ABI, App.provider);
    const SNX_CONTRACT = new ethers.Contract(SNX_TOKEN_ADDRESS, ERC20_ABI, App.provider);

    // SYNTH Staking Pool
    const yourStakedUniv1Amount = await SYNTH_UNIV1_SETH_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_UNIV1_SETH_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;

    // Uniswap V1 sETH-ETH Pool
    const totalUniv1SethEthTokenSupply = await UNISWAPV1_SETH_ETH_POOL.totalSupply() / 1e18;
    const totalStakedUniv1SethEthTokenAmount = await UNISWAPV1_SETH_ETH_POOL.balanceOf(SYNTH_UNIV1_SETH_STAKING_POOL_ADDR) / 1e18;
    const stakingPoolPercentage = 100 * yourStakedUniv1Amount / totalStakedUniv1SethEthTokenAmount;

    const totalSETHAmount = await SETH_CONTRACT.balanceOf(UNISWAP_SETH_ETH_POOL_ADDR) / 1e18;
    const totalETHAmount = await App.provider.getBalance(UNISWAP_SETH_ETH_POOL_ADDR) / 1e18;

    const sETHPerToken = totalSETHAmount / totalUniv1SethEthTokenSupply;
    const ETHPerToken = totalETHAmount  / totalUniv1SethEthTokenSupply;

    // Query the filter
    const eventFilter = SNX_CONTRACT.filters.Transfer(SYNTH_DISTRIBUTOR_ADDR, SYNTH_UNIV1_SETH_STAKING_POOL_ADDR);
    const current_block_num = App.provider.getBlockNumber();
    const logs = await SNX_CONTRACT.queryFilter(eventFilter, current_block_num - BLOCK_PER_DAY * 7, current_block_num);

    const latest_log = logs[logs.length - 1];
    const weekly_reward = latest_log.args[2] / 1e18;
    const rewardPerToken = weekly_reward / totalStakedUniv1SethEthTokenAmount;

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "ethereum", "seth"]);

    const SNXPrice = prices.havven.usd;
    const ETHPrice = prices.ethereum.usd;
    const sETHPrice = prices.seth.usd;

    const Univ1SethEthPricePerToken = toFixed(ETHPerToken * ETHPrice + sETHPerToken * sETHPrice, 2);

    console.log("========== PRICES ==========")
    console.log(`1 SNX            = $${SNXPrice}\n`);

    console.log(`1 sETH           = $${sETHPrice}`);
    console.log(`1 ETH            = $${ETHPrice}`);
    console.log(`1 UNI-V1 (sETH)  = [${toFixed(sETHPerToken, 4)} sETH, ${toFixed(ETHPerToken, 4)} ETH]`);
    console.log(`                 = $${toFixed(sETHPerToken * sETHPrice + ETHPerToken * ETHPrice, 2)} \n`);


    console.log("========= STAKING ==========")
    console.log(`There are total   : ${totalUniv1SethEthTokenSupply} UNI-V1 (sETH) given out by Uniswap.`);
    console.log(`There are total   : ${totalStakedUniv1SethEthTokenAmount} UNI-V1 (sETH) staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${yourStakedUniv1Amount} UNI-V1 (sETH) (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    console.log(`                  = [${toFixed(yourStakedUniv1Amount * sETHPerToken, 4)} sETH, ${toFixed(yourStakedUniv1Amount * ETHPerToken, 4)} ETH]`);
    console.log(`                  = $${toFixed(Univ1SethEthPricePerToken * yourStakedUniv1Amount, 2)}\n`);

    console.log("======== SNX REWARDS =======")
    console.log(`Claimable Rewards : ${earnedSNX} SNX`);
    console.log(`                  = $${toFixed(earnedSNX * SNXPrice, 2)}\n`)

    console.log(`Weekly estimate   : ${rewardPerToken * yourStakedUniv1Amount} SNX (out of total ${weekly_reward} SNX)`)
    console.log(`                  = $${toFixed((rewardPerToken * yourStakedUniv1Amount) * SNXPrice , 2)}`)
    console.log(`Weekly ROI        : ${toFixed(rewardPerToken * SNXPrice * 100 / Univ1SethEthPricePerToken, 4)}%\n`)
}