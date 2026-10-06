# 🧑‍💻 SauceDemo Playwright Framework — Part 2: Code & Reference

Prepared by: walrtemak



> This is **Part 2 of 2**. It gives the **complete, copy-ready source code for every
> file, in exact build order**, from an empty folder to the final suite run — plus
> all commands and an interview quick-reference.
>
> 👉 For the **why** behind each layer, architecture diagrams, and the execution
> flow, see **[Part 1 — Concepts, Architecture & Flow](SauceDemo_Framework_Guide_Part1_Concepts.md)**.

---

## 📑 Build Order (each step = one file or set of files)

| Step | What you create                 | Folder/File                                                                                           |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0    | Project init + install          | `package.json`, `node_modules`                                                                        |
| 1    | Minimal config + first raw test | `playwright.config.js`, `tests/login/positiveLogin.spec.js`                                           |
| 2    | Constants                       | `utils/constants.js`                                                                                  |
| 3    | Logger                          | `utils/logger.js`                                                                                     |
| 4    | BasePage                        | `pages/BasePage.js`                                                                                   |
| 5    | Page Objects                    | `pages/LoginPage.js`, `InventoryPage.js`, `CartPage.js`, `CheckoutPage.js`, `CheckoutCompletePage.js` |
| 6    | Environment config              | `config/environments/*.json`, `config/env.config.js`, `.env.example`                                  |
| 7    | Wire config into Playwright     | `playwright.config.js` (final)                                                                        |
| 8    | Utilities                       | `utils/stringUtils.js`, `waitUtils.js`, `dataGenerator.js`, `dataReader.js`, `assertionUtils.js`, …   |
| 9    | Fixtures                        | `fixtures/baseFixture.js`                                                                             |
| 10   | Test data                       | `test-data/*.json`                                                                                    |
| 11   | Specs (plain + data-driven)     | `tests/login/…`, `inventory/`, `cart/`, `checkout/`, `e2e/`                                           |
| 12   | Reporting + global setup        | `global-setup.js`, reporters in config                                                                |
| 14   | Unit tests                      | `tests/unit`                                                                                          |
| 15   | CI/CD + final package.json      | `.github/workflows/playwright.yml`, `Jenkinsfile`, `package.json`                                     |
| 15b  | Code quality config             | `eslint.config.js`, `.prettierrc.json`, `.prettierignore`                                             |
| 16   | Final run + reports             | commands                                                                                              |

---

## STEP 0 — Project Initialization

```powershell
mkdir saucedemo-framework
cd saucedemo-framework
npm init -y
npm install -D @playwright/test
npx playwright install
```

Add `"type": "module"` to `package.json` so we can use `import/export`:

```json
{
  "name": "saucedemo-ui-framework",
  "version": "1.0.0",
  "type": "module"
}
```

---

## STEP 1 — Minimal Config + First Raw Test

`playwright.config.js` (minimal — grown in Step 7)

```javascript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "https://www.saucedemo.com",
    headless: true,
  },
});
```

`tests/login/positiveLogin.spec.js` (deliberately raw)

```javascript
import { test, expect } from "@playwright/test";

test("valid user can log in", async ({ page }) => {
  await page.goto("/");
  await page.fill("#user-name", "standard_user");
  await page.fill("#password", "secret_sauce");
  await page.click("#login-button");
  await expect(page.locator(".title")).toHaveText("Products");
});
```

```powershell
npx playwright test
npx playwright show-report
```

---

## STEP 2 — Constants (Kill Magic Strings)

`utils/constants.js`

```javascript
/**
 * Application-wide constants: URLs, messages, and static text.
 */
const ROUTES = {
  LOGIN: "/",
  INVENTORY: "/inventory.html",
  CART: "/cart.html",
  CHECKOUT_STEP_ONE: "/checkout-step-one.html",
  CHECKOUT_STEP_TWO: "/checkout-step-two.html",
  CHECKOUT_COMPLETE: "/checkout-complete.html",
};

const MESSAGES = {
  LOCKED_OUT: "Epic sadface: Sorry, this user has been locked out.",
  USERNAME_REQUIRED: "Epic sadface: Username is required",
  PASSWORD_REQUIRED: "Epic sadface: Password is required",
  INVALID_CREDENTIALS:
    "Epic sadface: Username and password do not match any user in this service",
  FIRST_NAME_REQUIRED: "Error: First Name is required",
  LAST_NAME_REQUIRED: "Error: Last Name is required",
  POSTAL_CODE_REQUIRED: "Error: Postal Code is required",
  ORDER_COMPLETE_HEADER: "Thank you for your order!",
  ORDER_COMPLETE_TEXT:
    "Your order has been dispatched, and will arrive just as fast as the pony can get there!",
};

const SORT_OPTIONS = {
  NAME_A_TO_Z: "az",
  NAME_Z_TO_A: "za",
  PRICE_LOW_TO_HIGH: "lohi",
  PRICE_HIGH_TO_LOW: "hilo",
};

const TITLES = {
  PRODUCTS: "Products",
  YOUR_CART: "Your Cart",
  CHECKOUT_INFO: "Checkout: Your Information",
  CHECKOUT_OVERVIEW: "Checkout: Overview",
  CHECKOUT_COMPLETE: "Checkout: Complete!",
};

const EXPECTED_PRODUCT_COUNT = 6;

export { ROUTES, MESSAGES, SORT_OPTIONS, TITLES, EXPECTED_PRODUCT_COUNT };
```

---

## STEP 3 — Logger (Winston)

`npm install -D winston`

`utils/logger.js`

```javascript
import { createLogger, format, transports } from "winston";
import env from "../config/env.config.js";

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level.toUpperCase()}] ${stack || message}`;
});

const logger = createLogger({
  level: env.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat,
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
    }),
    new transports.File({ filename: "logs/test-execution.log" }),
    new transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});

export default logger;
```

> ⚠️ `logger.js` imports `env` (Step 6). If building strictly top-to-bottom,
> temporarily hard-code `level: 'info'` and remove the `env` import, then restore it
> after Step 6.

---

## STEP 4 — BasePage (Parent Class)

`pages/BasePage.js`

```javascript
import logger from "../utils/logger.js";

