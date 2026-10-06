# 🗣️ Interview Walkthrough — Explaining the Framework in a Natural, Spoken Flow

Prepared by: walrtemak



> This is written the way you would actually **speak it out loud** in an interview —
> folder by folder, file by file, in a simple "so basically we have created…" narration.
> Read it top to bottom and it flows as one continuous explanation.

---

## 🎬 Opening line (how to start)

> "So basically, we have developed a **hybrid, data-driven test automation framework**
> using **JavaScript with Playwright**, and the main design pattern we have used is the
> **Page Object Model**. I call it hybrid because it combines Page Object Model,
> data-driven testing, and a modular utility layer together. The application we are
> automating is **SauceDemo**, which is a demo e-commerce site with login, products,
> cart, and checkout flows.
>
> Let me walk you through the framework folder by folder and explain what each part
> does."

---

## 📁 `pages/` folder (Page Object Model)

> "First, we have a **`pages`** folder. This is where the Page Object Model lives.
>
> So basically, inside this `pages` folder, we have created one `.js` file for **each
> screen** of the application. For example, we have a `LoginPage.js` for the login
> screen, an `InventoryPage.js` for the products page, a `CartPage.js` for the cart, a
> `CheckoutPage.js` for the checkout form, and a `CheckoutCompletePage.js` for the order
> confirmation page.
>
> Each of these page files is a **class**, and inside that class we keep two things —
> the **locators** of that page, and the **methods** or actions we can perform on that
> page. The important rule we follow is that **all the locators are declared in the
> constructor**, not scattered inside the methods or inside the tests. So if a selector
> ever changes, we only change it in one place."

### 🧩 `BasePage.js` — the parent class

> "Now, inside the same `pages` folder, we have one special file called
> **`BasePage.js`**. This is the **parent class**, and **all the other page objects
> extend this BasePage**.
>
> So basically, the reason we created BasePage is to avoid repeating the same code in
> every page. Every page needs to click, fill text, get text, wait for elements, etc.
> Instead of writing `await locator.click()` and `await locator.fill()` again and again
> in every page, we wrote those as **reusable wrapper methods inside BasePage** — around
> 30-plus generic methods like `click`, `fill`, `getText`, `selectByValue`,
> `waitForVisible`, and so on.
>
> So when I create `LoginPage`, I just write `class LoginPage extends BasePage`, and I
> call `super(page)` in the constructor. After that, LoginPage automatically gets all
> those methods from BasePage for free. This is **inheritance** in action.
>
> One more thing inside BasePage — we have a small private helper called `_resolve()`.
> This makes the methods **flexible**: I can pass either a plain string selector or a
> Playwright locator object, and `_resolve` figures out which one it is. That's a small
> example of **polymorphism**. And every method in BasePage also **logs** what it did
> using our logger, so we automatically get a log line for every click and every fill."

### 📝 How it demonstrates OOP (if they ask)

> "So through BasePage and the page objects, I can actually show all four OOP concepts:
>
> - **Inheritance** — every page extends BasePage.
> - **Encapsulation** — each page hides its own locators.
> - **Polymorphism** — `_resolve()` accepts a string or a locator.
> - **Abstraction** — in my test I just call `login()`; I don't deal with raw
>   Playwright commands."

---

## 📁 `fixtures/` folder (Dependency Injection)

