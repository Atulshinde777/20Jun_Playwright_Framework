# 🎓 Learn the Framework From Scratch — A Student's Guide

Prepared by: walrtemak



> **Who is this for?**
> Complete beginners who have never seen this framework (and maybe never written an
> automated test). By the end you will understand **what** each piece is, **why** it
> exists, and **how** all the parts fit together — because we build it up **one small
> step at a time**, starting from a single ugly test and slowly turning it into a
> professional framework.
>
> **The golden rule of this guide:** we never add a file or a concept until the
> _previous_ step becomes painful without it. Every piece of the framework was born
> to solve a real problem. If you feel the pain first, the solution makes sense.

## 📑 Table of Contents

1. [Before We Start — The Mental Model]
2. [Step 1 — Your First Raw Test (no framework at all)]
3. [Step 2 — The Pain of Raw Tests]
4. [Step 3 — Page Object Model (POM): Move locators out of tests]
5. [Step 4 — BasePage: Stop repeating yourself]
6. [Step 5 — Constants: Kill the magic strings]
7. [Step 6 — Configuration: Stop hard-coding URLs & users]
8. [Step 7 — Fixtures: Automatic setup (Dependency Injection)]
9. [Step 8 — Data-Driven Testing: One test, many data rows]
10. [Step 9 — Utilities: Reusable helpers (logger, data, waits)]
11. [Step 10 — Reporting, Screenshots & Debugging]
12. [Step 11 — Cross-Browser & Parallel Runs]
13. [Step 12 — Putting It All Together (the full flow)
14. [Cheat Sheet — What lives where & why]

STEP 1

## Before We Start — The Mental Model

We are testing **SauceDemo** (`https://www.saucedemo.com`), a fake online shop used
for practice. A typical user journey is:

```
Login  →  See products  →  Add to cart  →  Checkout  →  Order complete
```

Our job is to **make a robot do this and check it works** — every time, on every
browser, automatically.

We use **Playwright** (a browser-automation tool by Microsoft) with **JavaScript**.

Think of the framework as a **kitchen**:

| Kitchen thing       | Framework thing         | Job                                              |
| ------------------- | ----------------------- | ------------------------------------------------ |
| Recipe cards        | `tests/`                | The actual scenarios we verify                   |
| Appliances (mixer…) | `pages/` (Page Objects) | Know _how_ to operate each screen                |
| Master appliance    | `BasePage`              | Shared buttons every appliance has (on/off/etc.) |
| Pantry labels       | `utils/constants.js`    | Fixed names/URLs so nobody guesses               |
| Fridge settings     | `config/`               | Which environment/URL/users to use               |
| Prep assistant      | `fixtures/`             | Sets the table before you cook, cleans up after  |
| Grocery list        | `test-data/`            | The data your recipes consume                    |
| Helper gadgets      | `utils/`                | Small reusable tools (timer, notepad…)           |

Keep this table in mind. Every step below fills in **one row**.

## Step 1 — Your First Raw Test (no framework at all)

**🎯 Goal:** Prove we can automate _anything_ before we make it pretty.

> 📦 **Install first (one-time project setup):**
>
> ```powershell
> npm init -y                              # create package.json (if you don't have one)
> npm install -D @playwright/test          # the Playwright test runner
> npx playwright install                   # download the browser engines (Chromium/Firefox/WebKit)
> ```
>
> - `@playwright/test` gives us `test`, `expect`, and the `page` object.
> - `npx playwright install` downloads the actual browsers Playwright drives.
> - `-D` means "dev dependency" — a tool used for building/testing, not shipped to users.

**🧠 Idea first:** A test is just a script that (1) opens a page, (2) does actions,
(3) checks the result. Playwright gives us a `page` object that represents the
browser tab. We write everything inline — no structure yet.

**Code (this is deliberately messy):**

```javascript
// tests/login/positiveLogin.spec.js  — VERSION 1 (raw)
import { test, expect } from "@playwright/test";

test("valid user can log in", async ({ page }) => {
  await page.goto("https://www.saucedemo.com"); // 1. open
  await page.fill("#user-name", "standard_user"); // 2. type username
  await page.fill("#password", "secret_sauce"); // 3. type password
  await page.click("#login-button"); // 4. click login
  await expect(page.locator(".title")).toHaveText("Products"); // 5. verify
});
```

**Run it:**

```powershell
npx playwright test tests/login/positiveLogin.spec.js
```

**✅ What you learned:**

- `test(...)` defines one scenario.
- `page` is the browser tab, injected by Playwright automatically.
- `expect(...)` is the assertion (the "check").

> 🧩 **Two JavaScript words you'll see everywhere: `async` and `await`.**
> Browser actions are **slow** — opening a page or clicking takes real time. JavaScript
> doesn't wait around by default; it would fire the next line immediately. We don't
> want that. So:
>
> - `await` means _"pause here until this action finishes, then continue."_ Every
>   Playwright action (`goto`, `fill`, `click`, `expect`) needs `await` in front of it.
> - `async` is a label we put on a function to say _"this function contains `await`
>   inside it."_ You can only use `await` inside an `async` function.
>
> Rule of thumb for now: **if a line talks to the browser, put `await` in front of it,
> and make sure the surrounding function starts with `async`.**

That's a working test! But now look closely… it has problems.

## Step 2 — The Pain of Raw Tests

**😖 The Pain:** Imagine we now write 50 login tests, 30 cart tests, 40 checkout
tests. Suddenly:

1. The selector `#user-name` is copy-pasted into **120 files**. The day the
   developer renames it, you edit 120 files. 😱
2. The URL `https://www.saucedemo.com` is hard-coded everywhere. Testing on a
   staging server? Edit everything again.
3. The password `secret_sauce` sits in plain text in every file.
4. Every checkout test repeats _login → add to cart → go to checkout_ — dozens of
   duplicated lines.

**🧠 The insight:** Tests should read like **plain English business steps**, not
like low-level clicks. The "how" (selectors, waits) must live **somewhere else**.

That "somewhere else" is the **Page Object**. On to Step 3.

## Step 3 — Page Object Model (POM): Move locators out of tests

**🎯 Goal:** Each screen gets **one class** that owns its locators and actions.
Tests just call meaningful methods.

**🧠 Idea first:** A _Page Object_ is a class named after a screen (e.g.
`LoginPage`). It stores the selectors as properties and exposes actions as methods
(`login()`, `getErrorMessage()`). Tests never see a raw selector again.

---

### 3.1 — What is a "class"? (a simple analogy)

Before the code, the one word you must be comfortable with is **class**.

Think of a class as a **blueprint for a TV remote**. The blueprint says: _"a remote
has these buttons (properties) and can do these things (methods)."_ From one blueprint
you can build many actual remotes.

- A **class** = the blueprint (`LoginPage`).
- An **object** (or _instance_) = one actual thing built from it
  (`new LoginPage(page)`).
- **Properties** = the data it holds (the locators: `usernameInput`, `loginButton`).
- **Methods** = the actions it can do (`open()`, `login()`).

So a _Page Object_ is just a blueprint for one screen: it knows **where** the buttons
are (properties) and **how** to operate them (methods).

---

### 3.2 — The Page Object, decoded line by line

```javascript
// pages/LoginPage.js  — VERSION 1 (basic)
class LoginPage {
  constructor(page) {
    this.page = page;
    // Locators live HERE, not in the test
    this.usernameInput = page.getByPlaceholder("Username");
    this.passwordInput = page.locator("#password");
    this.loginButton = page.getByRole("button", { name: "Login" });
  }

  async open() {
    await this.page.goto("https://www.saucedemo.com");
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

export default LoginPage;
```

```javascript
class LoginPage {
```

- `class` starts a blueprint named `LoginPage`. Everything inside `{ }` describes what
  this screen has and does.

```javascript
constructor(page) {
```

- `constructor` is a **special method that runs once**, automatically, the moment you
  write `new LoginPage(page)`. Its job is to **set the object up**.
- It receives `page` (the browser tab) so the object knows which tab to work with.

```javascript
this.page = page;
this.usernameInput = page.getByPlaceholder("Username");
```

- `this` means _"this particular object."_ `this.page = page` **saves** the tab onto
  the object so other methods can use it later.
- `this.usernameInput = ...` **stores a locator as a property.** Now anywhere in the
  class you can say `this.usernameInput` instead of repeating the selector.

```javascript
async open() {
  await this.page.goto('https://www.saucedemo.com');
}
```

- A **method** — an action the page can perform. `open()` navigates the saved tab to
  the site. (`async`/`await` are the same as Step 1: browser actions must be awaited.)

```javascript
async login(username, password) {
  await this.usernameInput.fill(username);
  ...
}
```

- Another method, this time taking **parameters**. It uses the stored locators to fill
  the form and click — the _"how"_ now lives inside the class, not the test.

```javascript
export default LoginPage;
```

- Makes the blueprint available to other files so a test can `import LoginPage` and do
  `new LoginPage(page)`.

> 🧠 **The whole file in one sentence:** _`LoginPage` is a blueprint that stores this
> screen's locators (in the constructor) and exposes readable actions (`open`,
> `login`) so tests never touch raw selectors._

