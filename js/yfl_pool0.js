$(function () {
  consoleInit();
  start(main);
});

async function main() {

  const App = await init_ethers();

  _print(`Initialized ${App.YOUR_ADDRESS}`);
  _print("Reading smart contracts...");

  const LINK_STAKING_POOL = new ethers.Contract(YFL_POOL_0_ADDR, Y_STAKING_POOL_ABI, App.provider);
  const LINK_TOKEN = new ethers.Contract(LINK_TOKEN_ADDR, ERC20_ABI, App.provider);
  const YFL_LINK_BALANCER_POOL = new ethers.Contract(YFL_LINK_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);

  const stakedLINKAmount = await LINK_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
  const earnedYFL = await LINK_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
  const totalSupplyLINK = await LINK_TOKEN.totalSupply() / 1e18;
  const totalStakedLINKAmount = await LINK_TOKEN.balanceOf(YFL_POOL_0_ADDR) / 1e18;

  // Find out reward rate
  const weeklyReward = await get_synth_weekly_rewards(LINK_STAKING_POOL);
  const nextHalving = await getPeriodFinishForReward(LINK_STAKING_POOL);
  const rewardPerToken = weeklyReward / totalStakedLINKAmount;

  _print("Finished reading smart contracts... Looking up prices... \n")

  // Look up prices
  const prices = await lookUpPrices(["chainlink"]);
  const LINKPrice = prices["chainlink"].usd;
  const YFLPrice = (await YFL_LINK_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR, YFL_TOKEN_ADDR) / 1e18) * LINKPrice;

  // Finished. Start printing

  _print("========== PRICES ==========")
  _print(`1 YFL   = $${YFLPrice}`);
  _print(`1 LINK  = $${LINKPrice}\n`);

  _print("========== STAKING =========")
  _print(`There are total   : ${totalSupplyLINK} LINK issued.`);
  _print(`There are total   : ${totalStakedLINKAmount} LINK staked in YFL's LINK staking pool.`);
  _print(`                  = ${toDollar(totalStakedLINKAmount * LINKPrice)}\n`);
  _print(`You are staking   : ${stakedLINKAmount} LINK (${toFixed(stakedLINKAmount * 100 / totalStakedLINKAmount, 3)}% of the pool)`);
  _print(`                  = ${toDollar(stakedLINKAmount * LINKPrice)}\n`);

  // REWARDS
  _print("======== YFL REWARDS ========")
  // _print(" (Temporarily paused until further emission model is voted by the community) ");
  _print(`Claimable Rewards : ${toFixed(earnedYFL, 4)} YFL = $${toFixed(earnedYFL * YFLPrice, 2)}`);
  const YFLWeeklyEstimate = rewardPerToken * stakedLINKAmount;


  _print(`Hourly estimate   : ${toFixed(YFLWeeklyEstimate / (24 * 7), 4)} YFL = ${toDollar((YFLWeeklyEstimate / (24 * 7)) * YFLPrice)} (out of total ${toFixed(weeklyReward / (7 * 24), 2)} YFL)`)
  _print(`Daily estimate    : ${toFixed(YFLWeeklyEstimate / 7, 2)} YFL = ${toDollar((YFLWeeklyEstimate / 7) * YFLPrice)} (out of total ${toFixed(weeklyReward / 7, 2)} YFL)`)
  _print(`Weekly estimate   : ${toFixed(YFLWeeklyEstimate, 2)} YFL = ${toDollar(YFLWeeklyEstimate * YFLPrice)} (out of total ${weeklyReward} YFL)`)
  const WeeklyROI = (rewardPerToken * YFLPrice) * 100 / (LINKPrice);

  _print(`\nHourly ROI in USD : ${toFixed((WeeklyROI / 7) / 24, 4)}%`)
  _print(`Daily ROI in USD  : ${toFixed(WeeklyROI / 7, 4)}%`)
  _print(`Weekly ROI in USD : ${toFixed(WeeklyROI, 4)}%`)
  _print(`APY (unstable)    : ${toFixed(WeeklyROI * 52, 4)}% \n`)

  const timeTilHalving = nextHalving - (Date.now() / 1000);

  _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)

  hideLoading();

}