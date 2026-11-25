import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.PLACE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  channel:process.env.PLACE_BROWSER_CHANNEL,
  executablePath:process.env.PLACE_BROWSER_EXECUTABLE,
});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const errors = [];
page.on('pageerror',error => errors.push(error.message));
const button = name => page.getByRole('button',{name,exact:true});
const role = id => page.locator(`[data-role="${id}"]`);
const endpoint = '**/api/placement/roles';

try {
  await page.route(endpoint,route => route.fulfill({json:{connected:[],roles:[]}}));
  await page.goto(base+'/placements');
  await page.getByRole('heading',{name:'Build what’s next in tech.'}).waitFor();
  await page.getByText('Connected boards are unavailable.',{exact:false}).waitFor();
  await role('example-google-job').waitFor();
  await role('example-google-internship').waitFor();
  await button('Jobs').click();
  assert.equal(await role('example-google-internship').count(),0);
  await button('Internships').click();
  assert.equal(await role('example-google-job').count(),0);
  await page.getByLabel('Company type').selectOption('IT services');
  const search = page.getByRole('searchbox');
  await search.fill('google');
  await page.getByText('No matching roles.').waitFor();
  await button('Clear filters').click();
  await role('example-google-internship').press('Enter');
  assert.equal(await page.locator('#placement-role-title').innerText(),'Software Engineering Intern');
  await button('Save role').click();
  await button('Saved only').click();
  assert.equal(await page.locator('[data-role]').count(),1);
  await button('Saved only').click();
  await button('Review my evidence').click();
  await page.getByLabel('Résumé text (optional)').fill('Built an HTTP demo project');
  await page.getByLabel('Arrays & hash maps').selectOption('practice');
  await button('Update role fit').click();
  await page.getByText('Needs practice',{exact:true}).waitFor();
  await page.getByText('Built an HTTP demo project',{exact:true}).first().waitFor();
  await button('Build my study plan').click();
  await page.locator('.placement-task-list summary').first().click();
  await page.getByLabel('Mark task complete').first().check();
  await page.getByText('1 of 5 complete',{exact:false}).waitFor();
  await page.reload();
  await page.getByText('1 of 5 complete',{exact:false}).waitFor();
  assert.equal(await page.getByText('Built an HTTP demo project',{exact:true}).count(),0);
  await button('Saved only').click();
  assert.equal(await page.locator('[data-role]').count(),1);
  await button('Saved only').click();
  await button('Add a job posting').click();
  await page.getByLabel('Company',{exact:true}).fill('Sample employer');
  await page.getByLabel('Role title').fill('Backend QA Engineer');
  await page.getByLabel('Requirements').fill('SQL and automated tests');
  await button('Save posting').click();
  assert.equal(await page.locator('#placement-role-title').textContent(),'Backend QA Engineer');
  await page.getByRole('heading',{name:'Skills recognized in your posting'}).waitFor();
  await button('Best fit').click();
  await page.getByText('Sorted by self-reported evidence',{exact:false}).waitFor();
  await button('Postings only').click();
  assert.equal(await page.locator('[data-role]').count(),1);
  await page.unroute(endpoint);
  await page.route(endpoint,route => route.fulfill({json:{
    connected:['gitlab'],
    roles:[{id:'gitlab-123',company:'gitlab',type:'job',discipline:'cloud',title:'Infrastructure Engineer II',source:'live',url:'https://job-boards.greenhouse.io/gitlab/jobs/123'}],
  }}));
  await page.reload();
  await role('gitlab-123').waitFor();
  await page.getByText('Employer listings from GitLab.',{exact:false}).waitFor();
  await role('gitlab-123').click();
  assert.equal(await page.getByRole('link',{name:'Open posting'}).getAttribute('href'),'https://job-boards.greenhouse.io/gitlab/jobs/123');
  for (const theme of ['light','dark']) {
    await page.getByLabel('Theme',{exact:true}).selectOption(theme);
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Placement overflow at ${width}px in ${theme}`);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await button('← Back to roles').click();
  await role('example-google-job').click();
  await page.locator('#placement-role-title').waitFor();
  await button('← Back to roles').click();
  assert.ok(await role('example-google-job').evaluate(element => element === document.activeElement));
  await button('Edit target').click();
  await page.getByLabel('Role preference').selectOption('job');
  await page.getByLabel('Study hours per week').fill('2');
  await button('Save target').click();
  assert.equal(await button('Jobs').getAttribute('aria-pressed'),'true');
  await page.reload();
  assert.equal(await button('Jobs').getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);
  console.log('Placement browser flow passed, including 10 viewport/theme checks.');
} finally {
  await browser.close();
}
