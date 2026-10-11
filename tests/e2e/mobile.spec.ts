import { test, expect } from '@playwright/test';

test('mobile trip, station exclusion, compact PNG and saved trip', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Le voyage commence ici.'})).toBeVisible();
  await expect(page.getByText('Exemple fictif Sauverny')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const firstName=await page.locator('.station-name').first().textContent();
  await page.getByRole('button',{name:'Exclure',exact:true}).first().click();
  await expect(page.locator('.station-name').first()).not.toHaveText(firstName!);
  await page.getByRole('button',{name:'Modifier',exact:true}).click();
  await page.getByLabel('Batterie initiale (%)').fill('90');
  await page.getByRole('button',{name:'Calculer le voyage'}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('90 % au départ')).toBeVisible();
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(page.getByText('Trajet enregistré sur cet appareil.')).toBeVisible();
  await page.getByRole('button',{name:'Compacte',exact:true}).click();
  await expect(page.locator('section.recap')).toBeVisible();
  await expect(page.locator('section.recap .compact-stops>div')).toHaveCount(2);
  await page.getByRole('button',{name:'Partager mon trajet'}).click();
  await expect(page.getByText('Image PNG complète prête')).toBeVisible({timeout:20000});
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Télécharger le PNG'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('evtrip-recapitulatif.png');
  await download.saveAs('test-results/evtrip-recapitulatif.png');
  await page.screenshot({path:'test-results/mobile-compact.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('live provider failures are displayed without substituting demo data', async ({page}) => {
  await page.route('**/api/plan',route=>route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Fournisseur indisponible (HTTP 503).'})}));
  await page.goto('/');await page.getByRole('button',{name:'Modifier le trajet',exact:true}).click();
  await page.getByLabel('Mode de calcul').selectOption('live');
  await page.getByRole('button',{name:'Calculer le voyage'}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Fournisseur indisponible');
  await expect(page.getByRole('dialog')).toBeVisible();
});
