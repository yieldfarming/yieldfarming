$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const MUSD_MTA_BALANCER_POOL = new ethers.Contract(MUSD_MTA_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const MUSD_MTA_BPT_TOKEN_CONTRACT = new ethers.Contract(MUSD_MTA_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const totalBPTAmount = await MUSD_MTA_BALANCER_POOL.totalSupply() / 1e18;
    const yourBPTAmount = await MUSD_MTA_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const totalMTAAmount = await MUSD_MTA_BALANCER_POOL.getBalance(MTA_TOKEN_ADDR) / 1e18;
    const totalMUSDAmount = await MUSD_MTA_BALANCER_POOL.getBalance(MUSD_TOKEN_ADDR) / 1e18;

    const MTAPerBPT = totalMTAAmount / totalBPTAmount;
    const MUSDPerBPT = totalMUSDAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = 50000;
    const MTARewardPerBPT = weekly_reward / (totalBPTAmount - 100);

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["musd", "meta"]);
    const MTAPrice = prices["meta"].usd;
    const MUSDPrice = prices["musd"].usd;

    const BPTPrice = MTAPerBPT * MTAPrice + MUSDPerBPT * MUSDPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 MTA  = $${MTAPrice}`);
    _print(`1 mUSD = $${MUSDPrice}\n`);
    _print(`1 BPT  = [${MTAPerBPT} MTA, ${MUSDPerBPT} mUSD]`);
    _print(`       = ${toDollar(BPTPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by mUSD-MTA Balancer Pool.`);
    _print(`                  = ${toDollar(totalBPTAmount * BPTPrice)}\n`);
    _print(`You are holding   : ${yourBPTAmount} BPT (${toFixed(yourBPTAmount * 100 / totalBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${MTAPerBPT * yourBPTAmount} MTA, ${MUSDPerBPT * yourBPTAmount} mUSD]`);
    _print(`                  = ${toDollar(yourBPTAmount * BPTPrice)}\n`);

    // MTA REWARDS
    _print("======== MTA REWARDS ========")
    _print("** Initial seeding of this pool (100 BPT) will not be considered for the MTA rewards.")
    _print("** Therefore total eligible BPTs are total supply - 100 .\n")
    _print(`Weekly estimate   : ${toFixed(MTARewardPerBPT * yourBPTAmount, 2)} MTA = ${toDollar(MTARewardPerBPT * yourBPTAmount * MTAPrice)} (out of total ${weekly_reward} MTA)`)
    const YFIWeeklyROI = (MTARewardPerBPT * MTAPrice) * 100 / (BPTPrice);
    _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
    _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

    // BAL REWARDS
    _print("======== BAL REWARDS ========")
    _print_href(`Check http://www.predictions.exchange/balancer/ for accurate %`, "https://www.predictions.exchange/balancer/")

    hideLoading();

}