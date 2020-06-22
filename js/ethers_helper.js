async function init_ethers() {
    const App = {};

    const ETHEREUM_NODE_URL = "aHR0cHM6Ly9tYWlubmV0LmluZnVyYS5pby92My9mN2Q1YjkwMzY3MzY0YmFkYWNhZDI5Njg5OWYyMTMxYQ==";

    let isMetaMaskInstalled = true;

    // Modern dapp browsers...
    if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
            // Request account access
            await window.ethereum.enable();
        } catch (error) {
            // User denied account access...
            console.error("User denied account access")
        }
        App.provider = new ethers.providers.Web3Provider(window.ethereum);
    }
    // Legacy dapp browsers...
    else if (window.web3) {
        App.provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    }
    // If no injected web3 instance is detected, fall back to backup node
    else {
        App.provider = new ethers.providers.JsonRpcProvider(atob(ETHEREUM_NODE_URL));
        isMetaMaskInstalled = false;
        console.log("You don't have MetaMask installed! Falling back to backup node...\n (will likely to fail. Please install MetaMask extension).\n")
        sleep(10);
    }

    App.YOUR_ADDRESS = getUrlParameter("addr");

    // Cloud not load URL parameter
    if (!App.YOUR_ADDRESS) {
        if (!isMetaMaskInstalled) {

            if (localStorage.hasOwnProperty('addr')) {
                App.YOUR_ADDRESS = localStorage.getItem('addr');
            } else {
                App.YOUR_ADDRESS = window.prompt("Enter your eth address.");
            }

        } else {
            let accounts = await App.provider.listAccounts();
            App.YOUR_ADDRESS = accounts[0];
        }
    }

    if (!App.YOUR_ADDRESS || !ethers.utils.isAddress(App.YOUR_ADDRESS)) {
        throw "Could not initialize your address. Make sure your address is checksum valid.";
    }

    localStorage.setItem('addr', App.YOUR_ADDRESS);
    return App;
}

const getUrlParameter = function(sParam) {
    let sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

const toFixed = function(num, fixed) {
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
};


const start = function (f) {
    f().catch((e)=> {
        console.log(e);
        console.error(e);
        console.log("Oops something went wrong. Try refreshing the page.")
    });
};

const consoleInit = function() {
    const logger = document.getElementById('log');
    console.log = function () {
        for (let i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] == 'object') {
                logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
            } else {
                logger.innerHTML += arguments[i] + '<br />';
            }
        }
    }
};

const sleep = function(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
};

const lookUpPrices = async function(id_array) {
    let ids = id_array.join("%2C");
    return $.ajax({
        url: "https://api.coingecko.com/api/v3/simple/price?ids=" + ids + "&vs_currencies=usd",
        type: 'GET'
    });
};

const getBALEarnings = async function(addr) {

    const bal_earnings = [];

    for (let i = 0; i < BAL_DISTRIBUTION_WEEK ; i++) {
        if (i === 0) {
            bal_earnings.push(null);
            continue;
        }

        const data = await $.getJSON(`../js/bal_rewards/week${i + 1}.json`);
        const earning = parseFloat(data[addr.toLowerCase()]);

        if (earning) {
            bal_earnings.push(earning);
        } else {
            bal_earnings.push(0);
        }
    }

    return bal_earnings;
}