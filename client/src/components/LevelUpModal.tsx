import { Confetti } from "@/components/Confetti";

const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow", "Orange", "Purple"];

interface LevelUpModalProps {
  newLevel: number;
  maxColors: number;
  onContinue: () => void;
}

export const LevelUpModal = ({ newLevel, maxColors, onContinue }: LevelUpModalProps) => {
  const colorsAvailable = Math.min(newLevel + 1, maxColors);
  const previousColors = Math.min(newLevel, maxColors);
  const isNewColor = colorsAvailable > previousColors;

  return (
    <div className="modal-container">
      <div className="modal">
        <Confetti />
        <h3 className="pb-3">Level {newLevel} Unlocked!</h3>
        {isNewColor ? (
          <p>
            New color unlocked: <strong>{COLOR_NAMES[colorsAvailable - 1]}</strong>!
          </p>
        ) : (
          <p>Sequences are getting harder!</p>
        )}
        <p className="pb-3">You now have {colorsAvailable} colors in play.</p>
        <div className="actions">
          <button className="btn" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
