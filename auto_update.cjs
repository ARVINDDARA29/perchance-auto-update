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

  const EMAIL = process.env.PERCH_EMAIL;
  const PASS = process.env.PERCH_PASS;

  await page.goto("https://perchance.org/login", { waitUntil: "networkidle2" });

  // ✅ Find login form inputs
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passInput = await page.$('input[type="password"], input[name="password"]');
  const loginBtn = await page.$("button[type='submit'], button");

  if (emailInput && passInput && loginBtn) {
    await emailInput.type(EMAIL);
    await passInput.type(PASS);
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("✅ Login successful.");
  } else {
    console.log("⚠️ Login inputs not found — skipping explicit login (maybe already logged in).");
  }

  // ✅ List of generators to update
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
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 4000)); // wait for editor to load

      // Try to find editable area
      const editor = await page.$(".CodeMirror textarea, textarea, [contenteditable='true']");

      if (editor) {
        await editor.click({ clickCount: 3 });
        await page.keyboard.type("// Auto-updated by GitHub Action\n", { delay: 10 });
        console.log("✏️  Added comment line to editor.");
      } else {
        console.log("⚠️ No editable field found, taking debug screenshot...");
        await page.screenshot({
          path: `debug_screens/${name.replace(/[^a-z0-9\-]/gi, "_")}_no_editor.png`,
          fullPage: true,
        });
      }

      // Save button detection — use text() inside page.evaluate
      const saveBtn = await page.$eval("body", () => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find(b => b.textContent.includes("Save")) ? true : false;
      }).catch(() => false);

      if (saveBtn) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button"));
          const save = btns.find(b => b.textContent.includes("Save"));
          if (save) save.click();
        });
        console.log("💾 Clicked Save button.");
      } else {
        console.log("⚠️ Save button not found, taking debug screenshot...");
        await page.screenshot({
          path: `debug_screens/${name.replace(/[^a-z0-9\-]/gi, "_")}_no_save.png`,
          fullPage: true,
        });
      }

      console.log(`✅ Updated: ${url}`);
    } catch (err) {
      console.log(`❌ Error on ${url}: ${err.message}`);
      await page.screenshot({
        path: `debug_screens/${name.replace(/[^a-z0-9\-]/gi, "_")}_error.png`,
        fullPage: true,
      });
    }
  }

  await browser.close();
  console.log("🎯 All generators processed successfully.");
})();
