$(function () {
  consoleInit();
  start(main);
});

async function main() {

  const App = await init_ethers();

  _print(`Initialized ${App.YOUR_ADDRESS}`);
  _print("Reading smart contracts...");

  const GOVREW_STAKING_POOL = new ethers.Contract(YFL_GOVREW_ADDR, Y_STAKING_POOL_ABI, App.provider);
  const YFL_TOKEN = new ethers.Contract(YFL_TOKEN_ADDR, ERC20_ABI, App.provider);
  const WYFL_TOKEN = new ethers.Contract(YFL_WRAPPER_ADDR, ERC20_ABI, App.provider);
  const YFL_LINK_BALANCER_POOL = new ethers.Contract(YFL_LINK_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);

  const stakedWYFLAmount = await GOVREW_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
  const earnedYFL = await GOVREW_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
  const totalSupply = await YFL_TOKEN.totalSupply() / 1e18;
  const totalStakedWYFLAmount = await WYFL_TOKEN.balanceOf(YFL_GOVREW_ADDR) / 1e18;

  // Find out reward rate
  const weeklyReward = await get_synth_weekly_rewards(GOVREW_STAKING_POOL);
  const nextHalving = await getPeriodFinishForReward(GOVREW_STAKING_POOL);
  const rewardPerToken = weeklyReward / totalStakedWYFLAmount;

  _print("Finished reading smart contracts... Looking up prices... \n")

  // Look up prices
  const prices = await lookUpPrices(["chainlink"]);
  const LINKPrice = prices["chainlink"].usd;
  const YFLPrice = (await YFL_LINK_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR, YFL_TOKEN_ADDR) / 1e18) * LINKPrice;

  // Finished. Start printing

  _print("========== PRICES ==========")
  _print(`1 YFL   = $${YFLPrice}`);

  _print("========== STAKING =========")
  _print(`There are total   : ${totalSupply} YFL issued.`);
  _print(`There are total   : ${totalStakedWYFLAmount} wYFL staked in YFL's Gov Rewards pool.`);
  _print(`                  = ${toDollar(totalStakedWYFLAmount * YFLPrice)}\n`);
  _print(`You are staking   : ${stakedWYFLAmount} wYFL (${toFixed(stakedWYFLAmount * 100 / totalStakedWYFLAmount, 3)}% of the pool)`);
  _print(`                  = ${toDollar(stakedWYFLAmount * YFLPrice)}\n`);

  // REWARDS
  _print("======== YFL REWARDS ========")
  _print(`Claimable Rewards : ${toFixed(earnedYFL, 4)} YFL = $${toFixed(earnedYFL * YFLPrice, 2)}`);
  const YFLWeeklyEstimate = rewardPerToken * stakedWYFLAmount;


  _print(`Hourly estimate   : ${toFixed(YFLWeeklyEstimate / (24 * 7), 4)} YFL = ${toDollar((YFLWeeklyEstimate / (24 * 7)) * YFLPrice)} (out of total ${toFixed(weeklyReward / (7 * 24), 2)} YFL)`)
  _print(`Daily estimate    : ${toFixed(YFLWeeklyEstimate / 7, 2)} YFL = ${toDollar((YFLWeeklyEstimate / 7) * YFLPrice)} (out of total ${toFixed(weeklyReward / 7, 2)} YFL)`)
  _print(`Weekly estimate   : ${toFixed(YFLWeeklyEstimate, 2)} YFL = ${toDollar(YFLWeeklyEstimate * YFLPrice)} (out of total ${weeklyReward} YFL)`)
  const WeeklyROI = (rewardPerToken * YFLPrice) * 100 / (YFLPrice);

  _print(`\nHourly ROI in USD : ${toFixed((WeeklyROI / 7) / 24, 4)}%`)
  _print(`Daily ROI in USD  : ${toFixed(WeeklyROI / 7, 4)}%`)
  _print(`Weekly ROI in USD : ${toFixed(WeeklyROI, 4)}%`)
  _print(`APY (unstable)    : ${toFixed(WeeklyROI * 52, 4)}% \n`)

  const timeTilHalving = nextHalving - (Date.now() / 1000);

  _print(`Minting ceases    : in ${forHumans(timeTilHalving)} \n`)

  hideLoading();
}