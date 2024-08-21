const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const fs = require('fs').promises;


const port = 8080;

app.use(cors());
app.use(bodyParser.json());

app.post('/PinValidation', async (req, res) => {
    const companyId = req.body.companyId;
    const PhoneNumber = req.body.cellNumber.replace(/^0+/, '');
    const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

    console.log('Received companyId:', companyId);
    console.log('PhoneNumber:', PhoneNumber);


    const ChatsSelector = 'div[title="Search input textbox"][data-tab="3"]';
    const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
    const AlertSelector = '.f8jlpxt4.iuhl9who';


    try {
        await fs.access(userDataDir);

        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: userDataDir,
        });
        const page = await browser.newPage();

        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });



        const waitForChats = page.waitForSelector(ChatsSelector, { timeout: 40000 }).then(async () => {
            console.log('Chats element found');
            return 'chats';
        });

        const waitForQR = page.waitForSelector(qrCodeSelector, { timeout: 300000 }).then(async () => {
            console.log('QR code element found');
            return 'qr';
        });

        const waitForAlert = page.waitForSelector(AlertSelector, { timeout: 40000 }).then(async () => {
            console.log('Alert element found');
            return 'alert';
        });


        const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

        if (result === 'chats') {
            console.log('Chats element found. Sending Chats response...');
            await browser.close();
            res.json({ message: 'Hello World! Chats element found.' });
        } else if (result === 'qr') {
            console.log('QR code element found. Waiting for scanning...');

            await page.waitForTimeout(2000);
            const linkWithPhoneNumberElement = await page.$('#app > div > div.landing-wrapper > div.landing-window > div.landing-main > div > div > div._3rDmx');

            if (linkWithPhoneNumberElement) {

                await linkWithPhoneNumberElement.click();

                await page.waitForTimeout(2000);
                await page.type('input[aria-label="Type your phone number."]', PhoneNumber);
                const Next = await page.$('.emrlamx0.aiput80m.h1a80dm5.sta02ykp.g0rxnol2.l7jjieqr.hnx8ox4h.f8jlpxt4.l1l4so3b.le5p0ye3.m2gb0jvt.rfxpxord.gwd8mfxi.mnh9o63b.qmy7ya1v.dcuuyf4k.swfxs4et.bgr8sfoe.a6r886iw.fx1ldmn8.orxa12fk.bkifpc9x.rpz5dbxo.bn27j4ou.oixtjehm.hjo1mxmu.snayiamo.szmswy5k');

                if (Next) {
                    await Next.click();
                    console.log('Button clicked.');

                    await page.waitForTimeout(5000);
                    const codeElements = await page.$$('.tvf2evcx.m0h2a7mj.lb5m6g5c.j7l1k36l.ktfrpxia.nu7pwgvd.p357zi0d.dnb887gk.gjuq5ydh.i2cterl7.ac2vgrno.sap93d0t.gndfcl4n.cm280p3y.rvmgzurb.ovutvysd.kab5304t.pf11cqaa.ptuh2wo7.cm7i9enn.bbr44loe.ooj5yc5b.m8i16etx.cw0ivh8j.mw4yctpw.qnz2jpws.lqdozo90.bavixdlz');

                    if (codeElements.length > 0) {
                        const codes = await Promise.all(codeElements.map(async element => {
                            return await page.evaluate(element => element.textContent, element);
                        }));
                        console.log('Codes:', codes);
                        res.status(200).json({ message: 'Verification Code ', Data: codes });
                        await page.waitForTimeout(60000);

                        const chatsElement = await page.$(ChatsSelector);
                        if (chatsElement) {
                            console.log('Chats element found after QR code scanning.');
                            await browser.close();
                        } else {
                            console.log('Chats element not found after QR code scanning.');
                        }
                    } else {
                        console.log('No code elements found.');
                    }

                } else {
                    console.log('Button not found.');
                }




                await page.waitForTimeout(10000);

            } else {
                console.log('Link with Phone Number element not found after QR code scanning.');
            }


        } else if (result === 'alert') {
            console.log('Alert Shown');
            const directoryToDelete = path.join(process.cwd(), `ChromeSession${companyId}`);

            try {
                await fs.rm(directoryToDelete, { recursive: true, force: true });
                res.status(200).json({ message: 'Please Try Again' });
                console.log(`Directory ${directoryToDelete} deleted successfully.`);
            } catch (error) {
                console.error(`Error deleting directory ${directoryToDelete}:`, error);
            }
        }


    } catch (error) {
        console.log(userDataDir);
        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: userDataDir,
        });
        const page = await browser.newPage();
        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });

        const waitForQR = page.waitForSelector(qrCodeSelector, { timeout: 100000 }).then(async () => {
            console.log('QR code element found');
            return 'qr';
        });
        const result = await Promise.race([waitForQR]);

        if (result === 'qr') {
            console.log('QR code element found. Waiting for scanning...');

            await page.waitForTimeout(2000);
            const linkWithPhoneNumberElement = await page.$('#app > div > div.landing-wrapper > div.landing-window > div.landing-main > div > div > div._3rDmx');

            if (linkWithPhoneNumberElement) {

                await linkWithPhoneNumberElement.click();

                await page.waitForTimeout(2000);
                await page.type('input[aria-label="Type your phone number."]', PhoneNumber);
                const Next = await page.$('.emrlamx0.aiput80m.h1a80dm5.sta02ykp.g0rxnol2.l7jjieqr.hnx8ox4h.f8jlpxt4.l1l4so3b.le5p0ye3.m2gb0jvt.rfxpxord.gwd8mfxi.mnh9o63b.qmy7ya1v.dcuuyf4k.swfxs4et.bgr8sfoe.a6r886iw.fx1ldmn8.orxa12fk.bkifpc9x.rpz5dbxo.bn27j4ou.oixtjehm.hjo1mxmu.snayiamo.szmswy5k');

                if (Next) {
                    await Next.click();
                    console.log('Button clicked.');

                    await page.waitForTimeout(5000);
                    const codeElements = await page.$$('.tvf2evcx.m0h2a7mj.lb5m6g5c.j7l1k36l.ktfrpxia.nu7pwgvd.p357zi0d.dnb887gk.gjuq5ydh.i2cterl7.ac2vgrno.sap93d0t.gndfcl4n.cm280p3y.rvmgzurb.ovutvysd.kab5304t.pf11cqaa.ptuh2wo7.cm7i9enn.bbr44loe.ooj5yc5b.m8i16etx.cw0ivh8j.mw4yctpw.qnz2jpws.lqdozo90.bavixdlz');

                    if (codeElements.length > 0) {
                        const codes = await Promise.all(codeElements.map(async element => {
                            return await page.evaluate(element => element.textContent, element);
                        }));
                        console.log('Codes:', codes);
                        res.status(200).json({ message: 'Verification Code ', Data: codes });
                        await page.waitForTimeout(60000);

                        const chatsElement = await page.$(ChatsSelector);
                        if (chatsElement) {
                            console.log('Chats element found after QR code scanning.');
                            await browser.close();
                        } else {
                            console.log('Chats element not found after QR code scanning.');
                        }
                    } else {
                        console.log('No code elements found.');
                    }

                } else {
                    console.log('Button not found.');
                }

                await page.waitForTimeout(10000);

            } else {
                console.log('Link with Phone Number element not found after QR code scanning.');
            }

        }
    }
});
app.post('/DeleteSession', async (req, res) => {
    const companyId = req.body.companyId;
    console.log('Received companyId:', companyId);

    const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

    const ChatsSelector = 'div[title="Search input textbox"][data-tab="3"]';
    const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
    const AlertSelector = '.f8jlpxt4.iuhl9who';
    const menu = 'span[data-icon="menu"]';
    const logoutSelector = 'div[aria-label="Log out"]';
    const logoutButton = '#app > div > span:nth-child(3) > div > div > div > div > div > div > div.p357zi0d.ns59xd2u.kcgo1i74.gq7nj7y3.lnjlmjd6.przvwfww.mc6o24uu.e65innqk.le5p0ye3 > div > button.emrlamx0.aiput80m.h1a80dm5.sta02ykp.g0rxnol2.l7jjieqr.hnx8ox4h.f8jlpxt4.l1l4so3b.le5p0ye3.m2gb0jvt.rfxpxord.gwd8mfxi.mnh9o63b.qmy7ya1v.dcuuyf4k.swfxs4et.bgr8sfoe.a6r886iw.fx1ldmn8.orxa12fk.bkifpc9x.rpz5dbxo.bn27j4ou.oixtjehm.hjo1mxmu.snayiamo.szmswy5k';


    try {
        await fs.access(userDataDir);

        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: userDataDir,
        });
        const page = await browser.newPage();

        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });



        const waitForChats = page.waitForSelector(ChatsSelector, { timeout: 40000 }).then(async () => {
            console.log('Chats element found');
            return 'chats';
        });

        const waitForQR = page.waitForSelector(qrCodeSelector, { timeout: 100000 }).then(async () => {
            console.log('QR code element found');
            return 'qr';
        });

        const waitForAlert = page.waitForSelector(AlertSelector, { timeout: 40000 }).then(async () => {
            console.log('Alert element found');
            return 'alert';
        });

        const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

        if (result === 'chats') {
            const menuElement = await page.$(menu);
            if (menuElement) {
                console.log('Menu Element Found!');
                await menuElement.click();
                await page.waitForTimeout(2000);
                const logoutElement = await page.$(logoutSelector);
                if (logoutElement) {
                    console.log('Logout Element Found!');
                    await logoutElement.click();
                    const logoutButton1 = await page.$(logoutButton);
                    if (logoutButton1) {
                        logoutButton1.click()
                        await page.waitForTimeout(3000);
                        await browser.close();
                        res.status(200).json({ message: 'Logout Successfully!' });
                    }
                    console.log('Logout Clicked');
                } else {
                    console.log('Logout Element Not Found!');
                }
            } else {
                console.log('Menu Element Not Found!');
            }
        } else if (result === 'qr') {
            console.log('QR code element found. Waiting for scanning...');
            const screenshotBuffer = await page.screenshot();
            const screenshotBase64 = screenshotBuffer.toString('base64');
            res.status(200).json({ qrCodeScreenshot: screenshotBase64, message: 'QR code found. Waiting for scanning...' });
            await page.waitForTimeout(40000);
            const chatsElement = await page.$(ChatsSelector);
            if (chatsElement) {
                console.log('Chats element found after QR code scanning.');
                await browser.close();
            } else {
                console.log('Chats element not found after QR code scanning.');
            }
        } else if (result === 'alert') {
            console.log('Alert Shown');
            const directoryToDelete = path.join(process.cwd(), `ChromeSession${companyId}`);
            try {
                await fs.rm(directoryToDelete, { recursive: true, force: true });
                res.status(200).json({ message: 'Please Try Again' });
                console.log(`Directory ${directoryToDelete} deleted successfully.`);
            } catch (error) {
                console.error(`Error deleting directory ${directoryToDelete}:`, error);
            }
        }
    } catch (error) {
        res.status(500).json({ message: 'Error ' });
    }
});