---

### 3.3 — The test becomes readable

```javascript
// tests/login/positiveLogin.spec.js  — VERSION 2 (uses POM)
import { test, expect } from "@playwright/test";
import LoginPage from "../../pages/LoginPage.js";

test("valid user can log in", async ({ page }) => {
  const loginPage = new LoginPage(page); // 👈 build one object from the blueprint
  await loginPage.open(); // 👈 call its methods — reads like English
  await loginPage.login("standard_user", "secret_sauce");
  await expect(page.locator(".title")).toHaveText("Products");
});
```

- `new LoginPage(page)` builds an actual object (this is what triggers the
  `constructor`).
- From then on the test just calls `.open()` and `.login(...)` — it reads like a
  story, and knows **nothing** about selectors.

**💡 Why this is better:**

- Selector changes now happen in **one place** (`LoginPage.js`).
- The test reads like a story: _open → login → check_.
- New team members understand the test without knowing the HTML.

> 🔎 **Note on locators:** In the real `LoginPage.js` you'll see three styles mixed
> on purpose so you learn all of them:
>
> - **Built-in** (best): `page.getByPlaceholder('Username')`, `getByRole('button', …)`
> - **CSS**: `page.locator('#password')`
> - **XPath**: `page.locator("//div[@class='login_logo']")`
>   Prefer built-in > CSS > XPath in real work, but you should recognize all three.

---

## Step 4 — BasePage: Stop repeating yourself

**😖 The Pain:** Now we build `InventoryPage`, `CartPage`, `CheckoutPage`… and every
one of them re-writes the same low-level helpers: _wait for element, then click_;
_wait for element, then fill_; _get trimmed text_. That's the same handful of lines
copy-pasted into every page object.

**🧠 The insight:** Every page needs the **same basic browser skills**. Put those
shared skills in a **parent class** called `BasePage`, and let every page **extend**
it. This is classic Object-Oriented **inheritance**.

---

### 4.1 — What is "inheritance"? (a simple analogy)

**Inheritance** is one class **borrowing** all the abilities of another.

Think of **appliances**. Every appliance can _turn on_ and _turn off_. Instead of
teaching a blender, a toaster, and a microwave each how to power on separately, you
make a general **"Appliance"** blueprint that knows on/off, and each specific
appliance **inherits** those skills — then adds its own (a blender also _blends_).

In our framework:

- `BasePage` = the general "Appliance" — it knows generic browser skills (`click`,
  `fill`, `goto`, `getText`).
- `LoginPage`, `CartPage`, etc. = specific appliances — they **inherit** those skills
  and add their own screen-specific methods (`login()`, `addProductToCart()`).

Two keywords make this work:

- `extends` — _"this class inherits from that one."_
- `super(...)` — _"run the parent's constructor first."_

Write the shared skills **once** in `BasePage`; every page gets them for free.

---

### 4.2 — The parent class (keep it simple for now)

```javascript
// pages/BasePage.js  — VERSION 1 (just shared waits, no logging yet)
class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }

  // Safe click: wait until visible, THEN click
  async click(locator) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.click();
  }

  // Safe fill: wait until visible, THEN type
  async fill(locator, text) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.fill(text);
  }

  async getText(locator) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    return (await element.innerText()).trim();
  }
}

export default BasePage;
```

> 🧩 **New syntax in this file — read this before moving on:**
>
> - `async` / `await` — same as Step 1: these methods talk to the browser, so each
>   action is `await`ed and each method is marked `async`.
> - `goto(path = '/')` — the `= '/'` is a **default parameter**. It means _"if the
>   caller doesn't pass a path, use `'/'` (the home page) automatically."_ So
>   `goto()` opens `/`, while `goto('/cart.html')` opens the cart. It saves us from
>   writing the common case every time.
> - `_resolve(locator)` / `_describe(locator)` — small private helpers (the leading
>   `_` is just a naming convention for "internal, don't call from outside"). They let
>   you pass **either** a selector string **or** a Playwright locator. You don't need
>   to understand their internals yet — just know they make the methods flexible.

**Why each helper does the "wait, THEN act" dance:** pages load bit by bit. If you
click a button that hasn't appeared yet, the test fails randomly (this is called
_flakiness_). Every `BasePage` method first does `waitFor({ state: 'visible' })`, so
the action only happens once the element is truly ready. You write this safety **once**
here, and every page inherits it.

> ⏳ **Coming later:** notice there's no logging here yet — that's intentional. We
> haven't built a logger yet. In **Step 9** we'll add one line (`logger.info(...)`)
> to each of these methods, so every click and fill automatically records what it
> did. For now, focus only on the idea of **shared methods via inheritance**.

### 4.3 — The child class inherits everything, decoded

Now child pages become tiny — they just declare locators & business methods, and get
`goto/click/fill/getText` for **free**:

```javascript
// pages/LoginPage.js  — VERSION 3 (extends BasePage)
import BasePage from "./BasePage.js";

class LoginPage extends BasePage {
  // 👈 inherits goto/click/fill/getText…
  constructor(page) {
    super(page); // 👈 pass page up to the parent
    this.usernameInput = page.getByPlaceholder("Username");
    this.passwordInput = page.locator("#password");
    this.loginButton = page.getByRole("button", { name: "Login" });
  }

  async open() {
    await this.goto("/"); // 👈 reused from BasePage
  }

  async login(username, password) {
    await this.fill(this.usernameInput, username); // 👈 reused, with wait built in
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
  }
}

export default LoginPage;
```

**The two new keywords, explained:**

```javascript
class LoginPage extends BasePage {
```

- `extends BasePage` = _"`LoginPage` **is a** `BasePage` and inherits all its
  methods."_ That's why `LoginPage` can call `this.goto`, `this.click`, `this.fill`
  even though they're **not defined here** — they come from the parent.

```javascript
constructor(page) {
  super(page);
```