/**
 * BasePage - parent class for all Page Objects.
 * Reusable, generic wrappers around Playwright actions.
 */
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /* ===== NAVIGATION ===== */
  async goto(path = "/") {
    logger.info(`Navigating to: ${path}`);
    await this.page.goto(path);
  }
  async reload() {
    await this.page.reload();
  }
  async goBack() {
    await this.page.goBack();
  }
  async goForward() {
    await this.page.goForward();
  }

  /* ===== CORE INTERACTIONS ===== */
  async click(locator) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.click();
    logger.info(`Clicked element: ${this._describe(locator)}`);
  }
  async forceClick(locator) {
    await this._resolve(locator).click({ force: true });
  }
  async doubleClick(locator) {
    await this._resolve(locator).dblclick();
  }
  async rightClick(locator) {
    await this._resolve(locator).click({ button: "right" });
  }
  async type(locator, text, delay = 50) {
    await this._resolve(locator).pressSequentially(text, { delay });
  }
  async clear(locator) {
    await this._resolve(locator).clear();
  }
  async pressKey(locator, key) {
    await this._resolve(locator).press(key);
  }
  async hover(locator) {
    await this._resolve(locator).hover();
  }
  async dragAndDrop(source, target) {
    await this._resolve(source).dragTo(this._resolve(target));
  }

  /* ===== CHECKBOX / RADIO ===== */
  async check(locator) {
    await this._resolve(locator).check();
  }
  async uncheck(locator) {
    await this._resolve(locator).uncheck();
  }
  async isChecked(locator) {
    return this._resolve(locator).isChecked();
  }

  /* ===== FILE UPLOAD ===== */
  async uploadFile(locator, filePaths) {
    await this._resolve(locator).setInputFiles(filePaths);
  }

  /* ===== INPUT ===== */
  async fill(locator, text) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.fill(text);
    logger.info(`Filled "${text}" into: ${this._describe(locator)}`);
  }

  /* ===== READ / STATE ===== */
  async getText(locator) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    return (await element.innerText()).trim();
  }
  async getAllTexts(locator) {
    return (await this._resolve(locator).allInnerTexts()).map((t) => t.trim());
  }
  async getValue(locator) {
    return this._resolve(locator).inputValue();
  }
  async getAttribute(locator, attribute) {
    return this._resolve(locator).getAttribute(attribute);
  }
  async getUrl() {
    return this.page.url();
  }
  async getTitle() {
    return this.page.title();
  }
  async isVisible(locator) {
    return this._resolve(locator).isVisible();
  }
  async isEnabled(locator) {
    return this._resolve(locator).isEnabled();
  }
  async count(locator) {
    return this._resolve(locator).count();
  }

  /* ===== DROPDOWNS ===== */
  async selectByValue(locator, value) {
    await this._resolve(locator).selectOption(value);
  }
  async selectByLabel(locator, label) {
    await this._resolve(locator).selectOption({ label });
  }

  /* ===== WAITS ===== */
  async waitForVisible(locator, timeout = 10000) {
    await this._resolve(locator).waitFor({ state: "visible", timeout });
  }
  async waitForHidden(locator, timeout = 10000) {
    await this._resolve(locator).waitFor({ state: "hidden", timeout });
  }

  /* ===== PRIVATE HELPERS ===== */
  /** Accept a string selector OR a Locator and always return a Locator. @private */
  _resolve(locator) {
    return typeof locator === "string" ? this.page.locator(locator) : locator;
  }
  /** Short description of a locator for logging. @private */
  _describe(locator) {
    return typeof locator === "string" ? locator : locator.toString();
  }
}

export default BasePage;
```

---

## STEP 5 — Page Objects (Extend BasePage)

`pages/LoginPage.js`

```javascript
import { test } from "@playwright/test";
import BasePage from "./BasePage.js";
import { ROUTES } from "../utils/constants.js";
import logger from "../utils/logger.js";

/** LoginPage - mix of locator strategies: built-in, CSS, XPath. */
class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.usernameInput = page.getByPlaceholder("Username"); // built-in
    this.passwordInput = page.locator("#password"); // CSS
    this.loginButton = page.getByRole("button", { name: "Login" }); // role
    this.errorMessage = page.locator('[data-test="error"]'); // CSS attr
    this.errorButton = page.locator("//button[@class='error-button']"); // XPath
    this.loginLogo = page.locator("//div[@class='login_logo']"); // XPath
  }

  async open() {
    await this.goto(ROUTES.LOGIN);
  }

  async login(username, password) {
    await test.step(`Login as "${username}"`, async () => {
      logger.info(`Attempting login with username: ${username}`);
      await this.fill(this.usernameInput, username);
      await this.fill(this.passwordInput, password);
      await this.click(this.loginButton);
    });
  }

  async getErrorMessage() {
    return this.getText(this.errorMessage);
  }
  async hasError() {
    return this.isVisible(this.errorMessage);
  }
}

export default LoginPage;
```

`pages/InventoryPage.js`

```javascript
import BasePage from "./BasePage.js";
import { ROUTES } from "../utils/constants.js";
import { slugify, parsePrice } from "../utils/stringUtils.js";
import logger from "../utils/logger.js";

class InventoryPage extends BasePage {
  constructor(page) {
    super(page);
    this.pageTitle = page.locator(".title");
    this.inventoryItems = page.locator(".inventory_item");
    this.itemNames = page.locator(".inventory_item_name");
    this.itemPrices = page.locator(".inventory_item_price");
    this.itemImages = page.locator("//div[@class='inventory_item_img']//img");
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartBadge = page.locator(".shopping_cart_badge");
    this.cartLink = page.locator("//a[@class='shopping_cart_link']");
    this.menuButton = page.locator("#react-burger-menu-btn");
    this.logoutLink = page.getByRole("link", { name: "Logout" });
  }

  addToCartButton(productName) {
    return this.page.locator(
      `[data-test="add-to-cart-${this._toId(productName)}"]`,
    );
  }
  removeButton(productName) {
    return this.page.locator(`[data-test="remove-${this._toId(productName)}"]`);
  }

  async addProductToCart(productName) {
    logger.info(`Adding product to cart: ${productName}`);
    await this.click(this.addToCartButton(productName));
  }
  async removeProductFromCart(productName) {
    await this.click(this.removeButton(productName));
  }
  async addMultipleProducts(productNames = []) {
    for (const name of productNames) await this.addProductToCart(name);
  }
  async getProductCount() {
    return this.count(this.inventoryItems);
  }
  async getProductNames() {
    return this.getAllTexts(this.itemNames);
  }
  async getProductPrices() {
    const priceStrings = await this.getAllTexts(this.itemPrices);
    return priceStrings.map((p) => parsePrice(p));
  }
  async sortBy(sortValue) {
    await this.selectByValue(this.sortDropdown, sortValue);
  }
  async getCartCount() {
    if (await this.isVisible(this.cartBadge)) {
      return parseInt(await this.getText(this.cartBadge), 10);
    }
    return 0;
  }
  async goToCart() {
    await this.click(this.cartLink);
  }
  async openProductDetails(productName) {
    await this.click(this.itemNames.filter({ hasText: productName }));
  }
  async logout() {
    await this.click(this.menuButton);
    await this.click(this.logoutLink);
  }
  async isLoaded() {
    return this.getUrl().includes(ROUTES.INVENTORY);
  }
  _toId(productName) {
    return slugify(productName);
  }
}

export default InventoryPage;
```

`pages/CartPage.js`

```javascript
import BasePage from "./BasePage.js";
import { ROUTES } from "../utils/constants.js";
import { slugify, parsePrice } from "../utils/stringUtils.js";
import logger from "../utils/logger.js";

