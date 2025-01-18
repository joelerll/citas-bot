const puppeteer = require('puppeteer')
const fs = require('fs').promises;
const { DateTime } = require("luxon");
const path = require('path')
const _ = require('lodash')
const os = require('os');

const sleep = (time = randomIntFromInterval(3000, 6000)) => new Promise(resolve => setTimeout(resolve, time))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function getVisual() {
  console.log('=== Start: ', os.platform())
  const start = DateTime.now().toFormat('MM-dd-yyyy_H_mm_ss').toLocaleString()
  const URL = 'https://apps.registrocivil.gob.ec/portalCiudadano/login.jsf'
  const browser = await puppeteer.launch({
    headless: true,
    ...(os.platform() !== 'win32' ? {
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    } : {})
  })
	try {

		const page = await browser.newPage()
		await page.goto(URL)
    await sleep()

    console.log('=== fill username')
    await page.focus('#username')
    await page.keyboard.type(process.env.PASSPORT_USER, {
      delay: 500
    })

    console.log('=== fill password')
    await page.focus('#password')
    await page.keyboard.type(process.env.PASSPORT_PASS, {
      delay: 500
    })

    await page.locator('button[title="Ingresar"]').click();
    console.log('=== loggin success')
    await page.waitForNavigation({
      waitUntil: 'networkidle0',
    });

    await sleep()

    console.log('=== removin banner')
    await page.locator('#idBannerGeneral .ui-corner-all').click()
    await sleep()
    await page.locator('#misPedidosForm a').click()
    console.log('=== go to pedidos')

    await sleep(15000)

    console.log('=== get element')
    await  page.locator('tbody tr .ui-commandlink').click();
    // await buttonContains.click()
    

    await sleep()
    console.log('=== agendar turno')
    await page.locator('a[title="Agendar turno"]').click()

    await sleep()
    console.log('=== button si')
    await page.locator('#botonTurnoSi').click()

    
    await sleep(10000)

    const elementHandle = await page.$('iframe');
    const frame = await elementHandle.contentFrame();
    await frame.waitForSelector('#content');

    await sleep()
    console.log('=== options 1')
    await frame.$eval('.ui-inputfield', el => el.click());

    await sleep()
    console.log('=== options 2')
    // await page.locator('li[data-label="GUAYAS"]').click()
    await frame.$eval('li[data-label="GUAYAS"]', el => el.click());

    await sleep(8000)
    console.log('=== options 3')
    await frame.$eval('.ui-selectonemenu-label', el => el.click());

    await sleep()
    console.log('=== options 4')
    await frame.$eval('li[data-label="GOBIERNO ZONAL (GUAYAQUIL)"]', el => el.click());

    await sleep()
    console.log('=== show pages')
    let elements = []
    const element1 = await frame.$$eval('.fc-title', els =>
      els.map(el => el.innerHTML));
    elements = [...elements, element1]

    await sleep()
    console.log('=== next button 1')
    await frame.$eval('.fc-next-button', el => el.click());
    await sleep(8000)
    const element2 = await frame.$$eval('.fc-title', els =>
      els.map(el => el.innerHTML));
    elements = [...elements, element2]

    await sleep()
    console.log('=== next button 2')
    await frame.$eval('.fc-next-button', el => el.click());
    await sleep(8000)
    const element3 = await frame.$$eval('.fc-title', els =>
      els.map(el => el.innerHTML));
    elements = [...elements, element3]

    await sleep()
    console.log('=== next button 3')
    await frame.$eval('.fc-next-button', el => el.click());
    await sleep(8000)
    const element4 = await frame.$$eval('.fc-title', els =>
      els.map(el => el.innerHTML));
    elements = [...elements, element4]

    await sleep()
    console.log('=== next button 5')
    await frame.$eval('.fc-next-button', el => el.click());
    await sleep(8000)
    const element5 = await frame.$$eval('.fc-title', els =>
      els.map(el => el.innerHTML));
    elements = [...elements, element5]
    // console.log('=== elements: ', elements)
    const end = DateTime.now().toFormat('MM-dd-yyyy_H_mm_ss').toLocaleString()
    await fs.writeFile(path.join(__dirname, 'runnings', `${start}.json`), JSON.stringify({ start, end, elements: _.flatten(elements) }, null, 2));

    await sleep()
    await fs.writeFile(path.join(__dirname, 'last_run.txt'),  `${start}:OK`)
		await browser.close()
    console.log('=== finish scrapper')
    return { start, end, elements: _.flatten(elements) }
	} catch (error) {
		console.error(error)
    await fs.writeFile(path.join(__dirname, 'runnings', `${start}.json`), JSON.stringify({ start, error }, null, 2));
    await fs.writeFile(path.join(__dirname, 'last_run.txt'),  `${start}:FAIL`)
    await browser.close()
    return { start, error }
	}
}

module.exports = getVisual