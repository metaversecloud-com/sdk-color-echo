// Admin settings: who may change them, what the form saves, and when the leaderboard resets.
import { expect, test } from "../../fixtures";
import { FAST_CONFIG, leaderboardOf } from "./colorEcho";

const BOARD = { other: "Ada|3|2|6" };

const openSettings = async (page: import("@playwright/test").Page) => {
  await page.locator("button.icon-with-rounded-border").click();
  await expect(page.getByRole("button", { name: "Save Settings" })).toBeVisible();
};

test("a player who isn't an admin can't change the settings", async ({ request, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, leaderboard: BOARD }, isAdmin: false });

  const response = await request.put(world.api("/update-config"), {
    data: { maxColors: 4, lives: 5, speed: "slow", particlesEnabled: false },
  });

  expect(response.status()).toBe(403);
  expect((await response.json()).message).toBe("Admin access required");
  expect(await world.assetData()).toEqual({ ...FAST_CONFIG, leaderboard: BOARD });
});

test("the settings form shows the current settings", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, maxColors: 5, lives: 0, particlesEnabled: false }, isAdmin: true });
  await page.goto(world.url("/"));

  await openSettings(page);

  const selects = page.locator("select");
  await expect(selects.nth(0)).toHaveValue("5");
  await expect(selects.nth(1)).toHaveValue("0");
  await expect(selects.nth(2)).toHaveValue("fast");
  await expect(page.getByRole("checkbox", { name: "Enable Particle Effects" })).not.toBeChecked();
});

test("changing the difficulty saves it, resets the leaderboard and logs the new settings", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, leaderboard: BOARD }, isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.locator("select").nth(0).selectOption("4");
  await page.locator("select").nth(1).selectOption("5");
  await page.locator("select").nth(2).selectOption("slow");
  await page.getByRole("button", { name: "Save Settings" }).click();

  await expect(page.getByText("Settings saved. Leaderboard has been reset.")).toBeVisible();
  expect(await world.assetData()).toEqual({
    maxColors: 4,
    lives: 5,
    speed: "slow",
    particlesEnabled: true,
    leaderboard: {},
  });
  const analytics = (await world.events("analytics")).map((e) => e.analyticName);
  expect(analytics).toContain("admin4MaxColors");
  expect(analytics).toContain("admin5Lives");

  // Back in the game, the board is empty.
  await page.locator("button.icon-with-rounded-border").click();
  await page.getByRole("button", { name: "Leaderboard" }).click();
  await expect(page.getByText("No results yet. Be the first to play!")).toBeVisible();
});

test("changing only particle effects keeps the leaderboard", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, leaderboard: BOARD }, isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.getByRole("checkbox", { name: "Enable Particle Effects" }).uncheck();
  await page.getByRole("button", { name: "Save Settings" }).click();

  await expect(page.getByText("Settings saved.", { exact: true })).toBeVisible();
  expect(await world.assetData()).toEqual({ ...FAST_CONFIG, particlesEnabled: false, leaderboard: BOARD });
  expect((await world.events("analytics")).map((e) => e.analyticName)).not.toContain("admin6MaxColors");
});

test("a new game uses the saved settings", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG, isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);
  await page.locator("select").nth(1).selectOption("5");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText(/Settings saved/)).toBeVisible();

  await page.locator("button.icon-with-rounded-border").click();
  await page.getByRole("button", { name: "Start Game" }).click();

  await expect(page.locator(".lives-display .heart")).toHaveCount(5);
});

test("settings a game can't be played with are rejected", async ({ request, world }) => {
  test.fail(true, "EXP-457 #4: update-config stores any values, e.g. 0 colors leaves no buttons to press");
  await world.seed({ assetData: { ...FAST_CONFIG, leaderboard: BOARD }, isAdmin: true });

  const response = await request.put(world.api("/update-config"), {
    data: { maxColors: 0, lives: -5, speed: "warp", particlesEnabled: "yes" },
  });

  expect(response.ok()).toBe(false);
  expect(await world.assetData()).toEqual({ ...FAST_CONFIG, leaderboard: BOARD });
  expect(await leaderboardOf(request, world)).toHaveLength(1);
});
