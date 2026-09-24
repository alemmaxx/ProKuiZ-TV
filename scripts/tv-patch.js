// Sambungkan lapisan TV (tv.css + tv.js) ke www/index.html app telefon.
// Fail index.html asal TIDAK perlu diubah — salin terus dari projek telefon.
const fs = require("fs"), path = require("path");
const shared = path.join(__dirname, "..", "shared");
for (const f of ["tv.js", "tv.css"]) fs.copyFileSync(path.join(shared, f), path.join("www", f));
const p = "www/index.html";
let s = fs.readFileSync(p, "utf8");
if (!s.includes('href="tv.css"')) s = s.replace("</head>", '<link rel="stylesheet" href="tv.css">\n</head>');
if (!s.includes('src="tv.js"')) {
  const i = s.lastIndexOf("</body>");
  if (i < 0) throw new Error("</body> tidak dijumpai dalam index.html");
  s = s.slice(0, i) + '<script src="tv.js"></script>\n' + s.slice(i);
}
fs.writeFileSync(p, s);
console.log("Lapisan TV dipasang pada www/index.html");
