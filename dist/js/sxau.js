$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const SYNTH_UNIV2_SXAU_USDC_STAKING_POOL = new ethers.Contract(SYNTH_UNIV2_SXAU_STAKING_POOL_ADDR, SYNTH_UNIV2_SXAU_STAKING_POOL_ABI, App.provider);
    const UNISWAPV2_SXAU_USDC_POOL = new ethers.Contract(UNISWAP_SXAU_USDC_POOL_ADDR, UNISWAP_SXAU_USDC_POOL_ABI, App.provider);
    const SXAU_CONTRACT = new ethers.Contract(SXAU_TOKEN_ADDR, ERC20_ABI, App.provider);
    const USDC_CONTRACT = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, App.provider);

    // SYNTH Staking Pool
    const yourStakedUniv2Amount = await SYNTH_UNIV2_SXAU_USDC_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_UNIV2_SXAU_USDC_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;

    // Uniswap V2 sXAU-usdc Pool
    const totalUniv2SXAUUSDCTokenSupply = await UNISWAPV2_SXAU_USDC_POOL.totalSupply() / 1e18;
    const totalStakedUniv2SXAUUSDCTokenAmount = await UNISWAPV2_SXAU_USDC_POOL.balanceOf(SYNTH_UNIV2_SXAU_STAKING_POOL_ADDR) / 1e18;
    const stakingPoolPercentage = 100 * yourStakedUniv2Amount / totalStakedUniv2SXAUUSDCTokenAmount;

    const totalSXAUAmount = await SXAU_CONTRACT.balanceOf(UNISWAP_SXAU_USDC_POOL_ADDR) / 1e18;
    const totalUSDCAmount = await USDC_CONTRACT.balanceOf(UNISWAP_SXAU_USDC_POOL_ADDR) / 1e6;

    const SXAUPerToken = totalSXAUAmount / totalUniv2SXAUUSDCTokenSupply;
    const USDCPerToken = totalUSDCAmount / totalUniv2SXAUUSDCTokenSupply;

    // Find out reward rate
    const weekly_reward = await get_synth_weekly_rewards(SYNTH_UNIV2_SXAU_USDC_STAKING_POOL);
    const rewardPerToken = weekly_reward / totalStakedUniv2SXAUUSDCTokenAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "sxau", "usd-coin"]);

    const SNXPrice = prices.havven.usd;
    const SXAUPrice = prices.sxau.usd;
    const USDCPrice = prices["usd-coin"].usd;

    const Univ2SXAUUSDCTokenPrice = toFixed(SXAUPerToken * SXAUPrice + USDCPerToken * USDCPrice, 2);

    _print("========== PRICES ==========");
    _print(`1 SNX                = $${SNXPrice}\n`);

    _print(`1 sXAU               = $${SXAUPrice}`);
    _print(`1 USDC               = $${USDCPrice}`);
    _print(`1 UNI-V2 (sXAU/USDC) = [${toFixed(SXAUPerToken, 4)} sXAU, ${toFixed(USDCPerToken, 4)} USDC]`);
    _print(`                     = $${toFixed(SXAUPerToken * SXAUPrice + USDCPrice * USDCPrice, 2)} \n`);

    _print("========= STAKING ==========");
    _print(`There are total   : ${totalUniv2SXAUUSDCTokenSupply} UNI-V2 (sXAU/USDC) given out by Uniswap.`);
    _print(`There are total   : ${totalStakedUniv2SXAUUSDCTokenAmount} UNI-V2 (sXAU/USDC) staked in Synthetix's pool. \n`);
    _print(`You are staking   : ${yourStakedUniv2Amount} UNI-V2 (sXAU/USDC) (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    _print(`                  = [${toFixed(yourStakedUniv2Amount * SXAUPerToken, 4)} sXAU, ${toFixed(yourStakedUniv2Amount * USDCPerToken, 4)} USDC]`);
    _print(`                  = $${toFixed(Univ2SXAUUSDCTokenPrice * yourStakedUniv2Amount, 2)}\n`);

    _print("======== SNX REWARDS =======")
    _print(`Claimable Rewards : ${earnedSNX} SNX`);
    _print(`                  = $${toFixed(earnedSNX * SNXPrice, 2)}\n`)

    _print(`Weekly estimate   : ${rewardPerToken * yourStakedUniv2Amount} SNX (out of total ${weekly_reward} SNX)`)
    _print(`                  = $${toFixed((rewardPerToken * yourStakedUniv2Amount) * SNXPrice , 2)}`)
    const SNXWeeklyROI = rewardPerToken * SNXPrice * 100 / Univ2SXAUUSDCTokenPrice;
    _print(`Weekly ROI in USD : ${toFixed(SNXWeeklyROI, 4)}%`)
    _print(`APR (unstable)    : ${toFixed(SNXWeeklyROI * 52, 4)}% \n`)

    hideLoading();

}