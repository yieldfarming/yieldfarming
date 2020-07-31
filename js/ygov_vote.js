$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_VOTING_POOL = new ethers.Contract(YGOV_BPT_2_STAKING_POOL_ADDR, YGOV_BPT_2_STAKING_POOL_ABI, App.provider);
    const YFI_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(YFI_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const currentBlockTime = await getBlockTime();
    const currentBlockNumber = await App.provider.getBlockNumber();
    const currentTotalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YGOV_BPT_2_STAKING_POOL_ADDR) / 1e18;

    const proposalCount = await YGOV_VOTING_POOL.proposalCount();
    let proposals = {};

    for(let i = 0; i < proposalCount; i++) {
        proposals[i] = await YGOV_VOTING_POOL.proposals(i);
    }

    // PROPOSALS
    let wasVotingPeriodOver = true;

    _print(``);

    for(let i = 0; i < proposalCount; i++) {


        const proposedBy = proposals[i][1];
        const forVotes = proposals[i][2] / 1e18;
        const againstVotes = proposals[i][3] / 1e18;
        const startBlock = proposals[i][4];
        const endBlock = proposals[i][5];

        const totalVotes = forVotes + againstVotes;
        const timeUntilEndBlock =  (endBlock - currentBlockNumber ) * currentBlockTime;

        let readableTimeUntilEndBlock;
        let totalStakedBPTAmount;
        let status, isQuorumMet, isVotingPeriodOver;

        if (timeUntilEndBlock <= 0) {
            isVotingPeriodOver = true;
            const endBlockTimestamp = (await App.provider.getBlock(parseInt(endBlock))).timestamp;
            readableTimeUntilEndBlock = forHumans((Date.now() / 1000) - endBlockTimestamp) + " ago";
            totalStakedBPTAmount = await YFI_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YGOV_BPT_2_STAKING_POOL_ADDR, {blockTag : parseInt(endBlock)}) / 1e18;
        } else {
            isVotingPeriodOver = false;
            readableTimeUntilEndBlock = "in " + forHumans(timeUntilEndBlock);
            totalStakedBPTAmount = currentTotalStakedBPTAmount;
        }

        const quorumPercentage = toFixed((totalVotes * 100) / totalStakedBPTAmount, 2);
        isQuorumMet = quorumPercentage > 33;

        let _print_status = _print;

        status = "";
        if (isVotingPeriodOver) {
            if (!isQuorumMet) {
                status += "🏳 DECLINED: Quorum percentage (33%) was not met."
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

        if (wasVotingPeriodOver && !isVotingPeriodOver) {
            _print(`\n=============================================================`)
            _print(`==================== ON GOING PROPOSALS =====================`)
            _print(`=============================================================\n\n`)
        }

        _print_bold(`====== PROPOSAL #${i} ======`);

        if (PROPOSAL_DESCRIPTION.hasOwnProperty(i)) {
            _print(PROPOSAL_DESCRIPTION[i])
        } else {
            _print_href("No description yet. Please check gov.yearn.finance for latest update.", "https://gov.yearn.finance/");
            _print("");
        }

        _print_status(`Status              : ${status}\n`);

        let _print_quorum = _print;
        let _print_for = _print;
        let _print_against = _print;

        if (isVotingPeriodOver) {
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

        _print(`Proposed by         : ${proposedBy}`);
        _print_for(`Total for votes     : ${toFixed(forVotes, 4)} (${toFixed( forVotes * 100 / totalVotes, 2)}%)`);
        _print_against(`Total against votes : ${toFixed(againstVotes, 4)} (${toFixed( againstVotes * 100 / totalVotes, 2)}%)`);
        _print_quorum(`Quorum              : ${quorumPercentage}% ${parseFloat(quorumPercentage) > 33 ? "✔" : "𐄂"}`)
        _print(`Start block         : ${startBlock}`);
        _print(`End block           : ${endBlock} (${readableTimeUntilEndBlock})\n`);

        wasVotingPeriodOver = isVotingPeriodOver;
    }

    hideLoading();

}