import { test, expect } from "../../fixtures/baseFixture.js";
import { readJSON } from "../../utils/dataReader.js";
import env from "../../config/env.config.js";
import {
  allureMeta,
  step,
  attachJSON,
  Severity,
  loginMeta,
} from "../../utils/allure.js";

/**
 * Positive Login Scenarios
 * ------------------------------------------------------------------
 * Valid users that ARE able to log in successfully and land on the
 * inventory (Products) page.
 */
const users = readJSON("users.json");

test.describe("Login - Positive @regression", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test("TC_LOGIN_VALID: valid standard user can log in @smoke", async ({
    loginPage,
    inventoryPage,
  }) => {
    await allureMeta(
      loginMeta({
        story: "Valid user can log in",
        severity: Severity.BLOCKER,
        tags: ["smoke", "regression"],
        description: [
          "### Objective",
          "Verify that a **standard user** can log in and land on the Products page.",
          "",
          "**Precondition:** SauceDemo is reachable.",
          "**Expected:** Products page is shown after login.",
        ].join("\n"),
        username: env.users.standard,
        environment: env.name,
        issueName: "AUTH-101",
        issueUrl: "https://jira.example.com/browse/AUTH-101",
        tmsName: "TC_LOGIN_VALID",
        tmsUrl: "https://testrail.example.com/cases/1001",
      }),
    );

    await step("Log in as standard user", async () => {
      await loginPage.login(env.users.standard, env.password);
    });

    await step("Verify inventory page is loaded", async () => {
      expect(await inventoryPage.isLoaded()).toBeTruthy();
      await expect(inventoryPage.pageTitle).toHaveText("Products");
    });

    await attachJSON("login-context", {
      username: env.users.standard,
      landingPage: "Products",
      environment: env.name,
    });
  });

  test("TC_LOGIN_PROBLEM: problem user can log in", async ({
    loginPage,
    inventoryPage,
  }) => {
    await allureMeta(
      loginMeta({
        story: "Problem user can log in (UI issues expected)",
        severity: Severity.NORMAL,
        tags: ["regression"],
        description:
          "The `problem_user` logs in successfully but has known UI/product defects.",
        username: users.problem.username,
        environment: env.name,
      }),
    );

    await step("Log in as problem user", async () => {
      await loginPage.login(users.problem.username, env.password);
    });

    await step("Verify inventory page is loaded", async () => {
      expect(await inventoryPage.isLoaded()).toBeTruthy();
    });
  });

  test("TC_LOGIN_PERF: performance glitch user can log in", async ({
    loginPage,
    inventoryPage,
  }) => {
    await allureMeta(
      loginMeta({
        story: "Performance glitch user can log in (with delay)",
        severity: Severity.MINOR,
        tags: ["regression", "performance"],
        description:
          "The `performance_glitch_user` logs in but with a deliberate delay.",
        username: users.performance.username,
        environment: env.name,
      }),
    );

    await step("Log in as performance glitch user", async () => {
      await loginPage.login(users.performance.username, env.password);
    });

    await step("Verify Products title is shown", async () => {
      await expect(inventoryPage.pageTitle).toHaveText("Products");
    });
  });
});
