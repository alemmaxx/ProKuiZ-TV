// Tukar projek Android (selepas APK telefon siap dibina) kepada versi TV:
//  - ID app berbeza (…​.tv) supaya boleh dipasang bersama versi telefon
//  - nama "… TV", muncul di skrin utama Android TV (LEANBACK_LAUNCHER + banner)
//  - skrin sentuh & mikrofon tidak diwajibkan
//  - app tahu ia berjalan di TV (sembunyi Conteng, Surih, Rakam Suara)
const fs = require("fs");
const must = (s, re, what) => { if (!re.test(s)) throw new Error("tv-patch: tidak jumpa " + what); };

// 1) ID app
const g = "android/app/build.gradle";
let s = fs.readFileSync(g, "utf8");
must(s, /applicationId "[^"]+"/, "applicationId");
s = s.replace(/applicationId "([^"]+)"/, (m, id) => id.endsWith(".tv") ? m : `applicationId "${id}.tv"`);
fs.writeFileSync(g, s);

// 2) Nama app
const str = "android/app/src/main/res/values/strings.xml";
let x = fs.readFileSync(str, "utf8");
x = x.replace(/(<string name="(?:app_name|title_activity_main)">)([^<]*)(<\/string>)/g, (m, a, b, c) => b.endsWith(" TV") ? m : a + b + " TV" + c);
fs.writeFileSync(str, x);

// 3) Manifest
const mf = "android/app/src/main/AndroidManifest.xml";
let m = fs.readFileSync(mf, "utf8");
must(m, /<application/, "<application");
const feats = [
  '<uses-feature android:name="android.software.leanback" android:required="false" />',
  '<uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />'
].filter(f => !m.includes(f.match(/name="([^"]+)"/)[1]));
if (feats.length) m = m.replace(/(\s*)<application/, (a, ws) => feats.map(f => ws + f).join("") + ws + "<application");
if (!m.includes("android:banner=")) m = m.replace("<application", '<application\n        android:banner="@drawable/tv_banner"');
if (!m.includes("LEANBACK_LAUNCHER")) {
  must(m, /<category android:name="android.intent.category.LAUNCHER"\s*\/>/, "kategori LAUNCHER");
  m = m.replace(/(\s*)(<category android:name="android.intent.category.LAUNCHER"\s*\/>)/, "$1$2$1<category android:name=\"android.intent.category.LEANBACK_LAUNCHER\" />");
}
fs.writeFileSync(mf, m);

// 4) Banner TV (320 x 180)
fs.mkdirSync("android/app/src/main/res/drawable-xhdpi", { recursive: true });
fs.copyFileSync(fs.existsSync("assets/tv-banner.png") ? "assets/tv-banner.png" : "assets/icon-only.png",
                "android/app/src/main/res/drawable-xhdpi/tv_banner.png");

// 5) Beritahu app bahawa ini versi TV
for (const f of ["android/app/src/main/assets/capacitor.config.json"]) {
  if (!fs.existsSync(f)) continue;
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  c.appendUserAgent = "ProKuizTV"; c.android = Object.assign({}, c.android, { appendUserAgent: "ProKuizTV" });
  c.appName = /TV$/.test(c.appName || "") ? c.appName : (c.appName || "ProKuiz") + " TV";
  fs.writeFileSync(f, JSON.stringify(c, null, 2));
}
console.log("Projek ditukar kepada versi TV");
