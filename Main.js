const express = require("express");
const https = require("https");
const axios = require("axios");
const puppeteer = require("puppeteer");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const port = 8011;

app.use(cors());
app.use(bodyParser.json());

app.get("/", async (req, res, Next) => {
  res.json({ message: "Hello World! Chats element found." });
});
const ChatsSelector = 'div[aria-label="Search"][data-tab="3"]';
const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
const AlertSelector = ".f8jlpxt4.iuhl9who";
const menu = 'span[data-icon="menu"]';
const logoutSelector = 'div[aria-label="Log out"]';
const logoutButton =
  "#app > div > span:nth-child(3) > div > div > div > div > div > div > div.p357zi0d.ns59xd2u.kcgo1i74.gq7nj7y3.lnjlmjd6.przvwfww.mc6o24uu.e65innqk.le5p0ye3.m2gb0jvt.rfxpxord.gwd8mfxi.mnh9o63b.qmy7ya1v.dcuuyf4k.swfxs4et.bgr8sfoe.a6r886iw.fx1ldmn8.orxa12fk.bkifpc9x.rpz5dbxo.bn27j4ou.oixtjehm.hjo1mxmu.snayiamo.szmswy5k";

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, "files");
    try {
      await fs.access(uploadDir);
    } catch (error) {
      // Directory does not exist, create it
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

async function ensureFolderExists(folderName) {
  try {
    await fs.access(folderName);
  } catch {
    await fs.mkdir(folderName, { recursive: true });
  }
}
async function readJsonFile(jsonFileName) {
  try {
    const fileContent = await fs.readFile(jsonFileName, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return [];
  }
}
async function writeJsonFile(jsonFileName, data) {
  try {
    await fs.writeFile(jsonFileName, JSON.stringify(data, null, 2), "utf-8");
    console.log(`JSON file '${jsonFileName}' updated successfully.`);
  } catch (err) {
    console.error(`Error writing to JSON file '${jsonFileName}':`, err.message);
  }
}
async function updateCompanyRecord(
  folderName,
  jsonFileName,
  msgLength,
  CompId
) {
  await ensureFolderExists(folderName);
  console.log(msgLength + " length ");

  const existingData = await readJsonFile(jsonFileName);

  const currentDate = new Date().toLocaleDateString("en-GB");
  const countersNeeded = Math.ceil(msgLength / 160);

  let currentDateExists = false;

  existingData.forEach((item) => {
    if (item.currentDate === currentDate) {
      currentDateExists = true;
      item.successfulUpdatesCount += countersNeeded;
      console.log(item.successfulUpdatesCount + " successfulUpdatesCount");
    }
  });
  if (!currentDateExists) {
    existingData.push({
      companyId: CompId,
      messageSent: "Company Data",
      successfulUpdatesCount: countersNeeded,
      currentDate: currentDate,
    });
  }
  await writeJsonFile(jsonFileName, existingData);
  return {
    success: true,
    message: `Data for company ID ${CompId} updated successfully.`,
  };
}

app.post("/receiveimages", (req, res) => {
  console.log("Received payload:", req.body);
  const { image } = req.body;
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const todayDate = new Date().toISOString().split("T")[0].replace(/-/g, "");
  // Create a concise filename
  const uniqueFilename = `pic_${todayDate}.png`;
  const filename = path.join(imagesDir, uniqueFilename);

  try {
    fs.writeFile(filename, buffer);
    console.log("Image saved successfully.");

    res.send({ message: "Image received and saved successfully." });
  } catch (error) {
    console.error("Error writing file:", error);
    res.status(500).send({ error: "Error saving image." });
  }
});

app.post("/PinValidation", async (req, res) => {
  const companyId = req.body.companyId;
  const PhoneNumber = req.body.cellNumber;
  const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

  console.log("Received companyId:", companyId);
  console.log("PhoneNumber:", PhoneNumber);

  try {
    await fs.mkdir(userDataDir, { recursive: true });
    console.log(
      `Directory ${userDataDir} created successfully or already exists.`
    );

    const browser = await puppeteer.launch({
      headless: false,
      slowMo: 250,
      userDataDir: userDataDir,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      ignoreDefaultArgs: ["--disable-extensions"],
    });

    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });
    console.log("Navigated to WhatsApp Web");

    const waitForChats = page
      .waitForSelector(ChatsSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Chats element found");
        return "chats";
      });

    const waitForQR = page
      .waitForSelector(qrCodeSelector, { timeout: 300000 })
      .then(async () => {
        console.log("QR code element found");
        return "qr";
      });

    const waitForAlert = page
      .waitForSelector(AlertSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Alert element found");
        return "alert";
      });

    const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

    if (result === "chats") {
      console.log("Chats element found. Sending Chats response...");
      await browser.close();
      res.json({ message: "Hello World! Chats element found." });
    } else if (result === "qr") {
      console.log("QR code element found. Waiting for scanning...");
      try {
        const screenshotBuffer = await page.screenshot();
        const screenshotBase64 = screenshotBuffer.toString("base64");
        console.log(`Screenshot base64 length: ${screenshotBase64.length}`);
        res
          .status(200)
          .json({
            qrCodeScreenshot: screenshotBase64,
            message: "QR code found. Waiting for scanning...",
          });

        await new Promise((resolve) => setTimeout(resolve, 40000)); // Replace page.waitForTimeout with a setTimeout

        const chatsElement = await page.$(ChatsSelector);
        if (chatsElement) {
          console.log("Chats element found after QR code scanning.");
          await browser.close();
        } else {
          console.log("Chats element not found after QR code scanning.");
          await browser.close();
        }
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        res.status(500).json({ error: "Failed to capture screenshot." });
        await browser.close();
      }
    } else if (result === "alert") {
      console.log("Alert Shown");
      const directoryToDelete = path.join(
        process.cwd(),
        `ChromeSession${companyId}`
      );
      try {
        await fs.rm(directoryToDelete, { recursive: true, force: true });
        res.status(200).json({ message: "Please Try Again" });
        console.log(`Directory ${directoryToDelete} deleted successfully.`);
        await browser.close();
      } catch (error) {
        console.error(`Error deleting directory ${directoryToDelete}:`, error);
        res.status(500).json({ message: "Error deleting directory" });
        await browser.close();
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error" });
    await browser.close();
  }
});
app.post("/DeleteSession", async (req, res) => {
  const companyId = req.body.companyId;
  console.log("Received companyId:", companyId);

  const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

  const ChatsSelector = 'div[aria-label="Search"][data-tab="3"]';
  const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
  const AlertSelector = ".f8jlpxt4.iuhl9who";
  const menu = 'span[data-icon="menu"]';
  const logoutSelector = 'div[aria-label="Log out"]';
  const logoutButton =
    "#app > div > span:nth-child(3) > div > div > div > div > div > div > div.p357zi0d.ns59xd2u.kcgo1i74.gq7nj7y3.lnjlmjd6.przvwfww.mc6o24uu.e65innqk.le5p0ye3 > div > button.emrlamx0.aiput80m.h1a80dm5.sta02ykp.g0rxnol2.l7jjieqr.hnx8ox4h.f8jlpxt4.l1l4so3b.le5p0ye3.m2gb0jvt.rfxpxord.gwd8mfxi.mnh9o63b.qmy7ya1v.dcuuyf4k.swfxs4et.bgr8sfoe.a6r886iw.fx1ldmn8.orxa12fk.bkifpc9x.rpz5dbxo.bn27j4ou.oixtjehm.hjo1mxmu.snayiamo.szmswy5k";

  try {
    await fs.access(userDataDir);

    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: userDataDir,
    });
    const page = await browser.newPage();

    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    const waitForChats = page
      .waitForSelector(ChatsSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Chats element found");
        return "chats";
      });

    const waitForQR = page
      .waitForSelector(qrCodeSelector, { timeout: 100000 })
      .then(async () => {
        console.log("QR code element found");
        return "qr";
      });

    const waitForAlert = page
      .waitForSelector(AlertSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Alert element found");
        return "alert";
      });

    const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

    if (result === "chats") {
      const menuElement = await page.$(menu);
      if (menuElement) {
        console.log("Menu Element Found!");
        await menuElement.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const logoutElement = await page.$(logoutSelector);
        if (logoutElement) {
          console.log("Logout Element Found!");
          await logoutElement.click();
          const logoutButton1 = await page.$(logoutButton);
          if (logoutButton1) {
            logoutButton1.click();
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await browser.close();
            res.status(200).json({ message: "Logout Successfully!" });
          }
          console.log("Logout Clicked");
        } else {
          console.log("Logout Element Not Found!");
        }
      } else {
        console.log("Menu Element Not Found!");
      }
    } else if (result === "qr") {
      console.log("QR code element found. Waiting for scanning...");
      const screenshotBuffer = await page.screenshot();
      const screenshotBase64 = screenshotBuffer.toString("base64");
      res
        .status(200)
        .json({
          qrCodeScreenshot: screenshotBase64,
          message: "QR code found. Waiting for scanning...",
        });
      await page.waitForTimeout(40000);
      const chatsElement = await page.$(ChatsSelector);
      if (chatsElement) {
        console.log("Chats element found after QR code scanning.");
        await browser.close();
      } else {
        console.log("Chats element not found after QR code scanning.");
      }
    } else if (result === "alert") {
      console.log("Alert Shown");
      const directoryToDelete = path.join(
        process.cwd(),
        `ChromeSession${companyId}`
      );
      try {
        await fs.rm(directoryToDelete, { recursive: true, force: true });
        res.status(200).json({ message: "Please Try Again" });
        console.log(`Directory ${directoryToDelete} deleted successfully.`);
      } catch (error) {
        console.error(`Error deleting directory ${directoryToDelete}:`, error);
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Error " });
  }
});
app.post("/SessionValidation", async (req, res) => {
  const companyId = req.body.companyId;
  const Number = req.body.number;
  const userDataDir = path.join(process.cwd(), `ChromeSession${companyId}`);

  console.log("Received companyId:", companyId);

  const ChatsSelector = 'div[data-tab="3"]';
  const qrCodeSelector = 'canvas[aria-label="Scan me!"]';
  const AlertSelector = ".f8jlpxt4.iuhl9who";

  try {
    await fs.access(userDataDir);

    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: userDataDir,
    });

    const page = await browser.newPage();

    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    const waitForChats = page
      .waitForSelector(ChatsSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Chats element found");
        return "chats";
      });

    const waitForQR = page
      .waitForSelector(qrCodeSelector, { timeout: 100000 })
      .then(async () => {
        console.log("QR code element found");
        return "qr";
      });

    const waitForAlert = page
      .waitForSelector(AlertSelector, { timeout: 40000 })
      .then(async () => {
        console.log("Alert element found");
        return "alert";
      });

    const result = await Promise.race([waitForChats, waitForQR, waitForAlert]);

    if (result === "chats") {
      console.log("Chats element found. Sending Chats response...");
      res.json({ message: "Hello World! Chats element found." });
      await browser.close();
    } else if (result === "qr") {
      console.log("QR code element found. Waiting for scanning...");
      const screenshotBuffer = await page.screenshot();
      const screenshotBase64 = screenshotBuffer.toString("base64");
      res
        .status(200)
        .json({
          qrCodeScreenshot: screenshotBase64,
          message: "QR code found. Waiting for scanning...",
        });
      await new Promise((resolve) => setTimeout(resolve, 40000));
      //const chatsElement = await page.$(ChatsSelector);
      // if (chatsElement) {
      //     console.log('Chats element found after QR code scanning.');
      //     await browser.close();
      // } else {
      //     console.log('Chats element not found after QR code scanning.');
      //     await browser.close();
      // }
    } else if (result === "alert") {
      console.log("Alert Shown");
      const directoryToDelete = path.join(
        process.cwd(),
        `ChromeSession${companyId}`
      );

      // console.log(directoryToDelete);
      try {
        await fs.rm(directoryToDelete, { recursive: true, force: true });
        res.status(200).json({ message: "Please Try Again" });
        console.log(`Directory ${directoryToDelete} deleted successfully.`);
      } catch (error) {
        console.error(`Error deleting directory ${directoryToDelete}:`, error);
      }
    }
  } catch (error) {
    console.log(error);
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: userDataDir,
    });
    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    const waitForQR = page
      .waitForSelector(qrCodeSelector, { timeout: 100000 })
      .then(async () => {
        console.log("QR code element found");
        return "qr";
      });
    const result = await Promise.race([waitForQR]);

    if (result === "qr") {
      const screenshotBuffer = await page.screenshot();
      const screenshotBase64 = screenshotBuffer.toString("base64");
      res
        .status(200)
        .json({
          qrCodeScreenshot: screenshotBase64,
          message: "QR code found. Waiting for scanning...",
        });
      await new Promise((resolve) => setTimeout(resolve, 20000));

      const chatsElement = await page.$(ChatsSelector);
      if (chatsElement) {
        console.log("Chats element found after QR code scanning.");
        await browser.close();
      } else {
        console.log("Chats element not found after QR code scanning.");
        await browser.close();
      }
    }
  }
});
app.post("/grouplinks", async (req, res) => {
  const linksArray = req.body;
  console.log("Received links array:", linksArray);
  try {
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: path.join(
        process.cwd(),
        `ChromeSession${linksArray.companyId}`
      ),
    });

    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#side", { timeout: 60000 });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    function formatPhoneNumber(phoneNumber) {
      const numericOnly = phoneNumber.replace(/\D/g, "");
      const formattedNumber = `+92 ${numericOnly.slice(
        1,
        4
      )} ${numericOnly.slice(4, 11)}`;
      return formattedNumber;
    }

    const HelperContact = formatPhoneNumber(linksArray.Number);
    console.log(HelperContact);

    for (const link of linksArray.dataArray) {
      await page.type('div[aria-label="Search"][data-tab="3"]', HelperContact);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatSelector = `span[title="${HelperContact}"]`;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatElement = await page.$(chatSelector);

      if (chatElement) {
        console.log("Chat Exist !");
        await page.click(chatSelector);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await page.type(
          'div[aria-label="Type a message"][data-tab="10"]',
          link
        );
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
        const link1 = `${link}`;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const linkSelector = `a[href="${link1}"]`;
        const NewChat = await page.$(linkSelector);
        const selector =
          ".x889kno.x1a8lsjc.xbbxn1n.xxbr6pl.x1n2onr6.x1rg5ohu.xk50ysn.x1f6kntn.xyesn5m.x1z11no5.xjy5m1g.x1mnwbp6.x4pb5v6.x1i1c1dq.x87ea8o.x196p5u9.x1t2x6vz.x1hl8ikr.xfagghw.x9dyr19.x9lcvmn.xbtce8p.x14v0smp.xo8ufso.xcjl5na.x1k3x3db.xuxw1ft.xv52azi";
        await page.waitForTimeout(2000);
        if (NewChat) {
          await NewChat.click();
          await page.waitForTimeout(2000);
          console.log("NewChat clicked");
          const button = await page.$(selector);
          console.log(button + "button");
          await page.waitForTimeout(1500);
          if (button) {
            await button.click();
          } else {
            console.log("Button not found");
          }
          await page.waitForTimeout(1500);
        } else {
          await page.waitForTimeout(5000);
          console.log("Link not found. Performing alternative action...");
        }
      } else {
        console.log("Chat Not Exist");
      }
    }
    await page.type('div[aria-label="Search"][data-tab="3"]', HelperContact);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const chatSelector = `span[title="${HelperContact}"]`;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const chatElement = await page.$(chatSelector);
    const menu = 'span[data-icon="menu"].xr9ek0c';
    const chatclear = 'div[aria-label="Clear chat"]';
    const clearButton =
      "#app > div > span:nth-child(3) > div > div > div > div > div > div > div.x78zum5.x8hhl5t.x13a6bvl.x13crsa5.x1mpkggp.x18d9i69.x1t2a60a.xp4054r.xuxw1ft > div > button.x889kno.x1a8lsjc.xbbxn1n.xxbr6pl.x1n2onr6.x1rg5ohu.xk50ysn.x1f6kntn.xyesn5m.x1z11no5.xjy5m1g.x1mnwbp6.x4pb5v6.x1i1c1dq.x87ea8o.x196p5u9.x1t2x6vz.x1hl8ikr.xfagghw.x9dyr19.x9lcvmn.xbtce8p.x14v0smp.xo8ufso.xcjl5na.x1k3x3db.xuxw1ft.xv52azi > div > div";
    if (chatElement) {
      console.log("Chat Exist !");
      await page.click(chatSelector);
      const menuElement = await page.$(menu);
      if (menuElement) {
        await menuElement.click();
        const ChatElement = await page.$(chatclear);
        if (ChatElement) {
          await ChatElement.click();
          const clearButton1 = await page.$(clearButton);
          if (clearButton1) {
            await clearButton1.click();
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    res.json({ message: "success" });
    await browser.close();
  } catch (error) {
    console.error("Error processing data array:", error);
    res
      .status(500)
      .json({ message: "Error processing data array", error: error });
    return;
  }
  res.json({ success: true, message: "Links received successfully" });
});
app.post("/tableData", async (req, res) => {
  const dataArray = req.body;
  const updatedArray = [];
  var Status = dataArray.validation.Status;
  var limit = dataArray.validation.limit;
  console.log(Status);
  console.log(limit);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  const qrCodeSelector = 'canvas[aria-label="Scan me!"]';

  try {
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: path.join(
        process.cwd(),
        `ChromeSession${dataArray.companyId}`
      ),
    });

    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#side", { timeout: 60000 });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    function formatPhoneNumber(phoneNumber) {
      const numericOnly = phoneNumber.replace(/\D/g, "");
      const formattedNumber = `+92 ${numericOnly.slice(
        1,
        4
      )} ${numericOnly.slice(4, 11)}`;
      return formattedNumber;
    }

    const HelperContact = formatPhoneNumber(dataArray.cellNumber);
    console.log(HelperContact);

    for (const data of dataArray.dataArray) {
      let successfulUpdatesCount = 0;
      const folderName = `Record/${dataArray.companyId}`;
      const jsonFileName = `${folderName}/CompanyRecord.json`;
      try {
        const fileContent = await fs.readFile(jsonFileName, "utf8");
        const data = JSON.parse(fileContent);
        const currentDate = new Date().toLocaleDateString("en-GB");
        const currentDateRecord = data.find(
          (record) => record.currentDate === currentDate
        );
        successfulUpdatesCount = currentDateRecord
          ? currentDateRecord.successfulUpdatesCount
          : 0;
      } catch (err) {
        console.error("Error reading or parsing JSON file:", err);
      }
      const contactName = data.cellNumber;
      const message = data.Message;
      const GroupName = data.GroupName;
      const rawMsg = data.Message;

      const Msg = rawMsg
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const countersNeeded = Math.ceil(Msg.length / 160);
      console.log(countersNeeded + "countersNeeded");
      const AfterAddition = countersNeeded + successfulUpdatesCount;
      console.log(AfterAddition + "AfterAddition");

      if (contactName && message && AfterAddition <= limit) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const contactName = formatPhoneNumber(data.cellNumber);
        console.log(contactName);
        if (GroupName !== "") {
          await page.type('div[aria-label="Search"][data-tab="3"]', GroupName);
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const chatSelector = `span[title="${GroupName}"]`;

          await new Promise((resolve) => setTimeout(resolve, 3000));
          const chatElement = await page.$(chatSelector);

          if (chatElement) {
            console.log("Chat Exist !");
            await page.click(chatSelector);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await page.type(
              'div[aria-label="Type a message"][data-tab="10"]',
              Msg
            );
            await page.keyboard.press("Enter");
            data.Status = 1;

            console.log(data);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            console.log("nhi mili");
          }
        } else {
          await page.type(
            'div[aria-label="Search"][data-tab="3"]',
            contactName
          );

          await new Promise((resolve) => setTimeout(resolve, 2000));

          const chatSelector = `span[title="${contactName}"]`;

          await new Promise((resolve) => setTimeout(resolve, 2000));

          const chatElement = await page.$(chatSelector);
          if (chatElement) {
            await page.click(chatSelector);
            await page.type(
              'div[aria-label="Type a message"][data-tab="10"]',
              Msg
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await page.keyboard.press("Enter");
            try {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const response = await updateCompanyRecord(
                folderName,
                jsonFileName,
                Msg.length,
                dataArray.companyId,
                1
              );
              console.log(
                "Response from updateCompanyRecord1:",
                response.message
              );
              console.log("updateCompanyRecord1");
              await new Promise((resolve) => setTimeout(resolve, 2000));
              if (response.message) {
                data.Status = 1;
                updatedArray.push(data);
                console.log("Company record update process completed.");
              }
              await new Promise((resolve) => setTimeout(resolve, 5000));
            } catch (err) {
              console.error("Error in company record update process:", err);
            }
            await new Promise((resolve) => setTimeout(resolve, 10000));
          } else {
            const UserId = data.ID;
            const contactNumber = data.cellNumber;
            const message = data.Message;
            const cleanedContactNumber = contactNumber.replace(/\s+/g, "");
            const formattedContactNumber = cleanedContactNumber.startsWith("0")
              ? "92" + cleanedContactNumber.slice(1)
              : cleanedContactNumber;

            async function deleteText(selector, times) {
              await page.focus(selector);
              for (let i = 0; i < times; i++) {
                await page.keyboard.press("Backspace");
              }
            }

            const link = `https://wa.me/${formattedContactNumber}`;

            const Groupname = HelperContact;

            const getText = await page.$eval(
              ".selectable-text",
              (el) => el.innerText
            );
            const textLength = getText.length;
            await deleteText(".selectable-text", textLength);
            await new Promise((resolve) => setTimeout(resolve, 5000));

            await page.type(
              'div[aria-label="Search"][data-tab="3"]',
              Groupname
            );

            await new Promise((resolve) => setTimeout(resolve, 2000));
            const chatSelector = `span[title="${Groupname}"]`;
            console.log(chatSelector);

            await page.$(chatSelector);
            await page.click(chatSelector);
            await new Promise((resolve) => setTimeout(resolve, 3000));

            await page.type(
              'div[aria-label="Type a message"][data-tab="10"]',
              link
            );
            await page.keyboard.press("Enter");

            const linkSelector = `a[href="${link}"]`;
            const NewChat = await page.$(linkSelector);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const InvalidAccountSelector =
              "#app > div > span:nth-child(3) > div > span > div > div > div > div > div > div.x12lqup9.x1o1kx08";
            const SelectButton =
              "#app > div > span:nth-child(3) > div > span > div > div > div > div > div > div.x78zum5.x8hhl5t.x13a6bvl.x13crsa5.x1mpkggp.x18d9i69.x1t2a60a.xp4054r.xuxw1ft > div > button";
            if (NewChat) {
              await NewChat.click();
              await new Promise((resolve) => setTimeout(resolve, 3000));
              const invalidAccountElement = await page.$(
                InvalidAccountSelector
              );
              if (invalidAccountElement) {
                console.log(
                  "Invalid account element detected. Performing action..."
                );
                const invalidAccountText = await page.$eval(
                  InvalidAccountSelector,
                  (element) => element.textContent.trim()
                );

                if (
                  invalidAccountText ===
                  "Phone number shared via url is invalid."
                ) {
                  try {
                    console.log(invalidAccountText);
                    data.Status = 0;
                    updatedArray.push(data);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    await page.click(SelectButton);
                  } catch (err) {
                    console.error(
                      "Error in company record update process:",
                      err
                    );
                  }
                }
              } else {
                const inputFieldSelector =
                  'div[aria-label="Type a message"][data-tab="10"]';
                await page.waitForSelector(inputFieldSelector);
                await page.type(inputFieldSelector, Msg);
                await page.keyboard.press("Enter");

                try {
                  const response = await updateCompanyRecord(
                    folderName,
                    jsonFileName,
                    Msg.length,
                    dataArray.companyId,
                    2
                  );
                  console.log("Response from updateCompanyRecord2:", response);
                  console.log("updateCompanyRecord2");
                  data.Status = 1;
                  updatedArray.push(data);
                  console.log("Company record update process completed.");
                } catch (err) {
                  console.error("Error in company record update process:", err);
                  data.Status = 0;
                  updatedArray.push(data);
                }

                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
            } else {
              console.log("Link not found. Performing alternative action...");
            }
          }
        }
      } else {
        if (AfterAddition < limit) {
          res.status(200).json({ updatedArray, message: "Msg limit exceed !" });
        } else {
          data.Status = 0;
          updatedArray.push(data);
        }
      }
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await page.type('div[aria-label="Search"][data-tab="3"]', HelperContact);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatSelector = `span[title="${HelperContact}"]`;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatElement = await page.$(chatSelector);
      const menu = 'span[data-icon="menu"].xr9ek0c';
      const chatclear = 'div[aria-label="Clear chat"]';
      const clearButton =
        "#app > div > span:nth-child(3) > div > div > div > div > div > div > div.x78zum5.x8hhl5t.x13a6bvl.x13crsa5.x1mpkggp.x18d9i69.x1t2a60a.xp4054r.xuxw1ft > div > button.x889kno.x1a8lsjc.xbbxn1n.xxbr6pl.x1n2onr6.x1rg5ohu.xk50ysn.x1f6kntn.xyesn5m.x1z11no5.xjy5m1g.x1mnwbp6.x4pb5v6.x178xt8z.xm81vs4.xso031l.xy80clv.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x1v8p93f.xogb00i.x16stqrj.x1ftr3km.x1hl8ikr.xfagghw.x9dyr19.x9lcvmn.xbtce8p.x14v0smp.xo8ufso.xcjl5na.x1k3x3db.xuxw1ft.xv52azi";
      if (chatElement) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await page.click(chatSelector);
        const menuElement = await page.$(menu);
        if (menuElement) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await menuElement.click();
          const ChatElement = await page.$(chatclear);
          if (ChatElement) {
            console.log("chat milaaa!");
            await ChatElement.click();
            await new Promise((resolve) => setTimeout(resolve, 10000));
            const clearButton1 = await page.$(clearButton);
            if (clearButton1) {
              await clearButton1.click();
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(error);
    }
    res
      .status(200)
      .json({
        updatedArray,
        message: "Data received and processed successfully",
      });
    await browser.close();
  } catch (error) {
    console.error("Error processing data array:", error);
    res.status(500).json({ message: "error", updatedArray: updatedArray });
  }
});
app.post("/UnreadChats", async (req, res) => {
  const dataArray = req.body;
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: path.join(
        process.cwd(),
        `ChromeSession${dataArray.companyId}`
      ),
    });
    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });
    const SelectButton =
      "#side > div.x1ky8ojb.x78zum5.x1q0g3np.x1a02dak.x2lah0s.x3pnbk8.xfex06f.xeuugli.x2lwn1j.x1nn3v0j.x1ykpatu.x1swvt13.x1pi30zi > button:nth-child(2)";
    const Chatlist = 'div[aria-label="Chat list"]';
    const UnreadChatSelector =
      "#pane-side > div > div > div > div > div > div > div > div._ak8l > div._ak8o > div._ak8q > div > span[title]"; // Selector for all contact names with a title attribute
    await page.waitForSelector("#side", { timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const chatElement = await page.$(SelectButton);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await chatElement.click();

    await page.waitForSelector(Chatlist);

    const unreadChatElements = await page.$$(UnreadChatSelector);
    const contactNames = [];
    console.log(UnreadChatSelector.length);

    for (let index = 0; index < unreadChatElements.length; index++) {
      const title = await unreadChatElements[index].evaluate((el) =>
        el.getAttribute("title")
      );
      contactNames.push({ index: index + 1, title });
    }
    console.log(contactNames);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    res.status(200).json({ contactNames, message: "Success" });
    await browser.close();
  } catch (error) {
    console.error("Error processing data array:", error);
    res.status(500).json({ message: "error", updatedArray: updatedArray });
  }
});
const imagesDir = path.join(__dirname, "images");
async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(dir);
    } else {
      throw error;
    }
  }
}
ensureDirectoryExists(imagesDir).catch(console.error);
async function findImage() {
  const todayDate = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const imageName = `pic_${todayDate}.png`;
  const imagePath = path.join(__dirname, "Images", imageName);

  try {
    await fs.access(imagePath);
    return imagePath;
  } catch (error) {
    console.log("Image not found:", imagePath);
    return null;
  }
}
async function findFile() {
  const imageName = `testword.docx`;
  const imagePath = path.join(__dirname, "files", imageName);

  try {
    await fs.access(imagePath);
    return imagePath;
  } catch (error) {
    console.log("Image not found:", imagePath);
    return null;
  }
}
async function sendImageToClient(page, imagePath) {
  await page.click('div[aria-label="Attach"]');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("Image path:", imagePath);

  const extname = path.extname(imagePath).toLowerCase();

  const fileInputSelector = [".png", ".jpeg", ".jpg", ".gif"].includes(extname)
    ? 'input[type="file"][accept="image/*,video/mp4,video/3gpp,video/quicktime"]'
    : 'input[type="file"]';

  const fileInput = await page.$(fileInputSelector);

  if (fileInput) {
    console.log("Uploading image:", imagePath);

    await fileInput.uploadFile(imagePath);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await page.click('span[data-icon="send"]');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else {
    console.error("File input element not found.");
  }
}
app.post("/SendFile", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});
function formatPhoneNumber(phoneNumber) {
  const numericOnly = phoneNumber.replace(/\D/g, "");
  const formattedNumber = `+92 ${numericOnly.slice(1, 4)} ${numericOnly.slice(
    4,
    11
  )}`;
  return formattedNumber;
}
app.post("/SendImage", async (req, res) => {
  const linksArray = req.body;
  console.log(` Received links array:`, linksArray);

  try {
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: path.join(
        process.cwd(),
        `ChromeSession${linksArray.companyId}`
      ),
    });

    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#side", { timeout: 60000 });

    const HelperContact = formatPhoneNumber(linksArray.Number);
    console.log(`Formatted HelperContact:`, HelperContact);

    await page.type('div[aria-label="Search"][data-tab="3"]', HelperContact);
    await new Promise((resolve) => setTimeout(resolve, 2000));


    const contactExists = await page.$('span[title]');

    if (contactExists) {
      const contactName = await page.$eval('span[title]', el => el.getAttribute('title'));
      const chatSelector = `span[title="${contactName}"]`;
      await page.click(chatSelector);
      const imagePath = await findImage();
      if (imagePath) {
        await sendImageToClient(page, imagePath);
      } else {
        console.log(`No image to send.`);
      }
    } else {
      console.log('No matching contact found.');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    res.json({ message: "success" });
    await browser.close();
  } catch (error) {
    console.error(` Error processing data array:`, error);
    res
      .status(500)
      .json({ message: "Error processing data array", error: error });
  }
});
function formatPhoneNumber(phoneNumber) {
  const numericOnly = phoneNumber.replace(/\D/g, "");
  const formattedNumber = `+92 ${numericOnly.slice(1, 4
  )} ${numericOnly.slice(4, 11)}`;
  return formattedNumber;
}
app.post("/SendImageToMulti", async (req, res) => {
  const imagePaths = [];
  const linksArray = req.body;
  console.log(`Received links array:`, linksArray);
  const HelperContact = formatPhoneNumber(linksArray.GroupNumber);
  
  try {
    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
      userDataDir: path.join(
        process.cwd(),
        `ChromeSession${linksArray.companyId}`
      ),
    });

    const page = await browser.newPage();
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#side", { timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    for (const imageUrl of linksArray.imageLinks) {
      const imageName = path.basename(new URL(imageUrl).pathname);
      const imagePath = path.join(__dirname, "images", imageName);
      console.log(`Attempting to download image: ${imageUrl}`);
      try {
        await downloadImage(imageUrl, imagePath);
        imagePaths.push(imagePath);
      } catch (error) {
        console.log(`Skipping image: ${imageUrl}`);
        continue;
      }
    }
    async function deleteText(selector, times) {
      await page.focus(selector);
      for (let i = 0; i < times; i++) {
        await page.keyboard.press("Backspace");
      }
    }

    for (const data of linksArray.numbers) {
      console.log(data);
      const contactName = formatPhoneNumber(data);
      console.log(`Formatted Contact Name: ${contactName}`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      await page.type('div[aria-label="Search"][data-tab="3"]', contactName);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatSelector = `span[title="${contactName}"]`;
      const chatElement = await page.$(chatSelector);
      
      if (chatElement) {
        await chatElement.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await sendImageToClients(page, linksArray.msg, imagePaths);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log('No matching contact found.');
        const contactNumber = data;
        const cleanedContactNumber = contactNumber.replace(/\s+/g, "");
        const formattedContactNumber = cleanedContactNumber.startsWith("0")
          ? "92" + cleanedContactNumber.slice(1)
          : cleanedContactNumber;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("Chat Not Found!");
       
        const getText = await page.$eval(
          ".selectable-text",
          (el) => el.innerText
        );
        const textLength = getText.length;
        await deleteText(".selectable-text", textLength);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(formatPhoneNumber + "bilal");         
        const link = `https://wa.me/${formattedContactNumber}`;    
        GroupName = HelperContact;
        console.log(GroupName + "GroupName");
        await page.type(
          'div[aria-label="Search"][data-tab="3"]',
          GroupName
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        const contactExists = await page.$('span[title]');
        if (contactExists) {
          const contactName = await page.$eval('span[title]', el => el.getAttribute('title'));
          const chatSelector = `span[title="${contactName}"]`;
          await page.click(chatSelector);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        await page.type(
          'div[aria-label="Type a message"][data-tab="10"]',
          link
        );
        await page.keyboard.press("Enter");

        const linkSelector = `a[href="${link}"]`;
        const NewChat = await page.$(linkSelector);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const InvalidAccountSelector =
          "#app > div > span:nth-child(3) > div > span > div > div > div > div > div > div.x12lqup9.x1o1kx08";
    
        const SelectButton =
          "#app > div > span:nth-child(3) > div > span > div > div > div > div > div > div.x78zum5.x8hhl5t.x13a6bvl.x13crsa5.x1mpkggp.x18d9i69.x1t2a60a.xp4054r.xuxw1ft > div > button";
        if (NewChat) {
          await NewChat.click();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const invalidAccountElement = await page.$(
            InvalidAccountSelector
          );
          if (invalidAccountElement) {
            console.log(
              "Invalid account element detected. Performing action..."
            );
            const invalidAccountText = await page.$eval(
              InvalidAccountSelector,
              (element) => element.textContent.trim()
            );

            if (invalidAccountText === "Phone number shared via url is invalid.") {
              try {
                console.log(invalidAccountText);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await page.click(SelectButton);
              } catch (err) {
                console.error(
                  "Error in company record update process:",
                  err
                );
              }
            }
          } else {
            try {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              await sendImageToClients(page, linksArray.msg, imagePaths);
            } catch (err) {
              console.error(
                "Error",
                err
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        } else {
          console.log("Link not found. Performing alternative action...");
        }
      }
    }
    deleteImages(imagePaths);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await page.type('div[aria-label="Search"][data-tab="3"]', HelperContact);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatSelector = `span[title="${HelperContact}"]`;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const chatElement = await page.$(chatSelector);
      const menu = 'span[data-icon="menu"].xr9ek0c';
      const chatclear = 'div[aria-label="Clear chat"]';
      const clearButton =
        "#app > div > span:nth-child(3) > div > div > div > div > div > div > div.x78zum5.x8hhl5t.x13a6bvl.x13crsa5.x1mpkggp.x18d9i69.x1t2a60a.xp4054r.xuxw1ft > div > button.x889kno.x1a8lsjc.xbbxn1n.xxbr6pl.x1n2onr6.x1rg5ohu.xk50ysn.x1f6kntn.xyesn5m.x1z11no5.xjy5m1g.x1mnwbp6.x4pb5v6.x178xt8z.xm81vs4.xso031l.xy80clv.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x1v8p93f.xogb00i.x16stqrj.x1ftr3km.x1hl8ikr.xfagghw.x9dyr19.x9lcvmn.xbtce8p.x14v0smp.xo8ufso.xcjl5na.x1k3x3db.xuxw1ft.xv52azi";
      if (chatElement) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await page.click(chatSelector);
        const menuElement = await page.$(menu);
        if (menuElement) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await menuElement.click();
          const ChatElement = await page.$(chatclear);
          if (ChatElement) {
            console.log("chat milaaa!");
            await ChatElement.click();
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const clearButton1 = await page.$(clearButton);
            if (clearButton1) {
              await clearButton1.click();
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(error + "bilal");
    }
    res.json({ message: "success" });
    await browser.close();
  } catch (error) {
    console.error(`Error processing data array:`, error);
    res
      .status(500)
      .json({ message: "Error processing data array", error: error });
  }
});
app.use('/Photo', express.static(path.join(__dirname, 'Photo')));

async function downloadImage(url, outputPath) {
  try {
    const response = await axios({
      url,
      responseType: "arraybuffer",
      validateStatus: function (status) {
        return status === 200; // Resolve only if the status is 200
      },
    });
    await fs.writeFile(outputPath, response.data);
    console.log(`Image downloaded successfully: ${outputPath}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`Image not found (404): ${url}`);
    } else {
      console.error(`Error downloading the image from ${url}:`, error.message);
    }
    throw error;
  }
}
async function sendImageToClients(page, msg, imagePaths) {
  try {
    await page.click('div[aria-label="Attach"]'); // Open attachment dialog
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(msg);
    // Prepare the file input element and upload all images
    const fileInputSelector =
      'input[type="file"][accept="image/*,video/mp4,video/3gpp,video/quicktime"]';
    const fileInput = await page.$(fileInputSelector);
    const InputSelector =
      "#app > div > div.two._aigs > div._aigu > div._aigv._aigz > span > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x1hc1fzr.x6ikm8r.x10wlt62 > div > div.x78zum5.x1iyjqo2.xs83m0k.x1r8uery.xdt5ytf.x1qughib.x6ikm8r.x10wlt62 > div.x1c4vz4f.xs83m0k.xdl72j9.x1g77sc7.x78zum5.xozqiw3.x1oa3qoh.x12fk4p8.xeuugli.x2lwn1j.xl56j7k.x1q0g3np.x6s0dn4.x1n2onr6.xo8q3i6.x1y1aw1k.xwib8y2.xkhd6sd.x4uap5 > div > div > div.x1c4vz4f.xs83m0k.xdl72j9.x1g77sc7.x78zum5.xozqiw3.x1oa3qoh.x12fk4p8.xeuugli.x2lwn1j.x1nhvcw1.x1q0g3np.x1cy8zhl.x9f619.xh8yej3.x1ba4aug.x1iorvi4.x1pi30zi.xjkvuk6.x1swvt13.x7nbn6e.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c";

    if (fileInput) {
      await fileInput.uploadFile(...imagePaths);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (msg !== "") {
        await page.type(InputSelector, msg);
      }
      await page.click('span[data-icon="send"]');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      console.error("File input element not found.");
    }
  } catch (error) {
    console.error("Error sending images:", error);
  }
}
async function deleteImages(imagePaths) {
  try {
    for (const imagePath of imagePaths) {
      await fs.unlink(imagePath); // Deletes the image file
      console.log(`Deleted: ${imagePath}`);
    }
  } catch (error) {
    console.error(`Error deleting files: ${error}`);
  }
}
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
