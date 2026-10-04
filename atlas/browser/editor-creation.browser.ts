import { expect, test } from "@playwright/test";

test("creator can create generated terrain and preserve it through guarded replacement", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on(
    "console",
    (message) =>
      message.type() === "error" && runtimeErrors.push(message.text()),
  );
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/editor");
  await expect(
    page.getByRole("heading", { name: "Create a terrain session" }),
  ).toBeVisible();
  await expect(page.getByLabel("Seed")).toHaveValue("atlas");
  await expect(page.getByLabel("Sea level")).toHaveValue("50");
  await page.screenshot({
    path: "/tmp/editor-creation-desktop.png",
    fullPage: true,
  });

  await page.getByRole("radio", { name: "Generated terrain" }).check();
  await page.getByLabel("Seed").fill("  copper coast  ");
  await expect(page.locator(".effective-seed")).toHaveText(
    "Effective seed: copper coast",
  );
  await page.getByRole("button", { name: "Create Map" }).click();

  await expect(
    page.getByRole("heading", { name: "Terrain editor" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("[data-generation-state=ready]")).toBeVisible();
  await expect(page.getByText("copper coast", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-atlas-navigation", "enabled");
  await expect(canvas).toHaveAttribute("data-atlas-ready", "ready");
  await expect(canvas).toHaveAttribute("data-atlas-pan-tool", "on");
  const panButton = page.getByRole("button", { name: "Pan" });
  await panButton.click();
  await expect(panButton).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Pan off", { exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute("data-atlas-pan-tool", "off");
  await panButton.click();
  await expect(panButton).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveAttribute("data-atlas-pan-tool", "on");
  const generationEvidence = await page.evaluate(() => ({
    generationCount: performance.getEntriesByName("atlas:generation").length,
    failedCount: performance.getEntriesByName("atlas:generation-failed").length,
    state: document
      .querySelector(".atlas-editor")
      ?.getAttribute("data-generation-state"),
    seed: document
      .querySelector(".atlas-editor")
      ?.getAttribute("data-generation-seed"),
  }));
  expect(generationEvidence).toEqual({
    generationCount: 1,
    failedCount: 0,
    state: "ready",
    seed: "copper coast",
  });

  await page.getByRole("button", { name: "Start new Map" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Discard session and start new Map",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/current session remains/i)).toBeVisible();
  const dialogSeed = dialog.locator("[data-dialog-initial-focus]");
  await expect(dialogSeed).toBeFocused();
  const dialogClose = dialog.getByRole("button", { name: "Close dialog" });
  const replacementSubmit = dialog.getByRole("button", {
    name: /Discard current session/,
  });
  await dialogClose.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(replacementSubmit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialogClose).toBeFocused();
  await page.screenshot({
    path: "/tmp/editor-creation-dialog.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Start new Map" }),
  ).toBeFocused();
  await expect(page.getByText("copper coast", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Start new Map" }).click();
  const replacementDialog = page.getByRole("dialog", {
    name: "Discard session and start new Map",
  });
  await replacementDialog
    .getByRole("button", { name: /Discard current session/ })
    .click();
  await expect(replacementDialog).toBeHidden();
  await expect(page.getByText("copper coast", { exact: true })).toBeVisible();
  await expect(page.locator("[data-generation-state=ready]")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("copper coast", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Terrain editor" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/editor-creation-mobile.png",
    fullPage: true,
  });

  expect(runtimeErrors).toEqual([]);
});
