// PUT /api/end-game: the personal-best leaderboard, analytics, badges and the level-up particle.
import { forgeDisplayName } from "../../helpers/leaderboardForgery";
import { expect, test } from "../../fixtures";
import { FAST_CONFIG, FIRST_ROUND_LOSS, leaderboardOf, Stats } from "./colorEcho";

const endGame = (request: import("@playwright/test").APIRequestContext, url: string, stats: Stats) =>
  request.put(url, { data: stats });

const stats = (overrides: Partial<Stats>): Stats => ({ ...FIRST_ROUND_LOSS, ...overrides });

test("stores the result and logs the game end and every level reached", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG });

  const response = await endGame(request, world.api("/end-game"), stats({ level: 3, round: 2, maxSequenceLength: 5 }));

  expect(response.ok()).toBe(true);
  expect((await world.assetData()).leaderboard).toEqual({ [world.profileId]: "E2E Player|3|2|5" });
  const analytics = (await world.events("analytics")).map((e) => e.analyticName);
  expect(analytics.sort()).toEqual(["gameEnds", "level2Reached", "level3Reached"]);
  expect(await world.events("analytics")).toContainEqual(
    expect.objectContaining({ analyticName: "level3Reached", profileId: world.profileId, uniqueKey: world.profileId }),
  );
});

test("keeps the player's better earlier result", async ({ request, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, leaderboard: { [world.profileId]: "E2E Player|2|3|5" } } });

  for (const worse of [
    stats({ level: 1, round: 5, maxSequenceLength: 9 }),
    stats({ level: 2, round: 2 }),
    stats({ level: 2, round: 3, maxSequenceLength: 5 }),
  ]) {
    expect((await endGame(request, world.api("/end-game"), worse)).ok()).toBe(true);
  }

  expect((await world.assetData()).leaderboard).toEqual({ [world.profileId]: "E2E Player|2|3|5" });
  // The game end still counts.
  expect((await world.events("analytics")).filter((e) => e.analyticName === "gameEnds")).toHaveLength(3);
});

test("replaces the player's result when the new one is better, leaving others alone", async ({ request, world }) => {
  await world.seed({
    assetData: { ...FAST_CONFIG, leaderboard: { other: "Ada|9|1|10", [world.profileId]: "E2E Player|2|3|5" } },
  });

  await endGame(request, world.api("/end-game"), stats({ level: 2, round: 3, maxSequenceLength: 6 }));

  expect((await world.assetData()).leaderboard).toEqual({ other: "Ada|9|1|10", [world.profileId]: "E2E Player|2|3|6" });
});

test("awards the badges the result qualifies for, with a toast each", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG });

  const response = await endGame(
    request,
    world.api("/end-game"),
    stats({ level: 4, round: 1, maxSequenceLength: 8, consecutiveCorrectRounds: 5, colorsUnlocked: 5 }),
  );

  const earned = ["Memory Builder", "Pattern Player", "Mind in Motion", "Rising Star"];
  expect((await world.events("grant-item")).map((e) => e.name).sort()).toEqual([...earned].sort());
  await expect
    .poll(async () => (await world.events("fire-toast")).map((e) => e.text).sort())
    .toEqual(earned.map((name) => `You earned the ${name} badge!`).sort());
  expect(Object.keys((await response.json()).visitorInventory.badges).sort()).toEqual([...earned].sort());
});

test("awards the top badges for the longest sequences and levels", async ({ request, world }) => {
  await world.seed({ assetData: { ...FAST_CONFIG, maxColors: 4 } });

  await endGame(
    request,
    world.api("/end-game"),
    stats({ level: 6, round: 3, maxSequenceLength: 12, consecutiveCorrectRounds: 2, colorsUnlocked: 4 }),
  );

  expect((await world.events("grant-item")).map((e) => e.name).sort()).toEqual(
    [
      "Memory Builder",
      "Mind in Motion",
      "Rising Star",
      "Color Master",
      "Echo Expert",
      "Unbreakable Pattern",
      "Legendary Memory",
    ].sort(),
  );
});

test("doesn't award a badge the player already has", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG, badges: ["Memory Builder"] });

  const response = await endGame(request, world.api("/end-game"), stats({ level: 2, maxSequenceLength: 4 }));

  expect(response.ok()).toBe(true);
  expect(await world.events("grant-item")).toEqual([]);
  await request.get(world.api("/game-state"));
  expect(await world.events("fire-toast")).toEqual([]);
});

test("a result below every threshold awards nothing", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG });

  await endGame(
    request,
    world.api("/end-game"),
    stats({ level: 3, round: 5, maxSequenceLength: 3, consecutiveCorrectRounds: 4, colorsUnlocked: 4 }),
  );

  expect(await world.events("grant-item")).toEqual([]);
});

test("a failed badge grant doesn't lose the result", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG, failures: { "grant-visitor-inventory-item": 500 } });

  const response = await endGame(request, world.api("/end-game"), stats({ level: 2, maxSequenceLength: 4 }));

  expect(response.ok()).toBe(true);
  expect(await world.events("injected-failure")).toContainEqual(expect.objectContaining({ status: 500 }));
  expect((await world.assetData()).leaderboard[world.profileId]).toBe("E2E Player|2|1|4");
  expect((await response.json()).visitorInventory.badges).toEqual({});
});

test("fires a firework on the player after a level-up when particles are on", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG });

  await endGame(request, world.api("/end-game"), stats({ level: 2 }));

  await expect
    .poll(() => world.events("particles"))
    .toContainEqual(expect.objectContaining({ particleName: "Firework", followPlayerId: 42 }));
});

test("no firework in level 1 or when particles are off", async ({ request, world }) => {
  await world.seed({ assetData: FAST_CONFIG });
  await endGame(request, world.api("/end-game"), stats({ level: 1 }));
  await world.seed({ assetData: { ...FAST_CONFIG, particlesEnabled: false } });
  await endGame(request, world.api("/end-game"), stats({ level: 3 }));
  // The particle is fired without waiting for it; a later request gives it time to land.
  await request.get(world.api("/game-state"));

  expect(await world.events("particles")).toEqual([]);
});

test("a player can't post a result the game never produced", async ({ request, world }) => {
  test.fail(true, "EXP-457 #1: end-game trusts the client's stats, so any player can claim any level and every badge");
  await world.seed({ assetData: FAST_CONFIG });
  await request.put(world.api("/start-game"));

  // Seconds after starting, claim level 12: minutes of play the server never saw.
  await endGame(
    request,
    world.api("/end-game"),
    stats({ level: 12, round: 5, maxSequenceLength: 18, consecutiveCorrectRounds: 60, colorsUnlocked: 6 }),
  );

  expect(await world.events("grant-item")).toEqual([]);
  expect(
    (await leaderboardOf(request, world)).find((row) => row.profileId === world.profileId)?.level ?? 0,
  ).toBeLessThan(12);
});

test("a display name with '|' can't forge the leaderboard row", async ({ request, world }) => {
  test.fail(true, "EXP-457 #2: display name 'Mallory|99|5|20' is read back as level 99");
  await world.seed({ assetData: FAST_CONFIG });
  const forged = await forgeDisplayName(world, [99, 5, 20]);

  await endGame(request, world.api("/end-game", forged), FIRST_ROUND_LOSS);

  const row = (await leaderboardOf(request, world)).find((r) => r.profileId === world.profileId);
  expect(row).toMatchObject({ level: 1, round: 1, maxSequenceLength: 0 });
});
