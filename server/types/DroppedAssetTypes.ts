import { DroppedAssetInterface } from "@rtsdk/topia";
import { GameConfig } from "@shared/types/GameTypes.js";

export type { SpeedMode, GameConfig } from "@shared/types/GameTypes.js";

export interface ColorEchoDataObject extends GameConfig {
  leaderboard: {
    [profileId: string]: string; // "displayName|level|round|maxSequenceLength"
  };
}

export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: ColorEchoDataObject;
}

export const DEFAULT_CONFIG: ColorEchoDataObject = {
  maxColors: 6,
  lives: 3,
  speed: "progressive",
  particlesEnabled: true,
  leaderboard: {},
};
