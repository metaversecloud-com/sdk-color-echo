// Playing the game in the drawer: sequences, lives, level-ups and the result the client submits.
import { expect, test } from "../../fixtures";
import { FAST_CONFIG, hearts, lostHearts, openGame, playRound, progress, turnPrompt, untilTurn } from "./colorEcho";

test("plays the pattern, takes the player's input and moves to the next round", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);

  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(page.getByText("Level 1 · Round 1/5")).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByText("Watch the pattern...")).toBeVisible();
  // Level 1 has two colors; the buttons stay disabled while the pattern plays.
  await expect(page.locator(".game-button")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Red" })).toBeDisabled();
  await expect(page.locator(".game-button.color-0.active")).toBeVisible();

  await untilTurn(page);
  await expect(progress(page)).toHaveText("0/2");
  await page.getByRole("button", { name: "Red" }).click();
  await expect(progress(page)).toHaveText("1/2");
  await page.getByRole("button", { name: "Red" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();

  await untilTurn(page);
  await expect(page.getByText("Level 1 · Round 2/5")).toBeVisible();
  await expect(progress(page)).toHaveText("0/3");
});

test("records a game start when the player starts", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);

  await page.getByRole("button", { name: "Start Game" }).click();

  await expect.poll(async () => (await world.events("analytics")).map((e) => e.analyticName)).toContain("gameStarts");
  expect(await world.events("analytics")).toContainEqual(
    expect.objectContaining({ analyticName: "gameStarts", profileId: world.profileId, uniqueKey: world.profileId }),
  );
});

test("a wrong color costs a life and replays the same pattern", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await untilTurn(page);
  await expect(hearts(page)).toHaveCount(3);
  // Stop the clock so the 1s flash can't end on its own before it's checked (a loaded machine is that slow).
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));

  await page.getByRole("button", { name: "Blue" }).click();

  await expect(lostHearts(page)).toHaveCount(1);
  await expect(page.locator(".game-board-container.error-flash")).toBeVisible();
  await untilTurn(page);
  await expect(page.getByText("Level 1 · Round 1/5")).toBeVisible();
  await expect(progress(page)).toHaveText("0/2");
  await expect(lostHearts(page)).toHaveCount(1);
});

test("a second press during the mistake flash doesn't cost another life", async ({ page, world }) => {
  test.fail(
    true,
    "EXP-457 #3: buttons stay enabled for 1s after a mistake, so a quick second press costs another life",
  );
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await untilTurn(page);

  await page.getByRole("button", { name: "Blue" }).click();
  // The board shakes during the flash; a player's click lands anyway.
  await page.getByRole("button", { name: "Blue" }).click({ force: true });

  await expect(lostHearts(page)).toHaveCount(1);
});

test("losing the last life ends the game and submits the result", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await playRound(page);

  for (let i = 0; i < 3; i++) {
    await untilTurn(page);
    await page.getByRole("button", { name: "Blue" }).click();
  }

  await expect(page.getByText("Game Over!")).toBeVisible();
  await expect(page.getByText("You reached Level 1, Round 2")).toBeVisible();
  await expect(page.getByText("Max sequence length: 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "End Game" })).toHaveCount(0);
  await expect
    .poll(async () => (await world.assetData()).leaderboard)
    .toEqual({ [world.profileId]: "E2E Player|1|2|2" });
});

test("with the 1 Life setting the first mistake ends the game", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, lives: 0 } });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await untilTurn(page);
  await expect(hearts(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Blue" }).click();

  await expect(page.getByText("Game Over!")).toBeVisible();
  await expect
    .poll(async () => (await world.assetData()).leaderboard)
    .toEqual({ [world.profileId]: "E2E Player|1|1|0" });
});

test("five correct rounds level up and unlock a new color", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();

  for (let round = 1; round <= 5; round++) await playRound(page);

  await expect(page.getByRole("heading", { name: "Level 2 Unlocked!" })).toBeVisible();
  await expect(page.getByText("New color unlocked: Green!")).toBeVisible();
  await expect(page.getByText("You now have 3 colors in play.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await untilTurn(page);
  await expect(page.getByText("Level 2 · Round 1/5")).toBeVisible();
  await expect(page.locator(".game-button")).toHaveCount(3);
  // Level 2, round 1: level + floor(round / 2) + 1 colors to repeat.
  await expect(progress(page)).toHaveText("0/3");
});

test("End Game submits the progress so far and returns to the start screen", async ({ page, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await playRound(page);
  await playRound(page);
  await untilTurn(page);

  await page.getByRole("button", { name: "End Game" }).click();

  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  // Rounds 1 and 2 had 2 and 3 colors; the player was on round 3.
  await expect
    .poll(async () => (await world.assetData()).leaderboard)
    .toEqual({ [world.profileId]: "E2E Player|1|3|3" });
  expect(await world.events("analytics")).toContainEqual(
    expect.objectContaining({ analyticName: "gameEnds", profileId: world.profileId }),
  );
});

test("Play Again starts a fresh game with full lives", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, lives: 0 } });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await untilTurn(page);
  await page.getByRole("button", { name: "Blue" }).click();
  await expect(page.getByText("Game Over!")).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();

  await untilTurn(page);
  await expect(page.getByText("Level 1 · Round 1/5")).toBeVisible();
  await expect(progress(page)).toHaveText("0/2");
  await expect
    .poll(async () => (await world.events("analytics")).filter((e) => e.analyticName === "gameStarts").length)
    .toBe(2);
});

test("the leaderboard tab shows the player's result after the game", async ({ page, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, lives: 0 } });
  await openGame(page, world);
  await page.getByRole("button", { name: "Start Game" }).click();
  await playRound(page);
  await untilTurn(page);
  await page.getByRole("button", { name: "Blue" }).click();
  await expect(page.getByText("Game Over!")).toBeVisible();
  await expect.poll(async () => (await world.assetData()).leaderboard?.[world.profileId]).toBeTruthy();

  await page.getByRole("button", { name: "Leaderboard" }).click();

  await expect(page.getByText("Rank: #1 · Level 1, Round 2")).toBeVisible();
  await expect(page.getByRole("row", { name: "1 E2E Player 1 2" })).toBeVisible();
});