class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this.pageTitle = page.locator(".title");
    this.cartItems = page.locator(".cart_item");
    this.cartItemNames = page.locator(".inventory_item_name");
    this.cartItemPrices = page.locator(".inventory_item_price");
    this.checkoutButton = page.getByRole("button", { name: "Checkout" });
    this.continueShoppingButton = page.getByRole("button", {
      name: "Continue Shopping",
    });
    this.cartBadge = page.locator("//span[@class='shopping_cart_badge']");
  }

  removeButton(productName) {
    return this.page.locator(`[data-test="remove-${slugify(productName)}"]`);
  }
  async open() {
    await this.goto(ROUTES.CART);
  }
  async getItemCount() {
    return this.count(this.cartItems);
  }
  async getCartItemNames() {
    return this.getAllTexts(this.cartItemNames);
  }
  async getCartItemPrices() {
    const priceStrings = await this.getAllTexts(this.cartItemPrices);
    return priceStrings.map((p) => parsePrice(p));
  }
  async removeItem(productName) {
    logger.info(`Removing item from cart: ${productName}`);
    await this.click(this.removeButton(productName));
  }
  async proceedToCheckout() {
    await this.click(this.checkoutButton);
  }
  async continueShopping() {
    await this.click(this.continueShoppingButton);
  }
  async getCartCount() {
    if (await this.isVisible(this.cartBadge)) {
      return parseInt(await this.getText(this.cartBadge), 10);
    }
    return 0;
  }
}

export default CartPage;
```

`pages/CheckoutPage.js`

```javascript
import BasePage from "./BasePage.js";
import { parsePrice } from "../utils/stringUtils.js";
import logger from "../utils/logger.js";

class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);
    // Step One - Your Information
    this.firstNameInput = page.getByPlaceholder("First Name");
    this.lastNameInput = page.getByPlaceholder("Last Name");
    this.postalCodeInput = page.getByPlaceholder("Zip/Postal Code");
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator("//button[@data-test='cancel']");
    this.errorMessage = page.locator('[data-test="error"]');
    // Step Two - Overview
    this.finishButton = page.getByRole("button", { name: "Finish" });
    this.summarySubtotal = page.locator(
      "//div[@class='summary_subtotal_label']",
    );
    this.summaryTax = page.locator("//div[@class='summary_tax_label']");
    this.summaryTotal = page.locator("//div[@class='summary_total_label']");
    this.cartItemPrices = page.locator(".inventory_item_price");
    this.pageTitle = page.locator(".title");
  }

  async fillCustomerInfo(firstName, lastName, postalCode) {
    logger.info(
      `Filling checkout info: ${firstName} ${lastName}, ${postalCode}`,
    );
    if (firstName !== undefined && firstName !== "")
      await this.fill(this.firstNameInput, firstName);
    if (lastName !== undefined && lastName !== "")
      await this.fill(this.lastNameInput, lastName);
    if (postalCode !== undefined && postalCode !== "")
      await this.fill(this.postalCodeInput, postalCode);
  }
  async continue() {
    await this.click(this.continueButton);
  }
  async cancel() {
    await this.click(this.cancelButton);
  }
  async finish() {
    await this.click(this.finishButton);
  }
  async getErrorMessage() {
    return this.getText(this.errorMessage);
  }
  async getSubtotal() {
    return parsePrice(await this.getText(this.summarySubtotal));
  }
  async getTax() {
    return parsePrice(await this.getText(this.summaryTax));
  }
  async getTotal() {
    return parsePrice(await this.getText(this.summaryTotal));
  }
}

export default CheckoutPage;
```

`pages/CheckoutCompletePage.js`

```javascript
import BasePage from "./BasePage.js";
import { ROUTES } from "../utils/constants.js";

class CheckoutCompletePage extends BasePage {
  constructor(page) {
    super(page);
    this.completeHeader = page.locator("//h2[@class='complete-header']"); // XPath
    this.completeText = page.locator(".complete-text"); // CSS
    this.backHomeButton = page.getByRole("button", { name: "Back Home" }); // role
    this.ponyExpressImage = page.locator("//img[@class='pony_express']"); // XPath
  }

  async getHeaderText() {
    return this.getText(this.completeHeader);
  }
  async getCompleteText() {
    return this.getText(this.completeText);
  }
  async backHome() {
    await this.click(this.backHomeButton);
  }
  async isOrderComplete() {
    return (
      this.getUrl().includes(ROUTES.CHECKOUT_COMPLETE) &&
      (await this.isVisible(this.completeHeader))
    );
  }
}

export default CheckoutCompletePage;
```

---

## STEP 6 — Environment Configuration

`npm install -D dotenv`

`config/environments/qa.json`

```json
{
  "name": "qa",
  "baseURL": "https://www.saucedemo.com",
  "credentials": {
    "password": "secret_sauce",
    "users": {
      "standard": "standard_user",
      "lockedOut": "locked_out_user",
      "problem": "problem_user",
      "performance": "performance_glitch_user",
      "error": "error_user"
    }
  }
}
```

> Create `dev.json` and `staging.json` with the same shape (change `name`/URLs).

`config/env.config.js`

```javascript
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_NAME = process.env.ENV || "qa";

