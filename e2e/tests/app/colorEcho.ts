// Color Echo helpers shared by the app specs.
import { Page } from "@playwright/test";
import { expect, TopiaWorld } from "../../fixtures";

/** The asset's data object as the app initializes it (server/types/DroppedAssetTypes.ts DEFAULT_CONFIG). */
export const DEFAULT_CONFIG = { maxColors: 6, lives: 3, speed: "progressive", particlesEnabled: true, leaderboard: {} };

/** A config that plays sequences fast, so driven games stay short. */
export const FAST_CONFIG = { ...DEFAULT_CONFIG, speed: "fast" };

export type Stats = {
  level: number;
  round: number;
  maxSequenceLength: number;
  consecutiveCorrectRounds: number;
  colorsUnlocked: number;
};

/** Stats of a game that ended in level 1, round 1, without completing a round. */
export const FIRST_ROUND_LOSS: Stats = {
  level: 1,
  round: 1,
  maxSequenceLength: 0,
  consecutiveCorrectRounds: 0,
  colorsUnlocked: 2,
};

/**
 * Opens the game with a controllable clock and a fixed Math.random, so every sequence is the same color
 * (0 = Red, the first button) and the test fast-forwards through the pattern playback.
 */
export async function openGame(page: Page, world: TopiaWorld, credentials: Record<string, string> = {}) {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.clock.install();
  await page.goto(world.url("/", credentials));
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
}

export const turnPrompt = (page: Page) => page.getByText("Your turn! Repeat the pattern.");
export const progress = (page: Page) => page.locator("p").filter({ hasText: /^\d+\/\d+$/ });
export const hearts = (page: Page) => page.locator(".lives-display .heart");
export const lostHearts = (page: Page) => page.locator(".lives-display .heart.lost");

/** Advances the page clock until it's the player's turn (the sequence finished playing). */
export async function untilTurn(page: Page) {
  for (let i = 0; i < 200; i++) {
    // After a mistake the prompt stays up during the 1s flash (EXP-457 #3); the turn starts after the replay.
    if ((await turnPrompt(page).isVisible()) && (await page.locator(".error-flash").count()) === 0) return;
    await page.clock.runFor(100);
  }
  throw new Error("the player's turn never came");
}

/** Plays the current round correctly (every step is Red with the fixed Math.random). */
export async function playRound(page: Page) {
  await untilTurn(page);
  const [, total] = (await progress(page).innerText()).split("/").map(Number);
  for (let i = 0; i < total; i++) await page.getByRole("button", { name: "Red" }).click();
}

/** Leaderboard rows as GET /game-state returns them. */
export async function leaderboardOf(request: import("@playwright/test").APIRequestContext, world: TopiaWorld) {
  const response = await request.get(world.api("/game-state"));
  expect(response.ok()).toBe(true);
  return (await response.json()).leaderboard as Array<{
    name: string;
    level: number;
    round: number;
    maxSequenceLength: number;
    profileId: string;
  }>;
}
