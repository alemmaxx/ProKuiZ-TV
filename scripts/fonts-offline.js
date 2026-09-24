// Muat turun fon Google ke dalam www/fonts supaya app tidak perlu internet
// dan tidak menghantar sebarang permintaan ke luar (sesuai untuk app kanak-kanak).
const fs = require("fs"), path = require("path");
const html = "www/index.html";
(async () => {
  let s = fs.readFileSync(html, "utf8");
  const m = s.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)">/);
  if (!m) { console.log("Tiada pautan Google Fonts - dilangkau"); return; }
  const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
  const res = await fetch(m[1].replace(/&amp;/g, "&"), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  let css = await res.text();
  fs.mkdirSync("www/fonts", { recursive: true });
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
  if (!urls.length) throw new Error("tiada fail fon dalam CSS");
  let i = 0;
  for (const u of urls) {
    const name = `f${++i}${path.extname(new URL(u).pathname) || ".woff2"}`;
    const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status + " " + u);
    fs.writeFileSync("www/fonts/" + name, Buffer.from(await r.arrayBuffer()));
    css = css.split(u).join(name);
  }
  fs.writeFileSync("www/fonts/fonts.css", css);
  s = s.replace(m[0], '<link rel="stylesheet" href="fonts/fonts.css">')
       .replace(/<link rel="preconnect"[^>]*>\s*/g, "");
  fs.writeFileSync(html, s);
  console.log(`Fon disimpan dalam app: ${urls.length} fail`);
})().catch(e => {
  // Gagal muat turun: buang pautan fon luar supaya app tetap tidak menghubungi internet
  const s = fs.readFileSync(html, "utf8").replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, "").replace(/<link rel="preconnect"[^>]*>\s*/g, "");
  fs.writeFileSync(html, s);
  console.log("Fon tidak dapat dimuat turun, app guna fon sistem:", e.message);
});