function loadEnvFile() {
  const filePath = path.join(__dirname, "environments", `${ENV_NAME}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  console.warn(
    `[env.config] No environment file for "${ENV_NAME}", using defaults.`,
  );
  return {};
}

const fileConfig = loadEnvFile();
const fileCreds = fileConfig.credentials || {};
const fileUsers = fileCreds.users || {};

const env = {
  name: fileConfig.name || ENV_NAME,
  baseURL:
    process.env.BASE_URL || fileConfig.baseURL || "https://www.saucedemo.com",
  password: process.env.PASSWORD || fileCreds.password || "secret_sauce",
  users: {
    standard:
      process.env.STANDARD_USER || fileUsers.standard || "standard_user",
    lockedOut:
      process.env.LOCKED_OUT_USER || fileUsers.lockedOut || "locked_out_user",
    problem: process.env.PROBLEM_USER || fileUsers.problem || "problem_user",
    performance:
      process.env.PERFORMANCE_USER ||
      fileUsers.performance ||
      "performance_glitch_user",
    error: process.env.ERROR_USER || fileUsers.error || "error_user",
  },
  timeouts: {
    test: Number(process.env.TEST_TIMEOUT) || 60000,
    expect: Number(process.env.EXPECT_TIMEOUT) || 10000,
    action: Number(process.env.ACTION_TIMEOUT) || 15000,
    navigation: Number(process.env.NAVIGATION_TIMEOUT) || 30000,
  },
  headless: process.env.HEADLESS !== "false",
  logLevel: process.env.LOG_LEVEL || "info",
};

export default env;
```

`.env.example` (commit) + `.env` (git-ignored)

```bash
ENV=qa
BASE_URL=https://www.saucedemo.com
PASSWORD=secret_sauce
HEADLESS=true
LOG_LEVEL=info
TEST_TIMEOUT=60000
EXPECT_TIMEOUT=10000
ACTION_TIMEOUT=15000
NAVIGATION_TIMEOUT=30000
```

---

## STEP 7 — Final `playwright.config.js`

```javascript
// @ts-check
import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";
import env from "./config/env.config.js";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.js",
  timeout: env.timeouts.test,
  expect: { timeout: env.timeouts.expect },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/html-report", open: "never" }],
    ["json", { outputFile: "reports/json-report/results.json" }],
    ["junit", { outputFile: "reports/junit-report/results.xml" }],
    [
      "allure-playwright",
      { resultsDir: "reports/allure-results", detail: true, suiteTitle: true },
    ],
  ],

  use: {
    baseURL: env.baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: env.timeouts.action,
    navigationTimeout: env.timeouts.navigation,
    headless: env.headless,
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  outputDir: "test-results",
});
```

---

## STEP 8 — Utilities

`utils/stringUtils.js`

```javascript
export function parsePrice(priceString) {
  return parseFloat(String(priceString).replace(/[^\d.-]/g, ""));
}
export function toCurrency(amount, symbol = "$") {
  return `${symbol}${Number(amount).toFixed(2)}`;
}
export function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-");
}
export function normalizeSpaces(text) {
  return String(text).replace(/\s+/g, " ").trim();
}
export function containsIgnoreCase(haystack, needle) {
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
}
export default {
  parsePrice,
  toCurrency,
  capitalize,
  slugify,
  normalizeSpaces,
  containsIgnoreCase,
};
```

`utils/waitUtils.js`

```javascript
import logger from "./logger.js";

export async function retry(
  fn,
  { retries = 3, delay = 1000, name = "action" } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(
        `Retry ${attempt}/${retries} failed for "${name}": ${error.message}`,
      );
      if (attempt < retries) await sleep(delay);
    }
  }
  throw lastError;
}

export async function waitUntil(
  condition,
  { timeout = 10000, interval = 500, message = "condition" } = {},
) {
  const endTime = Date.now() + timeout;
  while (Date.now() < endTime) {
    if (await condition()) return;
    await sleep(interval);
  }
  throw new Error(`Timed out after ${timeout}ms waiting for: ${message}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default { retry, waitUntil, sleep };
```

`utils/dataGenerator.js`

```javascript
const FIRST_NAMES = [
  "John",
  "Jane",
  "Alex",
  "Priya",
  "Liam",
  "Sara",
  "Raj",
  "Emma",
  "Noah",
  "Mia",
];
const LAST_NAMES = [
  "Doe",
  "Smith",
  "Sharma",
  "Brown",
  "Khan",
  "Patel",
  "Jones",
  "Lee",
  "Verma",
];
const DOMAINS = ["example.com", "testmail.com", "mailinator.com", "qa-demo.io"];

export function randomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function randomFrom(array) {
  return array[randomInt(0, array.length - 1)];
}
export function randomString(length = 8) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++)
    result += chars[randomInt(0, chars.length - 1)];
  return result;
}
export function firstName() {
  return randomFrom(FIRST_NAMES);
}
export function lastName() {
  return randomFrom(LAST_NAMES);
}
export function fullName() {
  return `${firstName()} ${lastName()}`;
}
export function email(prefix = "user") {
  return `${prefix}_${Date.now()}_${randomString(4).toLowerCase()}@${randomFrom(DOMAINS)}`;
}
export function postalCode(length = 5) {
  let code = "";
  for (let i = 0; i < length; i++) code += randomInt(0, 9);
  return code;
}
export function phoneNumber() {
  return `9${postalCode(9)}`;
}
export function customer() {
  return {
    firstName: firstName(),
    lastName: lastName(),
    email: email(),
    postalCode: postalCode(),
    phone: phoneNumber(),
  };
}
export default {
  randomInt,
  randomFrom,
  randomString,
  firstName,
  lastName,
  fullName,
  email,
  postalCode,
  phoneNumber,
  customer,
};
```

`utils/dataReader.js`

```javascript
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "test-data");

function readJSON(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath))
    throw new Error(`Test data file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readCSV(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath))
    throw new Error(`Test data file not found: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const [headerLine, ...lines] = content.split(/\r?\n/);
  const headers = headerLine.split(",").map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {});
  });
}

export { readJSON, readCSV };
```

`utils/assertionUtils.js`

```javascript
import { expect } from "@playwright/test";
import logger from "./logger.js";

export function assertEquals(actual, expected, message = "") {
  logger.info(`Assert equals: "${actual}" === "${expected}" ${message}`);
  expect(actual, message).toBe(expected);
}
export function assertTrue(condition, message = "") {
  expect(condition, message).toBeTruthy();
}
export function assertFalse(condition, message = "") {
  expect(condition, message).toBeFalsy();
}
export function assertContains(text, substring, message = "") {
  expect(String(text), message).toContain(substring);
}
export async function assertVisible(locator, message = "") {
  await expect(locator, message).toBeVisible();
}
export async function assertHasText(locator, text, message = "") {
  await expect(locator, message).toHaveText(text);
}
export default {
  assertEquals,
  assertTrue,
  assertFalse,
  assertContains,
  assertVisible,
  assertHasText,
};
```

`utils/dateUtils.js`

```javascript
export function timestamp() {
  return Date.now();
}
export function today(separator = "-") {
  return format(new Date(), separator);
}
export function addDays(days, separator = "-") {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return format(d, separator);
}
export function format(date, separator = "-") {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${separator}${mm}${separator}${dd}`;
}
export function fileTimestamp() {
  const d = new Date();
  const date = format(d, "-");
  const time = `${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;
  return `${date}_${time}`;
}
export default { timestamp, today, addDays, format, fileTimestamp };
```

`utils/fileUtils.js`

```javascript
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

export function fromRoot(...segments) {
  return path.join(ROOT_DIR, ...segments);
}
export function exists(filePath) {
  return fs.existsSync(filePath);
}
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}
export function readText(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}
export function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}
export function appendText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, "utf-8");
}
export function deleteFile(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
export function fileSize(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}
export async function saveDownload(download, targetPath) {
  ensureDir(path.dirname(targetPath));
  await download.saveAs(targetPath);
  return targetPath;
}
export default {
  fromRoot,
  exists,
  ensureDir,
  readText,
  writeText,
  appendText,
  deleteFile,
  fileSize,
  saveDownload,
};
```

---

## STEP 9 — Fixtures (Dependency Injection)

`fixtures/baseFixture.js`

```javascript
import { test as base, expect } from "@playwright/test";
import LoginPage from "../pages/LoginPage.js";
import InventoryPage from "../pages/InventoryPage.js";
import CartPage from "../pages/CartPage.js";
import CheckoutPage from "../pages/CheckoutPage.js";
import CheckoutCompletePage from "../pages/CheckoutCompletePage.js";
import * as dataGenerator from "../utils/dataGenerator.js";
import env from "../config/env.config.js";
import logger from "../utils/logger.js";

const test = base.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },

  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(env.users.standard, env.password);
    await page.waitForURL(/inventory/);
    await use(page);
  },

  data: async ({}, use) => {
    await use(dataGenerator);
  },
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    logger.warn(`Test failed: "${testInfo.title}" — attaching screenshot`);
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach("failure-screenshot", {
        body: screenshot,
        contentType: "image/png",
      });
    } catch (error) {
      logger.error(`Could not capture failure screenshot: ${error.message}`);
    }
  }
});

