/*
Copyright © Fog Network
Made by Nebelung
MIT license: https://opensource.org/licenses/MIT
*/

const express = require("express");
const app = express();
const fetch = require("node-fetch");
const config = require("./config.json");

const fs = require("fs");
const codec = require("./lib/codec");


const proxy = new Corrosion({
    prefix: config.prefix,
    codec: config.codec,
    title: "Greatsword",
    forceHttps: true,
    requestMiddleware: [
        Corrosion.middleware.blacklist([
            "accounts.google.com",
        ], "Page is blocked"),
    ]
});

proxy.bundleScripts();

app.use(express.static("./public", {
    extensions: ["html"]
}));

app.get("/", function(req, res){
    res.sendFile("index.html", {root: "./public"});
});

app.get("/api/logs", (req, res) => {
    try {
        const logs = JSON.parse(fs.readFileSync("logs.json", "utf-8"));
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: "log read failed" });
    }
});


app.get("/suggestions", function(req, res){
async function getsuggestions() {
var term = req.query.q || "";
var response = await fetch("https://duckduckgo.com/ac/?q=" + term + "&type=list");
var result = await response.json();
var suggestions = result[1]
res.send(suggestions)
}
getsuggestions()
});

app.use(function (req, res) {

    if (req.url.startsWith(proxy.prefix)) {

        try {
            // /service/ の後ろにあるエンコードURLを取り出す
            const encoded = req.url
                .replace(proxy.prefix, "")
                .split("/")[0];

            // 元のURLに戻す（xor）
            const decodedUrl = codec.xor.decode(encoded);

            // 既存ログを読み込む
            const logs = JSON.parse(fs.readFileSync("logs.json", "utf-8"));

            // 新しい履歴を追加
            logs.push({
                time: new Date().toISOString(),
                ip: req.ip,
                url: decodedUrl,
                ua: req.headers["user-agent"]
            });

            // 保存
            fs.writeFileSync("logs.json", JSON.stringify(logs, null, 2));

        } catch (e) {
            console.log("log error", e);
        }

        // もともとのプロキシ処理
        proxy.request(req, res);

    } else {
        res.status(404).sendFile("404.html", { root: "./public" });
    }
});


app.listen(port, () => {
    console.log(`Greatsword V3 is running at localhost:${port}`)
})
