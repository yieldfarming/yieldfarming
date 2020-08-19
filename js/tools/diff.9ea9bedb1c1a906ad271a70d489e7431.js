/*!
* YieldFarming
* Boilerplate for a Static website using EJS and SASS
* https://yieldfarming.info
* @author Jongseung Lim -- https://yieldfarming.info
* Copyright 2020. MIT Licensed.
*/

$(function() {
    start(main);
});

const a = document.getElementById("a");
const b = document.getElementById("b");

async function loadContractSourceCode(address, index) {
    const sourceCode = (await getSourceCode(address)).result[0]["SourceCode"];

    if (parseInt(index) === 0) {
        $(`#a`).text(sourceCode);
    } else {
        $(`#b`).text(sourceCode);
    }
    changed();
}

function changed() {
    var diff = Diff["diffLines"](a.textContent, b.textContent);
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < diff.length; i++) {
        if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
            var swap = diff[i];
            diff[i] = diff[i + 1];
            diff[i + 1] = swap;
        }
        var node;
        if (diff[i].removed) {
            node = document.createElement("del");
            node.appendChild(document.createTextNode(diff[i].value));
        } else if (diff[i].added) {
            node = document.createElement("ins");
            node.appendChild(document.createTextNode(diff[i].value));
        } else {
            node = document.createTextNode(diff[i].value);
        }
        fragment.appendChild(node);
    }
    result.textContent = "";
    result.appendChild(fragment);
}

async function main() {

    $(`#diff_contractInput1`).val(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR);
    await loadContractSourceCode(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR, 0);

    var result = document.getElementById("result");

    window.onload = function () {
        onDiffTypeChange(document.querySelector('#settings [name="diff_type"]:checked'));
        changed();
    };
    a.onpaste = a.onchange = b.onpaste = b.onchange = changed;
    if ("oninput" in a) {
        a.oninput = b.oninput = changed;
    } else {
        a.onkeyup = b.onkeyup = changed;
    }
    function onDiffTypeChange(radio) {
        window.diffType = radio.value;
        document.title = "Diff " + radio.value.slice(4);
    }
    var radio = document.getElementsByName("diff_type");
    for (var i = 0; i < radio.length; i++) {
        radio[i].onchange = function (e) {
            onDiffTypeChange(e.target);
            changed();
        };
    }
    changed();

    $('#diff_contractInput1').keypress(async function (e) {
        if (e.which === 13) {
            await loadContractSourceCode($('#diff_contractInput1').val(), 0);
            return false;
        }
    });

    $('#diff_contractInput2').keypress(async function (e) {
        if (e.which === 13) {
            await loadContractSourceCode($('#diff_contractInput2').val(), 1);
            return false;
        }
    });

    $(`#diff_loadOriginal`).click(async function () {
        $(`#diff_contractInput1`).val(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR);
        await loadContractSourceCode(SYNTH_USDC_SNX_BPT_STAKING_POOL_ADDR, 0);
        return false;
    });

    $(`#diff_loadHalving`).click(async function () {
        $(`#diff_contractInput1`).val(YFFI_POOL_1_ADDR);
        await loadContractSourceCode(YFFI_POOL_1_ADDR, 0);
        return false;
    });

    $(`#diff_loadYAM`).click(async function () {
        $(`#diff_contractInput1`).val(YAM_WETH_REWARD_POOL_ADDR);
        await loadContractSourceCode(YAM_WETH_REWARD_POOL_ADDR, 0);
        return false;
    });
}

