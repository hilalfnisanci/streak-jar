import { expect, test } from "@playwright/test";
import { JARS_STORAGE_KEY, type JarStorage } from "../lib/storage";

// 01:00 on November 24 in Istanbul, but still November 23 in UTC.
const today = new Date("2026-11-23T22:00:00.000Z");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(today);
});

test("creates a jar, adds one marble for today, and keeps it on reload", async ({ page }) => {
  const name = "Daily reading";
  await page.goto("./");
  await page.getByRole("link", { name: "Create your first jar" }).click();

  await page.getByTitle("Mint", { exact: true }).click();
  await expect(page.getByRole("img", { name: "Mint jar preview" })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Target", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Create jar" }).click();

  const card = page.getByRole("link", { name: `Open ${name}`, exact: true });
  await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trophy Shelf" })).toHaveCount(0);
  await card.click();

  const jarHeading = page.getByRole("heading", { level: 1, name, exact: true });
  const oneMarble = page.getByText("1 / 5 marbles", { exact: true });
  const done = page.getByRole("button", { name: "Done for today ✓", exact: true });
  await expect(jarHeading).toBeVisible();
  await expect(page.getByText("0 / 5 marbles", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add today's marble" }).click();
  await expect(oneMarble).toBeVisible();
  await expect(done).toBeDisabled();

  await page.reload();
  await expect(jarHeading).toBeVisible();
  await expect(oneMarble).toBeVisible();
  await expect(done).toBeDisabled();
});

test.describe("a jar one marble away from its target", () => {
  const name = "Evening walks";
  const storage = {
    jars: [
      {
        id: "evening-walks",
        name,
        target: 5,
        color: "mint",
        createdAt: "2026-11-20T08:00:00.000Z",
        // Include local yesterday, which would block adding today if UTC were used.
        marbles: ["20", "21", "22", "23"].map((day) => ({
          date: `2026-11-${day}`,
          at: `2026-11-${day}T09:00:00.000Z`,
        })),
      },
    ],
    completed: [],
  } satisfies JarStorage;

  test.use({
    storageState: async ({ baseURL }, use) => {
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL("/", baseURL).origin,
            localStorage: [{ name: JARS_STORAGE_KEY, value: JSON.stringify(storage) }],
          },
        ],
      });
    },
  });

  test("celebrates completion and moves the jar to the Trophy Shelf", async ({ page }) => {
    await page.goto("./");

    const card = page.getByRole("link", { name: `Open ${name}`, exact: true });
    await card.click();
    await expect(page.getByText("4 / 5 marbles", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add today's marble" }).click();

    const celebration = page.getByRole("dialog", {
      name: `You finished your ${name} jar! 🎉`,
      exact: true,
    });
    await expect(celebration).toBeVisible();
    await celebration.getByRole("button", { name: "Pour into trophy shelf" }).click();
    await expect(celebration).toBeHidden();
    await page.getByRole("link", { name: "Back", exact: true }).click();

    // The shelf section has a visible heading but is not a named ARIA region.
    const shelf = page.getByRole("heading", { name: "Trophy Shelf", exact: true }).locator("..");
    await expect(shelf.locator(card)).toContainText("5 / 5");
    await expect(card).toHaveCount(1);
  });
});