- `super(page)` = _"run the **parent's** constructor first, passing `page` up to it."_
  This is what makes `this.page = page` (from `BasePage`'s constructor) happen for the
  child too.
- **Rule:** if a child class has a `constructor`, it **must** call `super(...)` before
  using `this`. Forgetting `super` is the #1 beginner error here.

```javascript
async open() {
  await this.goto('/');       // defined in BasePage, used here
}
async login(...) {
  await this.fill(this.usernameInput, username);   // fill = parent; usernameInput = child
}
```

- `this.goto` and `this.fill` are **inherited** from `BasePage`. `this.usernameInput`
  is the child's own property. The child freely mixes both.

> 🧠 **The whole idea in one sentence:** `LoginPage extends BasePage` so it inherits
> generic browser skills, calls `super(page)` to let the parent set itself up, then
> adds only the locators and actions unique to the login screen.

> ❓ **"Wait — `goto('/')`? Where does `/` know the website is saucedemo.com?"**
> Great question, and right now the honest answer is: **it doesn't yet.** `/` is a
> _relative_ path (just "the site root"). For it to mean
> `https://www.saucedemo.com/`, Playwright needs a **base URL** to attach it to — and
> we haven't set that up until **Step 6 (Configuration)**.
>
> So until Step 6, you have two options:
>
> - Keep passing the full URL for now: `await this.goto('https://www.saucedemo.com')`.
> - Or write `goto('/')` already, knowing it will _start working_ the moment we add
>   `baseURL` in Step 6.
>
> We deliberately write the clean `goto('/')` version now and **wire up the base URL
> in Step 6** — that's the exact pain (hard-coded URLs) that Step 6 exists to solve.

**💡 Why this matters:**

- Every page automatically gets **built-in waits** (fewer flaky tests) for free.
- `BasePage` is written **once**; all 5 page objects benefit.
- Child pages stay focused on _what's unique_ about their screen.

## Step 5 — Constants: Kill the magic strings

**The Pain:** Strings like `'/inventory.html'`, the error text
`'Epic sadface: Sorry, this user has been locked out.'`, and titles like
`'Products'` are scattered around. A typo (`'Prodcuts'`) causes a confusing failure,
and you can't reuse them.

**🧠 The insight:** Put every fixed string in **one file** and import it. If a value
changes, you change it once. Your editor also auto-completes them.

**Code:**

```javascript
// utils/constants.js
const ROUTES = {
  LOGIN: "/",
  INVENTORY: "/inventory.html",
  CART: "/cart.html",
  CHECKOUT_STEP_ONE: "/checkout-step-one.html",
};

const MESSAGES = {
  LOCKED_OUT: "Epic sadface: Sorry, this user has been locked out.",
  INVALID_CREDENTIALS:
    "Epic sadface: Username and password do not match any user in this service",
};

const TITLES = { PRODUCTS: "Products", YOUR_CART: "Your Cart" };

export { ROUTES, MESSAGES, TITLES };
```

**Use them in a page or test:**

```javascript
import { ROUTES } from '../utils/constants.js';

async open() {
  await this.goto(ROUTES.LOGIN);   // 👈 no magic string
}
```

**💡 Why:** One source of truth. No typos. Easy to update. Self-documenting.

---

## Step 6 — Configuration: Stop hard-coding URLs & users

**😖 The Pain:** We still hard-code `https://www.saucedemo.com`, the users, and the
password. But real teams run the **same tests** against **dev**, **qa**, and
**staging** servers — each with a different URL. We must not edit code to switch.

**🧠 The insight:** Move all environment-specific values into **config files**, and
pick the environment with an **environment variable** (`ENV`). The code reads config;
it never contains the values directly.

> 📦 **Install for this step:**
>
> ```powershell
> npm install -D dotenv
> ```
>
> `dotenv` lets us keep secrets/overrides in a local `.env` file (git-ignored) and
> load them with `import 'dotenv/config'`. That's how `process.env.BASE_URL` etc.
> become available to `env.config.js`.

---

### 6.1 — What is "configuration"? (a simple analogy)

Think of a **TV remote with a source button** (HDMI1, HDMI2, TV…). The TV itself
never changes — you just **point it at a different source**. Your tests are the TV.
The _environment_ (dev / qa / staging) is the source. Configuration is the **source
button** that lets the same tests point at a different server without rewiring
anything.

In plain terms, configuration answers three questions **from outside the code**:

- **Which website?** (`baseURL` — dev vs qa vs staging)
- **Which users & password?** (`credentials`)
- **How long to wait, headless or not?** (`timeouts`, `headless`)

We never want these values _inside_ a test. If they live outside, one switch changes
everything.

---

### 6.2 — Three places a value can come from

This is the **most important idea** in this step. A setting like `baseURL` can be
provided in **three** ways, and they have a **priority order**:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. .env / environment variable (HIGHEST — wins over everything) │
│  2. the environment JSON file   (config/environments/<ENV>.json) │
│  3. a hard-coded default in code(LOWEST — last-resort fallback)  │
└──────────────────────────────────────────────────────────────────┘
```

Why three layers?

- **Layer 3 (default)** guarantees the framework **always runs**, even with no setup.
- **Layer 2 (JSON file)** holds the normal, per-environment values your team commits.
- **Layer 1 (.env)** lets _one person on one machine_ (or CI) override a value
  temporarily **without editing any file that others share**.

Keep this "1 beats 2 beats 3" rule in mind — the loader code below is literally just
this rule written in JavaScript.

---

### 6.3 — Two kinds of config files (know the difference)

| File                          | Committed to git?  | Purpose                                     |
| ----------------------------- | ------------------ | ------------------------------------------- |
| `config/environments/qa.json` | ✅ Yes             | Shared, per-environment values for the team |
| `.env`                        | ❌ **No** (secret) | Personal/CI overrides & secrets             |
| `.env.example`                | ✅ Yes             | A template showing which vars _can_ be set  |

> 🔐 **Golden rule:** real secrets go in `.env` (git-ignored). The `.json` files hold
> non-sensitive, shareable defaults. `.env.example` is just a checklist so teammates
> know what they _could_ override.

---

### 6.4 — Step-by-step: build the config layer

**Step 6a — one JSON file per environment.** Each environment gets its own file with
the same shape. To add "staging", you copy this and change the values — no code:

```json
// config/environments/qa.json
{
  "name": "qa",
  "baseURL": "https://www.saucedemo.com",
  "credentials": {
    "password": "secret_sauce",
    "users": { "standard": "standard_user", "lockedOut": "locked_out_user" }
  }
}
```

**Step 6b — a loader that picks the right file and applies the 3-layer rule:**

```javascript
// config/env.config.js  (simplified)
import "dotenv/config"; // 👈 makes .env values appear on process.env
import fs from "fs";
import path from "path";

const ENV_NAME = process.env.ENV || "qa"; // 👈 which environment? default to qa

function loadEnvFile() {
  // Build the path to config/environments/<ENV_NAME>.json
  const filePath = path.join(
    process.cwd(),
    "config",
    "environments",
    `${ENV_NAME}.json`,
  );
  // If that file exists, read + parse it; otherwise return {} (safe fallback)
  return fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
    : {};
}

const fileConfig = loadEnvFile();
const fileCreds = fileConfig.credentials || {};

const env = {
  name: fileConfig.name || ENV_NAME,
  // Order of precedence: .env variable  →  JSON file  →  hard-coded default
  baseURL:
    process.env.BASE_URL || fileConfig.baseURL || "https://www.saucedemo.com",
  password: process.env.PASSWORD || fileCreds.password || "secret_sauce",
  users: {
    standard: fileCreds.users?.standard || "standard_user",
    lockedOut: fileCreds.users?.lockedOut || "locked_out_user",
  },
  timeouts: { test: 60000, expect: 10000, action: 15000, navigation: 30000 },
  headless: process.env.HEADLESS !== "false",
};

export default env; // 👈 one ready-to-use object the whole framework imports
```

**Let's decode the confusing parts line by line — read slowly:**

```javascript
const ENV_NAME = process.env.ENV || "qa";
```

- `process.env.ENV` is the value you set _outside_ the code (e.g. `$env:ENV="staging"`).
- `|| 'qa'` means _"if nobody set ENV, use `'qa'`."_ So the framework runs with zero
  setup, but you can switch environments from the command line.

```javascript
const filePath = path.join(
  process.cwd(),
  "config",
  "environments",
  `${ENV_NAME}.json`,
);
```

- `process.cwd()` = the folder you ran the command from (the project root).
- `path.join(...)` glues the pieces into a valid path **on any OS** (Windows uses `\`,
  Mac/Linux use `/` — `path.join` handles that for you).
- Result: if `ENV_NAME` is `staging`, this points at
  `config/environments/staging.json`.

```javascript
return fs.existsSync(filePath)
  ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
  : {};
```

- `fs.existsSync(filePath)` — _does that file exist?_
- If **yes**: `fs.readFileSync` reads it as text, `JSON.parse` turns that text into a
  real object.
- If **no**: return `{}` (an empty object) so the framework doesn't crash — the
  hard-coded defaults will fill the gaps.

```javascript
baseURL: process.env.BASE_URL || fileConfig.baseURL || 'https://www.saucedemo.com',
```

- This single line **is** the 3-layer rule from 6.2: try the `.env` value first, then
  the JSON file, then the hard-coded default. `||` picks the **first truthy** one.

```javascript
standard: fileCreds.users?.standard || 'standard_user',
```

- The `?.` is **optional chaining**: _"if `fileCreds.users` doesn't exist, don't
  crash — just give `undefined`,"_ and then `||` falls back to `'standard_user'`.

```javascript
headless: process.env.HEADLESS !== 'false',
```

- A small trick: headless is `true` **unless** you explicitly set `HEADLESS=false`.
  So tests run invisibly by default, but you can _watch_ them by setting that one var.

> 🧠 **The whole file in one sentence:** _pick the environment name, load its JSON
> file safely, then build one `env` object where every value follows "`.env` → JSON →
> default"._

**Step 6c — feed config into Playwright's own config.** Now Playwright itself uses our
`env` object, so tests and page objects never touch raw values:

```javascript
// playwright.config.js  (excerpt)
import { defineConfig } from '@playwright/test';
import env from './config/env.config.js';   // 👈 import the object we just built

export default defineConfig({
  testDir: './tests',
  timeout: env.timeouts.test,
  use: {
    baseURL: env.baseURL,          // 👈 now page.goto('/') knows the base URL
    headless: env.headless,
    actionTimeout: env.timeouts.action,
  },

  console.log("Current Environment:", ENV_NAME);
  console.log("Environment Config:", env);
});
```

> ✅ **This is the line that answers the Step 4 question.** Setting `baseURL` here
> tells Playwright: _"whenever a path starts with `/`, stick it on the end of this
> base URL."_ So now `this.goto('/')` becomes `https://www.saucedemo.com/`, and
> `this.goto('/cart.html')` becomes `https://www.saucedemo.com/cart.html`. That's why
> we could safely write the clean relative paths back in Steps 4–5 — **Step 6 is
> where they finally get their meaning.**

---

### 6.5 — How it all flows when you run a test

```
You run:  $env:ENV="staging"; npx playwright test
                    │
                    ▼
1. env.config.js reads process.env.ENV        → "staging"
2. loads config/environments/staging.json     → { baseURL, credentials, ... }
3. builds the `env` object (.env > JSON > default for each value)
4. playwright.config.js imports `env` and sets baseURL/timeouts/headless
5. every page object & test uses env.baseURL, env.users.standard, etc.
                    │
                    ▼
        Same tests, now pointed at the staging server. Zero code changes.
```

**Switching environments needs zero code changes:**

```powershell
$env:ENV="staging"; npx playwright test     # PowerShell — point at staging
# or the ready-made scripts:
npm run test:qa
npm run test:staging

ENV=staging npx playwright test --headed
```

**💡 Why this is powerful:**

- Same tests, any environment — controlled from **outside** the code.
- Secrets/URLs never live inside tests.
- The **precedence chain** (`.env` → JSON → default) means the framework _always_
  runs, even if a config file is missing.

> Because we set `baseURL` here, page objects can now call `this.goto('/')` and
> `this.goto(ROUTES.INVENTORY)` with **relative** paths. That's why Step 5's routes
> start with `/`.

> 🧠 **One-sentence summary:** configuration is a "source button" — an `env` object
> assembled from `.env` → JSON → defaults — that lets the _same_ tests run against
> _any_ environment just by setting `ENV` on the command line.

## Step 7 — Fixtures: Automatic setup (Dependency Injection)

**😖 The Pain:** Every test still starts with boilerplate:

```javascript
const loginPage = new LoginPage(page);
const inventoryPage = new InventoryPage(page);
const cartPage = new CartPage(page);
// …repeated at the top of every single test
```

And every **cart/checkout** test first has to log in manually before it can do
anything useful. More copy-paste.

**🧠 The insight:** Playwright has **fixtures** — a system that **automatically
prepares things your test needs, hands them over, and cleans up afterward.** Instead
of building objects at the top of every test, you just _ask_ for them by name and they
appear ready to use.

---

### 7.1 — What is a fixture, really? (a simple analogy)

Imagine a **restaurant**. You (the test) sit down and order _"a steak."_ You don't:

- go buy the meat,
- light the grill,
- cook it,
- and wash the pan afterward.

The **kitchen** (the fixture) does all of that. It **prepares** the steak, **serves**
it to you, and after you leave it **cleans up**. You just say what you want.

A fixture is that kitchen. In our framework:

- You ask for `loginPage` → the fixture **creates** a `new LoginPage(page)` for you.
- You ask for `loggedInPage` → the fixture **logs in first**, then hands you a
  ready, authenticated page.

**You never see the preparation. You just receive the finished thing.**

---

### 7.2 — You've already been using a fixture!

Look back at Step 1. Every test looked like this:

```javascript
test('valid user can log in', async ({ page }) => { ... });
//                                     ^^^^
//                                     this is a FIXTURE
```

That `page` inside `{ }` is a **built-in Playwright fixture**. You never wrote
`const page = new Page()` — Playwright saw you ask for `page` in the arguments,
**created a fresh browser tab**, gave it to your test, and **closed it** when the test
finished.

**Fixtures are just that same idea — but now we make our own.** We'll create
`loginPage`, `inventoryPage`, `loggedInPage`, etc., so tests can ask for them the same
easy way they already ask for `page`.

> 🔑 **Key mental model:** whatever names you put inside `async ({ ... }) => {}` are
> fixtures you're _requesting_. Playwright looks them up, prepares them, and injects
> them. This "ask by name, receive ready-made" idea is called **Dependency
> Injection**.

---

### 7.3 — Creating our own fixtures, one at a time

We use `base.extend({ ... })` to **add our own fixtures** on top of Playwright's
built-in ones. Let's build up the file gradually.

**First, the simplest possible fixture — `loginPage`:**

```javascript
// fixtures/baseFixture.js  — VERSION 1 (one fixture)
import { test as base, expect } from "@playwright/test";
import LoginPage from "../pages/LoginPage.js";

const test = base.extend({
  loginPage: async ({ page }, use) => {
    // 👈 define a fixture named "loginPage"
    const loginPage = new LoginPage(page); //   1. PREPARE: build the object
    await use(loginPage); //   2. SERVE: hand it to the test
  }, //   3. (cleanup would go here, after use)
});

export { test, expect };
```

**Let's decode that fixture function line by line — this is the part that confuses
everyone, so read slowly:**

```javascript
loginPage: async ({ page }, use) => {
```

- `loginPage:` — the **name**. This is the exact word a test will put in its `{ }` to
  request it.
- `async (...) => {}` — a fixture is just an **async function** that Playwright calls
  for you.
- `{ page }` — the fixture **itself** can ask for other fixtures! Here it asks for the
  built-in `page` (a browser tab) so it can build a `LoginPage` around it.
- `use` — a **special function Playwright passes in**. Think of it as the waiter's
  hand: _"whatever I give to `use()`, that becomes the value the test receives."_

```javascript
const loginPage = new LoginPage(page); // PREPARE (setup phase)
await use(loginPage); // SERVE — pause here while the test runs
// anything after use() = CLEANUP (teardown phase)
```

**The three phases of every fixture:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. SETUP     code BEFORE  await use(x)   → prepare the thing │
│  2. HAND-OVER await use(x)                → the TEST runs now │
│  3. TEARDOWN  code AFTER   await use(x)   → clean up          │
└─────────────────────────────────────────────────────────────┘
```

`await use(x)` literally means: _"give `x` to the test, and pause this fixture here
until the test is finished."_ When the test ends, execution **resumes right after
`use`** — that's where cleanup lives (closing files, disposing resources, etc.).

> 💡 For our page objects there's nothing to clean up, so there's no code after
> `use`. But the _slot_ is always there — that's what makes fixtures powerful for
> setup **and** teardown.

---

### 7.4 — The full fixture file

Now the same pattern, repeated for every page object, plus the special
`loggedInPage`:

```javascript
// fixtures/baseFixture.js  (full idea)
import { test as base, expect } from "@playwright/test";
import LoginPage from "../pages/LoginPage.js";
import InventoryPage from "../pages/InventoryPage.js";
import CartPage from "../pages/CartPage.js";
import env from "../config/env.config.js";

const test = base.extend({
  // Each one: build the page object, then hand it over.
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  // The star of the show: a page that is ALREADY logged in.
  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open(); // 1. go to the site
    await loginPage.login(env.users.standard, env.password); // 2. log in
    await page.waitForURL(/inventory/); // 3. wait until we're inside
    await use(page); // 4. hand over the READY page
  },
});

