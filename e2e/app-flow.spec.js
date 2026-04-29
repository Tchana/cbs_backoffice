import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL || "";
const password = process.env.E2E_PASSWORD || "";

async function login(page) {
  await page.goto("/login");
  await page.locator('input[placeholder="Email"]:visible').fill(email);
  await page.locator('input[placeholder="Password"]:visible').fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/(overview|course)/);
}

test.describe("Backoffice end-to-end flow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run e2e.");
    await login(page);
  });

  test("can navigate all major sections", async ({ page }) => {
    const links = [
      "Courses",
      "Lessons",
      "Books",
      "Blogs",
      "Announcements",
      "Forum",
      "Account Info",
    ];

    for (const linkText of links) {
      await page.getByRole("link", { name: linkText }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        new RegExp(linkText, "i")
      );
    }
  });

  test("forum page loads rooms and composer", async ({ page }) => {
    await page.getByRole("link", { name: "Forum" }).click();
    await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
    await expect(page.getByText("Rooms")).toBeVisible();
    await expect(
      page.locator('textarea[placeholder*="message"], textarea[placeholder*="Select a room"]')
    ).toBeVisible();
  });

  test("announcements page opens creation and list sections", async ({ page }) => {
    await page.getByRole("link", { name: "Announcements" }).click();
    await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create announcement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent announcements" })).toBeVisible();
  });

  test("courses page can open create-course modal", async ({ page }) => {
    await page.getByRole("link", { name: "Courses" }).click();
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();
    const addButton = page.locator("button.text-indigo-400").first();
    await addButton.click();
    await expect(page.getByRole("heading", { name: "Create New Course" })).toBeVisible();
  });
});