> "Next we have a **`fixtures`** folder, and inside it a file called
> **`baseFixture.js`**. This is a very important part of the framework.
>
> So basically, without fixtures, in every single test I would have to write
> `const loginPage = new LoginPage(page)`, `const cartPage = new CartPage(page)`, and so
> on — the same boilerplate everywhere. To avoid that, we used **Playwright's custom
> fixtures**, which is basically **dependency injection**.
>
> In `baseFixture.js`, we extend Playwright's base test and register all our page
> objects as fixtures. So in my test, I just ask for what I need — like
> `async ({ loginPage, cartPage }) => { ... }` — and Playwright automatically creates
> those objects and hands them to me, ready to use.
>
> We also created a special fixture called **`loggedInPage`**. This one does the login
> step automatically — it opens the site, logs in as the standard user, and waits for
> the inventory page. So for any test that doesn't test login itself, like cart or
> checkout tests, I just use `loggedInPage` and the test **starts already logged in**,
> with zero login code.
>
> There is also a **`data`** fixture that gives me a random data generator, and a global
> **`afterEach`** hook that automatically **takes a screenshot and attaches it to the
> report whenever a test fails**.
>
> And one convention we follow — in all our spec files, we import `test` and `expect`
> from this `baseFixture.js` file, **not** directly from `@playwright/test`."

---

## 📁 `config/` folder (Environment configuration)

> "Then we have a **`config`** folder for environment configuration.
>
> So basically, we didn't want to hard-code URLs, usernames, passwords, or timeouts
> inside the tests, because real projects run on multiple environments like dev, qa, and
> staging. So inside `config` we have an **`environments`** sub-folder with separate JSON
> files — `dev.json`, `qa.json`, and `staging.json` — each holding that environment's
> base URL and credentials.
>
> And we have one file called **`env.config.js`** which is the brain of this. It reads an
> `ENV` variable, loads the matching JSON file, and builds **one single `env` object**
> that the whole framework uses. The precedence order is: first it checks the `.env` file
> or environment variables, then the environment JSON file, and finally a hard-coded
> default. So the most specific value always wins.
>
> The benefit is — to switch environments, I don't change any code. I just run
> `ENV=staging` and the same tests run against staging. And secrets stay out of the code
> because they live in a git-ignored `.env` file."

---

## 📁 `test-data/` folder (Data-driven inputs)

> "Next is the **`test-data`** folder. This is the **data-driven** part of the framework.
>
> So basically, instead of hard-coding test data inside the tests, we keep it in external
> JSON files — like `loginData.json`, `users.json`, `checkoutData.json`, and
> `products.json`. For example, `loginData.json` has arrays of invalid credentials and
> empty credentials, each with a test ID, the input, and the expected error message.
>
> In the test, we read this data and **loop over it** using a `for...of` loop, and for
> each row of data we generate a separate test. So if I want to add a new negative login
> scenario, I don't write new code — I just **add one more row** in the JSON file. That's
> the real meaning of data-driven: the data is separated from the logic."

---

## 📁 `utils/` folder (Reusable helpers)

> "Then we have a **`utils`** folder, which is our utility or helper layer. These are
> small, reusable functions that any part of the framework can use. Let me quickly list
> the main ones:
>
> - **`logger.js`** — this uses Winston to create structured, timestamped logs. It prints
>   to the console and also saves to log files. This is wired into BasePage, so every
>   action gets logged automatically.
> - **`dataReader.js`** — this has `readJSON` and `readCSV` functions to read our
>   test-data files. So the tests don't directly deal with the file system.
> - **`constants.js`** — this holds all the fixed values like routes, error messages,
>   page titles, and sort options, so we don't have magic strings scattered around.
> - **`waitUtils.js`** — this has smart wait helpers like `retry`, `waitUntil`, and
>   `sleep`, so we never use hard-coded waits.
> - **`dataGenerator.js`** — this generates random data like names, emails, and postal
>   codes, so we get unique data every run.
> - And a few more — **`stringUtils`** for things like price parsing and slugify,
>   **`dateUtils`** for dates, **`fileUtils`** for file operations, **`assertionUtils`**
>   for readable assertions, and **`allure.js`** for adding rich metadata to the Allure
>   report.
>
> The idea is — write a helper once, test it once, and reuse it everywhere. This keeps
> the tests and page objects thin and clean."

---

## 📁 `tests/` folder (The actual test specs)

