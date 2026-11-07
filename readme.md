# Vox Publica (`vox-publica`)
> **V.O.X.** — **V**irtual **O**utbox **X**-change | *The Public Voice of Gemini Spark*

**Vox Publica** is an automated broadcast syndication pipeline that bridges **Gemini Scheduled Actions** and **Custom Skills** to **Discord Webhooks** using **Google Keep**, **Google Tasks**, and **Google Apps Script**.

---

## 1. Signal Architecture

Because Gemini's execution sandbox blocks direct outbound HTTP requests (`discord.com` webhooks cannot be called directly via Python or curl from inside a chat session), and because the `@Google Tasks` extension always writes most reliably to your primary/default task list (`@default`), **Vox Publica** uses your renamed default Google Tasks list (`Vox Publica` / `@default`) as a central staging switchboard, while **Google Apps Script** acts as the automated broadcast transmitter and archiver:

```text
[Gemini Scheduled Action]
       │
       ├─► Invokes Custom Skill (/discord-webhook-[topic-slug])
       │         │
       │         ├─► 1. Archives dispatch to Google Keep ("[TOPIC] Information & Tracker")
       │         └─► 2. Queues uncompleted task in Default Google Tasks ("Vox Publica" / @default)
       │                with title: "[EMOJI] [CHANNEL NAME] — [Date]: [Headline]"
       │
[Vox Publica Relay — Google Apps Script (Every 5–15 mins)]
       │
       ├─► 3. Scans the "Vox Publica" default task list ("@default") for uncompleted dispatches
       ├─► 4. Filters strictly for tasks containing "[CHANNEL NAME]" in the title
       ├─► 5. Broadcasts task title & notes as a rich Discord Embed via Webhook
       └─► 6. Moves the task out of "Vox Publica" into "[CHANNEL NAME] Outbox" (auto-creating
              the list if needed), marks it "completed", and clears "Vox Publica"
```

---

## 2. Placeholder Reference Table

Before deploying a new broadcast channel, define the following variables for your topic across the template files in this repository:

| Placeholder | Description | Example (Ancient Rome) | Example (Palworld) |
| :--- | :--- | :--- | :--- |
| `[INSERT TOPIC]` | Primary subject name (Title Case) | `Ancient Rome` | `Palworld` |
| `[INSERT TOPIC SLUG]` | Lowercase hyphenated identifier for the skill name | `acta-diurna` | `palworld` |
| `[INSERT DISCORD CHANNEL NAME]` | Display name for the bot/channel & task title tag | `Acta Diurna` | `World of Palworld` |
| `[INSERT ARCHIVE LIST NAME]` | Destination Google Tasks list after broadcast | `Acta Diurna Outbox` | `World of Palworld Outbox` |
| `[INSERT HEX COLOR]` | Hex color code for the Discord embed sidebar | `0x8B0000` (Crimson) | `0x00A8FF` (Pal Blue) |
| `[INSERT EMOJI]` | Prefix icon for task titles | `📜` | `🎮` |
| `[DAY]` & `[TIME]` | Schedule cadence for the Gemini Scheduled Action | `Sunday` at `9:00 AM` | `Friday` at `5:00 PM` |

---

## 3. Repository File Map

* `gemini/skills/discord-webhook-template/SKILL.md` — The Gemini Custom Skill template (`name`, `description`, and formatting/queuing rules).
* `gemini/scheduled-task-prompt.md` — The weekly prompt template for Gemini Scheduled Actions.
* `apps-script/appsscript.json` — The Google Apps Script project manifest enabling the `Tasks` v1 Advanced Service.
* `apps-script/Code.gs` — The **Vox Publica** relay script that polls your `Vox Publica` (`@default`) task list, broadcasts to Discord, and archives completed tasks into `[INSERT DISCORD CHANNEL NAME] Outbox`.

---

## 4. Deployment Guide

### Step 1: Create the Discord Webhook
1. Open your Discord server and go to **Server Settings** (or Channel Settings) → **Integrations** → **Webhooks**.
2. Click **New Webhook**.
3. Set the name to `[INSERT DISCORD CHANNEL NAME]`, select the target channel, and click **Copy Webhook URL**.

### Step 2: Initialize Google Keep & Rename Default Google Tasks List
1. **Google Keep:** Create a blank note titled `[INSERT TOPIC] Information & Tracker` (or `[INSERT DISCORD CHANNEL NAME]`).
2. **Google Tasks:** 
   * Locate your primary system default list (`@default` — the list where **Delete list** is grayed out) and rename it to **`Vox Publica`**.
   * Create your destination archive list named **`[INSERT DISCORD CHANNEL NAME] Outbox`** (or let `Code.gs` auto-create it on its first run).

### Step 3: Configure the Gemini Skill & Scheduled Action
1. Copy the contents of `gemini/skills/discord-webhook-template/SKILL.md`, replace the placeholders for your topic, and save it as a Gemini Custom Skill named `discord-webhook-[INSERT TOPIC SLUG]`.
2. Copy the prompt from `gemini/scheduled-task-prompt.md`, replace the placeholders, and schedule it in Gemini for your desired `[DAY]` and `[TIME]`.

### Step 4: Deploy the Vox Publica Apps Script (`apps-script/`)
1. Navigate to [script.google.com/home/projects/create](https://script.google.com/home/projects/create) and name the project **`Vox Publica — [INSERT DISCORD CHANNEL NAME]`**.
2. Click **Project Settings** (gear icon on the left sidebar) and check **Show "appsscript.json" manifest file in editor**.
3. Replace the contents of `appsscript.json` in the editor with `apps-script/appsscript.json`.
4. Replace the contents of `Code.gs` in the editor with `apps-script/Code.gs` and populate `VOX_CONFIG` with your webhook URL and channel details.
5. Select `processVoxPublicaQueue` from the toolbar dropdown and click **Run** once to complete the Google OAuth permission prompt.
6. Go to **Triggers** (alarm clock icon) → **+ Add Trigger**:
   * **Function to run:** `processVoxPublicaQueue`
   * **Deployment:** `Head`
   * **Event source:** `Time-driven` → `Minutes timer` → `Every 5 minutes` (or `Every 15 minutes`).

---

## 5. Security Note for Git Repositories

Never commit live Discord Webhook URLs to a public repository. Keep `PASTE_YOUR_DISCORD_WEBHOOK_URL_HERE` in `Code.gs` or store your live webhook URL in Apps Script **Project Settings → Script Properties**.