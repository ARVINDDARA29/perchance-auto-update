// auto_update.cjs
const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  console.log("🚀 Launching Puppeteer...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  console.log("🔐 Logging in to Perchance...");

  await page.goto("https://perchance.org/login", { waitUntil: "networkidle2" });

  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput = await page.$('input[type="password"], input[name="password"]');
  const loginBtn = await page.$("button[type='submit'], button");

  if (emailInput && passInput && loginBtn) {
    await emailInput.type(process.env.PERCH_EMAIL);
    await passInput.type(process.env.PERCH_PASS);
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("✅ Login successful.");
  } else {
    console.log("⚠️ Login inputs not found — skipping explicit login.");
  }

  const generators = [
    "----deep--reserch--with--ai--",
    "---adult---girlfriend---",
    "the-girlfriend---prime-2-0-ultra",
    "--girlfriend---",
    "ai----girlfriend---",
  ];

  if (!fs.existsSync("debug_screens")) fs.mkdirSync("debug_screens");

  for (const name of generators) {
    const url = `https://perchance.org/${name}#edit`;
    console.log(`➡️ Visiting: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForTimeout(5000); // editor load time

      // 🔍 Find the iframe
      const frames = page.frames();
      const editorFrame = frames.find(f => f.url().includes("edit"));
      if (!editorFrame) {
        console.log("⚠️ No editor iframe found!");
        await page.screenshot({
          path: `debug_screens/${name}_no_iframe.png`,
          fullPage: true,
        });
        continue;
      }

      // 🔍 Inside iframe: find CodeMirror or textarea
      const editor = await editorFrame.$(".CodeMirror textarea, textarea, [contenteditable='true']");
      if (editor) {
        await editor.click({ clickCount: 3 });
        await editor.type("\n// 🔁 Auto-updated by GitHub Action", { delay: 10 });
        console.log("✏️ Edited text inside iframe editor.");
      } else {
        console.log("⚠️ Editor not found inside iframe.");
        await page.screenshot({
          path: `debug_screens/${name}_no_editor.png`,
          fullPage: true,
        });
      }

      // 💾 Click “Save” button (outside iframe)
      const saveButton = await page.$x("//button[contains(., 'Save')]");
      if (saveButton.length > 0) {
        await saveButton[0].click();
        console.log("💾 Clicked Save button.");
      } else {
        console.log("⚠️ Save button not found.");
      }

      console.log(`✅ Updated: ${url}`);
    } catch (err) {
      console.log(`❌ Error on ${url}: ${err.message}`);
      await page.screenshot({
        path: `debug_screens/${name}_error.png`,
        fullPage: true,
      });
    }
  }

  await browser.close();
  console.log("🎯 All generators processed successfully.");
})();
