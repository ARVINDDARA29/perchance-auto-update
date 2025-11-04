// auto_update.cjs
// Perchance Auto Updater — fully working, GitHub Actions ready version
// by ChatGPT (Optimized 2025)

const puppeteer = require('puppeteer');

const MARKER = 'perchance-autosave-marker-2025';
const COMMENT_TEXT = '-- Auto updated by GitHub Action';
const GENERATORS = [
  "https://perchance.org/----deep--reserch--with--ai--/edit",
  "https://perchance.org/---adult---girlfriend---/edit",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra/edit",
  "https://perchance.org/--girlfriend---/edit",
  "https://perchance.org/ai----girlfriend---/edit"
];

const EMAIL = process.env.PERCH_EMAIL || '';
const PASS = process.env.PERCH_PASS || '';

/**
 * Detects what kind of comment prefix fits the current editor content.
 */
function chooseCommentPrefix(content) {
  const lc = (content || '').slice(0, 1000).toLowerCase();
  if (/<\s*script|<!doctype|<html|<\/\w+>/.test(lc)) return `<!-- ${MARKER} -->\n`;
  if (/\bfunction\b|\bvar\b|\blet\b|\bconst\b|=>/.test(lc)) return `// ${MARKER}\n`;
  if (/^\s*#/m.test(lc) || /\bdef\s+\w+\(/.test(lc)) return `# ${MARKER}\n`;
  if (/\/\*/.test(lc) || /\*\//.test(lc)) return `/* ${MARKER} */\n`;
  return `// ${MARKER}\n`;
}

/**
 * Clicks the Save or Publish button if available
 */
async function clickSaveIfAny(page) {
  const clicked = await page.evaluate(() => {
    const textCandidates = ['save', 'save changes', 'update', 'publish', 'save & publish', 'save draft'];
    const btn = Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))
      .find(el => {
        const t = (el.innerText || el.value || '').trim().toLowerCase();
        return textCandidates.some(s => t === s || t.includes(s));
      });
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (!clicked) {
    console.log('⚠️ Save button not found, reloading...');
    await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  } else {
    console.log('💾 Save clicked, waiting...');
    await new Promise(r => setTimeout(r, 4000));
  }
}

/**
 * Handles all possible editor types (textarea, CodeMirror, contenteditable)
 */
async function handleEditorAndSave(page) {
  // Try textarea
  const ta = await page.$('textarea');
  if (ta) {
    const content = await page.evaluate(t => t.value, ta);
    if (content.includes(MARKER)) {
      console.log('🟢 Marker already exists in textarea.');
      await clickSaveIfAny(page);
      return;
    }
    const prefix = chooseCommentPrefix(content);
    await page.evaluate((t, pref) => {
      t.value = pref + t.value;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }, ta, prefix);
    console.log('✏️ Marker added in textarea.');
    await page.waitForTimeout(1000);
    await clickSaveIfAny(page);
    return;
  }

  // Try CodeMirror
  const cm = await page.$('.CodeMirror');
  if (cm) {
    const content = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror');
      const ta = cm?.querySelector('textarea');
      return ta ? ta.value : '';
    });
    if (content.includes(MARKER)) {
      console.log('🟢 Marker already exists in CodeMirror.');
      await clickSaveIfAny(page);
      return;
    }
    const prefix = chooseCommentPrefix(content);
    await page.evaluate(pref => {
      const cm = document.querySelector('.CodeMirror');
      const ta = cm?.querySelector('textarea');
      if (ta) {
        ta.value = pref + ta.value;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, prefix);
    console.log('✏️ Marker added in CodeMirror.');
    await page.waitForTimeout(1000);
    await clickSaveIfAny(page);
    return;
  }

  // Try contenteditable
  const ce = await page.$('[contenteditable="true"]');
  if (ce) {
    const content = await page.evaluate(el => el.innerText, ce);
    if (content.includes(MARKER)) {
      console.log('🟢 Marker already exists in contenteditable.');
      await clickSaveIfAny(page);
      return;
    }
    const prefix = chooseCommentPrefix(content);
    await page.evaluate(pref => {
      const el = document.querySelector('[contenteditable="true"]');
      if (el) {
        el.innerText = pref + el.innerText;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, prefix);
    console.log('✏️ Marker added in contenteditable.');
    await page.waitForTimeout(1000);
    await clickSaveIfAny(page);
    return;
  }

  console.log('⚠️ No editable field found, skipping content change.');
  await clickSaveIfAny(page);
}

/**
 * Main automation process
 */
(async () => {
  if (!EMAIL || !PASS) {
    console.error('❌ PERCH_EMAIL or PERCH_PASS not set. Exiting.');
    process.exit(1);
  }

  console.log('🚀 Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    console.log('🔐 Logging in to Perchance...');
    await page.goto('https://perchance.org/login', { waitUntil: 'networkidle2' });
    await page.type('input[name=email], input[type=email], input#email', EMAIL, { delay: 30 }).catch(() => {});
    await page.type('input[name=password], input[type=password], input#password', PASS, { delay: 30 }).catch(() => {});
    await Promise.all([
      page.click('button[type=submit], button:has-text("Log"), button:has-text("Login")').catch(() => {}),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    ]);
    console.log('✅ Login successful.');
  } catch (e) {
    console.log('⚠️ Login error (continuing):', e.message);
  }

  for (const url of GENERATORS) {
    try {
      console.log(`\n➡️ Visiting: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.evaluate(() => { location.hash = '#edit'; });
      await page.waitForTimeout(5000); // wait for editor to load
      await handleEditorAndSave(page);
      await page.waitForTimeout(1500);
      console.log(`✅ Updated: ${url}`);
    } catch (err) {
      console.log(`❌ Error on ${url}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\n🎯 All generators processed successfully.');
  process.exit(0);
})();
