const hre = require("hardhat");
const { ethers } = hre;
const Web3 = require("web3");
const dotenv = require("dotenv");
const axios = require("axios");
const { BigNumber } = require("bigNumber.js");
const fs = require("fs");
dotenv.config();

var web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://polygon-mainnet.g.alchemy.com/v2/I9zTx8c8e5mxGrGaSzAF29KOjOmEckA2"
  )
);

const uniswapv3 = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const uniswapAbi = require("./constants/uniswapv3.json");

let uniswapContract = new web3.eth.Contract(uniswapAbi, uniswapv3);
let theGraphUrl =
  "https://api.thegraph.com/subgraphs/name/croooook/dsa-accounts";

const decrease = [];
const increase = {};
const dsa_accounts = new Map();

async function main() {
  let thresh = ``,
    result;
  const latest = await web3.eth.getBlockNumber();

  while (true) {
    result = await axios.post(theGraphUrl, {
      query:
        `
            {
                logAccountCreateds(first: 1000, where: {id_gt:"` +
        thresh +
        `"}){
                    id
                    account
                    owner
                  }
            }
            `,
    });

    if (Object.values(result.data.data.logAccountCreateds).length === 0) break;
    let datas = Object.values(result.data.data.logAccountCreateds);
    for (let data of datas) {
      dsa_accounts.set(String(data.account), 1);
    }
    thresh =
      result.data.data.logAccountCreateds[
        Object.values(result.data.data.logAccountCreateds).length - 1
      ].id;
  }

  const dsa = [...dsa_accounts.keys()].join();
  fs.writeFileSync("dsa.txt", dsa, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    //file written successfully
  });

  // let dsa = fs.readFileSync("dsa.txt", "utf-8");
  // dsa = dsa.split(",");
  // let dsa_accounts = new Map();
  // for (let x of dsa) dsa_accounts.set(x.toLowerCase(), true);

  for (let i = 25657968; i < latest; i += 3000) {
    await uniswapContract.getPastEvents(
      "IncreaseLiquidity",
      {
        fromBlock: i,
        toBlock: i + 3000,
      },
      async function (error, events) {
        if (events) {
          for (let event of events) {
            const token = event.returnValues.tokenId;
            try {
              const owner = await uniswapContract.methods.ownerOf(token).call();
              if (dsa_accounts.get(owner.toLowerCase())) {
                increase[event.transactionHash.toLowerCase()] =
                  event.returnValues.tokenId;
              }
            } catch {}
          }
        }
      }
    );
  }
  // console.log([...increase.keys()]);
  for (let i = 25657968; i < latest; i += 3000) {
    await uniswapContract
      .getPastEvents(
        "DecreaseLiquidity",
        {
          fromBlock: i,
          toBlock: i + 3000,
        },
        function (error, events) {
          if (events) {
            for (let event of events) {
              if (
                increase[event.transactionHash.toLowerCase()] &&
                increase[event.transactionHash.toLowerCase()] !=
                  event.returnValues.tokenId
              ) {
                decrease.push({
                  newTokenId: increase[event.transactionHash.toLowerCase()],
                  oldTokenId: event.returnValues.tokenId,
                  transactionHash: event.transactionHash.toLowerCase(),
                });
              }
            }
          }
        }
      )
      .then(function (events) {});
  }

  console.log("final:", decrease);
  console.log("total users that used rebalancing", decrease.length);
}

async function func() {
  await main().then(() => {});
}

func();
