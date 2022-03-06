const hre = require("hardhat");
const mongo = require("mongodb");
const dotenv = require("dotenv");
const { BigNumber } = require("bigNumber.js");
dotenv.config();

const MongoClient = require("mongodb").MongoClient;
const url = "mongodb+srv://interop.l8vu3.mongodb.net";
const password = process.env.PASSWORD;
const username = process.env.USERNAME;

const connectURL = `mongodb+srv://${username}:${password}@interop.l8vu3.mongodb.net`;
const feeByToken = {
  USDC: "0",
  ETH: "0",
  USDT: "0",
  WBTC: "0",
  DAI: "0",
};

async function main() {
  MongoClient.connect(connectURL, async (err, client) => {
    if (err) throw err;
    const interop = client.db("interop");

    interop
      .collection("transactions")
      .find({})
      .toArray((err, res) => {
        if (err) throw err;
        for (let data of res) {
          const position = data.positionInfo;
          if (position) {
            const supply = position.supply;
            const withdraw = position.withdraw;

            for (let s of supply) {
              if (s.feesInUSD)
                feeByToken[s.symbol] = BigNumber.sum(
                  BigNumber(feeByToken[s.symbol]),
                  BigNumber(s.feesInUSD)
                ).toFixed();
            }

            for (let w of withdraw) {
              if (w.feesInUSD)
                feeByToken[w.symbol] = BigNumber.sum(
                  BigNumber(feeByToken[w.symbol]),
                  BigNumber(w.feesInUSD)
                ).toFixed();
            }
          }
        }
        console.log(feeByToken);
      });
  });
}

main();
