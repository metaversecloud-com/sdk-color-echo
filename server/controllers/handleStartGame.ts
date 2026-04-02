import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "@utils/index.js";

export const handleStartGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId } = credentials;

    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    await visitor
      .updateDataObject(
        {},
        {
          analytics: [{ analyticName: "gameStarts", profileId, urlSlug, uniqueKey: profileId }],
        },
      )
      .catch(() => console.warn("Failed to track gameStarts analytics"));

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleStartGame",
      message: "Error starting game",
      req,
      res,
    });
  }
};
