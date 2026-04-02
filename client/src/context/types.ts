import type {
  GameConfig,
  BadgeType,
  VisitorInventoryType,
  LeaderboardEntryType,
} from "@shared/types/GameTypes";

export type { SpeedMode, GameConfig, BadgeType, VisitorInventoryType, LeaderboardEntryType } from "@shared/types/GameTypes";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export interface InitialState {
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  config?: GameConfig;
  badges?: { [name: string]: BadgeType };
  visitorInventory?: VisitorInventoryType;
  leaderboard?: LeaderboardEntryType[];
  profileId?: string;
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState>;
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };
