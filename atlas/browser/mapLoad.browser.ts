import { expect, test } from "@playwright/test";

test("loads the manifest and renders the static map", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on(
    "console",
    (message) =>
      message.type() === "error" && runtimeErrors.push(message.text()),
  );
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  const manifestResponse = page.waitForResponse((response) =>
    response.url().endsWith("/maps/eldoria/manifest.json"),
  );
  const mapResponse = page.waitForResponse((response) =>
    response.url().endsWith("/maps/eldoria/world-map.svg"),
  );

  await page.goto("/");
  await expect(page).toHaveTitle("Atlas — Fantasy Map Builder");
  await expect(page.getByText("Phase 0 · Read-only map preview")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /The Shattered Reach/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByText("The Shattered Reach", { exact: true }),
  ).toBeVisible();
  expect((await manifestResponse).ok()).toBeTruthy();
  await expect(page.getByRole("button")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("canvas")).toBeVisible();
  expect((await mapResponse).ok()).toBeTruthy();
  expect(runtimeErrors).toEqual([]);
});
