import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import useragent from "express-useragent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(useragent.express());

// Lê o arquivo de regras (rules.json)
const rulesPath = path.resolve(__dirname, "../config/rules.json");
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));

// Página principal
app.get("/", (req, res) => {
  const userIP = req.ip;
  const userAgent = req.useragent;
  const country = req.headers["cf-ipcountry"] || "unknown";

  console.log(`Acesso detectado: ${userIP} | ${userAgent.source} | ${country}`);

  // Verifica se o IP está bloqueado
  if (rules.blocked_ips.includes(userIP)) {
    return res.redirect(rules.redirects.bot);
  }

  // Verifica se o país está bloqueado
  if (rules.blocked_countries.includes(country)) {
    return res.redirect(rules.redirects.bot);
  }

  // Verifica se o user-agent indica bot
  const ua = userAgent.source.toLowerCase();
  if (
    ua.includes("bot") ||
    ua.includes("crawler") ||
    ua.includes("spider") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("adsbot") ||
    ua.includes("google") ||
    ua.includes("bing") ||
    ua.includes("yandex")
  ) {
    return res.redirect(rules.redirects.bot);
  }

  // Se passou em tudo → humano
  return res.redirect(rules.redirects.human);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Cloaker rodando na porta ${port}`));
