import { LeaderboardEntryType } from "@/context/types";

interface LeaderboardProps {
  leaderboard: LeaderboardEntryType[];
  profileId?: string;
}

export const Leaderboard = ({ leaderboard, profileId }: LeaderboardProps) => {
  const myStats = leaderboard?.find((entry) => entry.profileId === profileId);
  const myRank = leaderboard?.findIndex((entry) => entry.profileId === profileId);

  return (
    <div className="items-center">
      {myStats && (
        <div className="card mb-4">
          <div className="card-details">
            <h4 className="card-title h4">My Best</h4>
            <p className="p2">
              Rank: #{myRank + 1} &middot; Level {myStats.level}, Round {myStats.round}
            </p>
          </div>
        </div>
      )}

      {!leaderboard || leaderboard.length === 0 ? (
        <p className="p2 text-center">No results yet. Be the first to play!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th className="h5">#</th>
              <th className="h5">Name</th>
              <th className="h5">Level</th>
              <th className="h5">Round</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.profileId}>
                <td className="p2">{index + 1}</td>
                <td className={`p2${entry.profileId === profileId ? " text-success" : ""}`}>{entry.name}</td>
                <td className="p2">{entry.level}</td>
                <td className="p2">{entry.round}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Leaderboard;
