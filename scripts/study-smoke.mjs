import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { catalogBySlug } from '../judge/public-catalog.mjs';

const base = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  channel:process.env.PLACE_BROWSER_CHANNEL,
  executablePath:process.env.PLACE_BROWSER_EXECUTABLE,
});
const context = await browser.newContext({viewport:{width:1440,height:900}});
const page = await context.newPage();
const go = path => page.goto(base+path);
const button = name => page.getByRole('button',{name,exact:true});
const link = name => page.getByRole('link',{name,exact:true});
const heading = name => page.getByRole('heading',{name,exact:true});
const primary = 'decode-last-reading';
const followUp = 'decode-highest-reading';
const module = page.locator('#module-list > li').first();

async function submitFix(slug) {
  await page.waitForFunction(() => window.monaco?.editor.getModels().some(model => model.getLanguageId() === 'place-python'));
  await page.evaluate(source => window.monaco.editor.getModels().find(model => model.getLanguageId() === 'place-python').setValue(source),
    catalogBySlug.get(slug).programs.python.reference);
  await button('Submit Fix').click({timeout:20000});
  await page.locator('.verdict-AC').waitFor({timeout:30000});
  assert.match(await page.locator('.verdict-AC').innerText(),/Accepted/);
}

try {
  await go('/');
  await heading('Write better code. Know why it works.').waitFor();
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const appearance = page.getByLabel('Theme',{exact:true});
  assert.match(await appearance.locator('option[value="system"]').textContent(),/System · Dark/);
  await appearance.selectOption('light');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await appearance.selectOption('system');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.match(await appearance.locator('option[value="system"]').textContent(),/System · Light/);
  assert.equal(await link('Start learning').getAttribute('href'),'/learn');
  assert.equal(await link('Become a debugger').getAttribute('href'),'/arena/decode');
  assert.equal(await link('Start Code Hunt').getAttribute('href'),'#code-hunt');
  assert.equal(await page.locator('#code-hunt li a').count(),3);
  assert.equal(await page.locator('.landing-audiences article').count(),3);
  assert.equal(await link('Try this challenge').getAttribute('href'),'/arena/problems/decode-last-reading?lesson=arrays');
  assert.equal(await link('View sample Passport').getAttribute('href'),'/proof/demo');
  assert.equal(await page.locator('.landing-modules li').count(),5);
  assert.equal(await page.locator('[data-example-output]').innerText(),'7');
  await button('Example fix').focus();
  await page.keyboard.press('Enter');
  assert.equal(await button('Example fix').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-example-output]').innerText(),'8');
  await button('Buggy starter').click();
  assert.equal(await page.locator('[data-example-output]').innerText(),'7');
  for (const theme of ['light','dark']) {
    await page.getByLabel('Theme',{exact:true}).selectOption(theme);
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    for (const width of [320,360,768,851,1024,1440]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Landing overflow at ${width}px in ${theme}`);
    }
  }
  await page.setViewportSize({width:320,height:900});
  await button('Menu').press('Enter');
  assert.equal(await button('Menu').getAttribute('aria-expanded'),'true');
  await button('Menu').press('Escape');
  assert.equal(await button('Menu').getAttribute('aria-expanded'),'false');
  const [systemOption,...manualOptions] = await page.getByLabel('Theme',{exact:true}).locator('option').allTextContents();
  assert.match(systemOption,/^System · (Dark|Light)$/);
  assert.deepEqual(manualOptions,['Light','Dark']);
  await go('/practice');
  await heading('Practice challenges').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.setViewportSize({width:851,height:900});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await go('/');
  await page.setViewportSize({width:1440,height:900});
  await page.getByLabel('Theme',{exact:true}).selectOption('system');
  await link('Start learning').click();
  await module.waitFor();
  assert.equal(await page.locator('#module-list > li').count(),5);
  assert.match(await module.innerText(),/To do/);
  await link('Continue learning').click();
  await heading('Worked example').waitFor();
  await link('Open Decode challenge').click();
  await heading('The Missing Reading').waitFor();
  await button('Save challenge').click();
  await button('Hints').click();
  await button('Reveal tracing hint').click();
  await button('Reveal edge case').click();
  await button('Compare').click();
  await heading('Compare with starter').waitFor();
  await go('/learn');
  assert.match(await link('Continue learning').getAttribute('href'),new RegExp(primary));
  await page.getByText('Used two or more hints',{exact:false}).waitFor();
  await button('Skip').click();
  await page.getByText('No challenges to review yet.',{exact:true}).waitFor();

  await go('/arena');
  await page.locator('.problem-row').nth(29).waitFor();
  assert.equal(await page.locator('.problem-row').count(),30);
  await button('Saved').click();
  assert.equal(await page.locator('.problem-row').count(),1);
  await page.locator('.problem-row').first().click();
  await heading('The Missing Reading').waitFor();
  await page.getByRole('link',{name:'← Challenges'}).click();
  assert.match(page.url(),/view=saved/);
  await page.locator('.problem-row').first().waitFor();
  assert.equal(await page.locator('.problem-row').count(),1);
  await link('Solve').click();
  await heading('Practice problems').waitFor();
  await link('Contests').click();
  await heading('Contest schedule').waitFor();

  console.log('Study navigation, review queue and saved challenge views passed.');
  if (process.env.PLACE_OFFLINE_TEST !== '1') {
    await go('/learn?lesson=arrays');
    await link('Open Decode challenge').click();
    await button('Run').click({timeout:20000});
    await page.getByText('Different from the example.',{exact:false}).waitFor({timeout:30000});
    await button('Submit Fix').click();
    await page.locator('.verdict-WA').waitFor({timeout:30000});
    assert.match(await page.locator('.verdict-WA').innerText(),/Wrong Answer/);
    await submitFix(primary);
    console.log('The live judge rejected the starter and accepted the first repair.');
    await button('Review my fix').click();
    await heading('Accepted attempt').waitFor();
    await button('Compare with accepted').click();
    await heading('Accepted fix').waitFor();
    await go('/learn');
    await module.getByText('Accepted',{exact:true}).waitFor();
    assert.match(await link('Continue learning').getAttribute('href'),new RegExp(followUp));
    await link('Continue learning').click();
    await submitFix(followUp);
    await go('/learn');
    await module.getByText('Complete',{exact:true}).waitFor();
    await go('/profile');
    await heading('Engineering Passport').waitFor();
    await page.locator('#passport-languages').getByText('Python 3',{exact:true}).waitFor();
    await page.locator('#passport-achievements').getByText('Earned',{exact:true}).waitFor();
    await page.locator('#passport-trend .passport-chart').waitFor();
    await link('Activity').click();
    await page.locator('#accepted-timeline').getByText('The Missing Reading',{exact:true}).waitFor();
    await link('Evidence').click();
    await page.locator('#verified-evidence').getByText('The Missing Reading',{exact:true}).waitFor();
    await page.locator('#verified-evidence').getByText('Decode · Python 3 · Accepted',{exact:false}).first().waitFor();
  } else {
    await go('/profile');
    await link('Activity').click();
    await page.getByText('An active day has at least one accepted submission (UTC).',{exact:true}).waitFor();
  }
  await link('Preview Passport').click();
  await page.getByText('Private preview.',{exact:false}).waitFor();
  assert.equal(await link('Edit profile').count(),0);
  console.log(process.env.PLACE_OFFLINE_TEST === '1'
    ? 'Study UI passed with the public fallback catalog.'
    : 'Study loop passed with the live judge, real Python submissions, attempt comparison and Passport activity.');
} finally {
  await browser.close();
}