> "Now the **`tests`** folder — this is where the actual test scenarios live, and we have
> organized them **by feature**. So we have separate sub-folders: `login`, `inventory`,
> `cart`, `checkout`, an `e2e` folder for the full end-to-end purchase journey, and a
> `unit` folder.
>
> Each test file follows the same pattern. It imports `test` and `expect` from our
> baseFixture, reads any data it needs from test-data, and then uses the injected page
> objects to perform the steps. We wrap logical steps inside `test.step()` so the report
> shows a nice breakdown, and we start meaningful tests with Allure metadata.
>
> We also use **tags** in the test titles — like `@smoke` and `@regression`. So in CI we
> can first run only the smoke tests, which are the critical path, and then run the full
> regression. And we give each test a **descriptive ID** like `TC_LOGIN_VALID` so it's
> easy to trace.
>
> One special folder is **`tests/unit`**. These are **unit tests for our own utility
> functions** — they don't even open a browser. We test things like our price parser and
> our data generator directly. Because if a helper is broken, it could silently break
> many UI tests, so we wanted a safety net for our own framework code."

---

## ⚙️ `playwright.config.js` (The central configuration)

> "At the root we have **`playwright.config.js`**, which is the **central configuration**
> file. This is the first file Playwright reads.
>
> So basically, in this file we import our `env` object, so timeouts and the base URL
> come from the environment config. We set **`fullyParallel: true`** so tests run in
> parallel. We set the number of **workers** — on CI we cap it at 2 for stability, but
> locally it's automatic. We set **retries** — 2 on CI and 0 locally, because locally I
> want to see flaky tests and fix them.
>
> We also configure **five reporters** here — list, HTML, JSON, JUnit, and Allure — and
> we tell Playwright to capture a **trace, video, and screenshot only on failure**, so
> passing runs stay fast. And we define **three browser projects** — Chromium, Firefox,
> and WebKit — so the same suite runs cross-browser. We also point to a `globalSetup`
> file here."

---

## 🟢 `global-setup.js` (Runs once before everything)

> "Then we have **`global-setup.js`**, which runs **only once**, before the entire test
> run. In our case, it writes an `environment.properties` file into the Allure results
> folder. So the Allure report clearly shows which environment, which browser, the OS,
> and the Node version the tests ran on. It's basically the context for the report."

---

## 📊 Reporting & evidence

> "For reporting, as I mentioned, we generate five report formats. The most important one
> is **Allure**, which gives a rich, interactive report grouped by feature and severity.
>
> And when a test fails, we don't just see 'it failed' — we get the **screenshot**, the
> **video** of the run, and the **trace**. The Playwright **trace viewer** is like a
> time-travel debugger; I can scrub through every step and see the DOM, network, and
> console at each point. Plus we have the Winston log timeline. So debugging a failure is
> very easy."

---

## ✅ Code quality — ESLint & Prettier

> "To keep the code clean and consistent, we use **ESLint and Prettier**. Prettier
> handles the **formatting** — things like quotes and spacing. ESLint handles **code
> quality**.
>
> And the nice part — we added **custom ESLint rules** that enforce our own framework
> conventions automatically. For example, one rule **blocks importing `@playwright/test`
> directly in a spec** — it forces you to import from our baseFixture. Another rule
> **bans `waitForTimeout`**, so nobody can add hard waits. So our conventions are not
> just documentation that people forget — they actually fail the build if broken."

---

## 🔁 CI/CD

> "Finally, for CI/CD we have both a **Jenkinsfile** and a **GitHub Actions** workflow.
>
> The GitHub Actions one runs on every push and pull request, using a **matrix** so it
> tests on all three browsers in parallel, and it uploads the reports as artifacts. The
> Jenkins pipeline is **parameterized** — you can choose the browser and the suite
> (smoke, regression, or all) — and it goes through stages: checkout, install
> dependencies, install browsers, run tests, generate the Allure report, and archive the
> artifacts."

---

## 🔄 How it all works when I run the tests (the flow)

