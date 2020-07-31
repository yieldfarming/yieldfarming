$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const MUSD_USDC_BALANCER_POOL = new ethers.Contract(MUSD_USDC_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const MUSD_USDC_BPT_TOKEN_CONTRACT = new ethers.Contract(MUSD_USDC_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const totalBPTAmount = await MUSD_USDC_BALANCER_POOL.totalSupply() / 1e18;
    const yourBPTAmount = await MUSD_USDC_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const totalUSDCAmount = await MUSD_USDC_BALANCER_POOL.getBalance(USDC_ADDRESS) / 1e6;
    const totalMUSDAmount = await MUSD_USDC_BALANCER_POOL.getBalance(MUSD_TOKEN_ADDR) / 1e18;

    const USDCPerBPT = totalUSDCAmount / totalBPTAmount;
    const MUSDPerBPT = totalMUSDAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = 50000;
    const MTARewardPerBPT = weekly_reward / totalBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["musd", "meta", "usd-coin"]);
    const MTAPrice = prices["meta"].usd;
    const MUSDPrice = prices["musd"].usd;
    const USDCPrice = prices["usd-coin"].usd;

    const BPTPrice = USDCPerBPT * USDCPrice + MUSDPerBPT * MUSDPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 MTA  = $${MTAPrice}`);
    _print(`1 MUSD = $${MUSDPrice}`);
    _print(`1 USDC = $${USDCPrice}\n`);
    _print(`1 BPT  = [${MUSDPerBPT} MUSD, ${USDCPerBPT} USDC]`);
    _print(`       = ${toDollar(BPTPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by mUSD-USDC Balancer Pool.`);
    _print(`                  = ${toDollar(totalBPTAmount * BPTPrice)}\n`);
    _print(`You are holding   : ${yourBPTAmount} BPT (${toFixed(yourBPTAmount * 100 / totalBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${USDCPerBPT * yourBPTAmount} USDC, ${MUSDPerBPT * yourBPTAmount} mUSD]`);
    _print(`                  = ${toDollar(yourBPTAmount * BPTPrice)}\n`);

    // MTA REWARDS
    _print("======== MTA REWARDS ========")
    _print(`Weekly estimate   : ${toFixed(MTARewardPerBPT * yourBPTAmount, 2)} MTA = ${toDollar(MTARewardPerBPT * yourBPTAmount * MTAPrice)} (out of total ${weekly_reward} MTA)`)
    const YFIWeeklyROI = (MTARewardPerBPT * MTAPrice) * 100 / (BPTPrice);
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    // BAL REWARDS
    _print("======== BAL REWARDS ========")
    _print_href(`Check http://www.predictions.exchange/balancer/ for accurate %`, "https://www.predictions.exchange/balancer/")

    hideLoading();

}