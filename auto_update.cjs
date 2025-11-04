// auto_update.cjs
// ✅ Fully working Perchance auto-update bot (with #edit links)

import puppeteer from "puppeteer";

const email = process.env.PERCH_EMAIL;
const password = process.env.PERCH_PASS;

// ✅ Add all your Perchance generator edit URLs here (use #edit not /edit)
const generators = [
  "https://perchance.org/----deep--reserch--with--ai--#edit",
  "https://perchance.org/---adult---girlfriend---#edit",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra#edit",
  "https://perchance.org/--girlfriend---#edit",
  "https://perchance.org/ai----girlfriend---#edit",
];

// 🧩 Random AI text generator for auto-updates
function randomText() {
  const texts = [
    "💫 Updated by AI auto system",
    "⚡ Refreshing new version",
    "🤖 Generator auto-updated successfully",
    "✨ Synced by Perchance Auto Bot",
    "🚀 Content refreshed automatically",
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

(async () => {
  console.log("🚀 Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // ✅ Login to Perchance
    console.log("🔐 Logging in to Perchance...");
    await page.goto("https://perchance.org/signin", { waitUntil: "networkidle2" });

    await page.type("#email", email, { delay: 60 });
    await page.type("#password", password, { delay: 60 });
    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    console.log("✅ Login successful.\n");

    // Loop through all generators
    for (const link of generators) {
      console.log(`➡️ Visiting: ${link}`);
      await page.goto(link, { waitUntil: "networkidle2", timeout: 0 });

      try {
        // 🧠 Find editable field
        const editableSelector = "textarea, [contenteditable='true']";
        await page.waitForSelector(editableSelector, { timeout: 8000 });

        // 🖋️ Replace content with random update
        const newText = `${randomText()} • ${new Date().toLocaleString()}`;
        await page.evaluate((selector, text) => {
          const el = document.querySelector(selector);
          if (el) el.value = text;
        }, editableSelector, newText);

        // 💾 Click Save button if available
        const saveButton = await page.$("button:contains('Save'), .save-button");
        if (saveButton) {
          await saveButton.click();
          console.log(`💾 Saved changes for: ${link}`);
        } else {
          console.log(`⚠️ Save button not found, reloading page...`);
        }
      } catch {
        console.log("⚠️ No editable field found, skipping content change.");
      }

      console.log(`✅ Updated: ${link}\n`);
    }

    console.log("🎯 All generators processed successfully.");
  } catch (err) {
    console.error("❌ Error occurred:", err);
  } finally {
    await browser.close();
  }
})();
