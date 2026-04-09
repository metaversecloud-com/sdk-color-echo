import { useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { BadgesDisplay, GameBoard, Leaderboard, LevelUpModal, PageContainer, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// hooks
import { useGameLogic } from "@/hooks/useGameLogic";
import { useAudioTones } from "@/hooks/useAudioTones";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

type Tab = "game" | "badges" | "leaderboard";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, config, badges, visitorInventory, leaderboard, profileId } =
    useContext(GlobalStateContext);

  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("game");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(2);
  const [gameStarted, setGameStarted] = useState(false);

  const { gameState, startGame, handleButtonPress, proceedToNextRound, proceedAfterLevelUp, resetGame, setPlayTone } =
    useGameLogic(config);

  const { playErrorTone, playSuccessTone } = useAudioTones();

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => setGameState(dispatch, response.data))
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    startGame();

    backendAPI.put("/start-game").catch(() => console.warn("Failed to track game start"));
  }, [startGame]);

  const handleGameOver = useCallback(
    (stats: {
      level: number;
      round: number;
      maxSequenceLength: number;
      consecutiveCorrectRounds: number;
      colorsUnlocked: number;
    }) => {
      backendAPI
        .put("/end-game", stats)
        .then((response) => {
          if (response.data?.visitorInventory) {
            setGameState(dispatch, { visitorInventory: response.data.visitorInventory });
          }
          // Refresh leaderboard
          backendAPI
            .get("/game-state", { params: { forceRefreshInventory } })
            .then((res) => setGameState(dispatch, res.data))
            .catch(() => {});
        })
        .catch(() => console.warn("Failed to submit game results"));
    },
    [dispatch, forceRefreshInventory],
  );

  const handleButtonClick = useCallback(
    (colorIndex: number) => {
      handleButtonPress(colorIndex, {
        onRoundComplete: () => {
          playSuccessTone();
          setTimeout(() => proceedToNextRound(), 800);
        },
        onLevelUp: (level: number) => {
          playSuccessTone();
          setNewLevel(level);
          setShowLevelUp(true);
        },
        onGameOver: handleGameOver,
        onError: playErrorTone,
      });
    },
    [handleButtonPress, proceedToNextRound, handleGameOver, playSuccessTone, playErrorTone],
  );

  const handleLevelUpContinue = useCallback(() => {
    setShowLevelUp(false);
    proceedAfterLevelUp();
  }, [proceedAfterLevelUp]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    startGame();
    backendAPI.put("/start-game").catch(() => console.warn("Failed to track game start"));
  }, [resetGame, startGame]);

  const handleEndGame = useCallback(() => {
    const stats = {
      level: gameState.level,
      round: gameState.round,
      maxSequenceLength: gameState.maxSequenceLength,
      consecutiveCorrectRounds: gameState.consecutiveCorrectRounds,
      colorsUnlocked: gameState.colorsUnlocked,
    };
    handleGameOver(stats);
    resetGame();
    setGameStarted(false);
  }, [gameState, resetGame, handleGameOver]);

  const getGameContent = () => {
    if (!gameStarted) {
      return (
        <div className="grid gap-6 text-center">
          <img className="p-2 mt-2" src="/colorEcho.png" alt="Color Echo" />
          <p className="mb-4">Watch the pattern, then repeat it from memory. How far can you go?</p>
          <PageFooter>
            <button className="btn" onClick={handleStartGame}>
              Start Game
            </button>
          </PageFooter>
        </div>
      );
    }

    return (
      <>
        <GameBoard gameState={gameState} onButtonPress={handleButtonClick} onSetPlayTone={setPlayTone} />

        {gameState.phase === "game-over" && (
          <div className="text-center mt-4">
            <p className="mb-2">
              You reached Level {gameState.level}, Round {gameState.round}
            </p>
            <p className="p2 mb-4">Max sequence length: {gameState.maxSequenceLength}</p>
            <PageFooter>
              <button className="btn" onClick={handlePlayAgain}>
                Play Again
              </button>
            </PageFooter>
          </div>
        )}

        {gameState.phase !== "game-over" && (
          <PageFooter>
            <button className="btn btn-outline" onClick={handleEndGame}>
              End Game
            </button>
          </PageFooter>
        )}

        {showLevelUp && config && (
          <LevelUpModal newLevel={newLevel} maxColors={config.maxColors} onContinue={handleLevelUpContinue} />
        )}
      </>
    );
  };

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tab-container mb-4">
        <button className={activeTab === "game" ? "btn" : "btn btn-text"} onClick={() => setActiveTab("game")}>
          Game
        </button>
        <button className={activeTab === "badges" ? "btn" : "btn btn-text"} onClick={() => setActiveTab("badges")}>
          Badges
        </button>
        <button
          className={activeTab === "leaderboard" ? "btn" : "btn btn-text"}
          style={{ minWidth: "unset" }}
          onClick={() => setActiveTab("leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === "game" && getGameContent()}
      {activeTab === "badges" && <BadgesDisplay badges={badges} visitorInventory={visitorInventory} />}
      {activeTab === "leaderboard" && <Leaderboard leaderboard={leaderboard || []} profileId={profileId} />}
    </PageContainer>
  );
};

export default Home;
