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

app.use(express.static("./public", {
  extensions: ["html"],
}));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

/* =========================
   Logs API
========================= */

app.get("/api/logs", (req, res) => {
  try {
    const logs = JSON.parse(fs.readFileSync("logs.json", "utf-8"));
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: "log read failed" });
  }
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
  } catch (e) {
    res.send([]);
  }
});

/* =========================
   Proxy + logging
========================= */

app.use((req, res) => {
  if (req.url.startsWith(proxy.prefix)) {
    try {
      const encoded = req.url
        .replace(proxy.prefix, "")
        .split("/")[0];

      const decodedUrl = proxy.codec.decode(encoded);

      const logs = JSON.parse(fs.readFileSync("logs.json", "utf-8"));

      logs.push({
        time: new Date().toISOString(),
        ip: req.ip,
        url: decodedUrl,
        ua: req.headers["user-agent"],
      });

      fs.writeFileSync("logs.json", JSON.stringify(logs, null, 2));
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
  console.log(`Greatsword is running on port ${port}`);
});

