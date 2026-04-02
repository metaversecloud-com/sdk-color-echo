export type SpeedMode = "slow" | "medium" | "fast" | "progressive";

export interface GameConfig {
  maxColors: number;
  lives: number;
  speed: SpeedMode;
  particlesEnabled: boolean;
}

export type BadgeType = {
  id: string;
  name: string;
  icon: string;
  description?: string;
};

export type VisitorBadgeType = {
  id: string;
  name: string;
  icon: string;
};

export type VisitorInventoryType = {
  badges: { [name: string]: VisitorBadgeType };
};

export type LeaderboardEntryType = {
  name: string;
  level: number;
  round: number;
  maxSequenceLength: number;
  profileId: string;
};
