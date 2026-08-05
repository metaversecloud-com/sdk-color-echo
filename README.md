<div align="center">
<img src="https://global-uploads.webflow.com/62e7004a0f9b3a63b980ac3c/62e70c84dd3aac06fb2ac2b6_topia-logo-blue-2x.png" style="width: 120px; margin-bottom: 20px" alt="Topia logo">
</div>

# Color Echo

## Introduction / Summary

Color Echo is a Simon-says memory game for Topia worlds. An admin places a **single dropped asset** in the world — the key asset. When any visitor clicks it, Topia opens the drawer to this React app, which plays a sequence of colored button flashes paired with pentatonic Web Audio tones. The visitor repeats the sequence from memory; each cleared round grows the sequence and each cleared level (5 rounds) unlocks a new color, up to a configurable cap of 4, 5, or 6. Rounds, colors, playback speed, and lives are all stored on the key asset's data object, and there is a single leaderboard per key asset ranked by highest level → round → max sequence length. Admins tune the difficulty and toggle particle effects from a gear-icon panel inside the drawer.

The app is drawer-driven — there is no on-canvas rendering beyond the key asset itself and an optional `Firework` particle burst on level-up.

## Key Features

### Canvas elements & interactions

- **Key asset:** a single dropped asset placed manually by an admin. Its `assetId` (not its `uniqueName`) is the identity — `getCredentials` in `server/utils/getCredentials.ts` passes `assetId` straight into `DroppedAsset.get(assetId, urlSlug, …)`; there is no `_ColorEcho_` suffix scheme.
- **Particle effect:** on every round that ends with `level > 1`, `handleEndGame` calls `visitor.triggerParticle({ name: "Firework", duration: 3 })` if `particlesEnabled` is set on the key asset. Non-blocking; failures are swallowed.

### Drawer content

- **Game tab:** cover image (`/colorEcho.png`) + Start Game CTA on entry; then the circular `GameBoard` (2–6 buttons arranged on a radius of 90px), lives hearts (or hidden when `maxLives === 0`), Level/Round header, and a live "N/M" input counter. On the last correct input of round 5 a `LevelUpModal` interrupts before the next level starts. On failure a shake animation runs and the same sequence replays (unless the visitor is out of lives, in which case the tab shows the game-over screen + Play Again).
- **Badges tab:** grid of every `BADGE`-type item in the ecosystem inventory (via the 24-hour `inventoryCache`), rendered in color if the visitor owns it and grayed out otherwise.
- **Leaderboard tab:** ranked list ordered by `level` desc → `round` desc → `maxSequenceLength` desc, with the current visitor's row highlighted.

### Admin features

Gated by the gear-icon (`AdminIconButton`) that only appears when `visitor.isAdmin` is true. `handleUpdateConfig` re-checks admin server-side and returns 403 otherwise.

| Setting          | Values                          | Notes                                                                            |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Max Colors       | 4, 5, or 6                      | Default 6.                                                                       |
| Lives            | 0 (sudden death), 1, 2, 3       | Default 3.                                                                       |
| Playback Speed   | Slow, Medium, Fast, Progressive | Default Progressive. Progressive = Level 1 slow, Round 3 fast, otherwise medium. |
| Particle Effects | on/off                          | Default on. Fires `Firework` on level-up.                                        |

**Any change to Max Colors, Lives, or Speed wipes the leaderboard** (`updateData.leaderboard = {}`); toggling Particle Effects alone does not.

### Themes

None — the color palette (Red, Blue, Green, Yellow, Orange, Purple) and their radial gradients are hard-coded in `client/src/index.css` (`.game-button.color-0` … `.color-5`) and matching pentatonic tone frequencies live in `useAudioTones.ts` (C4, E4, G4, A4, C5, E5).

## Required Assets with Unique Names

Only the key asset needs to be placed — the app never drops assets, generates label assets, or looks anything up by `uniqueName`.

| Unique Name | Placed by | Description                                                                                                                                                                                   |
| ----------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _any_       | Manually  | The key asset (Color Echo drawer trigger). Only `assetId` matters. Its `Interactive Settings` must point at this app's URL so clicking it opens the drawer with the interactive query params. |

## Technical Architecture

### Data Objects

#### Key Asset (`ColorEchoDataObject`)

The primary source of truth for config + leaderboard. Initialized to `DEFAULT_CONFIG` by `initializeDroppedAssetDataObject` on first `GET /game-state` if `maxColors` is missing.

