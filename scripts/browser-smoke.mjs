import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1440,height:900}});
const page = await context.newPage();
const failures = [];
page.on('pageerror',error => failures.push(error.message));
const go = path => page.goto(base+path);
const loaded = () => page.getByRole('heading',{name:'Examples',exact:true}).waitFor();
try {
  await go('/arena/decode');
  await page.locator('.problem-row').nth(29).waitFor();
  assert.equal(await page.locator('.problem-row').count(),30);
  for (let index = 0; index < 30; index++) {
    const row = page.locator('.problem-row').nth(index);
    const href = await row.getAttribute('href');
    await row.click();
    await loaded();
    assert.equal(new URL(page.url()).pathname,href);
    await page.goBack();
    await page.locator('.problem-row').nth(29).waitFor();
  }
  await page.getByLabel('Difficulty').selectOption('Easy');
  await page.getByLabel('Topic').selectOption('Arrays');
  assert.ok(await page.locator('.problem-row').count() < 10);
  await page.locator('.problem-row').first().click();
  await loaded();
  const filtered = new URL(page.url()).search;
  assert.match(filtered,/level=Easy/);
  await page.reload();
  await loaded();
  await page.goBack();
  await page.getByLabel('Difficulty').waitFor();
  assert.equal(await page.getByLabel('Difficulty').inputValue(),'Easy');
  await page.goForward();
  await loaded();
  await page.getByRole('link',{name:'Challenges',exact:false}).last().click();
  await page.getByLabel('Search').fill('never-matches-123');
  await page.getByText('No problems match these filters.').waitFor();
  await page.getByRole('button',{name:'Clear filters'}).click();
  assert.equal(await page.locator('.problem-row').count(),30);

  assert.equal((await go('/arena/problems/missing-decode')).status(),404);
  await page.getByRole('heading',{name:'Challenge not found'}).waitFor();
  await go('/decode/last-reading/editorial');
  assert.match(page.url(),/\/arena\/problems\/decode-last-reading\/editorial$/);
  await page.getByText(/Submit an accepted fix to unlock/).waitFor();
  await page.getByRole('link',{name:/Return to the challenge/}).click();
  await loaded();

  const language = page.getByLabel('Language',{exact:true});
  const modelText = () => page.evaluate(() => {
    const key = document.querySelector('.editor-chrome select').value;
    return window.monaco?.editor.getModels().find(model => model.getLanguageId() === 'place-'+key)?.getValue();
  });
  for (const id of ['c','cpp','python']) {
    await language.selectOption(id);
    await page.waitForFunction(key => window.monaco?.editor.getModels().some(model => model.getLanguageId() === 'place-'+key),id);
    await page.evaluate(key => {
      const model = window.monaco.editor.getModels().find(model => model.getLanguageId() === 'place-'+key);
      model.setValue(model.getValue()+(key === 'python' ? '\n# ' : '\n// ')+key+' draft');
    },id);
  }
  await page.reload();
  await loaded();
  for (const id of ['cpp','c','python']) {
    await language.selectOption(id);
    await page.waitForFunction(key => window.monaco?.editor.getModels().some(model => model.getLanguageId() === 'place-'+key && model.getValue().endsWith(key+' draft')),id);
    assert.ok((await modelText()).endsWith(id+' draft'));
  }
  for (const width of [360,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ['light','dark']) {
      await page.getByLabel('Theme',{exact:true}).selectOption(theme);
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`overflow at ${width}px in ${theme}`);
      if (width <= 800) {
        await page.getByRole('button',{name:'Code',exact:true}).click();
        assert.ok(await language.isVisible());
        await page.getByRole('button',{name:'Output',exact:true}).click();
        assert.ok(await page.getByRole('textbox',{name:'Custom input'}).isVisible());
        await page.getByRole('button',{name:'Problem',exact:true}).click();
        await page.getByRole('button',{name:'Menu',exact:true}).focus();
        await page.keyboard.press('Enter');
        assert.ok(await page.getByRole('link',{name:'Skill Passport',exact:true}).isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
      }
    }
  }
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.deepEqual(failures,[]);
  console.log('Browser smoke passed: every catalog link, routes and filters, language drafts, theme persistence, keyboard menu, and four widths in both themes.');
} finally {
  await browser.close();
}