export { test, expect };
```

**Why `loggedInPage` is the big win:** it does the _setup phase_ (open + login +
wait) **before** `use(page)`. So by the time your test starts, you're already past the
login screen. The test contains **zero login code**.

---

### 7.5 — How a test uses them (and what happens under the hood)

Tests now import `test` from **our** fixture file, not from Playwright directly:

```javascript
// A login test — page objects arrive ready to use
import { test, expect } from "../../fixtures/baseFixture.js"; // 👈 our file

test("valid user can log in", async ({ loginPage, inventoryPage }) => {
  //                                   ^^^^^^^^^^  ^^^^^^^^^^^^^^
  //                                   we ASK for these two fixtures by name
  await loginPage.open();
  await loginPage.login("standard_user", "secret_sauce");
  expect(await inventoryPage.isLoaded()).toBeTruthy();
});
```

**Step-by-step, what Playwright does when this test runs:**

```
1. Sees the test asks for { loginPage, inventoryPage }
2. To build loginPage it needs `page` → creates a browser tab
3. Runs the loginPage fixture setup → new LoginPage(page) → use(...) → ready
4. Runs the inventoryPage fixture setup → new InventoryPage(page) → ready
5. Injects both into the test body → your test code runs
6. Test finishes → teardown runs in reverse → the browser tab closes
```

**And the cart test starts already logged in — notice there's no login code at all:**

```javascript
test("user can add a product", async ({ loggedInPage, inventoryPage }) => {
  // We asked for loggedInPage, so login already happened during SETUP.
  await inventoryPage.addProductToCart("Sauce Labs Backpack");
  // …assertions
});
```

> ✅ **The magic isn't magic:** asking for a fixture name in `{ }` tells Playwright
> _"run that fixture's setup, give me the result."_ That's the whole trick.

---

**💡 Why fixtures are a big deal:**

- **No boilerplate:** ask for what you need in the arguments; it's created for you.
- **Lazy:** a fixture only runs if a test actually asks for it (ask for nothing,
  build nothing).
- **Auto-cleanup:** anything after `await use(...)` runs automatically as teardown.
- **Composable:** fixtures can use other fixtures (`loggedInPage` uses `page`).
- `loggedInPage` removes login code from **every** non-login test.

> 🧠 **One-sentence summary:** a fixture is a small function that **prepares
> something → hands it to your test via `use()` → cleans up**, and your test gets it
> just by listing its name in `async ({ here }) => {}`.

---

## Step 8 — Data-Driven Testing: One test, many data rows

**😖 The Pain:** SauceDemo has several user types (standard, problem, performance,
locked-out…). Writing a near-identical test for each — copy, paste, change one word —
is wasteful and error-prone.

**🧠 The insight:** Separate the **data** from the **logic**. Keep the data in a JSON
file, read it, and **loop** to generate one test per row. Change coverage by editing
data, not code.

---

### 8.1 — What "data-driven" means (a restaurant analogy)

Imagine a chef who cooks **one dish** — say, an omelette. The _recipe_ (crack, whisk,
pour, fold) never changes. What changes is the **order ticket**: table 1 wants cheese,
table 2 wants mushrooms, table 3 wants plain.

A **bad** kitchen would train a separate chef for every possible topping. A **smart**
kitchen keeps **one recipe** and just reads the ticket.

```text
   ONE recipe (the test logic)          MANY tickets (the data rows)
   ┌───────────────────────────┐        ┌──────────────────────────┐
   │ open → login → check page │  ◀───  │ standard_user   ✅        │
   │ (written exactly once)     │        │ problem_user    ✅        │
   └───────────────────────────┘        │ performance...  ✅        │
                                         │ locked_out_user ❌        │
                                         └──────────────────────────┘
