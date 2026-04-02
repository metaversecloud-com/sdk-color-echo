import { useCallback, useRef, useState } from "react";
import { GameConfig } from "@/context/types";

export type GamePhase = "idle" | "playing-sequence" | "player-input" | "round-transition" | "level-up" | "game-over";

export interface GameState {
  phase: GamePhase;
  level: number;
  round: number;
  lives: number;
  maxLives: number;
  sequence: number[];
  playerInput: number[];
  activeButton: number | null;
  colorsAvailable: number;
  maxSequenceLength: number;
  consecutiveCorrectRounds: number;
  colorsUnlocked: number;
  errorFlash: boolean;
}

const ROUNDS_PER_LEVEL = 5;

const SPEED_MS: Record<string, number> = {
  slow: 800,
  medium: 500,
  fast: 300,
};

const getSequenceLength = (level: number, round: number): number => {
  return level + Math.floor(round / 2) + 1;
};

const getColorsAvailable = (level: number, maxColors: number): number => {
  return Math.min(level + 1, maxColors);
};

const getSpeedMs = (config: GameConfig, level: number, round: number): number => {
  if (config.speed !== "progressive") {
    return SPEED_MS[config.speed] || 500;
  }
  // Progressive: Level 1 = slow, Level 2+ = medium, R3 = fast
  if (level === 1) return SPEED_MS.slow;
  if (round === 3) return SPEED_MS.fast;
  return SPEED_MS.medium;
};

const generateSequence = (length: number, colorsAvailable: number): number[] => {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * colorsAvailable));
  }
  return seq;
};

const initialGameState: GameState = {
  phase: "idle",
  level: 1,
  round: 1,
  lives: 3,
  maxLives: 3,
  sequence: [],
  playerInput: [],
  activeButton: null,
  colorsAvailable: 2,
  maxSequenceLength: 0,
  consecutiveCorrectRounds: 0,
  colorsUnlocked: 2,
  errorFlash: false,
};