> "So if I put the whole flow together — when I run `npm test`:
>
> 1. Playwright reads `playwright.config.js`, which loads the environment config.
> 2. `global-setup.js` runs once and writes the Allure environment info.
> 3. Playwright discovers all the test files under `tests/`.
> 4. It spreads them across parallel workers, once per browser.
> 5. For each test, the **fixtures** create the page objects I asked for.
> 6. Data-driven tests read their data from the JSON files.
> 7. The test calls page object methods, which call BasePage wrappers, which log each
>    action.
> 8. Assertions auto-wait and auto-retry.
> 9. If a test fails, the `afterEach` hook attaches a screenshot, and the trace and video
>    are saved.
> 10. On CI, failed tests retry.
> 11. And finally, all five reports are generated.
>
> So that's my framework end to end — a hybrid, data-driven, Page Object Model framework
> that is maintainable, reliable, runs cross-browser in parallel, gives rich reports, and
> is fully integrated with CI/CD."

---

## 🔬 Detailed flow with a real example — the Login scenario

> "Let me make this very concrete by walking through **one real scenario — a valid login
> test** — from the moment I type the command in the terminal until the report is
> generated. I'll go step by step."

### Step 1 — I type the command in the terminal

> "I open the terminal and type a command — for example `npm run test:login`, or if I want
> just the smoke tests, `npm run test:smoke`. Let's say I run `npm run test:login`.
>
> This script is defined in `package.json`. Internally it runs
> `npx playwright test tests/login`. So npm just calls the Playwright test runner and
> points it at the login folder."

### Step 2 — Playwright reads `playwright.config.js`

> "The very first thing Playwright does is read **`playwright.config.js`**. At the top of
> that file we have `import env from './config/env.config.js'`.
>
> So this triggers `env.config.js`, which checks the `ENV` variable — if I didn't set one,
> it defaults to `qa`. It then loads `config/environments/qa.json`, reads the base URL
> (`https://www.saucedemo.com`) and the credentials, and builds one `env` object.
>
> Playwright uses this `env` to set the `baseURL`, the timeouts, and whether to run
> headless. It also reads the reporters, the retries, the workers, and the three browser
> projects from the config."

### Step 3 — `global-setup.js` runs once

> "Before any test starts, Playwright runs **`global-setup.js`** one time. For the login
> run, this creates the `reports/allure-results` folder and writes
> `environment.properties` into it — recording that this run is on qa, Chromium, my OS,
> and my Node version. This is just so the final Allure report has context."

### Step 4 — Test discovery

> "Now Playwright scans the `tests/login` folder and finds the spec files — for example
> `positiveLogin.spec.js` and `negativeLogin.spec.js`.
>
> Inside `positiveLogin.spec.js`, the valid login test looks something like this:
>
> ```js
> import { test, expect } from "../../fixtures/baseFixture.js";
> import env from "../../config/env.config.js";
>
> test("TC_LOGIN_VALID: valid standard user can log in @smoke", async ({
>   loginPage,
>   inventoryPage,
> }) => {
>   await loginPage.open();
>   await loginPage.login(env.users.standard, env.password);
>   await expect(inventoryPage.pageTitle).toHaveText("Products");
> });
> ```
>
> Notice the test is asking for two fixtures — `loginPage` and `inventoryPage`."

### Step 5 — Worker + browser launch

> "Because `fullyParallel` is true, Playwright assigns this test to a **worker** — a
> separate process. That worker launches a browser, let's say Chromium, creates a fresh
> **browser context**, and opens a new **page** (a clean tab). Each test gets its own
> context, so tests never interfere with each other."

### Step 6 — Fixtures build the page objects

> "Now, before the test body runs, Playwright looks at what the test asked for —
> `loginPage` and `inventoryPage` — and goes to **`fixtures/baseFixture.js`** to build
> them.
>
> For `loginPage`, the fixture runs `new LoginPage(page)`. That triggers the `LoginPage`
> constructor, which calls `super(page)` — so `BasePage` stores the page — and then
> declares all the login locators like the username field, password field, and login
> button. The same happens for `inventoryPage`. Both objects are now ready and injected
> into the test."

