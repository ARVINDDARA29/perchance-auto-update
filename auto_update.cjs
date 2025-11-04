// auto_update.cjs — 2025 stable version

const puppeteer = require('puppeteer');

const MARKER = 'perchance-autosave-marker-2025';
const COMMENT_TEXT = '-- This generator updated automatically';
const GENERATORS = [
  "https://perchance.org/----deep--reserch--with--ai--",
  "https://perchance.org/---adult---girlfriend---",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra",
  "https://perchance.org/--girlfriend---",
  "https://perchance.org/ai----girlfriend---"
];

const EMAIL = process.env.PERCH_EMAIL || '';
const PASS = process.env.PERCH_PASS || '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    const textCandidates = ['save', 'update', 'publish', 'save & publish', 'save draft'];
    const btn = Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))
      .find(el => {
        const t = (el.innerText || el.value || '').trim().toLowerCase();
        return textCandidates.some(s => t === s || t.includes(s));
      });
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!clicked) await page.reload({ waitUntil: 'networkidle2' }).catch(() => { });
  else await sleep(3000);
}

async function waitForEditor(page) {
  for (let i = 0; i < 10; i++) {
    const found = await page.evaluate(() => {
      return !!(document.querySelector('textarea') ||
                document.querySelector('.CodeMirror') ||
                document.querySelector('[contenteditable="true"]'));
    });
    if (found) return true;
    await sleep(1000);
  }
  return false;
}

async function handleEditorAndSave(page) {
  await waitForEditor(page);
  const editor = await page.evaluate(() => {
    if (document.querySelector('textarea')) return 'textarea';
    if (document.querySelector('.CodeMirror')) return 'CodeMirror';
    if (document.querySelector('[contenteditable="true"]')) return 'contenteditable';
    return null;
  });

  if (!editor) {
    console.log('⚠️ No editable field detected — skipping content edit, trying save only');
    await clickSaveIfAny(page);
    return;
  }

  async function addMarker(content, prefixFn) {
    const prefix = prefixFn(content);
    if (editor === 'textarea') {
      await page.evaluate(pref => {
        const t = document.querySelector('textarea');
        if (t && !t.value.includes(pref)) {
          t.value = pref + t.value;
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, prefix);
    } else if (editor === 'CodeMirror') {
      await page.evaluate(pref => {
        const cm = document.querySelector('.CodeMirror');
        if (!cm) return;
        const ta = cm.querySelector('textarea');
        if (ta && !ta.value.includes(pref)) {
          ta.value = pref + ta.value;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, prefix);
    } else if (editor === 'contenteditable') {
      await page.evaluate(pref => {
        const el = document.querySelector('[contenteditable="true"]');
        if (el && !el.innerText.includes(pref)) {
          el.innerText = pref + el.innerText;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, prefix);
    }
  }

  try {
    const content = await page.evaluate(() => {
      if (document.querySelector('textarea')) return document.querySelector('textarea').value;
      if (document.querySelector('.CodeMirror-code')) return document.querySelector('.CodeMirror-code').innerText;
      if (document.querySelector('[contenteditable="true"]')) return document.querySelector('[contenteditable="true"]').innerText;
      return '';
    });

    if (content && content.includes(MARKER)) {
      console.log('✅ Marker already present, saving only...');
      await clickSaveIfAny(page);
      return;
    }

    await addMarker(content, chooseCommentPrefix);
    await sleep(800);
    await clickSaveIfAny(page);
    console.log('💾 Updated and saved successfully.');
  } catch (e) {
    console.log('Editor update failed:', e.message);
  }
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
  page.setDefaultNavigationTimeout(40000);

  // --- LOGIN ---
  try {
    console.log('🔐 Logging in...');
    await page.goto('https://perchance.org/login', { waitUntil: 'networkidle2' });
    const hasInputs = await page.$('input[type=email], input[name=email]');
    if (hasInputs) {
      await page.type('input[type=email], input[name=email]', EMAIL, { delay: 30 });
      await page.type('input[type=password], input[name=password]', PASS, { delay: 30 });
      await Promise.all([
        page.click('button[type=submit], button:has-text("Login")').catch(() => { }),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => { })
      ]);
      console.log('✅ Logged in.');
    } else {
      console.log('ℹ️ Login page not detected, maybe session not needed.');
    }
  } catch (err) {
    console.log('⚠️ Login step failed but continuing:', err.message);
  }

  // --- GENERATORS LOOP ---
  for (const rawUrl of GENERATORS) {
    const url = rawUrl.endsWith('/edit') ? rawUrl : rawUrl + '/edit';
    try {
      console.log(`\n➡️ Visiting ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await sleep(1500);
      await handleEditorAndSave(page);
      await sleep(1000);
    } catch (e) {
      console.log('❌ Error on', url, e.message);
    }
  }

  await browser.close();
  console.log('\n🎯 All done.');
  process.exit(0);
})();
