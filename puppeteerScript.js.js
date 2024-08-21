const puppeteer = require('puppeteer');
const path = require('path');

async function sendBulkMessages() {
    const browser = await puppeteer.launch({ 
        headless: true, // Run in headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Additional options to run in environments like Docker
        userDataDir: path.join(process.cwd(), 'ChromeSession')
    });

    const page = await browser.newPage();
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#side', { timeout: 60000 });

    const contactName = 'Bilal';

    await page.type('div[title="Search input textbox"][data-tab="3"]', contactName);
    const chatSelector = `span[title="${contactName}"]`;

    await page.waitForSelector(chatSelector);
    await page.click(chatSelector);

    const sendButtonSelector = '#app > div > div.two._1jJ70 > div._2QgSC > div._2Ts6i._2xAQV > span > div > span > div > div > div.g0rxnol2.thghmljt.p357zi0d.rjo8vgbg.ggj6brxn.f8m0rgwh.gfz4du6o.r7fjleex.bs7a17vp > div > div.O2_ew > div._3wFFT > div';

    const sendButtonExists = await page.$(sendButtonSelector);
    if (sendButtonExists) {
        console.log('Send button found, proceeding to click.');
        await page.click(sendButtonSelector);
        console.log('Send button clicked successfully!');
    } else {
        console.log('Send button not found. Check your selector or page state.');
    }

    await browser.close();
}

module.exports = sendBulkMessages;