export { test, expect };
```

> 🔑 From here, every spec imports `test`/`expect` from this file — never from
> `@playwright/test` directly.

---

## STEP 10 — Test Data

`test-data/users.json`

```json
{
  "standard": {
    "username": "standard_user",
    "password": "secret_sauce",
    "description": "Works normally"
  },
  "lockedOut": {
    "username": "locked_out_user",
    "password": "secret_sauce",
    "description": "Cannot log in - locked out",
    "expectedError": "Epic sadface: Sorry, this user has been locked out."
  },
  "problem": {
    "username": "problem_user",
    "password": "secret_sauce",
    "description": "UI issues but can log in"
  },
  "performance": {
    "username": "performance_glitch_user",
    "password": "secret_sauce",
    "description": "Logs in with a delay"
  }
}
```

`test-data/loginData.json`

```json
{
  "validLogin": { "username": "standard_user", "password": "secret_sauce" },
  "invalidCredentials": [
    {
      "testId": "TC_LOGIN_01",
      "username": "invalid_user",
      "password": "secret_sauce",
      "description": "Invalid username",
      "expectedError": "Epic sadface: Username and password do not match any user in this service"
    },
    {
      "testId": "TC_LOGIN_02",
      "username": "standard_user",
      "password": "wrong_password",
      "description": "Invalid password",
      "expectedError": "Epic sadface: Username and password do not match any user in this service"
    }
  ],
  "emptyCredentials": [
    {
      "testId": "TC_LOGIN_04",
      "username": "",
      "password": "secret_sauce",
      "description": "Empty username",
      "expectedError": "Epic sadface: Username is required"
    },
    {
      "testId": "TC_LOGIN_05",
      "username": "standard_user",
      "password": "",
      "description": "Empty password",
      "expectedError": "Epic sadface: Password is required"
    }
  ]
}
```

`test-data/checkoutData.json`

```json
{
  "validCustomers": [
    {
      "testId": "TC_CHECKOUT_01",
      "firstName": "John",
      "lastName": "Doe",
      "postalCode": "12345",
      "description": "Standard valid customer"
    }
  ],
  "invalidCustomers": [
    {
      "testId": "TC_CHECKOUT_10",
      "firstName": "",
      "lastName": "Doe",
      "postalCode": "12345",
      "description": "Missing first name",
      "expectedError": "Error: First Name is required"
    },
    {
      "testId": "TC_CHECKOUT_11",
      "firstName": "John",
      "lastName": "",
      "postalCode": "12345",
      "description": "Missing last name",
      "expectedError": "Error: Last Name is required"
    },
    {
      "testId": "TC_CHECKOUT_12",
      "firstName": "John",
      "lastName": "Doe",
      "postalCode": "",
      "description": "Missing postal code",
      "expectedError": "Error: Postal Code is required"
    }
  ]
}
```

---

## STEP 11 — Specs (Plain + Data-Driven)

`tests/login/positiveLogin.spec.js`

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import env from "../../config/env.config.js";

const users = readJSON("users.json");

test.describe("Login - Positive @regression", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test("TC_LOGIN_VALID: valid standard user can log in @smoke", async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.login(env.users.standard, env.password);
    expect(await inventoryPage.isLoaded()).toBeTruthy();
    await expect(inventoryPage.pageTitle).toHaveText("Products");
  });

  test("TC_LOGIN_PROBLEM: problem user can log in", async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.login(users.problem.username, env.password);
    expect(await inventoryPage.isLoaded()).toBeTruthy();
  });

  test("TC_LOGIN_PERF: performance glitch user can log in", async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.login(users.performance.username, env.password);
    await expect(inventoryPage.pageTitle).toHaveText("Products");
  });
});
```

`tests/login/negativeLogin.spec.js` (data-driven)

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import { MESSAGES } from "../../utils/constants.js";
import env from "../../config/env.config.js";

const loginData = readJSON("loginData.json");
const users = readJSON("users.json");

test.describe("Login - Negative @regression", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test("TC_LOGIN_LOCKED: locked-out user sees lockout error @smoke", async ({
    loginPage,
  }) => {
    await loginPage.login(users.lockedOut.username, env.password);
    expect(await loginPage.getErrorMessage()).toBe(MESSAGES.LOCKED_OUT);
  });

  for (const data of loginData.invalidCredentials) {
    test(`${data.testId}: ${data.description}`, async ({ loginPage }) => {
      await loginPage.login(data.username, data.password);
      expect(await loginPage.getErrorMessage()).toBe(data.expectedError);
    });
  }

  for (const data of loginData.emptyCredentials) {
    test(`${data.testId}: ${data.description}`, async ({ loginPage }) => {
      await loginPage.login(data.username, data.password);
      expect(await loginPage.getErrorMessage()).toBe(data.expectedError);
    });
  }
});
```

`tests/login/logout.spec.js`

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { ROUTES } from "../../utils/constants.js";
import env from "../../config/env.config.js";

test.describe("Login - Logout @regression", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test("TC_LOGIN_LOGOUT: user can log out successfully", async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.login(env.users.standard, env.password);
    expect(await inventoryPage.isLoaded()).toBeTruthy();
    await inventoryPage.logout();
    await expect(loginPage.loginButton).toBeVisible();
    expect(inventoryPage.getUrl()).toContain(ROUTES.LOGIN);
  });
});
```

`tests/inventory/inventory.spec.js`

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import { SORT_OPTIONS, EXPECTED_PRODUCT_COUNT } from "../../utils/constants.js";

const productsData = readJSON("products.json");

