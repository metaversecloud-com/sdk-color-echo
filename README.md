# Color Echo

A memory/reflex game built with the Topia SDK. Players watch a sequence of colored button flashes paired with audio tones, then reproduce the sequence from memory. Difficulty increases through levels with longer sequences, faster playback, and more colors.

## Key Features

### Gameplay

- **Memory Game Loop:** Watch a sequence of colored button flashes, then repeat it in exact order.
- **Progressive Difficulty:** Each level adds new colors (up to 6) and increases sequence length and speed.
- **Lives System:** Configurable 0-3 lives (0 = sudden death). Lose a life on incorrect input, retry the same sequence.
- **Infinite Levels:** No max level — the game continues getting harder.

### Canvas Elements & Interactions

- **Key Asset:** Click to open the game drawer. Particle effects trigger on level completion.

### Drawer Content

- **Game Tab:** Start screen with image/description, then the game board with colored buttons arranged in a circle.
- **Badges Tab:** View all available badges with earned badges in color and unearned badges grayed out.
- **Leaderboard Tab:** Rankings by level/round reached, with personal best highlight.

### Admin Features

- Access: Click the gear icon in the top-right corner.
- **Max Colors:** Choose 4, 5, or 6 colors (default: 6).
- **Lives:** 0 (sudden death) to 3 (default: 3).
- **Playback Speed:** Slow, Medium, Fast, or Progressive (default: Progressive).
- **Particle Effects:** Enable/disable celebration particles (default: enabled).
- Changing difficulty settings (max colors, lives, speed) resets the leaderboard.

### Badges (8 Total)

| Badge | Condition |
|-------|-----------|
| Memory Builder | Reach sequence length of 4 |
| Pattern Player | Complete 5 correct rounds in a row |
| Mind in Motion | Reach sequence length of 8 |
| Rising Star | Reach Level 4 |
| Color Master | Unlock max colors |
| Echo Expert | Complete Level 5 |
| Unbreakable Pattern | Reach sequence length of 10 |
| Legendary Memory | Reach sequence length of 12 |

### Data Objects

#### Key Asset (Dropped Asset)

```ts
{
  maxColors: number,       // 4, 5, or 6
  lives: number,           // 0-3
  speed: string,           // "slow" | "medium" | "fast" | "progressive"
  particlesEnabled: boolean,
  leaderboard: {
    [profileId]: "displayName|level|round|maxSequenceLength"
  }
}
```

### Analytics

- `gameOpens` (uniqueKey: profileId)
- `gameStarts` (uniqueKey: profileId)
- `gameEnds` (uniqueKey: profileId)
- `level#Reached` (uniqueKey: profileId)
- `admin#MaxColor` (no uniqueKey)
- `admin#Lives` (no uniqueKey)

## Environment Variables

Create a `.env` file in the root directory:

```
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
INTERACTIVE_KEY=xxxxxxxxxxxxx
INTERACTIVE_SECRET=xxxxxxxxxxxxxx
```

## Getting Started

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

## Built With

- **Client:** React, TypeScript, Vite, Web Audio API
- **Server:** Node.js, Express, @rtsdk/topia

## Helpful Links

- [SDK Developer Docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [Topia Dev Dashboard](https://dev.topia.io/t/dashboard/integrations)
