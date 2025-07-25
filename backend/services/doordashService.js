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
      const linkInfo = await linkElement.evaluate((el) => ({
        href: el.href,
        className: el.className,
        dataAnchorId: el.getAttribute("data-anchor-id"),
        outerHTML: el.outerHTML.substring(0, 300),
      }));
      console.log("Link info:", linkInfo);

      // Get current number of pages before clicking
      const browser = page.browser();
      const pagesBefore = await browser.pages();
      console.log(`Pages before click: ${pagesBefore.length}`);

      // Click this link
      await linkElement.click();
      console.log("Clicked the restaurant link");

      // Wait for new tab to open
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get pages after clicking
      const pagesAfter = await browser.pages();
      console.log(`Pages after click: ${pagesAfter.length}`);

      if (pagesAfter.length > pagesBefore.length) {
        // New page opened! Switch to it
        const newPage = pagesAfter[pagesAfter.length - 1]; // Get the newest page

        console.log("New tab detected, switching to it...");

        // Wait for the new page to load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const newUrl = newPage.url();
        console.log("New tab URL:", newUrl);

        // Take screenshot of new tab
        await newPage.screenshot({ path: "new-tab-after-click.png" });
        console.log("Screenshot of new tab saved");

        // FIXED: Return the new page reference instead of trying to assign to const
        return {
          success: true,
          message: `Successfully opened ${name} in new tab`,
          url: newUrl,
          newPage: newPage, // Return the new page so other functions can use it
        };
      } else {
        console.log("No new tab opened, staying on current page");

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await page.screenshot({ path: "same-tab-after-click.png" });

        const currentUrl = page.url();
        console.log("Current URL:", currentUrl);

        return {
          success: false,
          message: "Click didn't open new tab or navigate",
        };
      }
    }
  }
}

