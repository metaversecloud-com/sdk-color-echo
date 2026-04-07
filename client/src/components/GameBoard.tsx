import { useEffect } from "react";
import { GameState } from "@/hooks/useGameLogic";
import { useAudioTones } from "@/hooks/useAudioTones";

const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow", "Orange", "Purple"];

interface GameBoardProps {
  gameState: GameState;
  onButtonPress: (colorIndex: number) => void;
  onSetPlayTone: (fn: (index: number, duration?: number) => void) => void;
}

const getButtonPosition = (index: number, total: number, radius: number) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius + radius + 22;
  const y = Math.sin(angle) * radius + radius + 22;
  return { left: `${x}px`, top: `${y}px` };
};

export const GameBoard = ({ gameState, onButtonPress, onSetPlayTone }: GameBoardProps) => {
  const { playTone } = useAudioTones();

  useEffect(() => {
    onSetPlayTone(playTone);
  }, [playTone, onSetPlayTone]);

  const { phase, activeButton, errorFlash, lives, maxLives, colorsAvailable } = gameState;
  const isInputPhase = phase === "player-input";
  const radius = 90;

  const handleClick = (index: number) => {
    if (!isInputPhase) return;
    playTone(index);
    onButtonPress(index);
  };

  return (
    <div className={`game-board-container${errorFlash ? " error-flash" : ""}`}>
      <div className="game-status">
        <p>
          Level {gameState.level} &middot; Round {gameState.round}/5
        </p>
        {maxLives > 0 && (
          <div className="lives-display">
            {Array.from({ length: maxLives }).map((_, i) => (
              <span key={i} className={`heart${i >= lives ? " lost" : ""}`}>
                &#x2764;
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="game-board">
        {Array.from({ length: colorsAvailable }).map((_, i) => {
          const pos = getButtonPosition(i, colorsAvailable, radius);
          const isActive = activeButton === i;
          return (
            <button
              key={i}
              className={`game-button color-${i}${isActive ? " active" : ""}`}
              style={{ left: pos.left, top: pos.top }}
              disabled={!isInputPhase}
              onClick={() => handleClick(i)}
              aria-label={COLOR_NAMES[i]}
            />
          );
        })}
      </div>

      <h4 className="text-center">
        {phase === "playing-sequence" && "Watch the pattern..."}
        {phase === "player-input" && "Your turn! Repeat the pattern."}
        {phase === "round-transition" && "Correct!"}
        {phase === "game-over" && "Game Over!"}
        {phase === "idle" && ""}
      </h4>

      <p>{phase === "player-input" && `${gameState.playerInput.length}/${gameState.sequence.length}`}</p>
    </div>
  );
};

export default GameBoard;
