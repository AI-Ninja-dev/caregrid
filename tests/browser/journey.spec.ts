import { test, expect } from '@playwright/test';
test('care journey links alerts, owned tasks, history, report and reset', async ({page}) => {
  await page.goto('/demo/');
  await page.getByRole('button', {name:'Alerts', exact:false}).first().click();
  await page.getByRole('button', {name:'Create follow-up'}).first().click();
  await expect(page.getByRole('heading', {name:'Follow-through, made visible.'})).toBeVisible();
  const card = page.locator('.task-card').filter({hasText:'T-004'});
  await expect(card).toBeVisible();
  await expect(card.getByLabel('Task status').locator('option', {hasText:'Completed'})).toHaveAttribute('disabled', '');
  await card.getByLabel('Assigned role').selectOption('Clinical reviewer');
  await card.getByLabel('Task status').selectOption('Completed');
  await expect(page.locator('.task-history')).toContainText('Moved from to do to completed');
  await card.getByRole('button', {name:'Thandi Mokoena'}).click();
  await expect(page.getByRole('heading', {name:'Thandi Mokoena', exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Alerts',exact:false}).first().click();
  await page.getByRole('button', {name:'View follow-up'}).click();
  await expect(page.locator('.task-card')).toHaveCount(4);
  await page.getByRole('button', {name:'Reports',exact:true}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Download demo report'}).click();
  expect((await download).suggestedFilename()).toBe('caregrid-demo-report.csv');
  await page.getByRole('button', {name:'Workspace',exact:true}).click();
  await page.getByRole('button', {name:'Reset demo activity'}).click();
  await page.getByRole('button', {name:'Tasks',exact:true}).click();
  await expect(page.locator('.task-card')).toHaveCount(3);
  await expect(page.getByRole('heading', {name:'Your activity appears here'})).toBeVisible();
});
test('people search and responsive layout work at phone and desktop widths', async ({page}) => {
  await page.goto('/demo/');
  await page.getByRole('button', {name:'People',exact:true}).click();
  await page.getByPlaceholder('Search people, town or pathway').fill('not found');
  await expect(page.getByRole('heading', {name:'No matching people'})).toBeVisible();
  await page.getByRole('button', {name:'Clear filters'}).click();
  await expect(page.locator('.person')).toHaveCount(8);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.getByRole('button', {name:'Tasks',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.getByRole('button', {name:'People',exact:true}).click();
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button', {name:'Overview',exact:true}).click();
  await page.screenshot({path:'test-results/caregrid-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/caregrid-mobile.png',fullPage:true});
});

test('patient links survive refresh and scoped alert queues support browser history',async({page})=>{
 await page.goto('/demo/#/people/CG-003');
 await expect(page.getByRole('heading',{name:'Naledi Dlamini',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Review alerts for this person'}).click();
 await expect(page).toHaveURL(/#\/alerts\?person=CG-003$/);
 await expect(page.locator('.alert')).toHaveCount(1);
 await expect(page.locator('.alert')).toContainText('Device connection needs attention');
 await page.reload();await expect(page.locator('.patient-scope')).toContainText('Naledi Dlamini');
 await page.getByRole('button',{name:'Show all people'}).click();await expect(page.locator('.alert')).toHaveCount(5);
 await page.goBack();await expect(page.locator('.alert')).toHaveCount(1);
 await page.goBack();await expect(page.getByRole('heading',{name:'Naledi Dlamini',exact:true})).toBeVisible();
 await page.goto('/demo/#/people/CG-004');await page.getByRole('button',{name:'Review alerts for this person'}).click();await expect(page.locator('.alert')).toHaveCount(0);await expect(page.getByRole('heading',{name:'No alerts'})).toBeVisible();
 await page.goto('/demo/#/unknown');await expect(page.getByRole('heading',{name:'Four pathways. One clearer view.'})).toBeVisible();
});

test('session survives reload, resets and recovers from corrupt storage',async({page})=>{
 await page.goto('/demo/#/alerts');await page.getByRole('button',{name:'Acknowledge',exact:true}).first().click();
 await page.reload();await expect(page.locator('.alert')).toHaveCount(4);
 await page.goto('/demo/#/workspace');await page.getByRole('button',{name:'Reset demo activity'}).click();await page.reload();await page.getByRole('button',{name:'Alerts',exact:false}).first().click();await expect(page.locator('.alert')).toHaveCount(5);
 await page.evaluate(()=>sessionStorage.setItem('caregrid-demo-session-v1','damaged'));await page.reload();await expect(page.getByText('Saved demo data could not be read. A fresh demo has been opened.')).toBeVisible();await expect(page.locator('.alert')).toHaveCount(5);
});
test('blocked storage leaves workflow usable with a visible limitation',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('Blocked')};Storage.prototype.getItem=()=>{throw new Error('Blocked')};});
 await page.goto('/demo/#/alerts');await expect(page.getByText('Demo session: memory only')).toBeVisible();await page.getByRole('button',{name:'Acknowledge',exact:true}).first().click();await expect(page.locator('.alert')).toHaveCount(4);
});
