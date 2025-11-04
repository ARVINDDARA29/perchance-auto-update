// ------------------------------
// 🧠 Perchance Auto Update Script
// Created by ArvindDara Automation
// ------------------------------

const fetch = require("node-fetch");

// 🔁 तुम्हारे Perchance generators के URLs यहाँ डालो
const generators = [
  "https://perchance.org/----deep--reserch--with--ai--",
  "https://perchance.org/---adult---girlfriend---",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra",
  "https://perchance.org/--girlfriend---",
  "https://perchance.org/ai----girlfriend---"
];

// 🔄 यह function हर generator को auto-refresh/update करेगा
async function autoUpdate() {
  console.log("🟢 Starting Perchance Auto Update...");
  const now = new Date().toISOString();

  for (const url of generators) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✅ Updated: ${url} at ${now}`);
      } else {
        console.log(`⚠️ Failed: ${url} - HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`❌ Error updating ${url}:`, err.message);
    }
  }

  console.log("✅ All generators refreshed successfully at:", now);
}

// रन करो
autoUpdate();
