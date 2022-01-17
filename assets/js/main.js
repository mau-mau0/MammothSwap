/** Connect to Moralis server */
const serverUrl = "https://tphexslv0stf.usemoralis.com:2053/server";
const appId = "2HCa3kyoG8hlVtt4Ahi67XNS9D4ZqrOCtCRZTvdV";
Moralis.start({ serverUrl, appId });

/** Add from here down */

let currentSwap = {};
let currentSelect;
let tokens;

async function init() {
    await Moralis.initPlugins()
    await Moralis.enableWeb3();
    await listTokens();
    currentUser = Moralis.User.current();
    if (currentUser) {
        document.getElementById("swap_button").disabled = false; 
    }
}


async function listTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
  });
  tokens = result.tokens;
  let mom = document.getElementById("token_list");
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement("div");
    div.setAttribute("data-address", address);
    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    mom.appendChild(div);
  }
}


function selectToken(address) {
    closeModal();
    console.log(tokens);
    currentSwap[currentSelect] = tokens[address];
    console.log(currentSwap)
    renderInterface();
    getQuote();
}

function renderInterface() {
    if(currentSwap.from) {
        document.getElementById("from_token_img").src = currentSwap.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentSwap.from.symbol;
    }
    if(currentSwap.to) {
        document.getElementById("to_token_img").src = currentSwap.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentSwap.to.symbol;
    }
}
async function login() {
    try {
      currentUser = Moralis.User.current();
      if (!currentUser) {
        currentUser = await Moralis.authenticate();
      }
      document.getElementById("swap_button").disabled = false;
    } catch (error) {
      console.log(error);
    }
  }

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

function openModal(side){
    currentSelect = side;
    document.getElementById("token_modal").style.display = "block";
}
function closeModal(){
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
    if (!currentSwap.from || !currentSwap.to || !document.getElementById("from_amount").value) return;
  
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentSwap.from.decimals);
  
    const quote = await Moralis.Plugins.oneInch.quote({
      chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentSwap.from.address, // The token you want to swap
      toTokenAddress: currentSwap.to.address, // The token you want to receive
      amount: amount,
    });
    console.log(quote);
    document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
    document.getElementById("to_amount").value = Math.round(quote.toTokenAmount / 10 ** quote.toToken.decimals * 1000) / 1000;
    }

async function trySwap() {
    let address = Moralis.User.current().get("ethAddress");
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentSwap.from.decimals);
    if (currentSwap.from.symbol !== "ETH") {
        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
        chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentSwap.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
        amount: amount,
        });
        console.log(allowance);
        if (!allowance) {
        await Moralis.Plugins.oneInch.approve({
            chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
            tokenAddress: currentSwap.from.address, // The token you want to swap
            fromAddress: address, // Your wallet address
        });
        }
    }
    try {
        let receipt = await doSwap(address, amount);
        alert("Swap Complete");
    } catch (error) {
        console.log(error);
    }
}

function doSwap(userAddress, amount) {
    return Moralis.Plugins.oneInch.swap({
      chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentSwap.from.address, // The token you want to swap
      toTokenAddress: currentSwap.to.address, // The token you want to receive
      amount: amount,
      fromAddress: userAddress, // Your wallet address
      slippage: 1,
    });
  }

init();

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").oninput = getQuote;
document.getElementById("swap_button").onclick = trySwap;