```ts
{
  maxColors: 4 | 5 | 6;                     // default 6
  lives: 0 | 1 | 2 | 3;                     // default 3; 0 = sudden death
  speed: "slow" | "medium" | "fast" | "progressive"; // default "progressive"
  particlesEnabled: boolean;                // default true
  leaderboard: {
    // "displayName|level|round|maxSequenceLength"
    [profileId: string]: string;
  };
}
```

#### Visitor

No custom `updateDataObject` payload is ever written — the app only calls `visitor.updateDataObject({}, { analytics })` to piggy-back analytics on empty writes. Visitor-scoped side effects that _do_ happen:

- `visitor.fetchInventoryItems()` + `getVisitorBadges(...)` → drives the Badges tab.
- `visitor.grantInventoryItem(item, 1)` → awarded by `awardBadge` on `handleEndGame`.
- `visitor.fireToast({ groupId: "badges", … })` → announces newly-earned badges.
- `visitor.triggerParticle({ name: "Firework", duration: 3 })` on level-up.

#### World

Not used. Nothing in `server/` touches `World.dataObject`.

## API Endpoints

All routes mount under `/api`. Every non-health route runs through `getCredentials(req.query)`, which requires `interactiveNonce`, `interactivePublicKey`, `urlSlug`, `visitorId` and verifies `process.env.INTERACTIVE_KEY === query.interactivePublicKey`.

| Method | Route            | Auth        | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/`              | —           | Sanity check.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET`  | `/system/health` | —           | Version + `NODE_ENV`, `INSTANCE_DOMAIN`, `INTERACTIVE_KEY`, `S3_BUCKET`.                                                                                                                                                                                                                                                                                                                                           |
| `GET`  | `/game-state`    | Interactive | Fetch full state: `{ isAdmin, config, badges, visitorInventory, leaderboard, profileId }`. Also initializes the key-asset data object on first call. Fires `gameOpens` analytic.                                                                                                                                                                                                                                   |
| `PUT`  | `/start-game`    | Interactive | Fires `gameStarts` analytic (empty visitor `updateDataObject`).                                                                                                                                                                                                                                                                                                                                                    |
| `PUT`  | `/end-game`      | Interactive | Body: `{ level, round, maxSequenceLength, consecutiveCorrectRounds, colorsUnlocked }`. Writes leaderboard **only if strictly better** (higher level, or equal level with higher round, or equal level+round with longer max sequence). Fires `gameEnds` and one `level${l}Reached` analytic for each `l` from 2 → `level`. Awards up to 8 badges. Triggers `Firework` particle if `particlesEnabled && level > 1`. |
| `PUT`  | `/update-config` | Admin       | Body: `{ maxColors, lives, speed, particlesEnabled }`. 403 for non-admins. Any change to `maxColors`/`lives`/`speed` also resets `leaderboard = {}`. Fires `admin${maxColors}MaxColors` and/or `admin${lives}Lives` analytics when those specific values change.                                                                                                                                                   |

**Concurrency:** every leaderboard/config write uses a 5-second-bucketed lock — `${assetId}-{5sBucket}` for game ends and `${assetId}-config-{5sBucket}` for admin config saves — via `updateDataObject`'s `lock` option.

**Realtime transport:** none. There is no SSE / websocket / polling. `Home.tsx` refetches `GET /game-state` after every `end-game` and `update-config` mutation.

## Badges

Granted via `awardBadge` (`visitor.grantInventoryItem` + `visitor.fireToast`, group `"badges"`). Badge inventory items must exist in the ecosystem — names below must match exactly. `handleEndGame` evaluates all conditions on every game-end; already-owned badges short-circuit before the SDK call.

| Badge               | Condition                       |
| ------------------- | ------------------------------- |
| Memory Builder      | `maxSequenceLength >= 4`        |
| Pattern Player      | `consecutiveCorrectRounds >= 5` |
| Mind in Motion      | `maxSequenceLength >= 8`        |
| Rising Star         | `level >= 4`                    |
| Color Master        | `colorsUnlocked >= maxColors`   |
| Echo Expert         | `level >= 6`                    |
| Unbreakable Pattern | `maxSequenceLength >= 10`       |
| Legendary Memory    | `maxSequenceLength >= 12`       |

## Analytics

Emitted via the SDK's `analytics: [...]` on `visitor.updateDataObject` / `droppedAsset.updateDataObject`. `uniqueKey` is `profileId` on every visitor-scoped event; admin events are world-scoped (no `uniqueKey`).

