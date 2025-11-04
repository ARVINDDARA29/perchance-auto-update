import puppeteer from "puppeteer";

const generators = [
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

  console.log("🔐 Logging in to Perchance...");
  try {
    await page.goto("https://perchance.org/signin", { waitUntil: "networkidle2" });
    const emailInput = await page.$('input[type="email"]');
    const passInput = await page.$('input[type="password"]');
    const loginBtn = await page.$('button[type="submit"]');

    if (emailInput && passInput && loginBtn) {
      await emailInput.type(process.env.PERCHANCE_EMAIL || "your_email@example.com");
      await passInput.type(process.env.PERCHANCE_PASSWORD || "your_password");
      await loginBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      console.log("✅ Login successful.");
    } else {
      console.log("⚠️ Login inputs not found — skipping explicit login (maybe already logged in).");
    }
  } catch (err) {
    console.log("⚠️ Login step skipped:", err.message);
  }

  for (const gen of generators) {
    const url = `https://perchance.org/${gen}#edit`;
    console.log(`➡️ Visiting: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForTimeout(3000); // <-- fixed version of waitForTimeout

      // find text area
      const textArea = await page.$("textarea");
      if (textArea) {
        const randomComment = `// Updated at ${new Date().toISOString()}`;
        await textArea.evaluate((el, text) => el.value += `\n${text}`, randomComment);
        console.log("✏️ Added comment line to editor.");
      } else {
        console.log("⚠️ No editable field found, taking debug screenshot...");
        await page.screenshot({ path: `${gen}_no_editable.png` });
      }

      // click save button
      const saveBtn = await page.$('button:has-text("Save")');
      if (saveBtn) {
        await saveBtn.click();
        console.log("💾 Save button clicked.");
      } else {
        console.log("⚠️ Save button not found, taking debug screenshot...");
        await page.screenshot({ path: `${gen}_no_save.png` });
      }

      console.log(`✅ Updated: ${url}`);
    } catch (err) {
      console.log(`❌ Error on ${url}: ${err.message}`);
    }
  }

  console.log("🎯 All generators processed successfully.");
  await browser.close();
})();
