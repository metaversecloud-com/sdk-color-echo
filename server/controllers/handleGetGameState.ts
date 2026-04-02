import { Request, Response } from "express";
import { errorHandler, getBadges, getCredentials, getDroppedAsset, getVisitorBadges, Visitor } from "@utils/index.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId } = credentials;
    const forceRefreshInventory = true; //req.query.forceRefreshInventory === "true";

    const [droppedAsset, badges] = await Promise.all([
      getDroppedAsset(credentials),
      getBadges(credentials, forceRefreshInventory),
    ]);

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor as any;

    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorBadges(visitor.inventoryItems);

    // Track gameOpens analytics
    await visitor
      .updateDataObject(
        {},
        {
          analytics: [{ analyticName: "gameOpens", profileId, urlSlug, uniqueKey: profileId }],
        },
      )
      .catch(() => console.warn("Failed to track gameOpens analytics"));

    const { leaderboard, ...config } = droppedAsset.dataObject;

    // Parse leaderboard into typed array
    const leaderboardEntries: {
      name: string;
      level: number;
      round: number;
      maxSequenceLength: number;
      profileId: string;
    }[] = [];
    if (leaderboard) {
      for (const pid in leaderboard) {
        const data = leaderboard[pid];
        const [displayName, level, round, maxSeqLen] = data.split("|");
        leaderboardEntries.push({
          name: displayName,
          level: parseInt(level) || 1,
          round: parseInt(round) || 1,
          maxSequenceLength: parseInt(maxSeqLen) || 0,
          profileId: pid,
        });
      }
    }

    leaderboardEntries.sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level;
      if (a.round !== b.round) return b.round - a.round;
      return b.maxSequenceLength - a.maxSequenceLength;
    });

    return res.json({
      success: true,
      isAdmin,
      config,
      badges,
      visitorInventory,
      leaderboard: leaderboardEntries,
      profileId,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error getting game state",
      req,
      res,
    });
  }
};