```

- The **recipe** = your test steps (the logic).
- The **tickets** = rows of data (usernames, expected results).
- Data-driven = _write the recipe once, feed it many tickets._

> 🧠 **In one sentence:** data-driven testing means the **steps stay fixed** and only
> the **data changes**, so you add test coverage by adding data rows — not by copying code.

---

### 8.2 — The data lives in `test-data/` (a JSON file)

We keep the "tickets" in a plain JSON file so a non-programmer could edit them:

```json
// test-data/users.json  (shape)
{
  "standard": { "username": "standard_user", "canLogin": true },
  "problem": { "username": "problem_user", "canLogin": true },
  "performance": { "username": "performance_glitch_user", "canLogin": true },
  "lockedOut": { "username": "locked_out_user", "canLogin": false }
}
```

**Read it slowly:**

- The whole thing is one **object** — a set of `"key": value` pairs.
- Each **key** (`"standard"`, `"problem"`…) is a friendly label for one user type.
- Each **value** is _itself_ a small object with two fields:
  - `username` — what we actually type into the login form.
  - `canLogin` — a `true`/`false` flag telling the test what to _expect_.
- Notice there's **zero test code here** — just facts. That's the whole point: a
  teammate can add `"visual": { ... }` without knowing Playwright.

> 💡 **Why JSON and not a `.js` array?** JSON is language-neutral and safe — no code
> can accidentally run from it. It's the standard "data, not logic" format.

---

### 8.3 — A tiny reader utility (so tests don't touch the filesystem)

Tests shouldn't know _where_ files live or _how_ to parse them. We hide that in one
small helper:

```javascript
// utils/dataReader.js  (excerpt)
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "test-data");

