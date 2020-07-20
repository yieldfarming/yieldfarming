$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YGOV_VOTING_POOL = new ethers.Contract(YGOV_BPT_2_STAKING_POOL_ADDR, YGOV_BPT_2_STAKING_POOL_ABI, App.provider);

    const proposalCount = await YGOV_VOTING_POOL.proposalCount();
    let proposals = {};

    for(let i = 0; i < proposalCount; i++) {
        proposals[i] = await YGOV_VOTING_POOL.proposals(i);
    }

    // PROPOSALS

    _print(``);

    for(let i = 0; i < proposalCount; i++) {
        _print_bold(`====== PROPOSAL #${i} ======`);

        if (PROPOSAL_DESCRIPTION.hasOwnProperty(i)) {
            _print(PROPOSAL_DESCRIPTION[i])
        } else {
            _print("No description yet. Please check @iearnfinance twitter for latest update.\n")
        }

        const forVotes = proposals[i][2] / 1e18;
        const againstVotes = proposals[i][3] / 1e18;

        const totalVotes = forVotes + againstVotes;

        let _print_for = _print;
        let _print_against = _print;

        if (forVotes > againstVotes) {
            _print_for = _print_bold;
        } else if (againstVotes > forVotes) {
            _print_against = _print_bold;
        }

        _print(`Proposed by         : ${proposals[i][1]}`);
        _print_for(`Total for votes     : ${forVotes} (${toFixed( forVotes * 100 / totalVotes, 2)}%)`);
        _print_against(`Total against votes : ${againstVotes} (${toFixed( againstVotes * 100 / totalVotes, 2)}%)`);
        _print(`Start block         : ${proposals[i][4]}`);
        _print(`End block           : ${proposals[i][5]}\n`);
    }
}