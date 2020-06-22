$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    console.log(`Initialized ${App.YOUR_ADDRESS}`);
    console.log("Reading smart contracts...");

    const SYNTH_UNIV2_SXAU_USDC_STAKING_POOL = new ethers.Contract(SYNTH_UNIV2_SXAU_STAKING_POOL_ADDR, SYNTH_UNIV2_SXAU_STAKING_POOL_ABI, App.provider);
    const UNISWAPV2_SXAU_USDC_POOL = new ethers.Contract(UNISWAP_SXAU_USDC_POOL_ADDR, UNISWAP_SXAU_USDC_POOL_ABI, App.provider);
    const SXAU_CONTRACT = new ethers.Contract(SXAU_TOKEN_ADDR, ERC20_ABI, App.provider);
    const USDC_CONTRACT = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, App.provider);

    // SYNTH Staking Pool
    const yourStakedUniv2Amount = await SYNTH_UNIV2_SXAU_USDC_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedSNX = await SYNTH_UNIV2_SXAU_USDC_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;

    // Uniswap V2 sXAU-USDC Pool
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

    console.log("Finished reading smart contracts... Looking up prices... \n")

    // CoinGecko price lookup
    const prices = await lookUpPrices(["havven", "sxau", "usd-coin"]);

    const SNXPrice = prices.havven.usd;
    const SXAUPrice = prices.sxau.usd;
    const USDCPrice = prices["usd-coin"].usd;

    const Univ2SXAUUSDCTokenPrice = toFixed(SXAUPerToken * SXAUPrice + USDCPerToken * USDCPrice, 2);

    console.log("========== PRICES ==========");
    console.log(`1 SNX                = $${SNXPrice}\n`);

    console.log(`1 sXAU               = $${SXAUPrice}`);
    console.log(`1 USDC               = $${USDCPrice}`);
    console.log(`1 UNI-V2 (sXAU/USDC) = [${toFixed(SXAUPerToken, 4)} sXAU, ${toFixed(USDCPerToken, 4)} USDC]`);
    console.log(`                     = $${toFixed(SXAUPerToken * SXAUPrice + USDCPrice * USDCPrice, 2)} \n`);

    console.log("========= STAKING ==========");
    console.log(`There are total   : ${totalUniv2SXAUUSDCTokenSupply} UNI-V2 (sXAU/USDC) given out by Uniswap.`);
    console.log(`There are total   : ${totalStakedUniv2SXAUUSDCTokenAmount} UNI-V2 (sXAU/USDC) staked in Synthetix's pool. \n`);
    console.log(`You are staking   : ${yourStakedUniv2Amount} UNI-V2 (sXAU/USDC) (${toFixed(stakingPoolPercentage, 5)}% of the pool)`);
    console.log(`                  = [${toFixed(yourStakedUniv2Amount * SXAUPerToken, 4)} sXAU, ${toFixed(yourStakedUniv2Amount * USDCPerToken, 4)} USDC]`);
    console.log(`                  = $${toFixed(Univ2SXAUUSDCTokenPrice * yourStakedUniv2Amount, 2)}\n`);

    console.log("======== SNX REWARDS =======")
    console.log(`Claimable Rewards : ${earnedSNX} SNX`);
    console.log(`                  = $${toFixed(earnedSNX * SNXPrice, 2)}\n`)

    console.log(`Weekly estimate   : ${rewardPerToken * yourStakedUniv2Amount} SNX (out of total ${weekly_reward} SNX)`)
    console.log(`                  = $${toFixed((rewardPerToken * yourStakedUniv2Amount) * SNXPrice , 2)}`)
    console.log(`Weekly ROI        : ${toFixed(rewardPerToken * SNXPrice * 100 / Univ2SXAUUSDCTokenPrice, 4)}%\n`)
}