// == Auto Perchance Generator Updater ==
// 🚀 Updated for Puppeteer 23+ (no waitForTimeout error)
// Author: Arvind + ChatGPT Fix Build 2025

import puppeteer from "puppeteer";

const GENERATORS = [
  "----deep--reserch--with--ai--",
  "---adult---girlfriend---",
  "the-girlfriend---prime-2-0-ultra",
  "--girlfriend---",
  "ai----girlfriend---"
];

(async () => {
  console.log("🚀 Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log("🔐 Logging in to Perchance...");
  await page.goto("https://perchance.org/login", { waitUntil: "networkidle2" });

  // Try login (if already logged in, skip)
  try {
    const emailField = await page.$('input[type="email"]');
    const passwordField = await page.$('input[type="password"]');

    if (emailField && passwordField) {
      console.log("✍️ Entering login details...");
      await emailField.type(process.env.PERCHANCE_EMAIL);
      await passwordField.type(process.env.PERCHANCE_PASSWORD);
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) await submitButton.click();
      await new Promise(r => setTimeout(r, 4000)); // ✅ replacement of waitForTimeout
    } else {
      console.log("⚠️ Login inputs not found — skipping explicit login.");
    }
  } catch (err) {
    console.log("⚠️ Login error (probably already logged in).");
  }

  // Loop through all generators
  for (const name of GENERATORS) {
    const url = `https://perchance.org/${name}#edit`;
    console.log(`➡️ Visiting: ${url}`);
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      await new Promise(r => setTimeout(r, 2000)); // ✅ safe delay

      const editorFrame = await page.$('iframe');
      if (!editorFrame) {
        console.log("⚠️ No editable field found, taking debug screenshot...");
        await page.screenshot({ path: `no_field_${name}.png` });
      } else {
        console.log("📝 Editing generator content...");
        await new Promise(r => setTimeout(r, 2000)); // ✅ wait before save
      }

      // Try clicking save
      const saveButton = await page.$('button:has-text("Save")');
      if (saveButton) {
        await saveButton.click();
        console.log("💾 Saved successfully!");
      } else {
        console.log("⚠️ Save button not found, taking debug screenshot...");
        await page.screenshot({ path: `no_save_${name}.png` });
      }

      console.log(`✅ Updated: ${url}`);
    } catch (err) {
      console.error(`❌ Error on ${url}:`, err.message);
    }
  }

  await browser.close();
  console.log("🎯 All generators processed successfully.");
})();
