import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:9527';
const outDir = path.resolve('docs/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const findings = [];

function note(msg) {
  findings.push(msg);
  console.log(msg);
}

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  note(`screenshot: ${file}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', err => note(`PAGEERROR: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') note(`CONSOLE_ERROR: ${msg.text()}`);
  });

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, '01-login');

    // Soybean login form: user/password fields
    const user = page.locator('input').first();
    await user.waitFor({ timeout: 15000 });
    const inputs = page.locator('input');
    const count = await inputs.count();
    note(`login inputs: ${count}`);

    // Fill Super / 123456 — typically first text + password
    const textInputs = page.locator('input:not([type="checkbox"]):not([type="radio"])');
    const n = await textInputs.count();
    if (n >= 2) {
      await textInputs.nth(0).fill('Super');
      await textInputs.nth(1).fill('123456');
    } else {
      note('WARN: unexpected login inputs');
    }

    const loginBtn = page.getByRole('button', { name: /登录|login/i }).first();
    await loginBtn.click();
    await page.waitForTimeout(2000);
    await shot(page, '02-after-login');
    note(`after login url: ${page.url()}`);

    await page.goto(`${BASE}/demo/page-config`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot(page, '03-page-config');
    note(`page-config url: ${page.url()}`);
    const bodyText = await page.locator('body').innerText();
    note(`page-config has 内容推荐: ${bodyText.includes('内容推荐')}`);
    note(`page-config has 多语言: ${bodyText.includes('多语言')}`);
    note(`page-config has 排序: ${bodyText.includes('排序')}`);

    // Try create / select content recommend via template if missing
    const addBtn = page.getByRole('button', { name: /新增|新建|创建页面/ }).first();
    if (await addBtn.count()) {
      note('found create page button');
    }

    await page.goto(`${BASE}/demo/runtime/content-recommend`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot(page, '04-runtime-content-recommend');
    const rtText = await page.locator('body').innerText();
    note(`runtime content-recommend 404: ${rtText.includes('未找到已发布页面')}`);
    note(`runtime has 排序列: ${rtText.includes('排序')}`);
    note(`runtime has 置顶 or drag: ${/置顶|排序已启用|完整列表/.test(rtText)}`);

    await page.goto(`${BASE}/demo/runtime/lang-asset-form`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot(page, '05-runtime-lang-asset');
    const formText = await page.locator('body').innerText();
    note(`runtime lang-asset 404: ${formText.includes('未找到已发布页面')}`);
    note(`runtime has 简体中文: ${formText.includes('简体中文')}`);
    note(`runtime has 素材: ${formText.includes('素材')}`);
  } catch (error) {
    note(`FATAL: ${error?.message || error}`);
    try {
      await shot(page, '99-fatal');
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outDir, 'smoke-findings.txt'), findings.join('\n'), 'utf8');
    console.log('\n--- DONE ---');
  }
}

main();
