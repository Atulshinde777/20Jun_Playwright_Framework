import { test, expect } from "@playwright/test";
import env from "../../config/env.config.js";
import { MESSAGES, TITLES } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";
import LoginPage from "../../pages/LoginPage.js";
import InventoryPage from "../../pages/InventoryPage.js";
import CheckoutPage from "../../pages/CheckoutPage.js";
import CartPage from "../../pages/cartPage.js";

const productName = "Sauce Labs Backpack";

// Flow: log in, add the backpack to the cart, and open checkout step one.
// Validation: continuing with all customer fields empty shows the required first-name error.
test("checkout validates required customer information", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  await loginPage.open();
  await loginPage.login(env.username, env.password);
  await inventoryPage.addProductToCart(productName);
  await inventoryPage.goToCart();
  await cartPage.proceedToCheckout();
  await checkoutPage.continue();
  await expect(checkoutPage.errorMessage).toHaveText(
    MESSAGES.FIRST_NAME_REQUIRED,
  );
  logger.info("Verified checkout validation for missing first name");
});

// Flow: log in, add the backpack to the cart, enter customer details, and continue to checkout overview.
// Validation: the overview page title is displayed and the calculated order total is greater than zero.
test("checkout accepts customer information and opens the overview", async ({
  page,
}) => {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  await loginPage.open();
  await loginPage.login(env.users.standard, env.password);
  await inventoryPage.addProductToCart(productName);
  await inventoryPage.goToCart();
  await cartPage.proceedToCheckout();
  await checkoutPage.fillCustomerInfo("Ranjeet", "Kendre", "411001");
  await checkoutPage.continue();
  await expect(checkoutPage.pageTitle).toHaveText(TITLES.CHECKOUT_OVERVIEW);
  expect(await checkoutPage.getTotal()).toBeGreaterThan(0);
  logger.info("Verified checkout overview and order total");
});
