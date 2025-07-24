let browser;
let page;
const { createReadStream } = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

// Your DoorDash credentials
// It's best to store these in environment variables, not directly in the code
const yourEmail = process.env.DOORDASH_EMAIL;
const yourPassword = process.env.DOORDASH_PASSWORD;

async function initialize() {
  browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "disable-setuid-sandbox"],
  });

  page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
  );
  //   await page.on("console", (msg) => {
  //     console.log(`BROWSER LOG: ${msg.text()}`);
  //   });

  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  await page.goto(
    "https://identity.doordash.com/auth?client_id=1666519390426295040&layout=consumer_web&prompt=none&redirect_uri=https%3A%2F%2Fwww.doordash.com%2F&response_type=code&scope=%2A&state=none",
    {
      waitUntil: "domcontentloaded",
    }
  );

  const emailInputSelector = 'input[type="email"]';
  await page.waitForSelector(emailInputSelector, {
    visible: true,
    timeout: 10000,
  });

  await page.type(emailInputSelector, yourEmail, { delay: 100 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const continueButtonXPath =
    "xpath/" + "//button[contains(., 'Continue to Sign In')]";
  await page.waitForSelector(continueButtonXPath, { visible: true });
  // This click does not cause a full navigation, so we remove the waitForNavigation
  await page.click(continueButtonXPath);

  const usePasswordSelector =
    "xpath/" + "//button[contains(., 'Use password')]";
  try {
    // Wait for the button for a short time. If it doesn't appear, the catch block will run.
    await page.waitForSelector(usePasswordSelector, {
      visible: true,
      timeout: 5000,
    });
    await page.click(usePasswordSelector);
    // Wait for the page to transition to the password screen
    await page
      .waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 })
      .catch(() => {});
  } catch (error) {
    console.log(
      '"Use password" button not found, assuming we are already on the password page.'
    );
  }

  // Step 2: Wait for the password page and enter the password
  const passwordInputSelector = 'input[type="password"]';
  await page.waitForSelector(passwordInputSelector, {
    visible: true,
    timeout: 10000,
  });

  await page.type(passwordInputSelector, yourPassword, { delay: 100 });
  await new Promise((resolve) => setTimeout(resolve, 500));

  // This selector is the most reliable as it uses the testing ID.
  const signInButtonSelector = 'button[id="login-submit-button"]';
  await page.waitForSelector(signInButtonSelector, { visible: true });

  // Click first, then wait for navigation. This is more reliable.
  await page.click(signInButtonSelector);
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  const finalSignInButtonSelector = 'a[data-testid="signInButton"]';
  const loggedInProofSelector = 'input[placeholder="Search DoorDash"]';
  await page.waitForSelector(finalSignInButtonSelector, {
    visible: true,
    timeout: 10000,
  });

  await page.click(finalSignInButtonSelector);
  await page.waitForSelector(loggedInProofSelector, { visible: true });
}

function getDoorDashPage() {
  if (page === null) {
    throw new Error("Doordash service not initialized");
  } else {
    return page;
  }
}

