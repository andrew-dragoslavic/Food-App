// You need to install these packages first:
// npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth dotenv

// This line now specifies the exact path to your .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Tell puppeteer to use the stealth plugin
puppeteer.use(StealthPlugin());

// Your DoorDash credentials
// It's best to store these in environment variables, not directly in the code
const yourEmail = process.env.DOORDASH_EMAIL;
const yourPassword = process.env.DOORDASH_PASSWORD;

async function loginToDoorDash() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser in action
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // The stealth plugin handles many of the other flags automatically
    ],
  });

  const page = await browser.newPage();

  // --- Apply Human-Like Settings ---

  // 1. Set a realistic User Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

  // 2. Set a realistic Viewport
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  // --- MODIFIED: Navigate directly to the login page ---
  console.log('Navigating directly to DoorDash login page...');
  // This bypasses the landing page and is more reliable.
  await page.goto('https://identity.doordash.com/auth?client_id=1666519390426295040&layout=consumer_web&prompt=none&redirect_uri=https%3A%2F%2Fwww.doordash.com%2F&response_type=code&scope=%2A&state=none', {
    // Using a less strict condition to avoid timeouts on busy pages
    waitUntil: 'domcontentloaded', 
  });


  // --- UPDATED LOGIN FLOW ---

  // Step 1: Wait for the email input, then type and click continue
  console.log('Landed on login page. Waiting for email input...');
  const emailInputSelector = 'input[type="email"]';
  await page.waitForSelector(emailInputSelector, { visible: true, timeout: 10000 });
  
  console.log('Typing email...');
  await page.type(emailInputSelector, yourEmail, { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Clicking continue...');
  const continueButtonXPath = "xpath/" + "//button[contains(., 'Continue to Sign In')]";
  await page.waitForSelector(continueButtonXPath, { visible: true });
  // This click does not cause a full navigation, so we remove the waitForNavigation
  await page.click(continueButtonXPath);


  // --- ADDED CONDITIONAL LOGIC ---
  console.log('Landed on the next page. Checking for "Use password" button...');
  const usePasswordSelector = "xpath/" + "//button[contains(., 'Use password')]";
  try {
    // Wait for the button for a short time. If it doesn't appear, the catch block will run.
    await page.waitForSelector(usePasswordSelector, { visible: true, timeout: 5000 });
    console.log('"Use password" button found. Clicking it...');
    await page.click(usePasswordSelector);
    // Wait for the page to transition to the password screen
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
  } catch (error) {
    console.log('"Use password" button not found, assuming we are already on the password page.');
  }

  // Step 2: Wait for the password page and enter the password
  console.log('Waiting for password input field...');
  const passwordInputSelector = 'input[type="password"]';
  await page.waitForSelector(passwordInputSelector, { visible: true, timeout: 10000 });
  
  console.log('Typing password...');
  await page.type(passwordInputSelector, yourPassword, { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 3: Click the final sign in button
  console.log('Clicking Sign In...');
  // This selector is the most reliable as it uses the testing ID.
  const signInButtonSelector = 'button[id="login-submit-button"]';
  await page.waitForSelector(signInButtonSelector, { visible: true });
  
  // Click first, then wait for navigation. This is more reliable.
  await page.click(signInButtonSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
      console.log('Landed on post-login page. Clicking final Sign In button in header...');
  const finalSignInButtonSelector = 'a[data-testid="signinButton"]';
    await page.waitForSelector(finalSignInButtonSelector, { visible: true, timeout: 10000 });
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.click(finalSignInButtonSelector)

  console.log('Login successful! Current URL:', page.url());

  // You can now perform other actions on the logged-in page
  await page.screenshot({ path: 'doordash_loggedin.png' });

  console.log('Closing browser...');
//   await browser.close();
}

loginToDoorDash().catch(error => {
  console.error('An error occurred:', error);
});
