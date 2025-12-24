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

const port = process.env.PORT || 8080;

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
   In-memory logs
========================= */

let memoryLogs = [];

try {
  memoryLogs = JSON.parse(fs.readFileSync("logs.json", "utf-8"));
} catch {
  memoryLogs = [];
}

setInterval(() => {
  fs.writeFile(
    "logs.json",
    JSON.stringify(memoryLogs.slice(-1000), null, 2),
    () => {}
  );
}, 10000);

/* =========================
   Static files
========================= */

app.use(express.static("./public", { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

/* =========================
   Logs API
========================= */

app.get("/api/logs", (req, res) => {
  res.json(memoryLogs);
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
   Proxy（見た目・速度OK）
========================= */

app.use((req, res, next) => {
  if (req.url.startsWith(proxy.prefix)) {
    try {
      const encoded = req.url
        .replace(proxy.prefix, "")
        .split("/")[0];

      const decodedUrl = proxy.codec.decode(encoded);

      if (!decodedUrl.match(/\.(css|js|png|jpg|jpeg|svg|gif|ico|webp)$/)) {
        memoryLogs.push({
          time: new Date().toISOString(),
          ip: req.ip,
          url: decodedUrl,
          ua: req.headers["user-agent"],
        });

        if (memoryLogs.length > 1000) memoryLogs.shift();
      }
    } catch {}

    proxy.request(req, res);
  } else {
    next(); // ← CSS・画像を殺さない
  }
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).sendFile("404.html", { root: "./public" });
});

/* =========================
   Start server
========================= */

app.listen(port, () => {
  console.log(`Greatsword running on port ${port}`);
});