test.describe("Inventory / Products Module @regression", () => {
  test.beforeEach(async ({ loggedInPage }) => {
    void loggedInPage;
  });

  test("TC_INV_01: exactly 6 products are displayed @smoke", async ({
    inventoryPage,
  }) => {
    expect(await inventoryPage.getProductCount()).toBe(EXPECTED_PRODUCT_COUNT);
  });

  test("TC_INV_03: all expected product names are present", async ({
    inventoryPage,
  }) => {
    const names = await inventoryPage.getProductNames();
    const expectedNames = productsData.products.map((p) => p.name);
    expect(names.sort()).toEqual(expectedNames.sort());
  });

  test("TC_INV_04: sort products Name A to Z @smoke", async ({
    inventoryPage,
  }) => {
    await inventoryPage.sortBy(SORT_OPTIONS.NAME_A_TO_Z);
    const names = await inventoryPage.getProductNames();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test("TC_INV_06: sort products Price low to high", async ({
    inventoryPage,
  }) => {
    await inventoryPage.sortBy(SORT_OPTIONS.PRICE_LOW_TO_HIGH);
    const prices = await inventoryPage.getProductPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test("TC_INV_08: add single product updates cart badge @smoke", async ({
    inventoryPage,
  }) => {
    await inventoryPage.addProductToCart("Sauce Labs Backpack");
    expect(await inventoryPage.getCartCount()).toBe(1);
  });
});
```

`tests/cart/cart.spec.js`

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { TITLES } from "../../utils/constants.js";

test.describe("Cart Module @regression", () => {
  test.beforeEach(async ({ loggedInPage }) => {
    void loggedInPage;
  });

  test("TC_CART_01: cart badge reflects number of added items @smoke", async ({
    inventoryPage,
  }) => {
    await inventoryPage.addMultipleProducts([
      "Sauce Labs Backpack",
      "Sauce Labs Bike Light",
    ]);
    expect(await inventoryPage.getCartCount()).toBe(2);
  });

  test("TC_CART_04: remove item from the cart page", async ({
    inventoryPage,
    cartPage,
  }) => {
    await inventoryPage.addProductToCart("Sauce Labs Backpack");
    await inventoryPage.goToCart();
    expect(await cartPage.getItemCount()).toBe(1);
    await cartPage.removeItem("Sauce Labs Backpack");
    expect(await cartPage.getItemCount()).toBe(0);
  });

  test("TC_CART_08: checkout button navigates to checkout step one", async ({
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await inventoryPage.addProductToCart("Sauce Labs Backpack");
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
    await expect(checkoutPage.pageTitle).toHaveText(TITLES.CHECKOUT_INFO);
  });
});
```

`tests/checkout/checkout.spec.js` (data-driven + soft asserts + steps)

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import { TITLES, MESSAGES } from "../../utils/constants.js";
import dataGenerator from "../../utils/dataGenerator.js";

const checkoutData = readJSON("checkoutData.json");

test.describe("Checkout Module @regression", () => {
  test.beforeEach(async ({ loggedInPage, inventoryPage, cartPage }) => {
    void loggedInPage;
    await inventoryPage.addProductToCart("Sauce Labs Backpack");
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
  });

  for (const customer of checkoutData.validCustomers) {
    test(`${customer.testId}: complete order - ${customer.description} @smoke`, async ({
      checkoutPage,
      checkoutCompletePage,
    }) => {
      await test.step("Fill customer information and continue", async () => {
        await checkoutPage.fillCustomerInfo(
          customer.firstName,
          customer.lastName,
          customer.postalCode,
        );
        await checkoutPage.continue();
      });
      await test.step("Verify overview page then finish order", async () => {
        await expect(checkoutPage.pageTitle).toHaveText(
          TITLES.CHECKOUT_OVERVIEW,
        );
        await checkoutPage.finish();
      });
      await test.step("Verify order confirmation", async () => {
        expect.soft(await checkoutCompletePage.isOrderComplete()).toBeTruthy();
        expect
          .soft(await checkoutCompletePage.getHeaderText())
          .toBe(MESSAGES.ORDER_COMPLETE_HEADER);
      });
    });
  }

  for (const customer of checkoutData.invalidCustomers) {
    test(`${customer.testId}: validation - ${customer.description}`, async ({
      checkoutPage,
    }) => {
      await checkoutPage.fillCustomerInfo(
        customer.firstName,
        customer.lastName,
        customer.postalCode,
      );
      await checkoutPage.continue();
      expect(await checkoutPage.getErrorMessage()).toBe(customer.expectedError);
    });
  }

  test("TC_CHECKOUT_SUMMARY: order summary total = subtotal + tax", async ({
    checkoutPage,
  }) => {
    await checkoutPage.fillCustomerInfo("John", "Doe", "12345");
    await checkoutPage.continue();
    const subtotal = await checkoutPage.getSubtotal();
    const tax = await checkoutPage.getTax();
    const total = await checkoutPage.getTotal();
    expect(Number((subtotal + tax).toFixed(2))).toBe(total);
  });

  test("TC_CHECKOUT_RANDOM: complete order with random customer data", async ({
    checkoutPage,
    checkoutCompletePage,
  }) => {
    const cust = dataGenerator.customer();
    await checkoutPage.fillCustomerInfo(
      cust.firstName,
      cust.lastName,
      cust.postalCode,
    );
    await checkoutPage.continue();
    await checkoutPage.finish();
    expect(await checkoutCompletePage.isOrderComplete()).toBeTruthy();
  });
});
```

`tests/e2e/purchaseJourney.spec.js` (full end-to-end)

```javascript
import { test, expect } from "../../fixtures/baseFixture.js";
import { TITLES, SORT_OPTIONS } from "../../utils/constants.js";
import env from "../../config/env.config.js";

test.describe("E2E - Purchase Journey @e2e", () => {
  test("TC_E2E_01: log in, buy two products and complete checkout @smoke", async ({
    loginPage,
    inventoryPage,
    cartPage,
    checkoutPage,
    checkoutCompletePage,
  }) => {
    const products = ["Sauce Labs Backpack", "Sauce Labs Bike Light"];

    await test.step("1. Log in as the standard user", async () => {
      await loginPage.open();
      await loginPage.login(env.users.standard, env.password);
      await expect(inventoryPage.pageTitle).toHaveText(TITLES.PRODUCTS);
    });

    await test.step("2. Sort low to high and add two items", async () => {
      await inventoryPage.sortBy(SORT_OPTIONS.PRICE_LOW_TO_HIGH);
      await inventoryPage.addMultipleProducts(products);
      expect(await inventoryPage.getCartCount()).toBe(products.length);
    });

    await test.step("3. Open cart and verify items", async () => {
      await inventoryPage.goToCart();
      await expect(cartPage.pageTitle).toHaveText(TITLES.YOUR_CART);
      const names = await cartPage.getCartItemNames();
      for (const product of products) expect(names).toContain(product);
    });

    await test.step("4. Checkout and fill info", async () => {
      await cartPage.proceedToCheckout();
      await expect(checkoutPage.pageTitle).toHaveText(TITLES.CHECKOUT_INFO);
      await checkoutPage.fillCustomerInfo("John", "Doe", "12345");
      await checkoutPage.continue();
    });

    await test.step("5. Verify totals", async () => {
      const subtotal = await checkoutPage.getSubtotal();
      const tax = await checkoutPage.getTax();
      const total = await checkoutPage.getTotal();
      expect(Number((subtotal + tax).toFixed(2))).toBe(total);
    });

    await test.step("6. Finish and verify confirmation", async () => {
      await checkoutPage.finish();
      expect(await checkoutCompletePage.isOrderComplete()).toBeTruthy();
    });

    await test.step("7. Back home, cart empty", async () => {
      await checkoutCompletePage.backHome();
      expect(await inventoryPage.getCartCount()).toBe(0);
    });
  });
});
```

---

## STEP 12 — Reporting + Global Setup

`npm install -D allure-playwright allure-commandline`
(Reporters already configured in the Step 7 config.)

`global-setup.js`

```javascript
import fs from "fs";
import path from "path";
import os from "os";
import env from "./config/env.config.js";

export default async function globalSetup() {
  const allureResultsDir = path.resolve("reports/allure-results");
  fs.mkdirSync(allureResultsDir, { recursive: true });

  const properties = {
    Environment: env.name,
    "Base.URL": env.baseURL,
    Browser: process.env.BROWSER || "chromium",
    "Node.Version": process.version,
    OS: `${os.type()} ${os.release()}`,
    Platform: os.platform(),
    CI: process.env.CI ? "true" : "false",
    "Executed.At": new Date().toISOString(),
  };

  const content = Object.entries(properties)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(
    path.join(allureResultsDir, "environment.properties"),
    content,
    "utf-8",
  );
}
```

---

## STEP 14 — Unit Tests

`tests/unit/stringUtils.unit.spec.js`

```javascript
import { test, expect } from "@playwright/test";
import {
  parsePrice,
  toCurrency,
  capitalize,
  slugify,
  normalizeSpaces,
  containsIgnoreCase,
} from "../../utils/stringUtils.js";

test.describe("Unit: stringUtils @unit", () => {
  test("parsePrice extracts a number from a currency string", () => {
    expect(parsePrice("$29.99")).toBe(29.99);
    expect(parsePrice("7.99 USD")).toBe(7.99);
  });
  test("toCurrency formats a number", () => {
    expect(toCurrency(29.9)).toBe("$29.90");
    expect(toCurrency(5, "€")).toBe("€5.00");
  });
  test("slugify converts product name to data-test id", () => {
    expect(slugify("Sauce Labs Backpack")).toBe("sauce-labs-backpack");
    expect(slugify("Test.allTheThings() T-Shirt (Red)")).toBe(
      "test.allthethings-t-shirt-red",
    );
  });
  test("normalizeSpaces collapses whitespace", () => {
    expect(normalizeSpaces("  a   b \n c ")).toBe("a b c");
  });
  test("containsIgnoreCase is case-insensitive", () => {
    expect(containsIgnoreCase("Hello World", "WORLD")).toBe(true);
  });
});
```

`tests/unit/waitUtils.unit.spec.js`

```javascript
import { test, expect } from "@playwright/test";
import { retry, waitUntil, sleep } from "../../utils/waitUtils.js";

test.describe("Unit: waitUtils @unit", () => {
  test("sleep waits approximately the given time", async () => {
    const start = Date.now();
    await sleep(100);
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });
  test("retry succeeds after transient failures", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("transient");
        return "ok";
      },
      { retries: 5, delay: 10 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });
  test("waitUntil times out when condition never true", async () => {
    await expect(
      waitUntil(() => false, {
        timeout: 100,
        interval: 20,
        message: "never true",
      }),
    ).rejects.toThrow(/never true/);
  });
});
```

`tests/unit/dataGenerator.unit.spec.js`

```javascript
import { test, expect } from "@playwright/test";
import {
  randomInt,
  randomString,
  email,
  postalCode,
  phoneNumber,
  customer,
} from "../../utils/dataGenerator.js";

test.describe("Unit: dataGenerator @unit", () => {
  test("randomInt returns a value within range", () => {
    const n = randomInt(1, 5);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(5);
  });
  test("randomString returns requested length", () => {
    expect(randomString(10)).toHaveLength(10);
  });
  test("email is unique and well formed", () => {
    const a = email();
    const b = email();
    expect(a).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(a).not.toBe(b);
  });
  test("phoneNumber is 10 digits starting with 9", () => {
    expect(phoneNumber()).toMatch(/^9\d{9}$/);
  });
  test("customer returns a complete object", () => {
    const c = customer();
    expect(c).toHaveProperty("firstName");
    expect(c).toHaveProperty("email");
  });
});
```

`tests/unit/dateUtils.unit.spec.js`

```javascript
import { test, expect } from "@playwright/test";
import {
  timestamp,
  today,
  addDays,
  format,
  fileTimestamp,
} from "../../utils/dateUtils.js";

test.describe("Unit: dateUtils @unit", () => {
  test("timestamp returns a positive number", () => {
    expect(timestamp()).toBeGreaterThan(0);
  });
  test("today returns YYYY-MM-DD", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test("format formats a fixed date", () => {
    expect(format(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
  test("fileTimestamp is filename-safe", () => {
    expect(fileTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });
});
```

---

## STEP 15 — CI/CD + Final `package.json`

`package.json`

```json
{
  "name": "saucedemo-ui-framework",
  "version": "1.0.0",
  "description": "Data-Driven UI Test Automation Framework using JavaScript + Playwright + POM for SauceDemo",
  "type": "module",
  "scripts": {
    "test": "npx playwright test",
    "test:headed": "npx playwright test --headed",
    "test:chromium": "npx playwright test --project=chromium",
    "test:firefox": "npx playwright test --project=firefox",
    "test:webkit": "npx playwright test --project=webkit",
    "test:smoke": "npx playwright test --grep @smoke",
    "test:regression": "npx playwright test --grep @regression",
    "test:login": "npx playwright test tests/login",
    "test:inventory": "npx playwright test tests/inventory",
    "test:cart": "npx playwright test tests/cart",
    "test:checkout": "npx playwright test tests/checkout",
    "test:e2e": "npx playwright test tests/e2e",
    "test:unit": "npx playwright test tests/unit",
    "test:dev": "cross-env ENV=dev npx playwright test",
    "test:qa": "cross-env ENV=qa npx playwright test",
    "test:staging": "cross-env ENV=staging npx playwright test",
    "test:trace": "npx playwright test --trace on",
    "test:debug": "npx playwright test --debug",
    "test:ui": "npx playwright test --ui",
    "show-trace": "npx playwright show-trace",
    "report": "npx playwright show-report reports/html-report",
    "allure:generate": "allure generate reports/allure-results --clean -o reports/allure-report",
    "allure:open": "allure open reports/allure-report",
    "allure:serve": "allure serve reports/allure-results",
    "clean": "rimraf reports test-results"
  },
  "keywords": [
    "playwright",
    "javascript",
    "pom",
    "data-driven",
    "automation",
    "saucedemo"
  ],
  "author": "QA Automation Team",
  "license": "MIT",
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "allure-commandline": "^2.30.0",
    "allure-playwright": "^3.0.0",
    "cross-env": "^7.0.3",
    "dotenv": "^16.4.5",
    "rimraf": "^6.0.1",
    "winston": "^3.14.2"
  }
}
```

`.github/workflows/playwright.yml`

```yaml
name: Playwright Tests

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
  workflow_dispatch:
    inputs:
      suite:
        description: "Test suite to run"
        required: false
        default: "all"
        type: choice
        options: [all, smoke, regression]

jobs:
  test:
    name: Run Playwright Tests (${{ matrix.browser }})
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}
      - name: Run Playwright tests
        env:
          CI: true
          HEADLESS: true
        run: |
          SUITE="${{ github.event.inputs.suite || 'all' }}"
          GREP=""
          if [ "$SUITE" = "smoke" ]; then GREP="--grep @smoke"; fi
          if [ "$SUITE" = "regression" ]; then GREP="--grep @regression"; fi
          npx playwright test --project=${{ matrix.browser }} $GREP
      - name: Upload Playwright HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: html-report-${{ matrix.browser }}
          path: reports/html-report
          retention-days: 7
      - name: Upload Allure results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-results-${{ matrix.browser }}
          path: reports/allure-results
          retention-days: 7
```

`Jenkinsfile`

```groovy
pipeline {
    agent any
    tools { nodejs 'Node20' }
    parameters {
        choice(name: 'BROWSER', choices: ['chromium', 'firefox', 'webkit', 'all'], description: 'Browser project to run')
        choice(name: 'SUITE', choices: ['all', 'smoke', 'regression'], description: 'Test suite to execute')
    }
    options {
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
    }
    environment { CI = 'true'; HEADLESS = 'true' }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install Dependencies') { steps { sh 'npm ci' } }
        stage('Install Playwright Browsers') { steps { sh 'npx playwright install --with-deps' } }
        stage('Run Tests') {
            steps {
                script {
                    def projectFlag = params.BROWSER == 'all' ? '' : "--project=${params.BROWSER}"
                    def grepFlag = ''
                    if (params.SUITE == 'smoke') { grepFlag = '--grep @smoke' }
                    else if (params.SUITE == 'regression') { grepFlag = '--grep @regression' }
                    sh "npx playwright test ${projectFlag} ${grepFlag}"
                }
            }
        }
        stage('Generate Allure Report') { steps { sh 'npm run allure:generate' } }
    }
    post {
        always {
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            junit testResults: 'reports/junit-report/*.xml', allowEmptyResults: true
        }
    }
}
```

`.gitignore`

```
node_modules/
reports/
test-results/
logs/
.env
allure-results/
allure-report/
playwright-report/
```

---

## STEP 15b — Code Quality (ESLint + Prettier)

`npm install -D eslint @eslint/js eslint-plugin-playwright eslint-config-prettier prettier`

> **Prettier owns formatting; ESLint owns code quality.** `eslint-config-prettier` is
> loaded **last** so the two never conflict.

`.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf",
  "arrowParens": "always"
}
```

`.prettierignore`

```
reports/
test-results/
logs/
node_modules/
playwright-report/
*.min.js
```

`eslint.config.js` (flat config, ESLint v9+)

```javascript
// ESLint flat config (ESLint v9+) for the SauceDemo Playwright framework.
// ES Modules + Playwright. Prettier owns formatting; ESLint owns code quality.
import js from "@eslint/js";
import playwright from "eslint-plugin-playwright";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "reports/**",
      "test-results/**",
      "logs/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        // Browser globals used inside page.evaluate() callbacks
        window: "readonly",
        document: "readonly",
        globalThis: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      // The `async ({}, use)` empty-destructure is a valid Playwright fixture idiom
      "no-empty-pattern": "off",
    },
  },
  // Playwright-specific rules for feature test specs.
  // Unit specs (tests/unit) test pure utils directly and legitimately import
  // from '@playwright/test', so they are excluded from the fixture-import rule.
  {
    files: ["tests/**/*.spec.js"],
    ignores: ["tests/unit/**"],
    ...playwright.configs["flat/recommended"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      // Framework rule: never import directly from @playwright/test in specs
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              message:
                "Import { test, expect } from '../../fixtures/baseFixture.js' instead of '@playwright/test'.",
            },
          ],
        },
      ],
      // Framework rule: no hard waits
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            "Do not use waitForTimeout. Use web-first assertions (await expect(...)).",
        },
      ],
    },
  },
  prettier,
];
```

**What the custom rules enforce:**

| Rule                                         | Effect                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| `no-restricted-imports` (`@playwright/test`) | Specs **must** import from `fixtures/baseFixture.js` |
| `no-restricted-syntax` (`waitForTimeout`)    | **Bans hard waits** — forces web-first assertions    |
| `eqeqeq` / `prefer-const`                    | `===` only; `const` when not reassigned              |
| `no-unused-vars` (ignore `^_`)               | Flags dead code; allows `_unused` convention         |
| `no-empty-pattern: off`                      | Allows the `async ({}, use)` fixture idiom           |

**Commands** (optionally add to `package.json` scripts):

```powershell
npx prettier --write .      # auto-format everything
npx prettier --check .      # verify formatting (CI)
npx eslint .                # lint quality + framework rules
npx eslint . --fix          # auto-fix where safe
```

Suggested `package.json` scripts:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

---

## STEP 16 — Final Execution (Commands)

```powershell
# Single spec (fast feedback)
npx playwright test tests/login/positiveLogin.spec.js

