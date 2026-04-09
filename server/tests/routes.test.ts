const topiaMock = require("../mocks/@rtsdk/topia").__mock;

import express from "express";
import request from "supertest";

import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
  profileId: "profile-123",
  displayName: "TestUser",
  sceneDropId: "scene-123",
};

const mockDroppedAsset = {
  id: "dropped-asset-123",
  position: { x: 100, y: 200 },
  dataObject: {
    maxColors: 6,
    lives: 3,
    speed: "progressive",
    particlesEnabled: true,
    leaderboard: {},
  },
  fetchDataObject: jest.fn().mockResolvedValue({}),
  updateDataObject: jest.fn().mockResolvedValue({}),
  setDataObject: jest.fn().mockResolvedValue({}),
};

const mockVisitor = {
  isAdmin: true,
  id: 1,
  inventoryItems: [],
  fetchInventoryItems: jest.fn().mockResolvedValue([]),
  updateDataObject: jest.fn().mockResolvedValue({}),
  grantInventoryItem: jest.fn().mockResolvedValue({}),
  fireToast: jest.fn().mockResolvedValue({}),
};

const mockWorld = {
  triggerParticle: jest.fn().mockResolvedValue({}),
  fireToast: jest.fn().mockResolvedValue({}),
};

jest.mock("@utils/index.js", () => ({
  errorHandler: jest.fn(({ res }: any) => {
    if (res) return res.status(500).json({ success: false, error: "Error" });
    return { error: "Error" };
  }),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  getBadges: jest.fn(),
  getVisitorBadges: jest.fn(),
  awardBadge: jest.fn(),
  getCachedInventoryItems: jest.fn(),
  Visitor: {
    get: jest.fn(),
    create: jest.fn(),
  },
  World: {
    create: jest.fn(),
  },
  DroppedAsset: {
    get: jest.fn(),
  },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

describe("routes", () => {
  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();

    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.getDroppedAsset.mockResolvedValue(mockDroppedAsset);
    mockUtils.getBadges.mockResolvedValue({});
    mockUtils.getVisitorBadges.mockReturnValue({ badges: {} });
    mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
    mockUtils.Visitor.create.mockResolvedValue(mockVisitor);
    mockUtils.World.create.mockReturnValue(mockWorld);
    mockUtils.DroppedAsset.get.mockResolvedValue(mockDroppedAsset);
    mockUtils.awardBadge.mockResolvedValue({ success: true });
    mockUtils.getCachedInventoryItems.mockResolvedValue([]);
  });

  test("GET /system/health returns status OK", async () => {
    const app = makeApp();
    const res = await request(app).get("/api/system/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
    expect(res.body).toHaveProperty("envs");
  });

  test("GET /game-state returns config, badges, leaderboard, and admin status", async () => {
    const app = makeApp();
    const res = await request(app).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("isAdmin", true);
    expect(res.body).toHaveProperty("config");
    expect(res.body.config).toEqual({
      maxColors: 6,
      lives: 3,
      speed: "progressive",
      particlesEnabled: true,
    });
    expect(res.body).toHaveProperty("badges");
    expect(res.body).toHaveProperty("visitorInventory");
    expect(res.body).toHaveProperty("leaderboard");
    expect(res.body).toHaveProperty("profileId", "profile-123");

    expect(mockUtils.getCredentials).toHaveBeenCalled();
    expect(mockUtils.getDroppedAsset).toHaveBeenCalledWith(baseCreds);
    expect(mockUtils.getBadges).toHaveBeenCalledWith(baseCreds, false);
  });

  test("PUT /start-game tracks analytics", async () => {
    const app = makeApp();
    const res = await request(app).put("/api/start-game").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(mockUtils.Visitor.create).toHaveBeenCalledWith(
      baseCreds.visitorId,
      baseCreds.urlSlug,
      { credentials: baseCreds },
    );
  });

  test("PUT /end-game updates leaderboard and returns visitor inventory", async () => {
    const app = makeApp();
    const res = await request(app)
      .put("/api/end-game")
      .query(baseCreds)
      .send({
        level: 3,
        round: 4,
        maxSequenceLength: 6,
        consecutiveCorrectRounds: 8,
        colorsUnlocked: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("visitorInventory");
    expect(mockUtils.DroppedAsset.get).toHaveBeenCalledWith(
      baseCreds.assetId,
      baseCreds.urlSlug,
      { credentials: baseCreds },
    );
  });

  test("PUT /update-config saves settings and resets leaderboard on difficulty change", async () => {
    // Mock visitor as admin
    mockUtils.Visitor.get.mockResolvedValue({ ...mockVisitor, isAdmin: true });

    const app = makeApp();
    const res = await request(app)
      .put("/api/update-config")
      .query(baseCreds)
      .send({
        maxColors: 4,
        lives: 1,
        speed: "fast",
        particlesEnabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("leaderboardReset", true);
  });

  test("PUT /update-config rejects non-admin", async () => {
    mockUtils.Visitor.get.mockResolvedValue({ ...mockVisitor, isAdmin: false });

    const app = makeApp();
    const res = await request(app)
      .put("/api/update-config")
      .query(baseCreds)
      .send({
        maxColors: 4,
        lives: 1,
        speed: "fast",
        particlesEnabled: true,
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success", false);
  });
});