function readJSON(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath))
    throw new Error(`Test data file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export { readJSON };
```

**Decode it line by line:**

- `import fs from 'fs'` — `fs` is Node's built-in **file system** module (read/check files).
- `import path from 'path'` — `path` builds file paths that work on Windows **and** Mac/Linux
  (so you never hand-write `test-data\users.json` vs `test-data/users.json`).
- `process.cwd()` — "**c**urrent **w**orking **d**irectory" = the folder you ran the tests
  from (your project root). We join it with `'test-data'` to point at the data folder.
- `fs.existsSync(filePath)` — checks the file is really there; if not, we **throw a clear
  error** naming the missing file (much friendlier than a cryptic crash later).
- `fs.readFileSync(filePath, 'utf-8')` — reads the file's **text** (`'utf-8'` = normal text).
- `JSON.parse(...)` — turns that text **string** into a real JavaScript **object** we can loop over.
- `export { readJSON }` — makes this one function available to the tests.

> 🧠 **In one sentence:** `readJSON('users.json')` gives the test a ready-to-use object
> and hides all the messy file-reading details in one place.

---

### 8.4 — Read the data and loop to build tests

Now the payoff — one loop generates a separate test for every valid user:

```javascript
// tests/login/positiveLogin.spec.js  (data-driven idea)
import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import env from "../../config/env.config.js";

const users = readJSON("users.json");

// One test PER valid user — generated from data
for (const [key, user] of Object.entries(users)) {
  if (!user.canLogin) {
    continue;
  }
  test(`valid user "${key}" can log in`, async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.open();
    await loginPage.login(user.username, env.password);
    expect(await inventoryPage.isLoaded()).toBeTruthy();
  });
}
```

**Decode the tricky parts:**

- `const users = readJSON('users.json')` — `users` is now the whole object from the JSON file.
- `Object.entries(users)` — this is the key trick. It turns the object into an **array of
  pairs**, so it can be looped:

  ```text
  { "standard": {...}, "problem": {...} }
        │  Object.entries(...)  │
        ▼                       ▼
  [ ["standard", {...}], ["problem", {...}], ... ]
  ```

- `for (const [key, user] of ...)` — loops over those pairs. The `[key, user]` part is
  **destructuring**: `key` grabs the label (`"standard"`), `user` grabs its object
  (`{ username, canLogin }`). Each spin of the loop handles one user.
- `if (!user.canLogin) continue;` — skip users we don't expect to log in (like
  `locked_out_user`). `continue` = "skip the rest of this loop turn, go to the next row."
- `test(\`valid user "${key}" can log in\`, ...)`— the biggest idea: **calling`test()`inside a loop creates a brand-new test each time.** The name includes`${key}`, so the
report shows `valid user "standard" can log in`, `valid user "problem" can log in`, etc.
  — each with its **own** pass/fail.
- `user.username` and `env.password` — the data row supplies the username; the password
  comes from config (Step 6). Data + config working together.

> 🧠 **In one sentence:** the loop reads each data row and calls `test()` once per row,
> so **four JSON entries become four real tests** without four copies of code.

---

**💡 Why data-driven:**

- Add a new user? Add a JSON row — **no new test code**.
- Each row shows as its **own test** in the report (clear pass/fail per case).
- Logic and data evolve independently.

---

<a id="chapter-9"></a>

## Step 9 — Utilities: Reusable helpers (logger, data, waits)

**😖 The Pain:** We keep needing the same small tools: printing nice log lines,
reading data, generating fake customer names for checkout, formatting prices. If each
test invents its own, we get chaos.

**🧠 The insight:** Collect these framework-agnostic helpers in `utils/`. They know
nothing about SauceDemo — they're just reliable tools any project could reuse.

> 📦 **Install for the logger:**
>
> ```powershell
> npm install -D winston
> ```
>
> `winston` is a popular logging library. We use it to print nice timestamped log
> lines to the console **and** save them to files under `logs/`. (The other helpers
> like `dataGenerator`/`stringUtils` are plain JavaScript — no install needed.)

---

### 9.1 — What is a "logger", and why not just `console.log`?

A **logger** is a tool that records _what your program did, when, and how important it
was._ You've probably used `console.log('here')` before — a logger is the grown-up
version of that.

Think of it like a **flight recorder (black box)** on a plane. While everything is
fine, nobody looks at it. But the moment something crashes, that recording is the
**only** way to know what happened leading up to it. Your tests need the same thing.

Why not just sprinkle `console.log` everywhere? Because a real logger gives you things
`console.log` can't:

