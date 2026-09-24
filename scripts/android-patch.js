// Ubah suai projek Android selepas "npx cap add android":
//  - nombor versi (versionCode naik setiap kali GitHub membina)
//  - tandatangan release (kunci daripada GitHub Secrets)
//  - kebenaran mikrofon & enjin suara (hanya jika "mic": true dalam package.json)
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const cfg = pkg.prokuiz || {};

// 1) build.gradle
const g = "android/app/build.gradle";
let s = fs.readFileSync(g, "utf8");
const code = Number(process.env.GITHUB_RUN_NUMBER || 1) + (cfg.versionOffset || 0);
if (!/versionCode \d+/.test(s) || !/versionName "[^"]*"/.test(s)) throw new Error("versionCode/versionName tidak dijumpai dalam build.gradle");
s = s.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
if (!s.includes("signingConfigs {")) {
  if (!/\n(\s*)buildTypes \{/.test(s)) throw new Error("buildTypes tidak dijumpai dalam build.gradle");
  s = s.replace(/\n(\s*)buildTypes \{/, (all, ind) => `
${ind}signingConfigs {
${ind}    release {
${ind}        storeFile file("prokuiz-upload.jks")
${ind}        storePassword System.getenv("KEYSTORE_PASSWORD")
${ind}        keyAlias "prokuiz"
${ind}        keyPassword System.getenv("KEYSTORE_PASSWORD")
${ind}    }
${ind}}
${ind}buildTypes {`);
  s = s.replace(/(buildTypes \{\s*release \{)/, `$1\n            signingConfig signingConfigs.release`);
  if (!s.includes("signingConfig signingConfigs.release")) throw new Error("gagal menambah signingConfig");
}
fs.writeFileSync(g, s);
console.log(`build.gradle: versionCode ${code}, versionName ${pkg.version}, tandatangan release`);

// 2) AndroidManifest.xml
if (cfg.mic) {
  const p = "android/app/src/main/AndroidManifest.xml";
  let m = fs.readFileSync(p, "utf8");
  for (const perm of ["android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS"])
    if (!m.includes(perm)) m = m.replace("</manifest>", `    <uses-permission android:name="${perm}" />\n</manifest>`);
  if (!m.includes("android.intent.action.TTS_SERVICE"))
    m = m.replace("</manifest>", `    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n</manifest>`);
  fs.writeFileSync(p, m);
  console.log("AndroidManifest: mikrofon + enjin suara");
}

// 3) Android TV (hanya jika "tv": true dalam package.json)
if (cfg.tv) {
  const path = require("path");
  const p = "android/app/src/main/AndroidManifest.xml";
  let m = fs.readFileSync(p, "utf8");
  // Tidak perlu skrin sentuh; tanda app sebagai app TV (Leanback)
  const feats = [
    '<uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
    '<uses-feature android:name="android.software.leanback" android:required="false" />',
    '<uses-feature android:name="android.hardware.microphone" android:required="false" />',
  ];
  for (const f of feats) if (!m.includes(f.match(/name="([^"]+)"/)[1])) m = m.replace("<application", f + "\n    <application");
  // Banner untuk skrin utama Android TV
  if (!m.includes("android:banner=")) m = m.replace("<application", '<application\n        android:banner="@drawable/tv_banner"');
  // Muncul dalam launcher Android TV
  if (!m.includes("android.intent.category.LEANBACK_LAUNCHER")) {
    const re = /(\s*)(<category\s+android:name="android\.intent\.category\.LAUNCHER"\s*\/>)/;
    if (!re.test(m)) throw new Error("kategori LAUNCHER tidak dijumpai dalam AndroidManifest.xml");
    m = m.replace(re, '$1$2$1<category android:name="android.intent.category.LEANBACK_LAUNCHER" />');
  }
  // Skrin TV sentiasa landskap
  if (!m.includes("android:screenOrientation=")) m = m.replace(/(<activity\b)/, '$1\n            android:screenOrientation="sensorLandscape"');
  fs.writeFileSync(p, m);
  const res = "android/app/src/main/res";
  for (const [dir, file] of [["drawable", "tv-banner.png"], ["drawable-xhdpi", "tv-banner-xhdpi.png"]]) {
    fs.mkdirSync(path.join(res, dir), { recursive: true });
    fs.copyFileSync(path.join("assets", file), path.join(res, dir, "tv_banner.png"));
  }
  console.log("AndroidManifest: Android TV (Leanback launcher, banner, tanpa skrin sentuh)");
}
