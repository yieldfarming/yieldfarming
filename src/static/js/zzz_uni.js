$(function() {
  consoleInit();
  start(main);
});

async function main() {

  const App = await init_ethers();

  _print(`Initialized ${App.YOUR_ADDRESS}`);
  _print("Reading smart contracts...");

  const Y_STAKING_POOL = new ethers.Contract(ZZZ_POOL_B_ADDRESS, Y_STAKING_POOL_ABI, App.provider);
  const Y_TOKEN = new ethers.Contract(ZZZ_Token_ADDRESS, ERC20_ABI, App.provider);

  const ZZZ_ETH_UNI_POOL = new ethers.Contract(ZZZ_WETH_TOKEN_ADDRESS, UNISWAP_SETH_ETH_POOL_ABI, App.provider);
  const WETH_TOKEN = new ethers.Contract(WETH_TOKEN_ADDR, ERC20_ABI, App.provider);

  // const totalZZZInUNI = await Y_TOKEN.balanceOf(ZZZ_WETH_TOKEN_ADDRESS) / 1e18;
  const totalWethInUNI = await WETH_TOKEN.balanceOf(ZZZ_WETH_TOKEN_ADDRESS) / 1e18;
  const totalUniSupply = await ZZZ_ETH_UNI_POOL.totalSupply() / 1e18;
  const prices = await lookUpPrices(["weth"])
  const ethPrice = prices.weth.usd
  const totalpoolValue = totalWethInUNI * ethPrice * 2;
  const UNIPrice = totalpoolValue / totalUniSupply;

  const stakedYAmount = await Y_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
  const earnedYFI = await Y_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
  const totalStakedYAmount = await Y_TOKEN.balanceOf(ZZZ_POOL_B_ADDRESS) / 1e18;

  // Find out reward rate
  const weekly_reward = await get_synth_weekly_rewards(Y_STAKING_POOL);

  // const weekly_reward = 0;

  const rewardPerToken = weekly_reward / totalStakedYAmount;

  // Find out underlying assets of Y
  // const ZZZPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;

  _print("Finished reading smart contracts... Looking up prices... \n")

  // Look up prices
  // const prices = await lookUpPrices(["yearn-finance"]);
  // const YFIPrice = prices["yearn-finance"].usd;
  const {'zzz-finance' : ReturnedPrice } = await lookUpPrices(["zzz-finance"])
  const ZZZPrice = ReturnedPrice.usd;
  // const UNIPrice=799

  // Finished. Start printing

  _print("========== PRICES ==========")
  _print(`1 ZZZ  = $${ZZZPrice}`);
  _print(`1 UNI  = $${UNIPrice}\n`);

  _print("========== STAKING =========")
  _print(`There are total   : ${500} UNI issued by ZZZ-UNI`);
  _print(`There are total   : ${totalStakedYAmount} ZZZ staked in ZZZ's ZZZ/UNI staking pool.`);
  _print(`                  = ${toDollar(totalStakedYAmount * ZZZPrice)}\n`);
  _print(`You are staking   : ${stakedYAmount} ZZZ (${toFixed(stakedYAmount * 100 / totalStakedYAmount, 3)}% of the pool)`);
  _print(`                  = ${toDollar(stakedYAmount * ZZZPrice)}\n`);

  // YFII REWARDS
  _print("======== UNI REWARDS ========")
  // _print(" (Temporarily paused until further emission model is voted by the community) ");
  _print(`Claimable Rewards : ${toFixed(earnedYFI, 4)} UNI = $${toFixed(earnedYFI * UNIPrice, 2)}`);
  _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedYAmount, 2)} UNI = ${toDollar(rewardPerToken * stakedYAmount * UNIPrice)} (out of total ${weekly_reward} UNI)`)
  const YFIWeeklyROI = (rewardPerToken * UNIPrice) * 100 / (ZZZPrice);
  _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
  _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

  hideLoading();

}