app.post('/SessionValidation', async (req, res) => {
    const companyId = req.body.companyId;
    const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

    console.log('Received companyId:', companyId);


    const ChatsSelector = 'div[title="Search input textbox"][data-tab="3"]';
    const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
    const AlertSelector = '.f8jlpxt4.iuhl9who';


    try {
        await fs.access(userDataDir);

        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: userDataDir,
        });
        const page = await browser.newPage();

        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });



        const waitForChats = page.waitForSelector(ChatsSelector, { timeout: 40000 }).then(async () => {
            console.log('Chats element found');
            return 'chats';
        });

        const waitForQR = page.waitForSelector(qrCodeSelector, { timeout: 100000 }).then(async () => {
            console.log('QR code element found');
            return 'qr';
        });

        const waitForAlert = page.waitForSelector(AlertSelector, { timeout: 40000 }).then(async () => {
            console.log('Alert element found');
            return 'alert';
        });


        const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

        if (result === 'chats') {
            console.log('Chats element found. Sending Chats response...');
            await browser.close();
            res.json({ message: 'Hello World! Chats element found.' });
        } else if (result === 'qr') {
            console.log('QR code element found. Waiting for scanning...');
            const screenshotBuffer = await page.screenshot();
            const screenshotBase64 = screenshotBuffer.toString('base64');
            res.status(200).json({ qrCodeScreenshot: screenshotBase64, message: 'QR code found. Waiting for scanning...' });
            await page.waitForTimeout(40000);

            const chatsElement = await page.$(ChatsSelector);
            if (chatsElement) {
                console.log('Chats element found after QR code scanning.');
                await browser.close();
            } else {
                console.log('Chats element not found after QR code scanning.');
            }
        } else if (result === 'alert') {
            console.log('Alert Shown');
            const directoryToDelete = path.join(process.cwd(), `ChromeSession${companyId}`);

            // console.log(directoryToDelete);
            try {
                await fs.rm(directoryToDelete, { recursive: true, force: true });
                res.status(200).json({ message: 'Please Try Again' });
                console.log(`Directory ${directoryToDelete} deleted successfully.`);
            } catch (error) {
                console.error(`Error deleting directory ${directoryToDelete}:`, error);
            }
        }


    } catch (error) {
        console.log(userDataDir);
        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: userDataDir,
        });
        const page = await browser.newPage();
        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });

        const waitForQR = page.waitForSelector(qrCodeSelector, { timeout: 100000 }).then(async () => {
            console.log('QR code element found');
            return 'qr';
        });
        const result = await Promise.race([waitForQR]);

        if (result === 'qr') {
            const screenshotBuffer = await page.screenshot();
            const screenshotBase64 = screenshotBuffer.toString('base64');
            res.status(200).json({ qrCodeScreenshot: screenshotBase64, message: 'QR code found. Waiting for scanning...' });
            await page.waitForTimeout(20000);

            const chatsElement = await page.$(ChatsSelector);
            if (chatsElement) {
                console.log('Chats element found after QR code scanning.');
                await browser.close();
            } else {
                console.log('Chats element not found after QR code scanning.');
            }
        }
    }
});