async function captureMenuItemsDuringScroll(restaurantPage) {
  console.log("=== STARTING GRADUAL MENU SCRAPING WITH FULL DEBUGGING ===");

  // Start from top
  await restaurantPage.evaluate(() => window.scrollTo(0, 0));
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const allMenuItems = new Map();
  const scrollIncrement = 200;
  let lastScrollPosition = 0;
  let noMovementCount = 0;
  let noNewItemsCount = 0;
  let scrollAttempt = 0;

  while (true) {
    scrollAttempt++;
    const currentScrollPosition = await restaurantPage.evaluate(
      () => window.scrollY
    );

    console.log(
      `\n--- SCROLL ATTEMPT ${scrollAttempt} (position: ${currentScrollPosition}px) ---`
    );

    // Wait for lazy loading
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // First, test different selectors to see what's available
    const selectorTests = await restaurantPage.evaluate(() => {
      return {
        dataTestId: document.querySelectorAll('[data-testid="MenuItem"]')
          .length,
        dataAnchorId: document.querySelectorAll('[data-anchor-id="MenuItem"]')
          .length,
        dataItemId: document.querySelectorAll("[data-item-id]").length,
        bothAttributes: document.querySelectorAll(
          '[data-testid="MenuItem"][data-anchor-id="MenuItem"]'
        ).length,
        anyTestId: document.querySelectorAll("[data-testid]").length,
        menuInClass: document.querySelectorAll('[class*="MenuItem"]').length,
      };
    });

    console.log("🔍 SELECTOR TEST RESULTS:", selectorTests);

    // Try the main selector with detailed debugging
    const debugResults = await restaurantPage.$$eval(
      '[data-testid="MenuItem"]',
      (elements) => {
        console.log("=== INSIDE $$EVAL DEBUG ===");
        console.log("Raw elements found:", elements.length);

        if (elements.length > 0) {
          const firstEl = elements[0];
          console.log("First element details:");
          console.log("  tagName:", firstEl.tagName);
          console.log("  data-testid:", firstEl.getAttribute("data-testid"));
          console.log(
            "  data-anchor-id:",
            firstEl.getAttribute("data-anchor-id")
          );
          console.log("  data-item-id:", firstEl.getAttribute("data-item-id"));
          console.log("  className:", firstEl.className);
          console.log(
            "  innerHTML preview:",
            firstEl.innerHTML.substring(0, 200)
          );

          // Check for aria-label in children
          const ariaLabelEl = firstEl.querySelector("[aria-label]");
          console.log("  aria-label element found:", !!ariaLabelEl);
          if (ariaLabelEl) {
            console.log(
              "  aria-label value:",
              ariaLabelEl.getAttribute("aria-label")
            );
          }

          // Check for title element
          const titleEl = firstEl.querySelector(
            '[data-telemetry-id="storeMenuItem.title"]'
          );
          console.log("  title element found:", !!titleEl);
          if (titleEl) {
            console.log("  title text:", titleEl.innerText);
          }

          // Check for price element
          const priceEl = firstEl.querySelector(
            '[data-testid="StoreMenuItemPrice"]'
          );
          console.log("  price element found:", !!priceEl);
          if (priceEl) {
            console.log("  price text:", priceEl.innerText);
          }
        }

        return {
          elementsFound: elements.length,
          sampleData:
            elements.length > 0
              ? {
                  testId: elements[0].getAttribute("data-testid"),
                  itemId: elements[0].getAttribute("data-item-id"),
                  hasAriaLabel: !!elements[0].querySelector("[aria-label]"),
                  hasTitle: !!elements[0].querySelector(
                    '[data-telemetry-id="storeMenuItem.title"]'
                  ),
                  hasPrice: !!elements[0].querySelector(
                    '[data-testid="StoreMenuItemPrice"]'
                  ),
                }
              : null,
        };
      }
    );

    console.log("🔍 $$EVAL DEBUG RESULTS:", debugResults);

    // Add the quick extraction test
    if (debugResults.elementsFound > 0) {
      const quickTest = await restaurantPage.$$eval(
        '[data-testid="MenuItem"]',
        (elements) => {
          const first = elements[0];
          const ariaEl = first.querySelector("[aria-label]");
          return {
            ariaLabelText: ariaEl
              ? ariaEl.getAttribute("aria-label")
              : "NOT FOUND",
            titleText:
              first.querySelector('[data-telemetry-id="storeMenuItem.title"]')
                ?.innerText || "NOT FOUND",
            priceText:
              first.querySelector('[data-testid="StoreMenuItemPrice"]')
                ?.innerText || "NOT FOUND",
          };
        }
      );
      console.log("🔍 QUICK EXTRACTION TEST:", quickTest);
    }

    // If we found elements, try to extract data from them (simplified version)
    if (debugResults.elementsFound > 0) {
      console.log("✅ Found elements! Attempting data extraction...");

      const currentMenuItems = await restaurantPage.$$eval(
        '[data-testid="MenuItem"]',
        (menuElements, scrollPosition) => {
          // Add scrollPosition as parameter
          return menuElements
            .map((element, index) => {
              const itemId = element.getAttribute("data-item-id");
              const ariaEl = element.querySelector("[aria-label]");
              const titleEl = element.querySelector(
                '[data-telemetry-id="storeMenuItem.title"]'
              );
              const priceEl = element.querySelector(
                '[data-testid="StoreMenuItemPrice"]'
              );

              let name = "";
              let price = "";

              // Try aria-label first
              if (ariaEl) {
                const ariaText = ariaEl.getAttribute("aria-label");
                const priceMatch = ariaText.match(/\$[\d,]+\.?\d*/);
                if (priceMatch) {
                  price = priceMatch[0];
                  name = ariaText.replace(priceMatch[0], "").trim();
                }
              }

              // Fallback to individual elements
              if (!name && titleEl) name = titleEl.innerText.trim();
              if (!price && priceEl) price = priceEl.innerText.trim();

              return name && itemId
                ? {
                    itemId,
                    name,
                    price: price || "Free",
                    scrollPosition: scrollPosition, // Use the parameter instead
                  }
                : null;
            })
            .filter((item) => item !== null);
        },
        currentScrollPosition // Pass currentScrollPosition as argument
      );

      console.log(
        `📊 Extraction completed: ${currentMenuItems.length} valid items extracted`
      );

      // Add new items to collection
      let newItemsThisRound = 0;
      currentMenuItems.forEach((item) => {
        if (!allMenuItems.has(item.itemId)) {
          allMenuItems.set(item.itemId, item);
          newItemsThisRound++;
          console.log(`  ✅ NEW ITEM: "${item.name}" - ${item.price}`);
        } else {
          console.log(`  🔄 DUPLICATE: "${item.name}"`);
        }
      });

      console.log(
        `📈 ROUND SUMMARY: +${newItemsThisRound} new items | Total: ${allMenuItems.size}`
      );

      if (newItemsThisRound === 0) {
        noNewItemsCount++;
      } else {
        noNewItemsCount = 0;
      }
    } else {
      console.log("❌ No MenuItem elements found in current viewport");
      noNewItemsCount++;
    }

    // Take a screenshot every 5 attempts for debugging
    if (scrollAttempt % 5 === 0) {
      await restaurantPage.screenshot({
        path: `debug-scroll-${scrollAttempt}.png`,
      });
      console.log(
        `📸 Debug screenshot saved: debug-scroll-${scrollAttempt}.png`
      );
    }

    // Scroll down
    await restaurantPage.evaluate((scrollAmount) => {
      window.scrollBy(0, scrollAmount);
    }, scrollIncrement);

    console.log(`⬇️  Scrolled down ${scrollIncrement}px`);

    // Check movement
    const newScrollPosition = await restaurantPage.evaluate(
      () => window.scrollY
    );

    if (newScrollPosition === lastScrollPosition) {
      noMovementCount++;
      console.log(`🛑 No scroll movement (${noMovementCount}/5)`);
      if (noMovementCount >= 5) {
        console.log("🏁 Reached bottom - stopping");
        break;
      }
    } else {
      noMovementCount = 0;
    }

    // Stop conditions
    if (noNewItemsCount >= 8 && noMovementCount >= 2) {
      console.log("🏁 No progress for several rounds - stopping");
      break;
    }

    if (scrollAttempt >= 100) {
      // Back to normal limit
      console.log("🛑 Reached attempt limit");
      break;
    }

    lastScrollPosition = newScrollPosition;
  }

  // Final deduplication by name+price combination
  console.log(`\n🔧 REMOVING DUPLICATES BY NAME+PRICE...`);
  const beforeCount = allMenuItems.size;

  // Convert to array and deduplicate by name+price combination
  const uniqueItems = Array.from(allMenuItems.values());
  const finalUniqueItems = [];
  const seenCombinations = new Set();

  uniqueItems.forEach((item) => {
    const combination = `${item.name}|${item.price}`;
    if (!seenCombinations.has(combination)) {
      seenCombinations.add(combination);
      finalUniqueItems.push(item);
    } else {
      console.log(`🗑️  REMOVED DUPLICATE: "${item.name}" - ${item.price}`);
    }
  });

  console.log(
    `📊 Deduplication complete: ${beforeCount} → ${finalUniqueItems.length} items`
  );
  console.log(
    `\n🎉 SCRAPING COMPLETE! Found ${finalUniqueItems.length} unique items in ${scrollAttempt} attempts`
  );

  return finalUniqueItems;
}

