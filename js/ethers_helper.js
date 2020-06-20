async function init_ethers() {
    const App = {};

    const ETHEREUM_NODE_URL = 'https://eth-mainnet.zerion.io/';

    let askForAddress = false;

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
    // If no injected web3 instance is detected, fall back to Ganache
    else {
        App.provider = new ethers.providers.JsonRpcProvider(ETHEREUM_NODE_URL);
        askForAddress = true;
    }

    App.YOUR_ADDRESS = getUrlParameter("addr");

    if (!App.YOUR_ADDRESS) {
        if (askForAddress) {
            App.YOUR_ADDRESS = window.prompt("Enter your eth address.");
        } else {
            let accounts = await App.provider.listAccounts();
            App.YOUR_ADDRESS = accounts[0];
        }
    }

    if (!App.YOUR_ADDRESS) {
        throw "Could not initialize your address.";
    }

    return App
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