# By tag
npm run test:smoke
npm run test:regression

# By module
npm run test:login
npm run test:inventory
npm run test:cart
npm run test:checkout
npm run test:e2e
npm run test:unit

# By browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# By environment
npm run test:dev
npm run test:qa
npm run test:staging

# Full suite — all browsers, parallel
npm test

# Debug a failure
npm run test:debug
npm run show-trace

# Reports
npm run report         # Playwright HTML
npm run allure:serve   # Allure
```

---

## Dependency Summary (install as you reach each step)

```powershell
# Step 0 — foundation
npm install -D @playwright/test
npx playwright install

# Step 6 — configuration & secrets
npm install -D dotenv cross-env

# Step 3 — logging
npm install -D winston

# Step 12 — rich reporting
npm install -D allure-playwright allure-commandline

# Step 15b — code quality (lint + format)
npm install -D eslint @eslint/js eslint-plugin-playwright eslint-config-prettier prettier

# cleanup helper
npm install -D rimraf
```

| Library                    | Introduced in | Why we need it                                  |
| -------------------------- | ------------- | ----------------------------------------------- |
| `@playwright/test`         | Step 0        | Test runner: `test`, `expect`, `page`, browsers |
| `dotenv`                   | Step 6        | Load `.env` overrides into `process.env`        |
| `cross-env`                | Step 6        | Cross-platform `ENV=…` in npm scripts           |
| `winston`                  | Step 3        | Timestamped logs to console + files             |
| `allure-playwright`        | Step 12       | Feeds results to Allure during the run          |
| `allure-commandline`       | Step 12       | Generates/opens the Allure report               |
| `eslint` + `@eslint/js`    | Step 15b      | Code-quality linting (flat config)              |
| `eslint-plugin-playwright` | Step 15b      | Playwright-specific lint rules                  |
| `eslint-config-prettier`   | Step 15b      | Turns off ESLint rules that clash with Prettier |
| `prettier`                 | Step 15b      | Opinionated code formatter                      |
| `rimraf`                   | Step 15       | Cross-platform `clean` script                   |

---

## Interview Quick-Reference

**2-minute answer:**

> "I built a Data-Driven framework using Playwright + JavaScript (ES Modules) + POM
> for SauceDemo. It has a `BasePage` with 30+ reusable logged methods, five page
> objects extending it with mixed locators (built-in + CSS + XPath), custom fixtures
> for DI (plus auto-login and data fixtures), multi-environment config (dev/qa/
> staging), Winston logging, and five reporters (List, HTML, JSON, JUnit, Allure)
> with trace/video/screenshots on failure. Data-driven tests loop over external
> JSON. I added a unit test suite and set up Jenkins + GitHub Actions CI. It runs
> cross-browser in parallel with tag-based selective execution."

**Key talking points by layer:**

| Layer        | What to say                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| Config       | `playwright.config.js` imports resolved `env`; `ENV` → `<ENV>.json` + `.env` |
| Global setup | `global-setup.js` writes Allure `environment.properties` once                |
| POM          | `BasePage` + 5 pages; locators in constructor; mixed strategies              |
| Fixtures     | DI of page objects; `loggedInPage` auto-login; `data` generator; afterEach   |
| Data-driven  | `readJSON` + `for...of` loop → one reported test per row                     |
| Utilities    | logger, dataReader, constants, waitUtils, dataGenerator, string/date/file    |
| Reporting    | 5 reporters; trace/video/screenshot `retain-on-failure`                      |
| CI/CD        | Jenkinsfile (parameterized) + GitHub Actions matrix; `npm ci`, archive       |

---

⬅️ **Back to [Part 1 — Concepts, Architecture & Flow](SauceDemo_Framework_Guide_Part1_Concepts.md)**