async function testMenuScraping() {
  console.log("=== STARTING RESTAURANT SELECTION ===");

  const restaurantResult = await findAndSelectRestaurant("McDonald's");

  if (!restaurantResult.success) {
    console.log("❌ Failed to select restaurant:", restaurantResult.message);
    return;
  }

  console.log("✅ Restaurant selection successful");
  const restaurantPage = restaurantResult.newPage;

  await restaurantPage.screenshot({ path: "restaurant-page-initial.png" });
  console.log("📸 Initial screenshot saved");

  console.log("⏳ Waiting for page to fully load...");
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Check initial state
  const initialCheck = await restaurantPage.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      menuItems: document.querySelectorAll('[data-testid="MenuItem"]').length,
      allTestIds: Array.from(document.querySelectorAll("[data-testid]")).length,
      pageHeight: document.body.scrollHeight,
    };
  });

  console.log("📊 INITIAL STATE:", initialCheck);

  console.log("\n=== STARTING MENU SCRAPING ===");
  const menuItems = await captureMenuItemsDuringScroll(restaurantPage);

  if (menuItems && menuItems.length > 0) {
    console.log(`\n🎉 SUCCESS! Captured ${menuItems.length} menu items:`);

    menuItems.sort((a, b) => a.name.localeCompare(b.name));
    menuItems.forEach((item, index) => {
      console.log(`${index + 1}. "${item.name}" - ${item.price}`);
    });
  } else {
    console.log("\n❌ No menu items captured - check debug screenshots");
  }

  await restaurantPage.screenshot({ path: "restaurant-page-final.png" });
  return menuItems;
}

