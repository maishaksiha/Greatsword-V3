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
   Corrosion
========================= */

const proxy = new Corrosion({
  prefix: config.prefix,
  codec: config.codec,
  title: "Greatsword",
  forceHttps: true,
});

proxy.bundleScripts();

/* =========================
   ★これが超重要（必須）
========================= */
app.use(proxy.middleware);

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

app.use(express.static("public", { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

/* =========================
   Logs API
========================= */

app.get("/api/logs", (req, res) => {
  res.json(memoryLogs);
});

/* =========================
   Suggestions
========================= */

app.get("/suggestions", async (req, res) => {
  try {
    const q = req.query.q || "";
    const r = await fetch(
      "https://duckduckgo.com/ac/?q=" + q + "&type=list"
    );
    const j = await r.json();
    res.json(j[1]);
  } catch {
    res.json([]);
  }
});

/* =========================
   Proxy + logging
========================= */

app.use((req, res, next) => {
  if (!req.url.startsWith(proxy.prefix)) return next();

  try {
    const encoded = req.url.replace(proxy.prefix, "").split("/")[0];
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

  next();
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).sendFile("404.html", { root: "public" });
});

/* =========================
   Start
========================= */

app.listen(port, () => {
  console.log(`Greatsword running on port ${port}`);
});

