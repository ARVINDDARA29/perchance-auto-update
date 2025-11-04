// auto_update.js
// Node script for GitHub Actions to login to perchance.org and prepend a safe comment + save
// Usage: Workflow provides PERCH_EMAIL, PERCH_PASS environment variables.

const puppeteer = require('puppeteer');

const MARKER = 'perchance-autosave-marker-2025';
const COMMENT_TEXT = '-- This generator updated automatically'; // change if you want
const GENERATORS = [
  "https://perchance.org/----deep--reserch--with--ai--",
  "https://perchance.org/---adult---girlfriend---",
  "https://perchance.org/the-girlfriend---prime-2-0-ultra",
  "https://perchance.org/--girlfriend---",
  "https://perchance.org/ai----girlfriend---"
];

const EMAIL = process.env.PERCH_EMAIL || '';
const PASS = process.env.PERCH_PASS || '';

function chooseCommentPrefix(content){
  const lc = (content||'').slice(0,1000).toLowerCase();
  if(/<\s*script|<!doctype|<html|<\/\w+>/.test(lc)) return `<!-- ${MARKER} -->\n`;
  if(/\bfunction\b|\bvar\b|\blet\b|\bconst\b|=>/.test(lc)) return `// ${MARKER}\n`;
  if(/^\s*#/m.test(lc) || /\bdef\s+\w+\(/.test(lc)) return `# ${MARKER}\n`;
  if(/\/\*/.test(lc) || /\*\//.test(lc)) return `/* ${MARKER} */\n`;
  return `// ${MARKER}\n`; // safest fallback: JS style
}

async function clickSaveIfAny(page){
  // Try common buttons
  const clicked = await page.evaluate(() => {
    const textCandidates = ['save', 'save changes', 'update', 'publish', 'save & publish', 'save draft'];
    let btn = Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))
               .find(el => {
                 const t = (el.innerText || el.value || '').trim().toLowerCase();
                 return textCandidates.some(s => t === s || t.includes(s));
               });
    if(btn){ btn.click(); return true; }
    return false;
  });
  if(!clicked){
    // fallback: reload to trigger any autosave or update stamp
    await page.reload({waitUntil: 'networkidle2'}).catch(()=>{});
  } else {
    // give server time to process
    await new Promise(r => setTimeout(r, 3000));
  }
}

async function handleEditorAndSave(page){
  // try textarea
  try {
    const ta = await page.$('textarea');
    if(ta){
      const content = await page.evaluate(t => t.value, ta);
      if(content && content.includes(MARKER)){
        console.log('marker present in textarea — just saving');
        await clickSaveIfAny(page);
        return;
      }
      const prefix = chooseCommentPrefix(content);
      await page.evaluate((t,pref) => { t.value = pref + t.value; t.dispatchEvent(new Event('input',{bubbles:true})); }, ta, prefix);
      await page.waitForTimeout(800);
      await clickSaveIfAny(page);
      return;
    }
  } catch(e){ console.log('textarea attempt failed:', e.message); }

  // try CodeMirror
  try {
    const cm = await page.$('.CodeMirror');
    if(cm){
      const content = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror');
        let ta = cm ? cm.querySelector('textarea') : null;
        if(ta) return ta.value;
        const pre = cm ? cm.querySelector('.CodeMirror-code') : null;
        return pre ? pre.innerText : '';
      });
      if(content && content.includes(MARKER)){
        console.log('marker present in CodeMirror — saving only');
        await clickSaveIfAny(page);
        return;
      }
      const prefix = chooseCommentPrefix(content);
      await page.evaluate(pref => {
        const cm = document.querySelector('.CodeMirror');
        if(!cm) return;
        const ta = cm.querySelector('textarea');
        if(ta){ ta.value = pref + ta.value; ta.dispatchEvent(new Event('input',{bubbles:true})); return; }
        const pre = cm.querySelector('.CodeMirror-code');
        if(pre) pre.innerText = pref + pre.innerText;
      }, prefix);
      await page.waitForTimeout(900);
      await clickSaveIfAny(page);
      return;
    }
  } catch(e){ console.log('CodeMirror attempt failed:', e.message); }

  // try contenteditable
  try {
    const ce = await page.$('[contenteditable="true"]');
    if(ce){
      const content = await page.evaluate(el => el.innerText, ce);
      if(content && content.includes(MARKER)){
        console.log('marker present in contenteditable — saving only');
        await clickSaveIfAny(page);
        return;
      }
      const prefix = chooseCommentPrefix(content);
      await page.evaluate(pref => {
        const el = document.querySelector('[contenteditable="true"]');
        if(el){ el.innerText = pref + el.innerText; el.dispatchEvent(new Event('input',{bubbles:true})); }
      }, prefix);
      await page.waitForTimeout(900);
      await clickSaveIfAny(page);
      return;
    }
  } catch(e){ console.log('contenteditable attempt failed:', e.message); }

  // fallback: try to add marker to a visible <textarea> or save only
  console.log('No editable area detected or update not possible — trying save only');
  await clickSaveIfAny(page);
}

(async () => {
  if(!EMAIL || !PASS){
    console.error('PERCH_EMAIL or PERCH_PASS not set. Exiting.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  // login once (if perchance has login page)
  try {
    console.log('Logging in...');
    await page.goto('https://perchance.org/login', {waitUntil: 'networkidle2'});
    // Try common selectors
    const emailSel = await page.$('input[name=email], input[type=email], input#email');
    const passSel = await page.$('input[name=password], input[type=password], input#password');

    if(emailSel && passSel){
      await page.type('input[name=email], input[type=email], input#email', EMAIL, {delay:30}).catch(()=>{});
      await page.type('input[name=password], input[type=password], input#password', PASS, {delay:30}).catch(()=>{});
      // submit
      await Promise.all([
        page.click('button[type=submit], button:has-text("Log"), button:has-text("Login")').catch(()=>{}),
        page.waitForNavigation({waitUntil: 'networkidle2', timeout:15000}).catch(()=>{})
      ]);
      console.log('Login attempt done.');
    } else {
      console.log('Login inputs not found - skipping explicit login (maybe not required).');
    }
  } catch(e){
    console.log('Login error (continuing):', e.message);
  }

  // Loop through generators
  for(const url of GENERATORS){
    try {
      console.log('\n-> Visiting', url);
      await page.goto(url, {waitUntil: 'networkidle2'});
      await page.waitForTimeout(1200);

      // handle editor and save
      await handleEditorAndSave(page);

      // small cooldown between generators
      await page.waitForTimeout(1500);
      console.log('Done with', url);
    } catch(err){
      console.log('Error processing', url, err.message);
    }
  }

  await browser.close();
  console.log('\nAll done.');
  process.exit(0);
})();