| Event                        | Fired when                                                                                                                                      | uniqueKey   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `gameOpens`                  | Any visitor GETs `/game-state` (i.e. opens the drawer).                                                                                         | `profileId` |
| `gameStarts`                 | Visitor presses **Start Game** or **Play Again** (`PUT /start-game`).                                                                           | `profileId` |
| `gameEnds`                   | `PUT /end-game` — either via lives-exhausted game-over or the **End Game** button.                                                              | `profileId` |
| `level${l}Reached`           | On every `end-game`, one event per `l` from 2 → `level` reached. E.g. reaching level 4 fires `level2Reached`, `level3Reached`, `level4Reached`. | `profileId` |
| `admin${maxColors}MaxColors` | Admin saves settings and `maxColors` changed. Value is interpolated into the name — e.g. `admin4MaxColors`, `admin6MaxColors`.                  | —           |
| `admin${lives}Lives`         | Admin saves settings and `lives` changed. Value is interpolated into the name — e.g. `admin0Lives`, `admin3Lives`.                              | —           |

## Environment Variables

Create a `.env` at the app root. See `.env-example` for a template. Only `INTERACTIVE_KEY` and `INTERACTIVE_SECRET` are enforced at boot (`server/index.ts` → `checkEnvVariables`).

| Variable             | Description                                                                                                                       | Required |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `INTERACTIVE_KEY`    | Topia interactive app key. Verified against `interactivePublicKey` on every request.                                              | Yes      |
| `INTERACTIVE_SECRET` | Topia interactive app secret. Used by the `Topia` SDK constructor.                                                                | Yes      |
| `INSTANCE_DOMAIN`    | Topia API domain. Falls back to `api.topia.io`.                                                                                   | No       |
| `INSTANCE_PROTOCOL`  | Falls back to `https`.                                                                                                            | No       |
| `NODE_ENV`           | `development` opens CORS to `localhost:3000` / `localhost:5173`; anything else serves the built React client from `client/build`. | No       |
| `PORT`               | Server port. Defaults to `3000`.                                                                                                  | No       |
| `S3_BUCKET`          | Reported by `/system/health` for deploy tracking; not otherwise used.                                                             | No       |

### Where to find `INTERACTIVE_KEY` and `INTERACTIVE_SECRET`

- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)
- [Topia Dev Dashboard](https://dev.topia.io/t/dashboard/integrations)

## Getting Started

```bash
# from the app root
npm install
cd client && npm install && cd ..

# create a .env at the app root (see Environment Variables above)
cp .env-example .env

# run the dev server (client + server together)
npm run dev
```

To exercise the app end-to-end, drop any dropped asset in a Topia world with its Interactive Settings pointing at this app's URL — clicking it will pass the interactive query params to `client/src/App.tsx` and open the drawer.

## For Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### App-specific notes

- **Client-side game loop:** all sequence generation, timing, tone playback, and correctness checking runs in `client/src/hooks/useGameLogic.ts`. The server only ever sees the aggregate result on `PUT /end-game` — it never validates individual button presses. Sequence length = `level + floor(round / 2) + 1`; colors available = `min(level + 1, maxColors)`; rounds-per-level = 5.
- **Progressive speed rules** (`useGameLogic.getSpeedMs`): Level 1 = 800ms per step; Round 3 of any level = 300ms; otherwise 500ms. Fixed modes use those same three constants.
- **Web Audio tones:** `useAudioTones.ts` synthesizes 300ms sine tones at C4 / E4 / G4 / A4 / C5 / E5 for the six buttons, a 400ms 150→80 Hz sawtooth for errors, and a 3-note arpeggio for round-complete / level-up successes. No audio files.
- **Ecosystem inventory cache** (`server/utils/inventoryCache.ts`): 24-hour in-memory TTL with stale-fallback on API failure. `handleGetGameState` currently passes `forceRefreshInventory = true` unconditionally (the client `?forceRefreshInventory` query is commented out), so badges refresh on every drawer open.
- **Leaderboard write-gating:** `handleEndGame` only overwrites a visitor's row when the new score is strictly better than their previous entry (`level`, then `round`, then `maxSequenceLength`). Analytics fire regardless.
- **Concurrency:** all key-asset mutations run under 5-second-bucketed locks via `updateDataObject`'s `lock` option.
- **`cleanReturnPayload` middleware** (`server/index.ts`) globally rewrites `res.send` to strip Topia SDK payload fields from every JSON response.

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [Topia Dev Dashboard](https://dev.topia.io/t/dashboard/integrations)
