const ccxt = require('ccxt');
const moment= require('moment') ;
const delay = require('delay');
const xlsx = require('xlsx');

var status = 0;
module.exports = function (app, obj, binance, binanceTest) {
  binance.futuresMiniTickerStream("BTCUSDT", (data) => {
    app.io.sockets.emit("server-send-price", data.close);
    printBalance(data.close);
  });
  async function printBalance(btcPrice) {
    const balance = await binanceTest.fetchBalance();
    const total = balance.total;
    console.log(`Balance : BTC ${total.BTC}, USDT: ${total.USDT}`);
    console.log(`Total USDT : ${(total.BTC - 1) * btcPrice + total.USDT}. \n `);
    app.io.sockets.emit("server-send-btc", `Balance : BTC ${total.BTC}`);
    app.io.sockets.emit("server-send-usdt", `USDT: ${total.USDT}`);
    app.io.sockets.emit(
      "server-send-total",
      ((total.BTC - 1) * btcPrice + total.USDT).toFixed(2)
    );
    var data = {
      avg: total,
      last: total,
    };
    // exportPriceToExcel(data, workSheetColumNames, workSheetName, filePath)
  }
  app.get("/", function (req, res) {
    // res.send("hello" + obj.KEY)
    res.render("master");
  });
  app.get("/buy/:amount", function (req, res) {
    var quantity = parseFloat(req.params.amount);
    console.log(quantity);
    binanceTest
      .createMarketOrder("BTC/USDT", "buy", quantity)
      .then((data) => {
        console.log(data);
        res.json(data);
      })
      .catch((err) => {
        console.log(err);
        res.json(err.body);
      });
  });
  app.get("/sell/:amount", function (req, res) {
    var quantity = parseFloat(req.params.amount);
    console.log(quantity);
    binanceTest
      .createMarketOrder("BTC/USDT", "sell", quantity)
      .then((data) => {
        console.log(data);
        res.json(data);
      })
      .catch((err) => {
        console.log(err);
        res.json(err.body);
      });
  });
  app.get("/on", function(req,res) {
      status = 1;
      main(binanceTest)
  })
  app.get("/off", function(req,res) {
    status = 0;
})
};
async function printBalance(btcPrice,binanceTest) {
    const balance = await binanceTest.fetchBalance();
    const total = balance.total
    console.log(`Balance : BTC ${total.BTC}, USDT: ${total.USDT}`);
    console.log(`Total USDT : ${(total.BTC - 1)*btcPrice + total.USDT}. \n `);
    var data ={
        avg: total,
        last: total,
    }
    // writeTotalMoney(total.USDT,total.BTC,(total.BTC - 1)*btcPrice + total.USDT)
    // exportPriceToExcel(data, workSheetColumNames, workSheetName, filePath)
}

async function  tick(binanceTest) {
    const price = await binanceTest.fetchOHLCV('BTC/USDT', '1m', undefined, 5);
    console.log(price);
    const bPrices = price.map(price=>{
        // console.log(price);
        return{
            timestamp: moment(price[0]).format(),
            open: price[1],
            high: price[2],
            low: price[3],
            close: price[4],
            volume: price[5]
        }
    })
   console.log(bPrices);
    const averagePrice = bPrices.reduce((acc,price) => acc + price.close, 0)/5
    const lastPrice = bPrices[bPrices.length - 1].close
    
    console.log(bPrices.map(p => p.close), averagePrice, lastPrice)

    const direction = lastPrice > averagePrice ? 'sell' : 'buy'

    const TRADE_SIZE = 100
    const quantity = 1000/ lastPrice

    console.log(`avg price: ${averagePrice}. Lasprice: ${lastPrice}`);
    const balance = await binanceTest.fetchBalance();
    const total = balance.total
    const totalMoney = (total.BTC - 1)*lastPrice + total.USDT
    const order = await binanceTest.createMarketOrder('BTC/USDT', direction, quantity).then((data)=>{
        console.log(data);
        writeContract(data, total.BTC, total.USDT, totalMoney);
    }
    )
    .catch((err)=>{
        console.log(err.body);
    })
    console.log(`${moment().format()} : ${direction}${quantity} BTC at ${lastPrice}`);
    printBalance(lastPrice,binanceTest)
}
async function main(binanceTest) {

    while (status>0) {
        await tick(binanceTest);
        await delay(30 * 1000);
    }
  }
  async function writeContract(data,btc,usdt,total) {
    const workbook = xlsx.readFile("contract.xlsx");
    let worksheets = {};
    for (const sheetName of workbook.SheetNames) {
        worksheets[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

worksheets.Sheet1.push({
    "ID": data.id,
    "Date Time": data.datetime,
    "Side": data.side,
    "Price": data.price,
    "Amount": data.amount,
    "Cost": data.cost,
    "Average": data.average,
    "Filled": data.filled,
    "Total BTC" : btc,
    "Total USDT" : usdt,
    "Total USD" : total,
});
const newBook = xlsx.utils.book_new();
const newSheet = xlsx.utils.json_to_sheet(worksheets.Sheet1);
xlsx.utils.book_append_sheet(newBook, newSheet, "Sheet1");
xlsx.writeFile(newBook,"contract.xlsx");
}