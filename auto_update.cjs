// auto_update.cjs
// GitHub Actions Puppeteer script to auto-login to perchance.org and prepend a comment in editors
// Updated with edit-hash force + proper wait handling

const puppeteer = require('puppeteer');

const MARKER = 'perchance-autosave-marker-2025';
const COMMENT_TEXT = '-- This generator updated automatically';
const GENERATORS = [
  "https://perchance.org/----deep--reserch--with--ai--/edit",
  "https://perchance.org/---adult---girlfriend---/edit",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra/edit",
  "https://perchance.org/--girlfriend---/edit",
  "https://perchance.org/ai----girlfriend---/edit"
];

const EMAIL = process.env.PERCH_EMAIL || '';
const PASS = process.env.PERCH_PASS || '';

function chooseCommentPrefix(content) {
  const lc = (content || '').slice(0, 1000).toLowerCase();
  if (/<\s*script|<!doctype|<html|<\/\w+>/.test(lc)) return `<!-- ${MARKER} -->\n`;
  if (/\bfunction\b|\bvar\b|\blet\b|\bconst\b|=>/.test(lc)) return `// ${MARKER}\n`;
  if (/^\s*#/m.test(lc) || /\bdef\s+\w+\(/.test(lc)) return `# ${MARKER}\n`;
  if (/\/\*/.test(lc) || /\*\//.test(lc)) return `/* ${MARKER} */\n`;
  return `// ${MARKER}\n`;
}

async function clickSaveIfAny(page) {
  const clicked = await page.evaluate(() => {
    const textCandidates = ['save', 'save changes', 'update', 'publish', 'save & publish', 'save draft'];
    let btn = Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))
      .find(el => {
        const t = (el.innerText || el.value || '').trim().toLowerCase();
        return textCandidates.some(s => t === s || t.includes(s));
      });
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (!clicked) {
    await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  } else {
    await new Promise(r => setTimeout(r, 3000));
  }
}

async function handleEditorAndSave(page) {
  try {
    const ta = await page.$('textarea');
    if (ta) {
      const content = await page.evaluate(t => t.value, ta);
      if (content && content.includes(MARKER)) {
        console.log('🟢 Marker already present — saving only');
        await clickSaveIfAny(page);
        return;
      }
      const prefix = chooseCommentPrefix(content);
      await page.evaluate((t, pref) => {
        t.value = pref + t.value;
        t.dispatchEvent(new Event('input', { bubbles: true }));
      }, ta, prefix);
      await page.waitForTimeout(800);
      await clickSaveIfAny(page);
      return;
    }
  } catch (e) { console.log('⚠️ Textarea failed:', e.message); }

  try {
    const cm = await page.$('.CodeMirror');
    if (cm) {
      const content = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror');
        const ta = cm ? cm.querySelector('textarea') : null;
        if (ta) return ta.value;
        const pre = cm ? cm.querySelector('.CodeMirror-code') : null;
        return pre ? pre.innerText : '';
      });
      if (content && content.includes(MARKER)) {
        console.log('🟢 Marker in CodeMirror — saving only');
        await clickSaveIfAny(page);
        return;
      }
      const prefix = chooseCommentPrefix(content);
      await page.evaluate(pref => {
        const cm = document.querySelector('.CodeMirror');
        if (!cm) return;
        const ta = cm.querySelector('textarea');
        if (ta) {
          ta.value = pref + ta.value;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        const pre = cm.querySelector('.CodeMirror-code');
        if (pre) pre.innerText = pref + pre.innerText;
      }, prefix);
      await page.waitForTimeout(900);
      await clickSaveIfAny(page);
      return;
    }
  } catch (e) { console.log('⚠️ CodeMirror failed:', e.message); }

  try {
    const ce = await page.$('[contenteditable="true"]');
    if (ce) {
      const content = await page.evaluate(el => el.innerText, ce);
      if (content && content.includes(MARKER)) {
        console.log('🟢 Marker in contenteditable — saving only');
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
      await page.waitForTimeout(900);
      await clickSaveIfAny(page);
      return;
    }
  } catch (e) { console.log('⚠️ contenteditable failed:', e.message); }

  console.log('⚠️ No editable field detected — skipping content edit, trying save only');
  await clickSaveIfAny(page);
}

(async () => {
  if (!EMAIL || !PASS) {
    console.error('❌ PERCH_EMAIL or PERCH_PASS not set. Exiting.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    console.log('🔐 Logging in...');
    await page.goto('https://perchance.org/login', { waitUntil: 'networkidle2' });
    const emailSel = await page.$('input[name=email], input[type=email], input#email');
    const passSel = await page.$('input[name=password], input[type=password], input#password');

    if (emailSel && passSel) {
      await page.type('input[name=email], input[type=email], input#email', EMAIL, { delay: 30 }).catch(() => {});
      await page.type('input[name=password], input[type=password], input#password', PASS, { delay: 30 }).catch(() => {});
      await Promise.all([
        page.click('button[type=submit], button:has-text("Log"), button:has-text("Login")').catch(() => {}),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
      ]);
      console.log('✅ Login done.');
    } else {
      console.log('ℹ️ Login page not detected, maybe session not needed.');
    }
  } catch (e) {
    console.log('⚠️ Login error (continuing):', e.message);
  }

  for (const url of GENERATORS) {
    try {
      console.log(`\n➡️ Visiting ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      // force edit mode via hash
      await page.evaluate(() => { location.hash = '#edit'; });
      await page.waitForTimeout(5000); // allow editor to load fully

      await handleEditorAndSave(page);
      await page.waitForTimeout(1500);
      console.log(`✅ Done with ${url}`);
    } catch (err) {
      console.log(`❌ Error processing ${url}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n🎯 All done.');
  process.exit(0);
})();