async function testMenuScraping() {
  console.log("=== STARTING RESTAURANT SELECTION ===");

  const restaurantResult = await findAndSelectRestaurant("McDonald's");

  if (!restaurantResult.success) {
    console.log("❌ Failed to select restaurant:", restaurantResult.message);
    return;
  }

  console.log("✅ Restaurant selection successful:", restaurantResult.message);
  const restaurantPage = restaurantResult.newPage;

  // Debug screenshots
  console.log("📸 Taking screenshot of restaurant page...");
  await restaurantPage.screenshot({ path: "restaurant-page-loaded.png" });

  // Extended wait for initial page load
  console.log("⏳ Waiting for initial page load (8 seconds)...");
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Pre-scraping debug
  const initialPageInfo = await restaurantPage.evaluate(() => {
    const menuItems = document.querySelectorAll('[data-testid="MenuItem"]');
    const sections = document.querySelectorAll('[class*="kvJaT"]'); // Menu sections

    return {
      url: window.location.href,
      title: document.title,
      initialMenuItemCount: menuItems.length,
      menuSectionCount: sections.length,
      pageHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });

  console.log("📊 INITIAL PAGE STATE:");
  console.log(`  URL: ${initialPageInfo.url}`);
  console.log(`  Title: ${initialPageInfo.title}`);
  console.log(
    `  Initial MenuItem count: ${initialPageInfo.initialMenuItemCount}`
  );
  console.log(`  Menu sections detected: ${initialPageInfo.menuSectionCount}`);
  console.log(`  Page height: ${initialPageInfo.pageHeight}px`);
  console.log(`  Viewport height: ${initialPageInfo.viewportHeight}px`);

  console.log("\n=== STARTING GRADUAL MENU ITEM CAPTURE ===");
  const menuItems = await captureMenuItemsDuringScroll(restaurantPage);

  if (menuItems && menuItems.length > 0) {
    console.log(`\n📋 SUCCESS! Captured ${menuItems.length} menu items`);

    // Sort by name for readability
    menuItems.sort((a, b) => a.name.localeCompare(b.name));

    console.log("\n=== FINAL MENU ITEMS ===");
    menuItems.forEach((item, index) => {
      console.log(`${index + 1}. "${item.name}" - ${item.price}`);
    });

    // Take final screenshot
    await restaurantPage.screenshot({ path: "restaurant-page-final.png" });
  } else {
    console.log("❌ No menu items captured");
    console.log(
      "🔍 Check screenshots: restaurant-page-loaded.png and restaurant-page-final.png"
    );
  }

  return menuItems;
}

module.exports = {
  initialize,
  getDoorDashPage,
  findAndSelectRestaurant,
  testMenuScraping,
};
