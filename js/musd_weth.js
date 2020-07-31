$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const MUSD_WETH_BALANCER_POOL = new ethers.Contract(MUSD_WETH_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const MUSD_WETH_BPT_TOKEN_CONTRACT = new ethers.Contract(MUSD_WETH_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const totalBPTAmount = await MUSD_WETH_BALANCER_POOL.totalSupply() / 1e18;
    const yourBPTAmount = await MUSD_WETH_BPT_TOKEN_CONTRACT.balanceOf(App.YOUR_ADDRESS) / 1e18;

    const totalWETHAmount = await MUSD_WETH_BALANCER_POOL.getBalance(WETH_TOKEN_ADDR) / 1e18;
    const totalMUSDAmount = await MUSD_WETH_BALANCER_POOL.getBalance(MUSD_TOKEN_ADDR) / 1e18;

    const WETHPerBPT = totalWETHAmount / totalBPTAmount;
    const MUSDPerBPT = totalMUSDAmount / totalBPTAmount;

    // Find out reward rate
    const weekly_reward = 50000;
    const MTARewardPerBPT = weekly_reward / totalBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["musd", "meta", "weth"]);
    const MTAPrice = prices["meta"].usd;
    const MUSDPrice = prices["musd"].usd;
    const WETHPrice = prices["weth"].usd;

    const BPTPrice = WETHPerBPT * WETHPrice + MUSDPerBPT * MUSDPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 MTA  = $${MTAPrice}`);
    _print(`1 mUSD = $${MUSDPrice}`);
    _print(`1 WETH = $${WETHPrice}\n`);
    _print(`1 BPT  = [${MUSDPerBPT} mUSD, ${WETHPerBPT} WETH]`);
    _print(`       = ${toDollar(BPTPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by mUSD-WETH Balancer Pool.`);
    _print(`                  = ${toDollar(totalBPTAmount * BPTPrice)}\n`);
    _print(`You are holding   : ${yourBPTAmount} BPT (${toFixed(yourBPTAmount * 100 / totalBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${WETHPerBPT * yourBPTAmount} WETH, ${MUSDPerBPT * yourBPTAmount} mUSD]`);
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