| Plain `console.log`                    | A proper logger (Winston)                          |
| -------------------------------------- | -------------------------------------------------- |
| No timestamp                           | Every line is time-stamped                         |
| No severity                            | Tags each line INFO / WARN / ERROR                 |
| Prints to screen only (then it's gone) | Also **saves to a file** you can read later        |
| No filtering                           | Can hide low-priority lines via a **level** switch |
| Looks the same everywhere              | Colored in the terminal, plain text in the file    |

---

### 9.2 — The three ideas inside a logger

Winston is built from three simple concepts. Learn these words and the code becomes
obvious:

```
┌───────────────────────────────────────────────────────────────────┐
│  LEVEL      how important is this message?   error > warn > info    │
│  FORMAT     what should each line look like?  (timestamp + text)    │
│  TRANSPORT  WHERE does the message go?         (console AND/OR file) │
└───────────────────────────────────────────────────────────────────┘
```

- **Level** — a severity dial. If you set the level to `info`, you see `info`,
  `warn`, and `error`. If you set it to `error`, you see _only_ errors. It lets you
  turn the noise up or down without deleting any code.
- **Format** — the _shape_ of each line, e.g. `2026-07-29 10:00:00 [INFO] Clicked login`.
- **Transport** — the _destination_. A logger can send the same message to **many**
  places at once (your terminal **and** a log file).

---

### 9.3 — Building the logger, decoded line by line

```javascript
// utils/logger.js  (idea)
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info", // ← LEVEL: show info and above
  format: format.combine(
    // ← FORMAT: stack recipes together
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ level, message, timestamp }) =>
        `${timestamp} [${level.toUpperCase()}] ${message}`,
    ),
  ),
  transports: [
    // ← TRANSPORT: where lines go
    new transports.Console(), // show in terminal
    new transports.File({ filename: "logs/test-execution.log" }), // save to file
  ],
});

export default logger;
```

**Now the confusing pieces, one at a time — read slowly:**

```javascript
import { createLogger, format, transports } from "winston";
```

- We pull three tools out of the `winston` library: `createLogger` (the factory),
  `format` (the line-shape helpers), and `transports` (the destinations).

```javascript
const logger = createLogger({ ... });
```

- `createLogger` **builds one logger object** from the settings we pass. We do this
  _once_ and reuse it everywhere. The object has methods like `logger.info(...)`,
  `logger.warn(...)`, `logger.error(...)`.

```javascript
level: 'info',
```

- The severity dial from 9.2. `info` means _"record info, warnings, and errors; hide
  anything less important (like `debug`)."_

```javascript
format: format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
),
```

- `format.combine(...)` **stacks multiple formatting steps** in order.
- `format.timestamp(...)` **stamps each entry** with the date/time in the pattern we
  give.
- `format.printf(...)` is the **final template** — it takes the pieces (`timestamp`,
  `level`, `message`) and returns the exact string we want:
  `2026-07-29 10:00:00 [INFO] Clicked login`.
- `level.toUpperCase()` just makes `info` print as `INFO`.

```javascript
transports: [
  new transports.Console(),
  new transports.File({ filename: 'logs/test-execution.log' }),
],
```

- A **list of destinations**. Because there are two, **every log line goes to both**:
  the terminal (so you see it live) **and** a file under `logs/` (so you can read it
  after the run finished, e.g. on CI).

```javascript
export default logger;
```

- We export the **single, ready-made** logger so any file can
  `import logger from '.../logger.js'` and start logging immediately.

> 🧠 **The whole file in one sentence:** _build one logger that stamps each message
> with a time + severity and sends it to both the screen and a file._

---

### 9.4 — Using the logger (and keeping the Step 4 promise)

Remember in **Step 4** we deliberately left `BasePage` with **no logging** and
promised to add it later? This is that moment. Because every page object extends
`BasePage`, we add logging in **one place** and _all_ pages get it for free:

```javascript
// pages/BasePage.js  — VERSION 2 (same methods, now with logging)
import logger from "../utils/logger.js"; // 👈 the new import

class BasePage {
  async goto(path = "/") {
    logger.info(`Navigating to: ${path}`); // 👈 added
    await this.page.goto(path);
  }

  async click(locator) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.click();
    logger.info(`Clicked element: ${this._describe(locator)}`); // 👈 added
  }

  async fill(locator, text) {
    const element = this._resolve(locator);
    await element.waitFor({ state: "visible" });
    await element.fill(text);
    logger.info(`Filled "${text}" into: ${this._describe(locator)}`); // 👈 added
  }
}
```

**What you get for free.** A single test run now produces a readable timeline —
in the terminal **and** saved in `logs/test-execution.log`:

```
2026-07-29 10:00:00 [INFO] Navigating to: /
2026-07-29 10:00:01 [INFO] Filled "standard_user" into: Username
2026-07-29 10:00:01 [INFO] Filled "secret_sauce" into: #password
2026-07-29 10:00:02 [INFO] Clicked element: Login button
```

When a test fails at 2 AM on CI, you open that file and **read exactly what happened,
step by step** — no need to re-run and hope it fails again. That is the payoff of
building `BasePage` first: logging was added **once** and every page inherited it.

> 💡 **When to use which level:** `logger.info(...)` for normal steps,
> `logger.warn(...)` for "something odd but we continued", `logger.error(...)` for
> real failures. The `level: 'info'` setting decides how much of that you actually see.

**A fake-data generator (for checkout forms):**

```javascript
// utils/dataGenerator.js  (idea)
export function generateCustomer() {
  const id = Date.now();
  return { firstName: `Test${id}`, lastName: "User", postalCode: "12345" };
}
```

Exposed as the `data` fixture so tests can grab fresh data:

```javascript
test("checkout with generated data", async ({ loggedInPage, data }) => {
  const customer = data.generateCustomer(); // unique every run
  // …fill checkout form with customer.firstName etc.
});
```

**Other helpers you'll find in `utils/`:** `stringUtils` (slugify, parsePrice),
`dateUtils`, `waitUtils`, `assertionUtils`, `fileUtils`. Each is small, focused, and
independently testable.

**💡 Why:** DRY (Don't Repeat Yourself). One good helper beats ten copy-pasted ones.

---

## Step 10 — Reporting, Screenshots & Debugging

**😖 The Pain:** A test failed on CI last night. You weren't watching. _What
happened?_ Without evidence, you must re-run and hope it fails again.

**🧠 The insight:** Configure Playwright to **automatically capture evidence on
failure** — trace, screenshot, video — and to produce **rich reports**. Also attach a
screenshot from a global hook so it lands in the report.

> 📦 **Install for rich reports (Allure):**
>
> ```powershell
> npm install -D allure-playwright allure-commandline
> ```
>
> - `allure-playwright` is the reporter that feeds results to Allure during the run.
> - `allure-commandline` is the tool that turns those results into a browsable report.
> - The **HTML** reporter needs no install — it's built into `@playwright/test`.

---

### 10.1 — Reporters vs. artifacts (two different things)

Beginners mix these up, so nail the distinction first:

```
┌──────────────────────────────────────────────────────────────────────┐
│  REPORTER   = the SUMMARY of the run                                    │
│               "12 passed, 2 failed" — the report you open and read      │
│                                                                         │
│  ARTIFACT   = the EVIDENCE from one test                                │
│               screenshot, video, trace — the files that prove what      │
│               happened inside a single test                             │
└──────────────────────────────────────────────────────────────────────┘
```

Think of a **car crash investigation**:

- The **reporter** is the _final written report_ — how many cars, which ones were
  damaged, the overall outcome.
- The **artifacts** are the _dashcam video, the photos, the black-box trace_ — the raw
  evidence for one specific crash.

You want **both**: a summary to see the big picture, and evidence to debug each
failure. Playwright produces both from one config.

---

### 10.2 — The three artifacts (your evidence)

| Artifact       | What it is                                           | When it helps                                 |
| -------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Screenshot** | A picture at the moment of failure                   | "What did the page look like?"                |
| **Video**      | A recording of the whole test                        | "What led up to the failure?"                 |
| **Trace**      | A step-by-step timeline you can _replay_ in a viewer | "Show me every action, DOM, and network call" |

The **trace** is the most powerful — it's like a time-travel debugger. You open it and
scrub through each step, seeing the page snapshot, the console, and network at every
moment.

> 💡 We capture all three **only on failure** (`retain-on-failure`) — recording every
> passing test too would be slow and waste disk space. No failures, no clutter.

---

### 10.3 — Configure it, decoded line by line

```javascript
// playwright.config.js  (excerpt)
export default defineConfig({
  reporter: [
    // ← SUMMARIES (10.1)
    ["list"], // live console output
    ["html", { outputFolder: "reports/html-report" }], // clickable HTML report
    ["allure-playwright", { resultsDir: "reports/allure-results" }], // rich report
  ],
  use: {
    // ← ARTIFACTS (10.2)
    trace: "retain-on-failure", // step-by-step timeline, only if it fails
    screenshot: "only-on-failure", // picture at the moment of failure
    video: "retain-on-failure", // recording, only if it fails
  },
});
```

**The confusing parts, one at a time:**

```javascript
reporter: [ ['list'], ['html', {...}], ['allure-playwright', {...}] ],
```

- `reporter` is a **list**, so you get **several summaries at once** from one run:
  - `['list']` — prints a live pass/fail list in the terminal as tests run.
  - `['html', { outputFolder: 'reports/html-report' }]` — builds a clickable HTML
    report saved to that folder.
  - `['allure-playwright', { resultsDir: 'reports/allure-results' }]` — writes raw
    results that the Allure tool later turns into a rich dashboard.
- Each reporter is `['name', { options }]` — a name plus its settings.

```javascript
use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' }
```

- These live under `use` (settings applied to every test).
- `'retain-on-failure'` / `'only-on-failure'` mean _"capture this, but **throw it away
  if the test passes**; keep it only when the test fails."_ That keeps runs fast and
  the folder clean while still giving you evidence exactly when you need it.

> 🧠 **In one sentence:** the `reporter` list decides _what summaries you get_, and the
> `use` block decides _what evidence is captured (and only on failure)_.

---

### 10.4 — Auto-attach a screenshot on failure (the `afterEach` hook)

Playwright already saves a screenshot file on failure — but we also want it **embedded
inside the report** so it's one click away. We do that with a global `afterEach` hook
in our fixture file (remember, `afterEach` runs after _every_ test):

```javascript
// fixtures/baseFixture.js  (teardown hook)
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // i.e. the test failed
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("failure-screenshot", {
      body: screenshot,
      contentType: "image/png",
    });
  }
});
```

**Decoded, line by line:**

```javascript
test.afterEach(async ({ page }, testInfo) => {
```

- `test.afterEach(...)` = _"run this after every single test."_
- `testInfo` is an object Playwright hands us describing **how the test went**
  (its title, status, expected status, etc.).

```javascript
if (testInfo.status !== testInfo.expectedStatus) {
```

- `status` = what actually happened (e.g. `failed`). `expectedStatus` = what _should_
  have happened (usually `passed`).
- If they **don't match**, the test failed — so only then do we bother capturing.

```javascript
const screenshot = await page.screenshot({ fullPage: true });
```

- Take a picture of the **entire** page (not just the visible part) and hold it in a
  variable.

```javascript
await testInfo.attach("failure-screenshot", {
  body: screenshot,
  contentType: "image/png",
});
```

- `testInfo.attach(...)` **glues that image into the report** under the name
  `failure-screenshot`, telling the report it's a PNG image.

> 💡 **Why bother, if Playwright already screenshots on failure?** The config-level
> screenshot is a loose _file_ on disk; this hook **embeds** it directly in the HTML/
> Allure report, so whoever reads the report sees the picture without hunting for files.

---

### 10.5 — Viewing the reports

```powershell
npm run report            # open the HTML report (built-in)
npm run allure:serve      # generate + open the Allure report
```

- `npm run report` opens the clickable **HTML report** — a pass/fail list where you
  can drill into any test and see its attached screenshot, video, and trace.
- `npm run allure:serve` builds and opens the **Allure** dashboard — a richer view
  with history, categories, and trends (great for showing stakeholders).

**💡 Why:** Failures become **self-explanatory**. You open the report, see the
screenshot, replay the trace, and read the log timeline (from Step 9) — no guessing,
no re-running.

> 🧠 **One-sentence summary:** reporters give you the _summary_ of the run, artifacts
> give you the _evidence_ for each failure (captured only when needed), and the
> `afterEach` hook embeds a screenshot right into the report so debugging is one click.

---

<a id="chapter-11"></a>

## Step 11 — Cross-Browser & Parallel Runs

**😖 The Pain:** "It works in Chrome" isn't good enough — users are on Firefox and
Safari too. And running hundreds of tests one-by-one is slow.

**🧠 The insight:** Playwright **projects** let one config run the whole suite on
multiple browser engines. `fullyParallel` runs tests at the same time to save time.

> 📦 **No new library — just make sure the browsers are installed:**
>
> ```powershell
> npx playwright install               # installs Chromium, Firefox, and WebKit
> ```
>
> Firefox and WebKit ship _with_ Playwright — you don't `npm install` them
> separately. `npx playwright install` (from Step 1) downloads all three engines so
> the `projects` below can run.

**Code (in `playwright.config.js`):**

```javascript
export default defineConfig({
  fullyParallel: true, // run tests simultaneously
  retries: process.env.CI ? 2 : 0, // auto-retry flaky tests on CI only
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

**Run one browser, or all:**

```powershell
npm run test:chromium     # just Chrome
npm run test              # all three, in parallel
```

**💡 Why:** Broad coverage + speed, with no changes to your tests.

> **Tags** help you slice the suite: tests tagged `@smoke` or `@regression` in their
> titles can be run alone via `npm run test:smoke` / `npm run test:regression`.

---

<a id="chapter-12"></a>

## Step 12 — Putting It All Together (the full flow)

Here's what happens, end to end, when you run **`npm test`**:

```
1. package.json  ──► runs "npx playwright test"
2. playwright.config.js loads
      └─ imports config/env.config.js
             └─ reads ENV → loads config/environments/<ENV>.json (+ .env overrides)
3. globalSetup runs once (writes environment info for the report)
4. For each spec file under tests/:
      └─ it imports { test } from fixtures/baseFixture.js   (NOT raw Playwright)
5. A test asks for e.g. { loggedInPage, inventoryPage, data }
      └─ fixtures build them on demand:
            • page objects (extend BasePage → shared waits + logging)
            • loggedInPage logs in automatically
            • data provides fresh fake data
6. The test runs its steps:
      • page objects use constants (ROUTES/MESSAGES) — no magic strings
      • BasePage logs every action via utils/logger.js
      • data-driven tests loop over test-data/*.json
7. After each test (afterEach hook):
      • if it FAILED → screenshot captured + attached; trace/video retained
8. Reporters produce: console list + HTML + JUnit + JSON + Allure
9. You open the report and see exactly what happened.
```

And the same test suite runs on **chromium/firefox/webkit**, in **parallel**, against
**any environment**, all controlled from **outside** the test code.

**This is the whole point of the framework:** the _test_ stays a short, readable
business story, while all the complexity (waiting, logging, config, setup, evidence,
browsers) is handled by the layers underneath.

---

## Dependency Summary — What to install & when

Install these as you reach each step (all are dev dependencies, hence `-D`):

```powershell
# Step 1 — the foundation (do this first)
npm install -D @playwright/test
npx playwright install                    # download Chromium, Firefox, WebKit

# Step 6 — configuration & secrets
npm install -D dotenv

# Step 9 — logging utility
npm install -D winston

# Step 10 — rich reporting
npm install -D allure-playwright allure-commandline
```

| Library              | Introduced in | Why we need it                                  |
| -------------------- | ------------- | ----------------------------------------------- |
| `@playwright/test`   | Step 1        | Test runner: `test`, `expect`, `page`, browsers |
| `dotenv`             | Step 6        | Load `.env` overrides into `process.env`        |
| `winston`            | Step 9        | Timestamped logs to console + files             |
| `allure-playwright`  | Step 10       | Feeds results to Allure during the run          |
| `allure-commandline` | Step 10       | Generates/opens the browsable Allure report     |

> The **HTML/JSON/JUnit reporters** and **Firefox/WebKit** browsers come bundled with
> `@playwright/test` — no separate install. Helpers like `dataGenerator`,
> `stringUtils`, `dateUtils`, and `constants` are plain JavaScript with no dependency.

---

<a id="cheat-sheet"></a>

## Cheat Sheet — What lives where & why

| Folder / File             | What it is                       | Why it exists                                      |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| `tests/`                  | The scenarios (recipes)          | Short, readable business steps                     |
| `pages/BasePage.js`       | Parent page class                | Shared waits + logging for all pages (DRY)         |
| `pages/*.js`              | One class per screen (POM)       | Owns locators & actions; keeps tests clean         |
| `utils/constants.js`      | Routes, messages, titles         | One source of truth; no magic strings              |
| `config/env.config.js`    | Config loader                    | Read env values from outside the code              |
| `config/environments/`    | dev/qa/staging JSON              | Same tests, different environments                 |
| `fixtures/baseFixture.js` | Custom fixtures (DI) + afterEach | Auto-build page objects, auto-login, auto-evidence |
| `test-data/*.json`        | Test data                        | Data-driven tests; add rows, not code              |
| `utils/dataReader.js`     | JSON/CSV reader                  | Tests don't touch the filesystem directly          |
| `utils/logger.js`         | Winston logger                   | A timeline of every action for debugging           |
| `utils/dataGenerator.js`  | Fake data                        | Fresh, unique data for forms                       |
| `playwright.config.js`    | Central Playwright config        | Browsers, timeouts, reporters, artifacts           |
| `package.json` scripts    | `npm run test:*` shortcuts       | Easy, memorable commands                           |

---

## How to Teach This (suggested order for class)

1. **Day 1:** Chapters 1–2. Write the ugly raw test. Feel the pain.
2. **Day 2:** Chapters 3–4. Introduce POM, then extract `BasePage` (teach OOP live).
3. **Day 3:** Chapters 5–6. Constants, then multi-environment config.
4. **Day 4:** Chapter 7. Fixtures & dependency injection
5. **Day 5:** Chapters 8–9. Data-driven tests + utilities.
6. **Day 6:** Chapters 10–11. Reporting/debugging + cross-browser/parallel.
7. **Day 7:** Chapter 12. Run the whole suite; walk the end-to-end flow diagram.

🎉 **That's the framework, from an empty folder to production-ready — one honest step
at a time.** Once students internalize _why_ each layer exists, the real source files
in `pages/`, `fixtures/`, `config/`, and `utils/` will read like old friends.
