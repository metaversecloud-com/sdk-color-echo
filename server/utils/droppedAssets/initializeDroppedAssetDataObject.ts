import { IDroppedAsset, DEFAULT_CONFIG } from "../../types/DroppedAssetTypes.js";
import { standardizeError } from "../standardizeError.js";

export const initializeDroppedAssetDataObject = async (droppedAsset: IDroppedAsset) => {
  try {
    const data = droppedAsset?.dataObject;
    if (!data || data.maxColors === undefined) {
      const lockId = `${droppedAsset.id}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
      await droppedAsset
        .setDataObject(DEFAULT_CONFIG, { lock: { lockId, releaseLock: true } })
        .catch(() => console.warn("Unable to acquire lock, another process may be updating the data object"));
    }

    return;
  } catch (error: any) {
    throw standardizeError(error);
  }
};