### Step 7 — The test body runs, action by action

> "Now the actual steps run:
>
> **`await loginPage.open()`** — inside LoginPage, `open()` calls `this.goto(ROUTES.LOGIN)`.
> `goto` lives in BasePage, so it logs 'Navigating to: /' and navigates. Because `baseURL`
> is set, `/` becomes `https://www.saucedemo.com/`.
>
> **`await loginPage.login(env.users.standard, env.password)`** — this is wrapped in a
> `test.step('Login as standard_user')` so it shows nicely in the report. Inside it:
>
> - It calls `this.fill(this.usernameInput, 'standard_user')`. `fill` is a BasePage
>   method — it first does `waitFor({ state: 'visible' })` on the field, then fills it,
>   then logs 'Filled standard_user into Username'.
> - Then `this.fill(this.passwordInput, 'secret_sauce')` — same wait-then-fill-then-log.
> - Then `this.click(this.loginButton)` — BasePage waits for the button to be visible,
>   clicks it, and logs 'Clicked Login button'.
>
> So notice the chain: **test → LoginPage method → BasePage wrapper → Playwright API →
> Winston log**. Every low-level action is safe (it waits first) and logged."

### Step 8 — The assertion

> "**`await expect(inventoryPage.pageTitle).toHaveText('Products')`** — this is a
> **web-first assertion**. It doesn't check instantly; it **auto-retries** until the title
> element shows 'Products' or the expect timeout is hit. So even if the page is still
> loading for a moment after login, the assertion waits for it. That's what makes it
> stable — no hard waits needed."

### Step 9 — `afterEach` hook

> "After the test finishes, the global **`afterEach`** in baseFixture runs. It checks: did
> the test fail?
>
> - If the login test **passed** — nothing happens, the run stays clean and fast.
> - If it had **failed** — say the title wasn't 'Products' — the hook would take a
>   full-page screenshot and attach it to the report, and Playwright would also keep the
>   trace and video of that failed run. So I'd have full evidence to debug."

### Step 10 — Retries (only on CI)

> "If this was running on CI and the login test failed, Playwright would **retry** it up
> to 2 times, each time with a fresh context. If it then passes, it's marked **flaky**.
> Locally, retries are 0, so I see the failure immediately."

### Step 11 — Reports are generated

> "Once all the login tests finish, the **reporters** produce the output:
>
> - the **list** reporter already printed pass/fail live in my terminal,
> - the **HTML** report is written to `reports/html-report`,
> - plus the **JSON**, **JUnit**, and **Allure** results.
>
> I then run `npm run report` to open the HTML report, or `npm run allure:serve` to open
> the rich Allure report — where I can see my login test grouped under its feature, see
> the `test.step` breakdown (open, login), and if anything failed, the screenshot, video,
> and trace are right there."

### 🧠 One-line summary of the login flow

> "So in one line: **I type `npm run test:login` → Playwright reads the config and
> environment → global-setup writes report context → it discovers the login spec → a
> worker launches Chromium → fixtures build LoginPage and InventoryPage → the test calls
> `open` and `login`, which go through BasePage wrappers with waits and logging → the
> web-first assertion checks the Products title → afterEach handles any failure evidence →
> and finally the five reports are generated.**"

---

## 🧾 Quick summary line (how to close)

> "So to summarize — the design pattern is **Page Object Model**, all pages extend a
> **BasePage** for reusable actions, we inject page objects using **fixtures**, the test
> data is **external JSON** for data-driven testing, the config is **environment-driven**,
> we have a strong **utility layer**, rich **Allure reporting** with trace and video on
> failure, **ESLint rules** that enforce our conventions, and full **Jenkins and GitHub
> Actions CI/CD**. That's why I call it a hybrid framework."
