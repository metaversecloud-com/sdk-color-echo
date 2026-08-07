import { useContext, useEffect, useState } from "react";

// components
import { PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, GameConfig, SpeedMode } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { config } = useContext(GlobalStateContext);

  const [maxColors, setMaxColors] = useState(config?.maxColors ?? 6);
  const [lives, setLives] = useState(config?.lives ?? 3);
  const [speed, setSpeed] = useState<SpeedMode>(config?.speed ?? "progressive");
  const [particlesEnabled, setParticlesEnabled] = useState(config?.particlesEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (config) {
      setMaxColors(config.maxColors);
      setLives(config.lives);
      setSpeed(config.speed);
      setParticlesEnabled(config.particlesEnabled);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    const newConfig: GameConfig = { maxColors, lives, speed, particlesEnabled };

    backendAPI
      .put("/update-config", newConfig)
      .then((response) => {
        setGameState(dispatch, { config: newConfig });

        if (response.data?.leaderboardReset) {
          setGameState(dispatch, { leaderboard: [] });
          setSaveMessage("Settings saved. Leaderboard has been reset.");
        } else {
          setSaveMessage("Settings saved.");
        }

        // Refresh game state to get updated leaderboard
        backendAPI
          .get("/game-state")
          .then((res) => setGameState(dispatch, res.data))
          .catch(() => {});
      })
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsSaving(false));
  };

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">Max Colors</label>
        <select className="input p2" value={maxColors} onChange={(e) => setMaxColors(Number(e.target.value))}>
          <option value={4}>4 Colors</option>
          <option value={5}>5 Colors</option>
          <option value={6}>6 Colors</option>
        </select>
      </div>

      <div>
        <label className="label">Lives</label>
        <select className="input p2" value={lives} onChange={(e) => setLives(Number(e.target.value))}>
          <option value={0}>1 Life</option>
          <option value={3}>3 Lives</option>
          <option value={5}>5 Lives</option>
        </select>
      </div>

      <div>
        <label className="label">Playback Speed</label>
        <select className="input p2" value={speed} onChange={(e) => setSpeed(e.target.value as SpeedMode)}>
          <option value="slow">Slow</option>
          <option value="medium">Medium</option>
          <option value="fast">Fast</option>
          <option value="progressive">Progressive</option>
        </select>
      </div>

      <div className="mt-2">
        <label className="label">
          <input
            className="input-checkbox"
            type="checkbox"
            checked={particlesEnabled}
            onChange={(e) => setParticlesEnabled(e.target.checked)}
          />
          Enable Particle Effects
        </label>
      </div>

      {saveMessage && <p className="p3 text-success mb-2">{saveMessage}</p>}

      <PageFooter>
        <button className="btn" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </PageFooter>
    </div>
  );
};

export default AdminView;
