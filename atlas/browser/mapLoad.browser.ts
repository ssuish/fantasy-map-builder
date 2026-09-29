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
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(
    page.getByText("The Shattered Reach", { exact: true }),
  ).toBeVisible();
  expect((await manifestResponse).ok()).toBeTruthy();
  expect((await mapResponse).ok()).toBeTruthy();

  await expect
    .poll(
      async () => {
        const screenshot = await canvas.screenshot();
        return page.evaluate(async (pngBase64) => {
          const image = new Image();
          image.src = `data:image/png;base64,${pngBase64}`;
          await image.decode();

          const sampleCanvas = document.createElement("canvas");
          sampleCanvas.width = image.width;
          sampleCanvas.height = image.height;
          const context = sampleCanvas.getContext("2d");
          if (!context) return 0;
          context.drawImage(image, 0, 0);

          const samplePoints = [
            [0.15, 0.2],
            [0.3, 0.32],
            [0.48, 0.2],
            [0.62, 0.4],
            [0.78, 0.28],
            [0.25, 0.68],
            [0.52, 0.75],
            [0.82, 0.7],
          ];
          const colors = new Set<string>();
          for (const [relativeX, relativeY] of samplePoints) {
            const x = Math.min(
              image.width - 1,
              Math.floor(relativeX * image.width),
            );
            const y = Math.min(
              image.height - 1,
              Math.floor(relativeY * image.height),
            );
            colors.add([...context.getImageData(x, y, 1, 1).data].join(","));
          }
          return colors.size;
        }, screenshot.toString("base64"));
      },
      {
        message: "map canvas should contain rendered artwork",
        timeout: 10_000,
      },
    )
    .toBeGreaterThan(4);

  await expect(page.getByRole("button")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