async function findAndSelectRestaurant(name) {
  const page = getDoorDashPage();
  const searchSelector = 'input[placeholder="Search DoorDash"]';

  console.log(`Searching for: ${name}`);
  await page.waitForSelector(searchSelector, { visible: true });

  // Clear the input field before typing
  await page.evaluate((selector) => {
    const input = document.querySelector(selector);
    if (input) input.value = "";
  }, searchSelector);

  await page.type(searchSelector, name, { delay: 100 });
  await page.keyboard.press("Enter");

  console.log("Waiting for search results to load...");
  await page
    .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
    .catch(() => {
      console.log("Navigation did not complete, but continuing to scrape.");
    });

  // Wait for at least one store name to be present
  const storeNameSelector = '[data-telemetry-id="store.name"]';
  try {
    await page.waitForSelector(storeNameSelector, { timeout: 10000 });
  } catch (error) {
    console.log("No restaurant names found after search.");
    await page.screenshot({ path: "doordash_no_results.png" });
    return { success: false, message: "No restaurants found." };
  }

  // Scrolling logic to handle lazy loading
  let previousHeight;
  for (let i = 0; i < 5; i++) {
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    let newHeight = await page.evaluate("document.body.scrollHeight");
    if (newHeight === previousHeight) {
      break;
    }
  }

  console.log("Finished scrolling. Finding the best match...");

  // --- FINALIZED LOGIC: Your selection + robust parsing ---
  const bestMatchIndex = await page.$$eval(
    storeNameSelector, // Start with your reliable store name selector
    (nameElements, restaurantName) => {
      // First, scrape the data from all cards
      const scrapedData = nameElements
        .map((nameEl) => {
          // Use your successful method to find the parent container
          const cardContainer = nameEl.closest('div[id^="store-info-"]');
          console.log(cardContainer);
          if (!cardContainer) return null;

          const name = nameEl.innerText;
          console.log(name);
          const cardText = cardContainer.innerText;
          let status = cardText.includes("Closed") ? "Closed" : "Open";

          return { name, status };
        })
        .filter((item) => item && item.name); // Filter out any nulls or items without a name

      // Now, find the index of the first open restaurant that matches the name
      const index = scrapedData.findIndex(
        (restaurant) =>
          restaurant.status === "Open" &&
          restaurant.name.toLowerCase().includes(restaurantName.toLowerCase())
      );

      return index; // This is the only thing we return
    },
    name // Pass the user's search term into the browser
  );

  if (bestMatchIndex === -1) {
    console.log(`No open restaurant matching "${name}" was found.`);
    return {
      success: false,
      message: "No open restaurant found with that name.",
    };
  }

  console.log(
    `Best match found at index: ${bestMatchIndex}. Clicking it now...`
  );

  // Get all the clickable card elements again, this time using the name selector as the base
  const allRestaurantNameElements = await page.$$(storeNameSelector);
  //   console.log(allRestaurantNameElements);
  const targetNameElement = allRestaurantNameElements[bestMatchIndex];

  if (targetNameElement) {
    // The span is inside an A tag, let's get that A tag
    const parentLink = await targetNameElement.evaluateHandle((el) =>
      el.closest("a")
    );

    const linkElement = parentLink.asElement();
    console.log("Found parent link:", linkElement);

    if (linkElement) {
      // Check what this link contains
      const linkInfo = await linkElement.evaluate((el) => ({
        href: el.href,
        className: el.className,
        dataAnchorId: el.getAttribute("data-anchor-id"),
        outerHTML: el.outerHTML.substring(0, 300),
      }));
      console.log("Link info:", linkInfo);

      // Click this link instead
      await linkElement.click();
      console.log("Clicked the restaurant link");
    }
  }
}

async function findAndAddFoodItem(item) {
  const page = getDoorDashPage();

  await page
    .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
    .catch(() => {
      console.log("Naviagtion complete, continuing...");
    });

  const menuItems = await scrapeMenuItems(page);
}

async function scrapeMenuItems(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, 300);
        totalHeight += 300;

        if (totalHeight >= scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  const menuItems = await page.evaluate(() => {
    const items = [];

    const menuItemContainers = document.querySelectorAll(
      '[data-anchor-id="MenuItem"], [data-testid="MenuItem"]'
    );

    menuItemContainers.forEach((container, index) => {
      try {
        const nameEl = container.querySelector(
          'h3[data-telemetry-id="storeMenuItem.title"]'
        );
        const name = nameEl ? nameEl.innerText.trim() : null;

        const priceEl = container.querySelector(
          '[data-testid="StoreMenuItemPrice"]'
        );
        const price = priceEl ? priceEl.innerText.trim() : null;

        const descEl = container.querySelector(
          '[data-telemetry-id="storeMenuItem.subtitle"]'
        );
        const desc = descEl ? descEl.innerText.trim() : null;

        const itemId = container.getAttribute("data-item-id");

        if (name && name.length > 0) {
          items.push({
            name,
            price,
            desc,
            itemId,
            index,
            selector: `[data-item-id="${itemId}"]`,
          });
        }
      } catch (error) {
        console.log(`Error extracting item ${index}:`, error);
      }
    });
    return items;
  });
  console.log(`Scraped ${menuItems.length} menu items`);

  // Log first few items for debugging
  menuItems.slice(0, 3).forEach((item) => {
    console.log(
      `- ${item.name} (${item.price}): ${item.description.substring(0, 50)}...`
    );
  });

  return menuItems;
}

async function testMenuScraping() {
  const page = getDoorDashPage(); // Your existing page
  
  console.log("Testing menu scraping...");
  const menuItems = await scrapeMenuItems(page);
  
  console.log(`\nFound ${menuItems.length} menu items:`);
  
  // Print first 5 items
  menuItems.slice(0, 5).forEach((item, index) => {
    console.log(`${index + 1}. ${item.name} - ${item.price}`);
    console.log(`   ${item.description.substring(0, 60)}...`);
    console.log("");
  });
}


module.exports = {
  initialize,
  getDoorDashPage,
  findAndSelectRestaurant,
  scrapeMenuItems,
  testMenuScraping,
};
