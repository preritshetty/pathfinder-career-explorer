import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('complete survey, ranking with keyboard, refresh recovery and AI error retry',async({page})=>{
 let questionCalls=0,reportCalls=0,reportAttempts=0;
 page.on('request',r=>{if(r.url().endsWith('/api/followups'))questionCalls++;if(r.url().endsWith('/api/report'))reportCalls++;});
 await page.route('**/api/report',async route=>{if(++reportAttempts===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'The AI service is busy. Your answers are saved. Please retry AI generation.'})});await route.continue();});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Your next big idea/})).toBeVisible();
 let scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
 await page.getByLabel('What grade are you in?').selectOption('6');await page.getByRole('button',{name:'Let’s begin'}).click();
 await page.locator('.answer-option').first().focus();await page.keyboard.press('Space');await expect(page.locator('.answer-option').first()).toHaveAttribute('aria-pressed','true');
 await page.locator('.answer-option').nth(1).focus();await page.keyboard.press('Space');await expect(page.locator('.answer-option').nth(1)).toHaveAttribute('aria-pressed','true');
 await page.locator('.answer-option').nth(2).click();await expect(page.locator('[aria-pressed="true"]')).toHaveCount(3);
 await page.reload();await expect(page.locator('[aria-pressed="true"]')).toHaveCount(3);
 scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 for(let i=1;i<30;i++){await page.locator('.answer-option').first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();}
 await expect(page.locator('.question-count')).toHaveText('31 / 40');expect(questionCalls).toBe(1);
 await page.reload();await expect(page.locator('.question-count')).toHaveText('31 / 40');expect(questionCalls).toBe(1);
 for(let i=0;i<10;i++){await page.locator('.answer-option').first().click();await page.getByRole('button',{name:i===9?'See my report':'Continue',exact:true}).click();}
 await expect(page.getByRole('alert')).toContainText('answers are saved');await page.reload();await expect(page.locator('.question-count')).toHaveText('40 / 40');
 await page.getByRole('button',{name:'See my report'}).click();await expect(page.locator('.report-head h1')).toHaveText('A few directions to explore');expect(reportCalls).toBe(2);
 await page.reload();await expect(page.locator('.report-head h1')).toHaveText('A few directions to explore');expect(reportCalls).toBe(2);
 await expect(page.getByText('One thing to try this week',{exact:true})).toBeVisible();
 scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
 await expect(page.locator('.career-dossier')).toHaveCount(4);
 await expect(page.locator('.dimension-block')).toHaveCount(6);
 await page.evaluate(()=>{window.printChecks={events:0,allExpanded:false};window.addEventListener('beforeprint',()=>{window.printChecks.events++;window.printChecks.allExpanded=[...document.querySelectorAll('.report-shell details')].every(el=>el.open);});});
 const openBefore=await page.locator('details[open]').count();
 await page.getByRole('button',{name:'Print / save PDF'}).click();
 await expect.poll(()=>page.evaluate(()=>window.printChecks.events)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.printChecks.allExpanded)).toBe(true);
 await page.pdf({path:test.info().outputPath('report.pdf'),format:'A4',printBackground:true,margin:{top:'12mm',right:'12mm',bottom:'12mm',left:'12mm'}});
 expect(await page.locator('details[open]').count()).toBe(openBefore);
 await page.getByRole('button',{name:'Start over',exact:true}).click();await page.reload();await expect(page.getByRole('heading',{name:/Your next big idea/})).toBeVisible();
});
