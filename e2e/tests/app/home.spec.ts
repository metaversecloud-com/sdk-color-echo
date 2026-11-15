// Opening the app: the game state it loads, the tabs, and what it writes to Topia on open.
import { expect, test } from "../../fixtures";
import { DEFAULT_CONFIG, FAST_CONFIG } from "./colorEcho";

test("opens on the start screen with the game, badges and leaderboard tabs", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await page.goto(world.url("/"));

  await expect(page.getByRole("img", { name: "Color Echo" })).toBeVisible();
  await expect(page.getByText("Watch the pattern, then repeat it from memory. How far can you go?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  for (const tab of ["Game", "Badges", "Leaderboard"])
    await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible();
});

test("sets up a new asset with the default settings and records the open", async ({ page, world }) => {
  await world.seed();
  await page.goto(world.url("/"));
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();

  expect(await world.assetData()).toEqual(DEFAULT_CONFIG);
  expect(await world.events("analytics")).toContainEqual(
    expect.objectContaining({ analyticName: "gameOpens", profileId: world.profileId, uniqueKey: world.profileId }),
  );
});

test("keeps the settings and results an asset already has", async ({ page, world }) => {
  const assetData = { ...FAST_CONFIG, maxColors: 4, leaderboard: { other: "Ada|3|2|6" } };
  await world.seed({ assetData });
  await page.goto(world.url("/"));
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();

  expect(await world.assetData()).toEqual(assetData);
});

test("the badges tab shows which badges the player has earned", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG, badges: ["Memory Builder"] });
  await page.goto(world.url("/"));

  await page.getByRole("button", { name: "Badges" }).click();

  const earned = page.getByRole("img", { name: "Memory Builder" });
  const notEarned = page.getByRole("img", { name: "Legendary Memory" });
  await expect(earned).toBeVisible();
  await expect(notEarned).toBeVisible();
  await expect(earned).not.toHaveAttribute("style", /grayscale/);
  await expect(notEarned).toHaveAttribute("style", /grayscale/);
});

test("the leaderboard ranks by level, then round, then longest sequence", async ({ page, world }) => {
  await world.seed({
    assetData: {
      ...FAST_CONFIG,
      leaderboard: {
        a: "Ada|2|5|6",
        b: "Bo|3|1|4",
        c: "Cy|2|5|7",
        [world.profileId]: "E2E Player|2|4|9",
      },
    },
  });
  await page.goto(world.url("/"));

  await page.getByRole("button", { name: "Leaderboard" }).click();

  await expect(page.locator("tbody tr")).toHaveText([
    /^1\s*Bo\s*3\s*1$/,
    /^2\s*Cy\s*2\s*5$/,
    /^3\s*Ada\s*2\s*5$/,
    /^4\s*E2E Player\s*2\s*4$/,
  ]);
  await expect(page.getByText("Rank: #4 · Level 2, Round 4")).toBeVisible();
});

test("the leaderboard invites the first result when nobody has played", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await page.goto(world.url("/"));

  await page.getByRole("button", { name: "Leaderboard" }).click();

  await expect(page.getByText("No results yet. Be the first to play!")).toBeVisible();
  await expect(page.getByText(/My Best/)).toHaveCount(0);
});

test("only admins see the settings button", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG, isAdmin: false });
  await page.goto(world.url("/"));
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await expect(page.locator("button.icon-with-rounded-border")).toHaveCount(0);

  await world.seed({ assetData: FAST_CONFIG, isAdmin: true });
  await page.reload();
  await expect(page.locator("button.icon-with-rounded-border")).toBeVisible();
});

test("asks to open the app inside a Topia world when credentials are missing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Missing Interactive Parameters" })).toBeVisible();
});

test("shows an error when Topia fails to load the asset", async ({ page, world }) => {
  await world.seed({ failures: { [`GET /api/v1/world/${world.urlSlug}/assets/${world.assetId}`]: 500 } });
  await page.goto(world.url("/"));

  await expect(page.locator(".text-error")).toContainText("Error");
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
});
