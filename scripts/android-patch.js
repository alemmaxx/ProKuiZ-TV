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
if (process.env.KEYSTORE_PASSWORD && !s.includes("signingConfigs {")) {
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
console.log(`build.gradle: versionCode ${code}, versionName ${pkg.version}` + (process.env.KEYSTORE_PASSWORD ? ", tandatangan release" : " (tanpa kunci: APK debug)"));

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
