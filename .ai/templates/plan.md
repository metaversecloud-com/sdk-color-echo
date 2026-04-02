**Game Name: Color Echo**

**Genre: Memory / Reflex Game**

## **1\. 🎮 Core Gameplay**

### **1.1 Game Loop**

- Player opens the game - sees an image (/Users/linabell/Downloads/colorEcho.png but should be saved in the repo), description, and start button (in PageFooter)
- On start, board is revealed.
- The game plays a sequence of **colored button flashes** (each paired with a sound).
- The player must **reproduce the sequence** in exact order by clicking the buttons.
- Outcomes:

  - Correct > next round
  - Incorrect > failure state (see Section below)

    - Option A: The game ends.
    - Option B (if enabled): Player loses a life and retries the sequence.

- Game ends on:

  - Failure (natural end)
  - Player exit/quit

## 1.2 Progression

- Levels and Rounds:

  - Game structured as Levels > Rounds
  - Each level contains \[5\] rounds

- Each round adds complexity:

  - Adding speed to the initial pattern
  - Adding number of items in a sequence

- Each level may add a new color up to the max

  - Adding new color to game (up to max configured by admins, defaults to 6)

- EXAMPLES:

  - Level 1 (2 colors)

    - R1: length 2, slow
    - R2: length 3, slow
    - R3: length 3, slow
    - R4: length 4, medium
    - R5: length 4, medium

  - Level 2 (3 colors)

    - R1: length 3, medium
    - R2: length 4, medium
    - R3: length 4, fast
    - R4: length 5, medium
    - R5: length 5, medium

  - Level 3 (4 colors)

    - R1: length 4, medium
    - R2: length 5, medium
    - R3: length 5, fast
    - R4: length 6, medium
    - R5: length 6, medium

## **2\. 🧩 UI Components**

### **2.1 Button Grid**

- 2–6 colored buttons in a circle
- Each button:

  - Has a unique color.
  - Plays a unique audio tone when triggered.
  - Glow on activation

### **2.2 Elements**

- **Round Indicator:** Displays current round number.
- **Start/Restart Button:** To begin or replay the game.
- **Lives Indicator (if enabled):** 1–3 hearts or icons.

### 2.3 Transitions

- Between rounds: short pause
- Between levels:

  - Modal: new level unlocked with new color indicated.
  - Celebration (in modal + particle effect)

## **3\. 🧠 Sequence Logic**

### **3.1 Sequence Generator (**@danielle update with notes of call)

- Each new round:

  - Sequence difficulty is increases either by increasing sequence length or increasing playback speed.

- Player must match entire sequence.

## **4\. ✨ Visual & Audio Effects**

**4.1 Visual Feedback**

- Button glows during sequence and player tap.
- Success: particle effect on leveling up
- Failure: screen shake or red flash.

### **4.2 Audio**

- Each button has a **distinct tone or sound**.

## **5\. ⚙️ Configurability (Admin Panel)**

- All admin settings should be stored in the dropped asset's data object

- Max colors: Admin can choose 4, 5, or 6. Default 6
- Lives: 0 (sudden death) to 3. Default 3
- Speed of sequence playback (slow, medium, fast, progressive - changes with round). Default progressive
- Enable/disable particles (could allow choice). Default enabled

## **6\. 📊 Analytics & Tracking**

- gameOpens (uniqueKey: profileId)
- gameStarts (uniqueKey: profileId)
- gameEnds (uniqueKey: profileId)
- level#Reached (uniqueKey: profileId)
- admin#MaxColor (no uniqueKey)
- admin#Lives (no uniqueKey)

## **7\. Badges**

- Memory Builder - Reach sequence length of 4
- Pattern Player - complete 5 correct rounds in a row
- Mind in Motion - reach sequence length of \[8\]
- Rising Star - Reach Level \[4\]
- Color Master - unlock max colors
- Echo Expert - complete level \[5\]
- Unbreakable Pattern - reach sequence length \[10\]
- Legendary Memory - reach a sequence of \[12\]

## **8\. 🛑 Failure States**

### **8.1 Instant Fail Mode**

- One mistake ends the game.

### **8.2 Lives Mode (Optional)**

- Player has 1–3 attempts per game.
- On mistake: lose a life, retry same sequence.
- Game ends when lives reach 0.

## **8\. Leaderboard**

- On game end a record should be added to the dropped asset's data object keyed by profileId documenting the level and round the reached (see topia-sdk-apps/sdk-color-echo/.ai/examples/leaderboard.md).

- Changing admin setting should reset the leaderboard
