/*
Copyright © Fog Network
Made by Nebelung
MIT license: https://opensource.org/licenses/MIT
*/

const express = require("express");
const app = express();
const fetch = require("node-fetch");
const fs = require("fs");

const config = require("./config.json");
const Corrosion = require("corrosion");

const port = process.env.PORT || 3000;

/* =========================
   Corrosion (Greatsword)
========================= */

const proxy = new Corrosion({
  prefix: config.prefix,
  codec: config.codec,
  title: "Greatsword",
  forceHttps: true,
  requestMiddleware: [
    Corrosion.middleware.blacklist(
      ["accounts.google.com"],
      "Page is blocked"
    ),
  ],
});

proxy.bundleScripts();

/* =========================
   Static files
========================= */

app.use(
  express.static("./public", {
    extensions: ["html"],
  })
);

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

/* =========================
   Logs API
========================= */

app.get("/api/logs", (req, res) => {
  fs.readFile("logs.json", "utf-8", (err, data) => {
    if (err) return res.json([]);
    try {
      res.json(JSON.parse(data));
    } catch {
      res.json([]);
    }
  });
});

/* =========================
   Search suggestions
========================= */

app.get("/suggestions", async (req, res) => {
  try {
    const term = req.query.q || "";
    const response = await fetch(
      "https://duckduckgo.com/ac/?q=" + term + "&type=list"
    );
    const result = await response.json();
    res.send(result[1]);
  } catch {
    res.send([]);
  }
});

/* =========================
   Proxy + logging (軽量)
========================= */

app.use((req, res) => {
  if (req.url.startsWith(proxy.prefix)) {
    try {
      const encoded = req.url
        .replace(proxy.prefix, "")
        .split("/")[0];

      const decodedUrl = proxy.codec.decode(encoded);

      // 静的ファイルはログらない
      if (!decodedUrl.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|ico)$/)) {
        fs.readFile("logs.json", "utf-8", (err, data) => {
          let logs = [];

          if (!err && data) {
            try {
              logs = JSON.parse(data);
            } catch {}
          }

          logs.push({
            time: new Date().toISOString(),
            ip: req.ip,
            url: decodedUrl,
            ua: req.headers["user-agent"],
          });

          // 最大1000件まで
          if (logs.length > 1000) logs.shift();

          fs.writeFile(
            "logs.json",
            JSON.stringify(logs, null, 2),
            () => {}
          );
        });
      }
    } catch (e) {
      console.log("log error:", e);
    }

    proxy.request(req, res);
  } else {
    res.status(404).sendFile("404.html", { root: "./public" });
  }
});

/* =========================
   Start server
========================= */

app.listen(port, () => {
  console.log(`Greatsword running on port ${port}`);
});
