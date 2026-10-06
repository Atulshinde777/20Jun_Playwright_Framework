# 📘 SauceDemo Playwright Framework — Part 1: Concepts, Architecture & Flow

Prepared by: walrtemak



> This is **Part 1 of 2**. It teaches the framework **in sequence** — from an empty
> folder to a production-ready design — explaining the _why_ behind every layer,
> the architecture, and the end-to-end execution flow.
>
> 👉 For the **complete copy-ready source code of every file (in build order)**,
> plus all commands and an interview quick-reference, see
> **[Part 2 — Code & Reference](SauceDemo_Framework_Guide_Part2_Code.md)**.

---

## 📑 Table of Contents

1. [The Mental Model](#1-the-mental-model)
2. [The Build-by-Pain Philosophy](#2-the-build-by-pain-philosophy)
3. [Sequence of Construction (Roadmap)](#3-sequence-of-construction-roadmap)
4. [Step 1 — Project Setup & First Raw Test](#step-1--project-setup--first-raw-test)
5. [Step 2 — Page Object Model (POM)](#step-2--page-object-model-pom)
6. [Step 3 — BasePage (Inheritance & DRY)](#step-3--basepage-inheritance--dry)
7. [Step 4 — Constants (Kill Magic Strings)](#step-4--constants-kill-magic-strings)
8. [Step 5 — Configuration & Environments](#step-5--configuration--environments)
9. [Step 6 — Fixtures (Dependency Injection)](#step-6--fixtures-dependency-injection)
10. [Step 7 — Data-Driven Testing](#step-7--data-driven-testing)
11. [Step 8 — Utilities Layer](#step-8--utilities-layer)
12. [Step 9 — Logging & Reporting](#step-9--logging--reporting)
13. [Step 10 — Cross-Browser & Parallel Execution](#step-10--cross-browser--parallel-execution)
14. [Step 11 — Unit Testing](#step-11--unit-testing)
15. [Step 12 — CI/CD](#step-12--cicd)
16. [Deep Dive — Workers, Retries & Flaky Test Handling](#deep-dive--workers-retries--flaky-test-handling)
17. [Deep Dive — Global Config & Global Setup](#deep-dive--global-config--global-setup)
18. [Deep Dive — Code Quality (ESLint + Prettier)](#deep-dive--code-quality-eslint--prettier)
19. [Framework Architecture](#framework-architecture)
20. [End-to-End Execution Flow](#end-to-end-execution-flow)
21. [Folder Structure — What & Why](#folder-structure--what--why)
22. [Common Mistakes & Fixes](#common-mistakes--fixes)

---

## 1. The Mental Model

We test **SauceDemo** (`https://www.saucedemo.com`), a practice e-commerce app.
A typical user journey:

```
Login → See products → Add to cart → Checkout → Order complete
```

Think of the framework as a **kitchen**:

| Kitchen thing    | Framework thing         | Job                                             |
| ---------------- | ----------------------- | ----------------------------------------------- |
| Recipe cards     | `tests/`                | The actual scenarios we verify                  |
| Appliances       | `pages/` (Page Objects) | Know _how_ to operate each screen               |
| Master appliance | `BasePage`              | Shared skills every appliance has (click/fill)  |
| Pantry labels    | `utils/constants.js`    | Fixed names/URLs so nobody guesses              |
| Fridge settings  | `config/`               | Which environment/URL/users to use              |
| Prep assistant   | `fixtures/`             | Sets the table before you cook, cleans up after |
| Grocery list     | `test-data/`            | The data your recipes consume                   |
| Helper gadgets   | `utils/`                | Small reusable tools (logger, waits, data)      |

**Tech stack:** `JavaScript (ES Modules) + Playwright + POM + Data-Driven + Allure`.

---

## 2. The Build-by-Pain Philosophy

> **Golden rule:** never introduce a file before the pain it solves exists. Let the
> framework _earn_ each folder.

Every layer solves a concrete pain from the previous one:

| Stage             | Pain from previous stage             | Solution we introduce         |
| ----------------- | ------------------------------------ | ----------------------------- |
| 1. Raw test       | Nothing yet                          | A single working test         |
| 2. POM            | Selectors copy-pasted everywhere     | Page Objects                  |
| 3. BasePage       | Same `click/fill` code in every page | A shared parent class         |
| 4. Constants      | Magic strings & typos                | One source of truth           |
| 5. Config         | Hard-coded URLs & users              | Central config + environments |
| 6. Fixtures       | `new LoginPage(page)` in every test  | Fixtures inject objects       |
| 7. Data-driven    | One test per data set                | Loop over JSON data           |
| 8. Utils          | Repeated waits, parsing, logging     | Reusable helpers              |
| 9. Reporting      | "It failed" — but no evidence        | Logs, screenshots, Allure     |
| 10. Cross-browser | "Works on my Chrome"                 | Projects + parallel workers   |
| 11. Unit tests    | Only functional coverage             | Unit tests for helpers        |
| 12. CI/CD         | "Runs on my machine"                 | Jenkins + GitHub Actions      |

---

## 3. Sequence of Construction (Roadmap)

```
Step 0  ▸ npm init + install Playwright            → package.json, node_modules
Step 1  ▸ Minimal config + first raw test          → playwright.config.js, tests/
Step 2  ▸ Page Object Model                         → pages/LoginPage.js, InventoryPage.js
Step 3  ▸ BasePage (inheritance)                    → pages/BasePage.js
Step 4  ▸ Constants (kill magic strings)            → utils/constants.js
Step 5  ▸ Config & environments                     → config/, .env
Step 6  ▸ Fixtures (dependency injection)           → fixtures/baseFixture.js
Step 7  ▸ Data-driven testing                       → test-data/, dataReader.js
Step 8  ▸ Utilities                                 → utils/logger, waitUtils, etc.
Step 9  ▸ Logging & reporting                       → reporters, Allure, screenshots
Step 10 ▸ Cross-browser + parallel                  → projects[], workers, retries
Step 11 ▸ Unit tests                                → tests/unit
Step 12 ▸ CI/CD                                     → Jenkinsfile, GitHub Actions
```

Each step below expands one line of this roadmap. The matching **source code** for
each step lives in [Part 2](SauceDemo_Framework_Guide_Part2_Code.md).

---

## Step 1 — Project Setup & First Raw Test

**🎯 Goal:** Get one real test running against SauceDemo.

**😖 Pain:** We have Playwright — but how do we prove it works, and where do tests live?

**🛠️ Build:** A minimal `playwright.config.js` (`testDir`, `baseURL`) and a raw spec
with inline selectors (deliberately messy).

**💡 Why it matters:**

- `defineConfig` gives one place for global settings.
- `baseURL` lets tests use `page.goto('/')` instead of full URLs.
- `testDir` tells Playwright where to discover specs.

**⚠️ Common mistakes:** `waitForTimeout(5000)` instead of auto-waiting; missing
`await`; hard-coding the full URL.

> **Teaching beat:** point at the inline selectors — _"If the login button ID
> changes and we have 50 tests, how many files do we edit?"_ → Step 2.

📄 Code: Part 2 → Step 1.

---

## Step 2 — Page Object Model (POM)

**🎯 Goal:** Move selectors & actions out of tests into Page Object classes.

**😖 Pain:** Selectors duplicated across tests; one UI change breaks everything.

**Key ideas:**

- A **class** is a blueprint for one screen (`LoginPage`).
- **Locators** live once in the constructor — never inline in tests.
- **Methods** return data or perform actions; **no assertions** inside page objects.
- Prefer `getByRole`/`getByPlaceholder` > CSS > XPath.

**💡 Why it matters:** POM separates "what the page can do" from "what we're
testing." Selectors live in exactly one place; tests read like a story.

📄 Code: Part 2 → Step 5 (Page Objects).

---

## Step 3 — BasePage (Inheritance & DRY)

**🎯 Goal:** A `BasePage` parent all page objects extend, holding shared action wrappers.

**😖 Pain:** Every page repeats `await locator.click()`, `fill()`, waits, logging.

**The 4 OOP pillars taught here:**

- **Inheritance** — every page `extends BasePage`.
- **Encapsulation** — locators are private details of each page.
- **Polymorphism** — `_resolve()` accepts a string _or_ a Locator.
- **Abstraction** — tests call `login()`, not raw Playwright.

**⚠️ Common mistakes:** forgetting `super(page)` in the child constructor; putting
page-specific locators in `BasePage`; over-engineering it on day one.

📄 Code: Part 2 → Step 4 (BasePage).

---

## Step 4 — Constants (Kill Magic Strings)

**🎯 Goal:** Put every fixed string (routes, messages, titles) in one file.

**😖 Pain:** `'/inventory.html'`, error texts, and titles scattered everywhere; a
typo like `'Prodcuts'` causes confusing failures.

**💡 Why it matters:** One source of truth, no typos, auto-complete, self-documenting.

📄 Code: Part 2 → Step 2 (constants).

---

## Step 5 — Configuration & Environments

**🎯 Goal:** Remove hard-coded URLs/users/timeouts. Support `dev`/`qa`/`staging`.

**😖 Pain:** Credentials and URLs are scattered; switching environments means
find-and-replace.

**The 3-layer precedence rule** (highest wins):

```
1. .env / environment variable   (HIGHEST — overrides everything)
2. config/environments/<ENV>.json (team's committed defaults)
3. hard-coded default in code     (LOWEST — last-resort fallback)
```

Selection: `process.env.ENV` → load `<ENV>.json` → merge `.env` → defaults, all
exported as a single `env` object the whole framework imports.

**🔐 Golden rule:** secrets go in `.env` (git-ignored); `.json` holds shareable
defaults; `.env.example` documents the shape.

**Switch environments with zero code changes:**

```powershell
$env:ENV="staging"; npx playwright test   # or: npm run test:staging
```

📄 Code: Part 2 → Steps 6 & 7 (env config + wiring into Playwright config).

---

## Step 6 — Fixtures (Dependency Injection)

**🎯 Goal:** Stop writing `new LoginPage(page)` in every test; let Playwright inject them.

**😖 Pain:** Every test starts with 4–5 lines of object construction and manual login.

**The 3 phases of every fixture:**

```
1. SETUP     code BEFORE  await use(x)   → prepare the thing
2. HAND-OVER await use(x)                → the TEST runs now
3. TEARDOWN  code AFTER   await use(x)   → clean up
```

**Available fixtures:**

| Fixture                | Provides                                       |
| ---------------------- | ---------------------------------------------- |
| `loginPage`            | Login page actions + locators                  |
| `inventoryPage`        | Product listing, sorting, add/remove, cart nav |
| `cartPage`             | Cart validation, remove, checkout nav          |
| `checkoutPage`         | Customer info form + overview                  |
| `checkoutCompletePage` | Order confirmation                             |
| `loggedInPage`         | Pre-authenticated page (auto-login)            |
| `data`                 | Random data generator                          |

A global `afterEach` attaches a full-page **screenshot on failure**.

**💡 Why it matters:** no boilerplate; lazy (only built when asked); auto-cleanup;
composable; `loggedInPage` removes login code from every non-login test.

📄 Code: Part 2 → Step 9 (fixtures).

---

## Step 7 — Data-Driven Testing

**🎯 Goal:** Run the same test logic across many data sets from external JSON.

**😖 Pain:** Separate near-identical tests for invalid username, invalid password,
empty fields, locked-out user… differing only by data.

**Core idea:** keep data in `test-data/*.json`, read it with `readJSON(...)`, and
**loop outside `test()`** so each row becomes its own reported test.

```javascript
for (const data of loginData.invalidCredentials) {
  test(`${data.testId}: ${data.description}`, async ({ loginPage }) => {
    await loginPage.login(data.username, data.password);
    expect(await loginPage.getErrorMessage()).toBe(data.expectedError);
  });
}
```

**⚠️ Common mistakes:** looping _inside_ one `test()` (one giant test); hard-coding
data in the spec; reusing mutable data across tests.

📄 Code: Part 2 → Steps 8 & 10–11 (dataReader, test-data, data-driven specs).

---

## Step 8 — Utilities Layer

**🎯 Goal:** Extract repeated logic into reusable `utils/`.

| File                | Introduce when students need…                                 |
| ------------------- | ------------------------------------------------------------- |
| `waitUtils.js`      | a flaky action to retry → `retry()`, `waitUntil()`, `sleep()` |
| `stringUtils.js`    | compare prices/sort → `parsePrice()`, `slugify()`             |
| `dataGenerator.js`  | unique test data → `email()`, `customer()`                    |
| `assertionUtils.js` | readable, logged checks → `assertEquals()`, `assertVisible()` |
| `dateUtils.js`      | timestamps / formatting                                       |
| `fileUtils.js`      | file I/O, downloads                                           |

**💡 Why it matters:** DRY — one good helper beats ten copy-pasted ones; keep utils
pure so they're easy to unit-test (Step 11).

📄 Code: Part 2 → Step 8 (utilities).

---

## Step 9 — Logging & Reporting

**🎯 Goal:** Turn "it failed" into actionable evidence.

**Logger (Winston)** — three ideas:

- **Level** — severity dial (`error > warn > info`).
- **Format** — line shape (`timestamp + level + message`).
- **Transport** — destination (console **and** file).

Wired into `BasePage`, so every click/fill is logged automatically.

**Reporters vs. artifacts:**

- **Reporter** = the _summary_ of the run (list / HTML / JSON / JUnit / Allure).
- **Artifact** = the _evidence_ for one test (screenshot / video / trace), captured
  only `on-failure` to keep runs fast.

A global `afterEach` embeds a screenshot in the report and saves a `.png` under
`reports/failed-screenshots/`. `global-setup.js` writes Allure `environment.properties`.

**View reports:**

```powershell
npm run report         # Playwright HTML
npm run allure:serve   # Allure dashboard
npx playwright show-trace   # time-travel debugger
```

📄 Code: Part 2 → Steps 3, 9 & 12 (logger, afterEach hook, global-setup, reporters).

---

## Step 10 — Cross-Browser & Parallel Execution

**🎯 Goal:** Run the suite on Chromium, Firefox, WebKit, in parallel, with CI retries.

Key config:

```javascript
fullyParallel: true,
workers: process.env.CI ? 2 : undefined,
retries: process.env.CI ? 2 : 0,
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
],
```

**⚠️ Rules:** tests must be independent for parallelism; retries only on CI; fix
flakiness at the root, don't mask it with high retries.

📄 Code: Part 2 → Step 7 (final playwright.config.js).

---

## Step 11 — Unit Testing

**🎯 Goal:** Broaden coverage beyond functional flows — test the helpers themselves.

**😖 Pain:** A broken helper can silently break many UI tests.

Pure-logic, browser-free tests for `stringUtils`, `waitUtils`, `dataGenerator`,
`dateUtils`. Run with `npm run test:unit`.

📄 Code: Part 2 → Step 14 (unit tests).

---

## Step 12 — CI/CD

**🎯 Goal:** Run the suite automatically on every push.

- **GitHub Actions** (`.github/workflows/playwright.yml`) — browser matrix, runs on
  push/PR, uploads report artifacts.
- **Jenkinsfile** — parameterized (`BROWSER`, `SUITE`): Checkout → Install →
  Browsers → Test → Reports → Archive.

**✅ Best practices:** `npm ci` (not `npm install`); `npx playwright install
--with-deps`; always archive artifacts; set `CI=true`; run headless.

📄 Code: Part 2 → Step 15 (CI/CD + final package.json).

---

## Deep Dive — Workers, Retries & Flaky Test Handling

These four settings live in `playwright.config.js` and together control **speed** and
**reliability**. They are easy to confuse, so here is exactly what each does.

### 1. `fullyParallel: true` — parallel inside a file

By default Playwright runs _files_ in parallel but _tests inside one file_
sequentially. `fullyParallel: true` runs **every test in every file** in parallel,
spread across workers. This is the biggest speed win — but it means tests **must be
independent** (no shared state, no reliance on execution order).

### 2. `workers` — how many tests run at the same time

A **worker** is a separate Node.js process, each driving its own browser. More
workers = more tests running simultaneously = faster, but more CPU/RAM.

```javascript
workers: process.env.CI ? 2 : undefined,
```

| Value       | Meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| `undefined` | Auto — Playwright picks ≈ half the CPU cores (good for local speed) |
| `2` (on CI) | Capped to 2 for stable, predictable CI runs (shared CI machines)    |
| `1`         | Fully serial — useful when debugging an order/state problem         |

> **Why cap on CI?** CI runners are smaller and shared; too many workers causes
> resource starvation and _false_ flakiness. Local machines can use auto.

### 3. `retries` — the automatic retry mechanism

```javascript
retries: process.env.CI ? 2 : 0,
```

When a test **fails**, Playwright re-runs it up to `retries` times with a **fresh
browser context and fresh fixtures** each attempt.

```
Attempt 1 ❌  →  Attempt 2 (fresh page + page objects) ❌  →  Attempt 3 ✅
                └─ reported as "flaky" (passed, but not first try)
```

- **On CI → 2 retries:** absorbs transient infrastructure hiccups (slow network, a
  one-off timing blip) so the pipeline isn't red for non-bugs.
- **Locally → 0 retries:** you _want_ to see flakiness immediately so you can fix it.

> ⚠️ Retries are a **safety net, not a cure**. High retry counts to "make tests pass"
> hide real bugs. Keep it at 2 and fix the root cause.

### 4. Flaky test handling (the full picture)

A **flaky** test is one that passes sometimes and fails other times with no code
change. This framework handles flakiness in layers:

| Layer                      | How it fights flakiness                                            |
| -------------------------- | ------------------------------------------------------------------ |
| **Web-first assertions**   | `await expect(locator).toHaveText(...)` auto-retries until timeout |
| **`BasePage` waits**       | Every `click`/`fill` does `waitFor({ state: 'visible' })` first    |
| **No hard sleeps**         | ESLint bans `waitForTimeout`; use `waitUntil`/`retry` instead      |
| **`retry()` util**         | Wraps genuinely flaky async steps with bounded retries + logging   |
| **`retries` on CI**        | Re-runs a failed test; a later pass is tagged **flaky** in reports |
| **Trace/video/screenshot** | `retain-on-failure` gives evidence to diagnose the _real_ cause    |
| **Independent tests**      | No shared state → parallel runs don't corrupt each other           |

**How a flaky test shows up:** in the HTML/Allure report it's marked **"flaky"** (not
just pass/fail), so you can triage it. Open its trace to see the exact failing step,
fix the root cause (bad locator, race condition, missing wait), and remove reliance on
retries.

### 5. `forbidOnly` — a CI guard rail

```javascript
forbidOnly: !!process.env.CI,
```

If someone accidentally commits a `test.only(...)` (which would skip the whole rest of
the suite), the CI run **fails fast** instead of silently running one test.

📄 Code: Part 2 → Step 7 (final playwright.config.js).

---

## Deep Dive — Global Config & Global Setup

Two distinct "global" pieces are often confused:

### A. Global configuration — `playwright.config.js`

The **single source of truth** for how the whole suite runs. Loaded **first**, before
any test. It is where the global/project-wide settings live:

| Setting                      | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `testDir`                    | Where specs are discovered (`./tests`)              |
| `timeout` / `expect.timeout` | Per-test and per-assertion time limits (from `env`) |
| `fullyParallel`/`workers`    | Parallelism (see deep dive above)                   |
| `retries` / `forbidOnly`     | Reliability + CI guard rail                         |
| `reporter`                   | The 5 reporters (list/HTML/JSON/JUnit/Allure)       |
| `use` (`baseURL`, trace, …)  | Defaults applied to **every** test                  |
| `projects`                   | The browser matrix (chromium/firefox/webkit)        |
| `globalSetup`                | A one-time hook (see below)                         |
| `outputDir`                  | Where artifacts (traces/videos) are written         |

It imports the resolved `env` object (`config/env.config.js`), so **environment
values flow into global config** — one place controls URLs, timeouts, headless, etc.

### B. Global setup — `global-setup.js`

A function that runs **exactly once, before the entire suite** (not per test). In this
framework it writes Allure's `environment.properties` so the report shows _which_
environment, browser, OS, and Node version the run used.

```
playwright.config.js loads → globalSetup() runs ONCE → all tests run → reporters emit
```

Other common uses (not all enabled here): seeding a database, creating an auth token
once and reusing it, or warming up a server. The matching teardown is `globalTeardown`.

> **Key difference:** global config = _settings_ (declarative); global setup = _code_
> that runs once (imperative). `fixtures` `beforeEach`/`afterEach` run **per test** —
> global setup runs **per run**.

📄 Code: Part 2 → Step 7 (config) & Step 12 (global-setup.js).

---

## Deep Dive — Code Quality (ESLint + Prettier)

The framework separates two concerns cleanly:

- **Prettier** owns **formatting** (how the code _looks_: quotes, spacing, line width).
- **ESLint** owns **code quality** (what the code _does_: bugs, bad patterns, framework
  rules). `eslint-config-prettier` is loaded **last** so ESLint never fights Prettier
  over formatting.

### Prettier — `.prettierrc.json`

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

| Option                  | Effect                                                  |
| ----------------------- | ------------------------------------------------------- |
| `semi: true`            | Always end statements with semicolons                   |
| `singleQuote: true`     | Use `'single'` quotes, not `"double"`                   |
| `trailingComma: "es5"`  | Trailing commas where valid in ES5 (arrays, objects)    |
| `printWidth: 100`       | Wrap lines at 100 characters                            |
| `tabWidth: 2`           | 2-space indentation                                     |
| `endOfLine: "lf"`       | Unix line endings (consistent across Windows/Mac/Linux) |
| `arrowParens: "always"` | Always parenthesize arrow params: `(x) => …`            |

`.prettierignore` keeps generated output out of formatting:

```
reports/
test-results/
logs/
node_modules/
playwright-report/
*.min.js
```

### ESLint — `eslint.config.js` (flat config, ESLint v9+)

Uses the modern **flat config** array. Key pieces:

1. **Ignores** — same generated folders as Prettier.
2. **`js.configs.recommended`** — core JS best-practice rules.
3. **Language options** — `ecmaVersion: 2023`, `sourceType: 'module'` (ES Modules),
   and declared globals (`process`, `window`/`document` for `page.evaluate` callbacks).
4. **General rules:**
   | Rule                                 | Why                                                  |
   | ------------------------------------ | ---------------------------------------------------- |
   | `no-unused-vars: warn` (ignore `^_`) | Catch dead variables; allow `_unused` convention     |
   | `eqeqeq: ['error', 'smart']`         | Force `===` over `==` (except safe `== null`)        |
   | `prefer-const: error`                | Use `const` when never reassigned                    |
   | `no-empty-pattern: off`              | Allow the Playwright `async ({}, use)` fixture idiom |
5. **Playwright spec rules** (`tests/**/*.spec.js`, excluding `tests/unit`) — these
   **enforce the framework's own conventions automatically:**

   | Rule                                         | What it enforces                                                     |
   | -------------------------------------------- | -------------------------------------------------------------------- |
   | `playwright.configs['flat/recommended']`     | Official Playwright lint rules                                       |
   | `no-restricted-imports` (`@playwright/test`) | Specs **must** import `test`/`expect` from `fixtures/baseFixture.js` |
   | `no-restricted-syntax` (`waitForTimeout`)    | **Bans hard waits** — use web-first assertions                       |

   > Unit specs (`tests/unit/**`) are **excluded** from the fixture-import rule because
   > they legitimately test pure utils and import directly from `@playwright/test`.

6. **`prettier` (last)** — disables any ESLint formatting rules that would conflict
   with Prettier.

### Why this matters

- New contributors **cannot** break conventions (wrong import, hard wait) — ESLint
  fails them automatically, even before CI.
- Formatting debates disappear — Prettier is the single authority.

### Commands

```powershell
npx prettier --write .      # auto-format the whole project
npx prettier --check .      # verify formatting (use in CI)
npx eslint .                # lint for quality + framework-rule violations
npx eslint . --fix          # auto-fix what ESLint safely can
```

📄 Code: Part 2 → Step 15b (eslint.config.js, .prettierrc.json, .prettierignore).

---

## Framework Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│   playwright.config.js ──▶ config/env.config.js ──▶ environments/ │
│          │                                                        │
│          ├──▶ global-setup.js ──▶ Allure environment.properties  │
│          ▼                                                        │
│   fixtures/baseFixture.js ──▶ PAGE OBJECTS (POM)                 │
│     (+ data / auto-login /       BasePage.js (parent, 30+ methods)│
│      afterEach screenshot)        ▲      ▲       ▲                │
│                                   │      │       │                │
│                           LoginPage  InventoryPage  CartPage …    │
│          ▼                                                        │
│   TEST DATA  (loginData / users / checkoutData / products .json)  │
│          ▼                                                        │
│   TEST SPECS (login/ inventory/ cart/ checkout/ e2e/ unit/)      │
│          ▼                                                        │
│   UTILITIES (logger, dataReader, constants, waitUtils, …)        │
│          ▼                                                        │
│   REPORTERS  (List │ HTML │ JSON │ JUnit │ Allure)              │
│                                                                  │
│   Cross-cutting: CI/CD (Jenkins + GitHub Actions)               │
└─────────────────────────────────────────────────────────────────┘
```

**POM inheritance:** every child page `extends BasePage` → inherits 30+ generic
wrappers, defines its own **mixed locators** (built-in + CSS + XPath) in the
constructor, and composes business methods from BasePage primitives.

---

## End-to-End Execution Flow

What happens when you run `npm test` — map each stage to its file:

```
1. CLI: npm test → npx playwright test
2. playwright.config.js loads
     ├── import 'dotenv/config'  (loads .env)
     └── import env from config/env.config.js → loads environments/<ENV>.json
3. global-setup.js runs ONCE → writes Allure environment.properties
4. Test discovery: finds tests/**/*.spec.js
5. Worker allocation: fullyParallel spreads tests × projects (chromium/firefox/webkit)
6. Per test:
     a. Browser context + page launched
     b. fixtures/baseFixture.js resolves page objects (+ loggedInPage, data)
     c. data-driven specs read JSON via utils/dataReader.js
     d. Spec → Page Object (test.step) → BasePage action → Winston log
     e. Assertions auto-retry until expect.timeout
     f. afterEach: on failure → screenshot/video/trace attached
7. Retries (CI only): failed tests re-run up to `retries`
8. Reporters emit: list • HTML • JSON • JUnit • Allure
9. View: show-report | allure:serve | show-trace
```

**One-line flow:**

```
CLI → config → env.config.js → global-setup → discover → workers → browsers
→ fixtures build page objects → load data → Spec → Page Object → BasePage → Playwright API
→ assertions → afterEach screenshot on failure → reports (list+html+json+junit+allure)
```

---

## Folder Structure — What & Why

```
saucedemo-framework/
├── config/            # externalized env settings (dev/qa/staging) — Step 5
│   └── environments/  # per-environment JSON (URLs, credentials)
├── pages/             # Page Object Model — one class per screen — Steps 2–3
├── fixtures/          # dependency injection of page objects & setup — Step 6
├── utils/             # reusable, framework-agnostic helpers — Step 8
├── test-data/         # external data for data-driven tests — Step 7
├── tests/             # specs by feature: login/inventory/cart/checkout/e2e/unit
├── reports/           # generated HTML/JSON/JUnit/Allure output (git-ignored)
├── logs/              # Winston execution & error logs (git-ignored)
├── .github/workflows/ # GitHub Actions CI — Step 12
├── playwright.config.js  # central test config
├── config/env.config.js  # config loader — Step 5
├── global-setup.js       # one-time setup (Allure env info) — Step 9
├── Jenkinsfile           # Jenkins pipeline — Step 12
├── .env / .env.example   # secrets & template — Step 5
└── package.json          # scripts & dependencies — Step 0
```

> **Rule:** a folder exists because a responsibility exists. Separation of concerns
> is the reason for every directory.

---

## Common Mistakes & Fixes

| #   | Mistake                                         | Fix                                       |
| --- | ----------------------------------------------- | ----------------------------------------- |
| 1   | Skipping `npm init`, writing loose scripts      | Always initialize the project first       |
| 2   | Hard-coding selectors in tests                  | Move to Page Objects (POM)                |
| 3   | `waitForTimeout(5000)` everywhere               | Trust auto-waiting / web-first assertions |
| 4   | Missing `await` on async calls                  | Every Playwright call is awaited          |
| 5   | Assertions inside Page Objects                  | Assertions belong in specs                |
| 6   | Forgetting `super(page)` in child pages         | Always call `super()` first               |
| 7   | Hard-coded URLs/users/timeouts                  | Centralize in `config/env.config.js`      |
| 8   | Committing `.env` with secrets                  | Git-ignore `.env`; commit `.env.example`  |
| 9   | Data loop inside one `test()`                   | Loop outside `test()` — one test per row  |
| 10  | Leaving `test.only` in code                     | `forbidOnly` blocks it in CI              |
| 11  | `trace: 'on'` always                            | Use `retain-on-failure`                   |
| 12  | Order-dependent tests                           | Keep tests independent for parallelism    |
| 13  | High retries to hide flakiness                  | Fix the root cause; retry only on CI      |
| 14  | Committing `node_modules/`, `reports/`, `logs/` | Git-ignore generated folders              |
| 15  | `npm install` in CI                             | Use `npm ci` for reproducibility          |

---

➡️ **Continue to [Part 2 — Code & Reference](SauceDemo_Framework_Guide_Part2_Code.md)**
for the full source of every file in build order, all commands, and the interview
quick-reference.
