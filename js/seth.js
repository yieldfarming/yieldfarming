$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const SYNTH_UNIV1_SETH_STAKING_POOL = new ethers.Contract(SYNTH_UNIV1_SETH_STAKING_POOL_ADDR, SYNTH_UNIV1_SETH_STAKING_POOL_ABI, App.provider);
    const UNISWAPV1_SETH_ETH_POOL = new ethers.Contract(UNISWAP_SETH_ETH_POOL_ADDR, UNISWAP_SETH_ETH_POOL_ABI, App.provider);
    const SETH_CONTRACT = new ethers.Contract(SETH_TOKEN_ADDR, ERC20_ABI, App.provider);

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

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(SYNTH_UNIV1_SETH_STAKING_POOL);
    const rewardPerToken = weekly_reward / totalStakedUniv1SethEthTokenAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "ethereum", "seth"]);

    const SNXPrice = prices.havven.usd;
    const ETHPrice = prices.ethereum.usd;
    const sETHPrice = prices.seth.usd;

    const Univ1SethEthPricePerToken = toFixed(ETHPerToken * ETHPrice + sETHPerToken * sETHPrice, 2);

    _print("========== PRICES ==========")
    _print(`1 SNX            = $${SNXPrice}\n`);

    _print(`1 sETH           = $${sETHPrice}`);
    _print(`1 ETH            = $${ETHPrice}`);
    _print(`1 UNI-V1 (sETH)  = [${toFixed(sETHPerToken, 4)} sETH, ${toFixed(ETHPerToken, 4)} ETH]`);
    _print(`                 = $${toFixed(sETHPerToken * sETHPrice + ETHPerToken * ETHPrice, 2)} \n`);


    _print("========= STAKING ==========")
    _print(`There are total   : ${totalUniv1SethEthTokenSupply} UNI-V1 (sETH) given out by Uniswap.`);
    _print(`There are total   : ${totalStakedUniv1SethEthTokenAmount} UNI-V1 (sETH) staked in Synthetix's pool. \n`);
    _print(`You are staking   : ${yourStakedUniv1Amount} UNI-V1 (sETH) (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    _print(`                  = [${toFixed(yourStakedUniv1Amount * sETHPerToken, 4)} sETH, ${toFixed(yourStakedUniv1Amount * ETHPerToken, 4)} ETH]`);
    _print(`                  = $${toFixed(Univ1SethEthPricePerToken * yourStakedUniv1Amount, 2)}\n`);

    _print("======== SNX REWARDS =======")
    _print(`Claimable Rewards : ${earnedSNX} SNX`);
    _print(`                  = $${toFixed(earnedSNX * SNXPrice, 2)}\n`)

    _print(`Weekly estimate   : ${rewardPerToken * yourStakedUniv1Amount} SNX (out of total ${weekly_reward} SNX)`)
    _print(`                  = $${toFixed((rewardPerToken * yourStakedUniv1Amount) * SNXPrice , 2)}`)
    const SNXWeeklyROI = rewardPerToken * SNXPrice * 100 / Univ1SethEthPricePerToken;
    _print(`Weekly ROI        : ${toFixed(SNXWeeklyROI, 4)}%`)
    _print(`APR (Unstable)    : ${toFixed(SNXWeeklyROI * 52, 4)}%`)

    hideLoading();

}