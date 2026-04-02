import { Request, Response } from "express";
import { awardBadge, DroppedAsset, errorHandler, getCredentials, getVisitorBadges, Visitor } from "@utils/index.js";
import { ColorEchoDataObject } from "../types/DroppedAssetTypes.js";
import { AnalyticType } from "@rtsdk/topia";

const BADGE_CONDITIONS: { name: string; check: (stats: GameEndStats) => boolean }[] = [
  { name: "Memory Builder", check: (s) => s.maxSequenceLength >= 4 },
  { name: "Pattern Player", check: (s) => s.consecutiveCorrectRounds >= 5 },
  { name: "Mind in Motion", check: (s) => s.maxSequenceLength >= 8 },
  { name: "Rising Star", check: (s) => s.level >= 4 },
  { name: "Color Master", check: (s) => s.colorsUnlocked >= s.maxColors },
  { name: "Echo Expert", check: (s) => s.level >= 6 },
  { name: "Unbreakable Pattern", check: (s) => s.maxSequenceLength >= 10 },
  { name: "Legendary Memory", check: (s) => s.maxSequenceLength >= 12 },
];

interface GameEndStats {
  level: number;
  round: number;
  maxSequenceLength: number;
  consecutiveCorrectRounds: number;
  colorsUnlocked: number;
  maxColors: number;
}

export const handleEndGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, displayName, profileId, urlSlug, visitorId } = credentials;
    const { level, round, maxSequenceLength, consecutiveCorrectRounds, colorsUnlocked } = req.body as GameEndStats;

    const droppedAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
    await droppedAsset.fetchDataObject();
    const dataObject = droppedAsset.dataObject as ColorEchoDataObject;
    const { maxColors, particlesEnabled } = dataObject;

    // Update leaderboard (personal best only)
    const existingEntry = dataObject.leaderboard?.[profileId];
    let shouldUpdate = true;

    if (existingEntry) {
      const [, oldLevel, oldRound, oldMaxSeq] = existingEntry.split("|");
      const oldL = parseInt(oldLevel) || 0;
      const oldR = parseInt(oldRound) || 0;
      const oldS = parseInt(oldMaxSeq) || 0;

      if (
        oldL > level ||
        (oldL === level && oldR > round) ||
        (oldL === level && oldR === round && oldS >= maxSequenceLength)
      ) {
        shouldUpdate = false;
      }
    }

    // Build analytics
    const analytics: AnalyticType[] = [{ analyticName: "gameEnds", profileId, urlSlug, uniqueKey: profileId }];

    for (let l = 2; l <= level; l++) {
      analytics.push({ analyticName: `level${l}Reached`, profileId, urlSlug, uniqueKey: profileId });
    }

    const lockId = `${assetId}-${new Date(Math.round(new Date().getTime() / 5000) * 5000)}`;

    if (shouldUpdate) {
      const resultString = `${displayName}|${level}|${round}|${maxSequenceLength}`;
      if (dataObject.leaderboard) {
        await droppedAsset.updateDataObject(
          { [`leaderboard.${profileId}`]: resultString },
          { lock: { lockId, releaseLock: true }, analytics },
        );
      } else {
        await droppedAsset.updateDataObject(
          { leaderboard: { [profileId]: resultString } },
          { lock: { lockId, releaseLock: true }, analytics },
        );
      }
    } else {
      await droppedAsset.updateDataObject({}, { lock: { lockId, releaseLock: true }, analytics });
    }

    // Award badges
    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });
    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorBadges(visitor.inventoryItems);

    const stats: GameEndStats = {
      level,
      round,
      maxSequenceLength,
      consecutiveCorrectRounds,
      colorsUnlocked,
      maxColors,
    };

    for (const badge of BADGE_CONDITIONS) {
      if (badge.check(stats)) {
        await awardBadge({ credentials, visitor, visitorInventory, badgeName: badge.name });
      }
    }

    // Trigger particle effect on level up
    if (particlesEnabled && level > 1) {
      visitor
        .triggerParticle({ name: "Firework", duration: 3 })
        .catch(() => console.warn("Failed to trigger particle effect"));
    }

    return res.json({ success: true, visitorInventory });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleEndGame",
      message: "Error ending game",
      req,
      res,
    });
  }
};
