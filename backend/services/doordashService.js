let browser;
let page;
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
    headless: true,
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
  page = getDoorDashPage();
  const searchSelector = 'input[placeholder="Search DoorDash"]';
  await page.waitForSelector(searchSelector, {
    visible: true,
    timeout: 200000,
  });
  await page.type(searchSelector, name, { delay: 100 });
  await page.keyboard.press("Enter");
  page.waitForNavigation({ waitUntil: "networkidle2" });
  return { success: true };
}

module.exports = {
  initialize,
  getDoorDashPage,
  searchForRestaurant,
};
