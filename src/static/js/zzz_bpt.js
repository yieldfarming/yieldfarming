$(function() {
  consoleInit();
  start(main);
});

async function main() {

  const App = await init_ethers();

  _print(`Initialized ${App.YOUR_ADDRESS}`);
  _print("Reading smart contracts...");

  const Y_STAKING_POOL = new ethers.Contract(ZZZ_POOL_A_ADDRESS, Y_STAKING_POOL_ABI, App.provider);
  const Y_TOKEN = new ethers.Contract(ZZZ_Token_ADDRESS, ERC20_ABI, App.provider);


  const stakedYAmount = await Y_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;
  const earnedYFI = await Y_STAKING_POOL.earned(App.YOUR_ADDRESS) / 1e18;
  const totalStakedYAmount = await Y_TOKEN.balanceOf(ZZZ_POOL_A_ADDRESS) / 1e18;

  // BPT
  const ZZZ_DAI_BALANCER_POOL = new ethers.Contract(ZZZ_DAI_BPT_ADDRESS, BALANCER_POOL_ABI, App.provider);
  const ZZZ_DAI_BPT_TOKEN_CONTRACT = new ethers.Contract(ZZZ_DAI_BPT_ADDRESS, ERC20_ABI, App.provider);
  const BPT_STAKING_POOL = new ethers.Contract(ZZZ_POOL_A_ADDRESS, MSTABLE_REWARDS_POOL_ABI, App.provider);
  const totalBPTAmount = await ZZZ_DAI_BALANCER_POOL.totalSupply() / 1e18;
  const totalStakedBPTAmount = await ZZZ_DAI_BPT_TOKEN_CONTRACT.balanceOf(ZZZ_POOL_A_ADDRESS) / 1e18;
  const yourBPTAmount = await BPT_STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 1e18;

  const totalDAIAmount = await ZZZ_DAI_BALANCER_POOL.getBalance(DAI_TOKEN_ADDR) / 1e18;
  const totalZZZAmount = await ZZZ_DAI_BALANCER_POOL.getBalance(ZZZ_Token_ADDRESS) / 1e18;

  const DAIPerBPT = totalDAIAmount / totalBPTAmount;
  const ZZZPerBPT = totalZZZAmount / totalBPTAmount;
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
  const prices = await lookUpPrices(["dai"]);
  const DAIPrice = prices["dai"].usd;
  // const BPTPrice = (await YFI_DAI_BALANCER_POOL.getSpotPrice(DAI_TOKEN_ADDR,YFII_TOKEN_ADDR) / 1e18) * DAIPrice;
  const {'zzz-finance' : ReturnedPrice } = await lookUpPrices(["zzz-finance"])
  const ZZZPrice = ReturnedPrice.usd;
  const DAIPRice = 1;
  const BPTPrice = DAIPerBPT * DAIPRice + ZZZPerBPT * ZZZPrice;

  // Finished. Start printing

  _print("========== PRICES ==========")
  _print(`1 ZZZ  = $${ZZZPrice}`);
  _print(`1 BPT  = $${BPTPrice}\n`);

  _print("========== STAKING =========")
  _print(`There are total   : ${5000} ZZZ issued by ZZZ-BPT`);
  _print(`There are total   : ${totalStakedBPTAmount} BPT staked in ZZZ's BPT/ZZZ staking pool.`);
  _print(`                  = ${toDollar(yourBPTAmount * BPTPrice)}\n`);
  _print(`You are staking   : ${yourBPTAmount} BPT (${toFixed(stakedYAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
  _print(`                  = ${toDollar(yourBPTAmount * ZZZPrice)}\n`);

  // YFII REWARDS
  _print("======== ZZZ REWARDS ========")
  // _print(" (Temporarily paused until further emission model is voted by the community) ");
  _print(`Claimable Rewards : ${toFixed(earnedYFI, 4)} ZZZ = $${toFixed(earnedYFI * BPTPrice, 2)}`);
  _print(`Weekly estimate   : ${toFixed(rewardPerToken * stakedYAmount, 2)} ZZZ = ${toDollar(rewardPerToken * stakedYAmount * BPTPrice)} (out of total ${weekly_reward} ZZZ)`)
  const YFIWeeklyROI = (rewardPerToken * BPTPrice) * 100 / (ZZZPrice);
  _print(`Weekly ROI in USD : ${toFixed(YFIWeeklyROI, 4)}%`)
  _print(`APY (unstable)    : ${toFixed(YFIWeeklyROI * 52, 4)}% \n`)

  hideLoading();

}
