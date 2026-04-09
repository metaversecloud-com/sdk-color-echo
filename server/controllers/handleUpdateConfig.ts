import { Request, Response } from "express";
import { DroppedAsset, errorHandler, getCredentials, Visitor } from "@utils/index.js";
import { ColorEchoDataObject, SpeedMode } from "../types/DroppedAssetTypes.js";
import { AnalyticType } from "@rtsdk/topia";

export const handleUpdateConfig = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;
    const { maxColors, lives, speed, particlesEnabled } = req.body as {
      maxColors: number;
      lives: number;
      speed: SpeedMode;
      particlesEnabled: boolean;
    };

    const visitor = (await Visitor.get(visitorId, urlSlug, { credentials })) as any;
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const droppedAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
    await droppedAsset.fetchDataObject();
    const dataObject = droppedAsset.dataObject as ColorEchoDataObject;

    // Check if difficulty-affecting settings changed (everything except particlesEnabled)
    const difficultyChanged =
      dataObject.maxColors !== maxColors || dataObject.lives !== lives || dataObject.speed !== speed;

    const updateData: Partial<ColorEchoDataObject> = {
      maxColors,
      lives,
      speed,
      particlesEnabled,
    };

    // Reset leaderboard if difficulty settings changed
    if (difficultyChanged) {
      updateData.leaderboard = {};
    }

    // Build analytics for admin config changes
    const analytics: AnalyticType[] = [];
    if (dataObject.maxColors !== maxColors) {
      analytics.push({ analyticName: `admin${maxColors}MaxColors`, urlSlug });
    }
    if (dataObject.lives !== lives) {
      analytics.push({ analyticName: `admin${lives}Lives`, urlSlug });
    }

    const lockId = `${assetId}-config-${new Date(Math.round(new Date().getTime() / 5000) * 5000)}`;

    await droppedAsset.updateDataObject(updateData, {
      lock: { lockId, releaseLock: true },
      ...(analytics.length > 0 ? { analytics } : {}),
    });

    return res.json({ success: true, leaderboardReset: difficultyChanged });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateConfig",
      message: "Error updating configuration",
      req,
      res,
    });
  }
};