export const useGameLogic = (config: GameConfig | undefined) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playToneRef = useRef<((index: number, duration?: number) => void) | null>(null);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const setPlayTone = useCallback((fn: (index: number, duration?: number) => void) => {
    playToneRef.current = fn;
  }, []);

  const playSequence = useCallback(
    (sequence: number[], speedMs: number, onComplete: () => void) => {
      clearTimeouts();

      const gapMs = 200;
      const totalPerStep = speedMs + gapMs;

      sequence.forEach((colorIdx, i) => {
        // Activate button
        const activateTimeout = setTimeout(() => {
          setGameState((prev) => ({ ...prev, activeButton: colorIdx }));
          playToneRef.current?.(colorIdx, speedMs);
        }, i * totalPerStep);

        // Deactivate button
        const deactivateTimeout = setTimeout(() => {
          setGameState((prev) => ({ ...prev, activeButton: null }));
        }, i * totalPerStep + speedMs);

        timeoutsRef.current.push(activateTimeout, deactivateTimeout);
      });

      // After sequence completes
      const completeTimeout = setTimeout(onComplete, sequence.length * totalPerStep + 300);
      timeoutsRef.current.push(completeTimeout);
    },
    [clearTimeouts],
  );

  const startNewRound = useCallback(
    (level: number, round: number) => {
      if (!config) return;

      const colorsAvailable = getColorsAvailable(level, config.maxColors);
      const seqLength = getSequenceLength(level, round);
      const sequence = generateSequence(seqLength, colorsAvailable);
      const speedMs = getSpeedMs(config, level, round);

      setGameState((prev) => ({
        ...prev,
        phase: "playing-sequence",
        level,
        round,
        sequence,
        playerInput: [],
        activeButton: null,
        colorsAvailable,
        colorsUnlocked: Math.max(prev.colorsUnlocked, colorsAvailable),
        errorFlash: false,
      }));

      // Small delay before playing sequence
      const startTimeout = setTimeout(() => {
        playSequence(sequence, speedMs, () => {
          setGameState((prev) => ({ ...prev, phase: "player-input" }));
        });
      }, 600);
      timeoutsRef.current.push(startTimeout);
    },
    [config, playSequence],
  );

  const startGame = useCallback(() => {
    if (!config) return;

    clearTimeouts();

    const newState: GameState = {
      ...initialGameState,
      phase: "idle",
      lives: config.lives,
      maxLives: config.lives,
      colorsAvailable: getColorsAvailable(1, config.maxColors),
      colorsUnlocked: getColorsAvailable(1, config.maxColors),
    };
    setGameState(newState);

    // Start first round after brief delay
    setTimeout(() => startNewRound(1, 1), 300);
  }, [config, clearTimeouts, startNewRound]);

  const handleButtonPress = useCallback(
    (
      colorIndex: number,
      callbacks: {
        onRoundComplete?: () => void;
        onLevelUp?: (newLevel: number) => void;
        onGameOver?: (stats: { level: number; round: number; maxSequenceLength: number; consecutiveCorrectRounds: number; colorsUnlocked: number }) => void;
        onError?: () => void;
      },
    ) => {
      setGameState((prev) => {
        if (prev.phase !== "player-input") return prev;

        const newInput = [...prev.playerInput, colorIndex];
        const inputIndex = newInput.length - 1;

        // Check if the input is correct
        if (prev.sequence[inputIndex] !== colorIndex) {
          // Wrong input!
          const newLives = prev.lives - 1;

          if (newLives <= 0 || prev.maxLives === 0) {
            // Game over
            const stats = {
              level: prev.level,
              round: prev.round,
              maxSequenceLength: prev.maxSequenceLength,
              consecutiveCorrectRounds: prev.consecutiveCorrectRounds,
              colorsUnlocked: prev.colorsUnlocked,
            };
            setTimeout(() => callbacks.onGameOver?.(stats), 0);
            setTimeout(() => callbacks.onError?.(), 0);
            return { ...prev, phase: "game-over", lives: 0, playerInput: newInput, errorFlash: true };
          } else {
            // Lose a life, retry same sequence
            setTimeout(() => callbacks.onError?.(), 0);
            setTimeout(() => {
              setGameState((p) => ({ ...p, errorFlash: false }));
              // Replay the same sequence after a delay
              if (config) {
                const speedMs = getSpeedMs(config, prev.level, prev.round);
                setGameState((p) => ({
                  ...p,
                  phase: "playing-sequence",
                  playerInput: [],
                  activeButton: null,
                }));
                setTimeout(() => {
                  playSequence(prev.sequence, speedMs, () => {
                    setGameState((p) => ({ ...p, phase: "player-input" }));
                  });
                }, 600);
              }
            }, 1000);
            return { ...prev, lives: newLives, playerInput: newInput, errorFlash: true, consecutiveCorrectRounds: 0 };
          }
        }

        // Correct input
        if (newInput.length === prev.sequence.length) {
          // Round complete!
          const newMaxSeqLen = Math.max(prev.maxSequenceLength, prev.sequence.length);
          const newConsecutive = prev.consecutiveCorrectRounds + 1;

          const nextRound = prev.round + 1;
          const nextLevel = prev.level + (nextRound > ROUNDS_PER_LEVEL ? 1 : 0);

          if (nextRound > ROUNDS_PER_LEVEL) {
            // Level up!
            setTimeout(() => callbacks.onLevelUp?.(nextLevel), 0);
            return {
              ...prev,
              phase: "level-up",
              playerInput: newInput,
              maxSequenceLength: newMaxSeqLen,
              consecutiveCorrectRounds: newConsecutive,
              colorsUnlocked: Math.max(prev.colorsUnlocked, getColorsAvailable(nextLevel, config?.maxColors || 6)),
            };
          } else {
            // Next round
            setTimeout(() => callbacks.onRoundComplete?.(), 0);
            return {
              ...prev,
              phase: "round-transition",
              playerInput: newInput,
              maxSequenceLength: newMaxSeqLen,
              consecutiveCorrectRounds: newConsecutive,
            };
          }
        }

        return { ...prev, playerInput: newInput };
      });
    },
    [config, playSequence],
  );

  const proceedToNextRound = useCallback(() => {
    setGameState((prev) => {
      const nextRound = prev.round + 1;
      if (nextRound > ROUNDS_PER_LEVEL) {
        // This shouldn't happen here, but handle gracefully
        startNewRound(prev.level + 1, 1);
      } else {
        startNewRound(prev.level, nextRound);
      }
      return prev;
    });
  }, [startNewRound]);

  const proceedAfterLevelUp = useCallback(() => {
    setGameState((prev) => {
      startNewRound(prev.level + 1, 1);
      return prev;
    });
  }, [startNewRound]);

  const resetGame = useCallback(() => {
    clearTimeouts();
    setGameState(initialGameState);
  }, [clearTimeouts]);

  return {
    gameState,
    startGame,
    handleButtonPress,
    proceedToNextRound,
    proceedAfterLevelUp,
    resetGame,
    setPlayTone,
  };
};
