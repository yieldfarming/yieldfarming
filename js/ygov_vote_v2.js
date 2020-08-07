$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print_href("Ygov voting V1", "https://yieldfarming.info/yearn/vote/old.html");
    _print("");

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_VOTING_POOL = new ethers.Contract(YFI_VOTING_POOL_ADDR, YFI_VOTING_POOL_ABI, App.provider);
    const YFI_TOKEN = new ethers.Contract(YFI_TOKEN_ADDR, ERC20_ABI, App.provider);

    const currentBlockTime = await getBlockTime();
    const currentBlockNumber = await App.provider.getBlockNumber();
    console.log(currentBlockNumber);
    // const currentTotalStakedBPTAmount = await YFI_TOKEN.balanceOf(YGOV_BPT_2_STAKING_POOL_ADDR) / 1e18;

    const proposalCount = await YGOV_VOTING_POOL.proposalCount();
    let proposals = {};

    for(let i = 30; i < proposalCount; i++) {
        proposals[i] = await YGOV_VOTING_POOL.proposals(i);
    }

    // PROPOSALS
    let wasVotingPeriodOver = true;

    _print(``);

    for(let i = 30; i < proposalCount; i++) {


        const proposer = proposals[i][1];
        const forVotes = proposals[i][2] / 1e18;
        const againstVotes = proposals[i][3] / 1e18;
        const startBlock = proposals[i][4];
        const endBlock = proposals[i][5];
        const hash = proposals[i][7];
        const totalVotesAvailable = proposals[i][8];
        const quorum = proposals[i][9];
        const quorumRequired = proposals[i][10];
        const isOnGoing = endBlock > currentBlockNumber ? proposals[i][11] : false;

        const totalVotes = forVotes + againstVotes;
        const timeUntilEndBlock = (endBlock - currentBlockNumber) * currentBlockTime;

        const isQuorumMet = quorum.toNumber() > quorumRequired.toNumber();

        let readableTimeUntilEndBlock;
        let status;

        if (!isOnGoing) {
            const endBlockTimestamp = (await App.provider.getBlock(parseInt(endBlock))).timestamp;
            readableTimeUntilEndBlock = forHumans((Date.now() / 1000) - endBlockTimestamp) + " ago";
        } else {
            readableTimeUntilEndBlock = "in " + forHumans(timeUntilEndBlock);
        }

        const quorumPercentage = toFixed(quorum / 100, 2);

        let _print_status = _print;

        status = "";
        if (!isOnGoing) {
            if (!isQuorumMet) {
                status += `🏳 DECLINED: Quorum percentage (${quorumPercentage}%) was not met.`
            } else {
                if (forVotes > againstVotes) {
                    status += "✅ PASSED"
                } else if (againstVotes > forVotes) {
                    status += "❌ REJECTED"
                } else {
                    status += "⚠️ TIED"
                }
            }
            _print_status = _print_bold;
        } else {
            status = "⌛ ON GOING"
        }

        if (wasVotingPeriodOver && isOnGoing) {
            _print(`\n=============================================================`)
            _print(`==================== ON GOING PROPOSALS =====================`)
            _print(`=============================================================\n\n`)
        }

        _print_bold(`====== PROPOSAL #${i} ======`);

        // const info = await $.ajax({
        //     url: hash,
        //     type: 'GET'
        // });

        //_print(info);

        _print_href(`https://yips.yearn.finance/YIPS/yip-${i}`, `https://yips.yearn.finance/YIPS/yip-${i}`);
        _print("");

        _print_status(`Status              : ${status}\n`);

        let _print_quorum = _print;
        let _print_for = _print;
        let _print_against = _print;

        if (!isOnGoing) {
            if (isQuorumMet) {
                if (forVotes > againstVotes) {
                    _print_for = _print_bold;
                } else if (againstVotes > forVotes) {
                    _print_against = _print_bold;
                }
            } else {
                _print_quorum = _print_bold;
            }
        }

        _print(`Proposed by         : ${proposer}`);
        _print_for(`Total for votes     : ${toFixed(forVotes, 4)} (${toFixed( forVotes * 100 / totalVotes, 2)}%)`);
        _print_against(`Total against votes : ${toFixed(againstVotes, 4)} (${toFixed( againstVotes * 100 / totalVotes, 2)}%)`);
        _print_quorum(`Quorum              : ${quorumPercentage}% ${isQuorumMet ? "✔" : "✗"}`)
        _print(`Start block         : ${startBlock}`);
        _print(`End block           : ${endBlock} (${readableTimeUntilEndBlock})\n`);

        wasVotingPeriodOver = !isOnGoing;
    }

    hideLoading();

}