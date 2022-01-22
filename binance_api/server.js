var express = require("express");
const Binance = require("node-binance-api");
const ccxt = require("ccxt");
const binanceTest = new ccxt.binance({
  apiKey: "rXhtCvRN7A7Jn5i255SsrjT721pOvD45yZlBI4yzA8KoDjfjdQ554PHPOUv9Hy0C",
  secret: "93T99awpArcceiwF5b7k18rmG1InNc6TOEUd2qJ0HEndQE9FtKHqwC52cgBrUbSK",
});
binanceTest.setSandboxMode(true);
var fs = require("fs");
var app = express();
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
var server = require("http").Server(app);
var io = require("socket.io")(server);
app.io = io;
server.listen(3000);

io.on("connection", (socket) => {
  console.log(socket.id);
});

loadConfigFile("./config.json");

function loadConfigFile(file) {
  var obj;
  fs.readFile(file, "utf-8", function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    const binance = new Binance().options({
      APIKEY: obj.API,
      APISECRET: obj.KEY,
    });
    //   binance.futuresMiniTickerStream( 'BTCUSDT', (data) => {
    //     console.info( data.close );
    //     app.io.sockets.emit("server-send-price", data.close)
    // } );

    require("./routers/client")(app, obj, binance, binanceTest);
  });
}