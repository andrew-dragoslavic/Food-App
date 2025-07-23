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

async function searchForRestaurant(name) {
  const page = getDoorDashPage();
  const searchSelector = 'input[placeholder="Search DoorDash"]';
  await page.waitForSelector(searchSelector, {
    visible: true,
    timeout: 200000,
  });
  await page.type(searchSelector, name, { delay: 100 });
  await page.keyboard.press("Enter");

  try {
    console.log("Waiting for the first batch of restaurants to load...");
    await page.waitForSelector('[data-telemetry-id="store.name"]', {
      timeout: 20000,
    });
    console.log(
      "Initial restaurants loaded. Now scrolling to load all results..."
    );
  } catch (error) {
    console.log(
      "Could not find any restaurants. Page might be blank or require login."
    );
    await page.screenshot({ path: "doordash_final_error.png" });
    return { success: false, data: [] };
  }

  // --- NEW: SCROLLING LOGIC TO HANDLE LAZY LOADING ---
  let previousHeight;
  for (let i = 0; i < 5; i++) {
    // Scroll a maximum of 5 times
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    // Wait for new content to load. A fixed wait is often easiest here.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    let newHeight = await page.evaluate("document.body.scrollHeight");
    if (newHeight === previousHeight) {
      break; // If the page height hasn't changed, we've reached the bottom.
    }
  }

  console.log("Finished scrolling. Beginning final scrape...");

  // --- DEFINITIVE SCRAPING LOGIC WITH CORRECTED SCOPE ---
  const restaurantData = await page.$$eval(
    '[data-telemetry-id="store.name"]', // Start with the reliable store names
    (nameElements) => {
      return nameElements.map((nameEl) => {
        // --- THE KEY FIX FOR NULL VALUES ---
        // From the name, travel up to the container with an ID that starts with "store-info-".
        const cardContainer = nameEl.closest('div[id^="store-info-"]');
        if (!cardContainer) return null;

        const name = nameEl.innerText;
        const allSpans = Array.from(cardContainer.querySelectorAll("span"));
        const allTextContent = allSpans
          .map((span) => span.innerText.trim())
          .filter((text) => text);

        let rating = null;
        let reviews = null;
        let distance = null;
        let deliveryTime = null;

        const ratingLine = allTextContent.find((text) => /^\d\.\d/.test(text));
        if (ratingLine) {
          rating = parseFloat(ratingLine) || null;
          const reviewMatch = ratingLine.match(/\(([^)]+)\)/);
          reviews = reviewMatch ? reviewMatch[1] : null;
        }

        distance = allTextContent.find((text) => text.includes("mi")) || null;
        deliveryTime =
          allTextContent.find((text) => text.includes("min")) || null;

        return { name, rating, reviews, distance, deliveryTime };
      });
    }
  );

  const finalData = restaurantData.filter((item) => item !== null);

  console.log(`Successfully scraped ${finalData.length} total restaurants.`);
  console.log(finalData);
  return { success: true, data: finalData };
}

module.exports = {
  initialize,
  getDoorDashPage,
  searchForRestaurant,
};