app.post('/tableData', async (req, res) => {

    const dataArray = req.body;
    const updatedArray = [];
    console.log(dataArray.companyId);


    const qrCodeSelector = 'canvas[aria-label="Scan me!"]';

    try {
        const browser = await puppeteer.launch({
            headless: false,
            channel: 'chrome',
            userDataDir: path.join(process.cwd(), `ChromeSession${dataArray.companyId}`)
        });

        const page = await browser.newPage();
        await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('#side', { timeout: 60000 });

        await page.waitForTimeout(2000);

        function formatPhoneNumber(phoneNumber) {

            const numericOnly = phoneNumber.replace(/\D/g, '');

            const formattedNumber = `+92 ${numericOnly.slice(1, 4)} ${numericOnly.slice(4, 11)}`;

            return formattedNumber;
        }

        const HelperContact = formatPhoneNumber(dataArray.cellNumber);
        console.log(HelperContact);

        for (const data of dataArray.dataArray) {

            const contactName = data.cellNumber;
            const message = data.Message;
            const GroupName = data.GroupName;
            console.log(contactName);
            console.log(message);

            if (contactName && message) {
                await page.waitForTimeout(2000);

                const contactName = formatPhoneNumber(data.cellNumber);

                const Msg = data.Message;
                console.log(GroupName);

                if (GroupName !== "") {

                    await page.type('div[title="Search input textbox"][data-tab="3"]', GroupName);

                    await page.waitForTimeout(2000);

                    const chatSelector = `span[title="${GroupName}"]`;

                    await page.waitForTimeout(3000);
                    const chatElement = await page.$(chatSelector);

                    if (chatElement) {
                        console.log('Chat Exist !');
                        await page.click(chatSelector);
                        await page.waitForTimeout(2000);
                        await page.type('div[title="Type a message"][data-tab="10"]', Msg);
                        await page.keyboard.press('Enter');
                        data.Status = 1;
                        updatedArray.push(data);
                        await page.waitForTimeout(2000);
                    } else {
                        console.log('nhi mili');
                    }
                } else {

                    await page.type('div[title="Search input textbox"][data-tab="3"]', contactName);

                    await page.waitForTimeout(2000);

                    const chatSelector = `span[title="${contactName}"]`;

                    await page.waitForTimeout(2000);

                    const chatElement = await page.$(chatSelector);

                    if (chatElement) {
                        await page.click(chatSelector);

                        await page.type('div[title="Type a message"][data-tab="10"]', Msg);
                        await page.waitForTimeout(3000);
                        await page.keyboard.press('Enter');
                        data.Status = 1;
                        updatedArray.push(data);
                        await page.waitForTimeout(1000);
                    } else {
                        const UserId = data.ID;
                        const contactNumber = data.cellNumber;
                        const message = data.Message;
                        const formattedContactNumber = contactNumber.startsWith("0")
                            ? "92" + contactNumber.slice(1)
                            : contactNumber;

                        async function deleteText(selector, times) {
                            await page.focus(selector);
                            for (let i = 0; i < times; i++) {
                                await page.keyboard.press('Backspace');
                            }
                        }
                        const link = `https://wa.me/${formattedContactNumber}`;

                        const Groupname = HelperContact;

                        const getText = await page.$eval('.selectable-text', el => el.innerText);
                        const textLength = getText.length;
                        await deleteText('.selectable-text', textLength);
                        await page.waitForTimeout(1000);

                        await page.type('div[title="Search input textbox"][data-tab="3"]', Groupname);

                        await page.waitForTimeout(3000);
                        const chatSelector = `span[title="${Groupname}"]`;
                        console.log(chatSelector);

                        await page.$(chatSelector);
                        await page.click(chatSelector);
                        await page.waitForTimeout(3000);

                        await page.type('div[title="Type a message"][data-tab="10"]', link);
                        await page.keyboard.press('Enter');

                        const linkSelector = `a[href="${link}"]`;
                        const NewChat = await page.$(linkSelector);

                        if (NewChat) {
                            console.log('mila');
                            await NewChat.click();
                            await page.waitForTimeout(3000);
                            await page.type('div[title="Type a message"][data-tab="10"]', Msg);
                            await page.keyboard.press('Enter');
                            data.Status = 1;
                            updatedArray.push(data);
                        } else {
                            console.log('Link not found. Performing alternative action...');
                        }

                        await page.waitForTimeout(2000);

                        const InvalidAccountSelector = '.f8jlpxt4.iuhl9who';

                        try {
                            const invalidAccountElement = await page.$(InvalidAccountSelector);
                            console.log(invalidAccountElement);
                            if (invalidAccountElement) {
                                const invalidAccountText = await page.$eval(InvalidAccountSelector, element => element.textContent.trim());
                                if (invalidAccountText === 'Phone number shared via url is invalid.') {
                                    const OKbutton = '#app > div > span:nth-child(3) > div > span > div > div > div > div > div > div.p357zi0d.ns59xd2u.kcgo1i74.gq7nj7y3.lnjlmjd6.przvwfww.mc6o24uu.e65innqk.le5p0ye3 > div > button > div > div';
                                    data.Status = 2;
                                    updatedArray.push(data);
                                    await page.click(OKbutton);
                                    await page.waitForTimeout(2000);
                                }
                            }
                        } catch (error) {
                            console.error('Error during the process:', error.message);
                            data.Status = 0;
                            updatedArray.push(data);
                        }
                    }
                }

            } else {
                data.Status = 0;
                updatedArray.push(data);
            }
        }

        const folderName = `Record/${dataArray.companyId}`;
        const jsonFileName = `${folderName}/CompanyRecord.json`;
        try {
            await fs.access(folderName);

            try {

                await fs.access(jsonFileName);

                const existingData = JSON.parse(await fs.readFile(jsonFileName, 'utf-8'));

                const currentDate = new Date().toLocaleDateString('en-GB');

                let currentDateExists = false;

                const successfulUpdates = updatedArray.filter(item => item.Status === 1);
                const successfulUpdatesCount = successfulUpdates.length;

                existingData.forEach(item => {
                    if (item.currentDate === currentDate) {
                        currentDateExists = true;
                        item.successfulUpdatesCount += successfulUpdatesCount;
                    }
                });

                if (!currentDateExists) {
                    existingData.push({
                        companyId: dataArray.companyId,
                        messageSent: "Company Data",
                        successfulUpdatesCount: successfulUpdatesCount,
                        currentDate: currentDate,
                    });
                }
                await fs.writeFile(jsonFileName, JSON.stringify(existingData, null, 2), 'utf-8');
                console.log(`JSON file '${jsonFileName}' updated successfully.`);
            } catch (jsonFileError) {
                const currentDate = new Date().toLocaleDateString('en-GB');
                const dataToWrite = {
                    companyId: dataArray.companyId,
                    messageSent: "Company Data ",
                    successfulUpdatesCount: successfulUpdatesCount,
                    currentDate: currentDate,
                };
                await fs.writeFile(jsonFileName, JSON.stringify(dataToWrite, null, 2), 'utf-8');
                console.log(`JSON file '${jsonFileName}' created successfully.`);
            }
        } catch (error) {
            await fs.mkdir(folderName);

            const successfulUpdates = updatedArray.filter(item => item.Status === 1);
            const successfulUpdatesCount = successfulUpdates.length;
            const currentDate = new Date().toLocaleDateString('en-GB');
            const dataToWrite = {
                companyId: dataArray.companyId,
                messageSent: "Company Data ",
                successfulUpdatesCount: successfulUpdatesCount,
                currentDate: currentDate,
            };

            const emptyArrayData = [];

            try {
                await fs.access(jsonFileName);
            } catch (fileNotFoundError) {
                await fs.writeFile(jsonFileName, JSON.stringify(emptyArrayData, null, 2), 'utf-8');
                console.log(`JSON file '${jsonFileName}' created successfully with an empty array.`);
            }

            const existingData = JSON.parse(await fs.readFile(jsonFileName, 'utf-8'));

            existingData.push(dataToWrite);

            await fs.writeFile(jsonFileName, JSON.stringify(existingData, null, 2), 'utf-8');
            console.log(`Folder '${folderName}' created successfully.`);
            console.log(`JSON file '${jsonFileName}' updated successfully.`);
        }
        res.status(200).json({ updatedArray, message: 'Data received and processed successfully' });
        await browser.close();
    } catch (error) {
        console.error('Error processing data array:', error);
        res.status(500).json({ message: 'Success', updatedArray: updatedArray });
    }
});

app.listen(port, '192.168.100.2', () => {
    console.log(`Server is listening at http://192.168.100.2:${port}`);
});
