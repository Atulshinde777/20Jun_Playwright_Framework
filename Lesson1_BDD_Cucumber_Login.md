# BDD Cucumber + Playwright — Lesson 1 (SauceDemo Login)

Prepared by: walrtemak



**App under test:** https://www.saucedemo.com/
**Stack:** JavaScript + Playwright + cucumber-js
**Prerequisite:** You already know Playwright with a POM hybrid data-driven framework.

---

## 1. What is BDD & Gherkin (the *why*)

In your POM framework, a test looked like this:

```js
test("valid user can login", async ({ page }) => { ... });
```

The **intent was hidden inside JavaScript** — only coders could read it.

**BDD (Behaviour Driven Development)** flips this: you first write the behaviour in
**plain English** (called *Gherkin*), which a BA, manual tester, or product owner can
read and approve *without knowing code*. Then you connect that English to Playwright code.

### The 5 keywords

| Gherkin | Meaning | POM equivalent |
|---|---|---|
| `Feature` | The capability under test | `test.describe(...)` |
| `Scenario` | One test case | one `test(...)` block |
| `Given` | Starting state (precondition) | **Arrange** |
| `When` | The action user performs | **Act** |
| `Then` | Expected result | **Assert** (`expect`) |
| `And` / `But` | Continue the previous step (readability) | extra lines |

> Key mindset shift: In POM, one test = one function. In Cucumber, **one scenario is
> split across many step functions** (Given/When/Then live separately). That's why we
> need a "World" to share `page` between them (see section 6).

---

## 2. Project setup — folder structure

```
BDD_Cucumber_Saucedemo/
├── package.json                       # deps + npm scripts
├── cucumber.js                        # Cucumber config (like playwright.config.js)
├── .gitignore
└── features/
    ├── login.feature                  # plain-English spec (Gherkin)
    ├── step_definitions/
    │   └── login.steps.js             # glue: English -> Playwright code
    └── support/
        ├── world.js                   # shared context (holds this.page)
        └── hooks.js                   # Before/After (launch/close browser)
```

**Dependencies:**
- `@cucumber/cucumber` — the BDD runner
- `playwright` — the browser automation

---

## 3. The `cucumber.js` config file explained

This is the Cucumber equivalent of `playwright.config.js`:

| Option | What it does | POM equivalent |
|---|---|---|
| `paths` | where `.feature` files live | `testDir` |
| `require` | load step defs + hooks before running | imports |
| `format` | how results print (progress bar, HTML) | `reporter` |
| `formatOptions` | tweaks snippet/output style | — |

```js
module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: [
      "features/step_definitions/**/*.js",
      "features/support/**/*.js"
    ],
    format: [
      "progress-bar",
      "summary",
      "html:reports/cucumber-report.html"
    ],
    formatOptions: { snippetInterface: "async-await" }
  }
};
```

---

## 4. First Feature file — `features/login.feature`

```gherkin
Feature: SauceDemo Login
  As a registered user
  I want to log in to SauceDemo
  So that I can see the products page and start shopping

  Scenario: Standard user logs in successfully
    Given I am on the SauceDemo login page
    When I log in with username "standard_user" and password "secret_sauce"
    Then I should land on the Products page
```

Note the `"..."` values — Cucumber captures these and passes them into your JS function
as arguments (via `{string}`).

---

## 5. Step definitions — `features/step_definitions/login.steps.js`

```js
const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("@playwright/test");

Given("I am on the SauceDemo login page", async function () {
  await this.page.goto("https://www.saucedemo.com/");
});

When(
  "I log in with username {string} and password {string}",
  async function (username, password) {
    await this.page.locator("#user-name").fill(username);
    await this.page.locator("#password").fill(password);
    await this.page.locator("#login-button").click();
  }
);

Then("I should land on the Products page", async function () {
  await expect(this.page).toHaveURL(/inventory\.html/);
  await expect(this.page.locator(".title")).toHaveText("Products");
});
```

> Two things to highlight to students:
> - The **string in `Given(...)` must match** the text in the `.feature` file exactly.
> - `this.page` is **not** a fixture here — it comes from the World + hook.

---

## 6. World & Hooks — how `page` is shared

Because Given/When/Then are **separate functions**, they need a shared place to store
the browser and page.

- **World** (`world.js`) — a class where we store `this.browser`, `this.context`,
  `this.page`. Cucumber creates a **fresh World per scenario** -> automatic test
  isolation (just like a fresh `page` per Playwright test).
- **`Before` hook** (`hooks.js`) — launches the browser and saves `this.page`.
- **`After` hook** — closes browser/context/page.

`this` inside every hook **and** every step points to the *same* World instance -> that's
how `this.page` set in `Before` is usable in every step.

| POM | Cucumber |
|---|---|
| `({ page })` fixture | `this.page` on the World |
| auto launch/close | `Before` / `After` hooks |
| per-test isolation | new World per scenario |

**world.js**

```js
const { setWorldConstructor, World } = require("@cucumber/cucumber");

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.browser = null;
    this.context = null;
    this.page = null;
  }
}

setWorldConstructor(CustomWorld);
```

**hooks.js**

```js
const { Before, After, setDefaultTimeout } = require("@cucumber/cucumber");
const { chromium } = require("playwright");

setDefaultTimeout(30 * 1000);

Before(async function () {
  this.browser = await chromium.launch({ headless: false, slowMo: 300 });
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
});

After(async function () {
  if (this.page) await this.page.close();
  if (this.context) await this.context.close();
  if (this.browser) await this.browser.close();
});
```

---

## 7. Run commands

First-time setup (run in the project folder):

```powershell
cd "BDD_Cucumber_Saucedemo"
npm install
npx playwright install chromium
```

Run the scenario:

```powershell
npm test
```

Expected output:
- `1 scenario (1 passed)`
- `3 steps (3 passed)`

An HTML report is generated at `reports/cucumber-report.html`.

---

## Test Cases Covered

| ID | Scenario | Type | Username | Password | Expected Result |
|----|----------|------|----------|----------|-----------------|
| TC_LOGIN_01 | Standard user logs in successfully | Happy path | `standard_user` | `secret_sauce` | Lands on Products page (`/inventory.html`), title = "Products" |

---

## What you learned

- **BDD/Gherkin** lets non-coders read tests; `Feature/Scenario/Given/When/Then` map to
  describe/test/Arrange/Act/Assert.
- **`cucumber.js`** is the Cucumber version of `playwright.config.js` (`paths`, `require`, `format`).
- A **`.feature` file is inert English**; **step definitions** are the JS glue that runs Playwright.
- Because steps are separate functions, the **World** (`this.page`) + **`Before`/`After` hooks**
  replace Playwright's fixtures and give you per-scenario isolation.
- `npm test` (i.e. `cucumber-js`) runs everything and reports pass/fail + an HTML report.

## Next lesson (preview)

**Lesson 2:** Refactor this into a **Page Object Model** (`LoginPage` / `ProductsPage`) called
from the step definitions, then add a **data-driven `Scenario Outline`** with an `Examples`
table to test valid + locked-out + invalid users in one feature.
