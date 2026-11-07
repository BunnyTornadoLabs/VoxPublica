---
name: discord-webhook-[INSERT TOPIC SLUG]
description: Formats [INSERT TOPIC] ([INSERT DISCORD CHANNEL NAME]) updates, saves them to Google Keep, and queues them in the Vox Publica (default) Google Tasks list for Discord webhook relay and archiving.
---

# [INSERT DISCORD CHANNEL NAME] — Vox Publica Google Keep & Discord Relay Workflow

When invoked to publish an [INSERT TOPIC] ([INSERT DISCORD CHANNEL NAME]) update, follow these steps exactly.

## 1. Environment Constraint
* **Do NOT** run Python scripts or attempt direct outbound HTTP requests to `discord.com` (outbound network requests are blocked in the execution sandbox).
* Instead, route all updates through **Google Keep** (archive) and **Google Tasks** (`Vox Publica` default task list relay queue).

## 2. Format the Update
Prepare the [INSERT TOPIC] update using Discord-compatible Markdown:
* Keep the total body length under **3,500 characters** so it fits cleanly within a single Discord embed description.
* Include concise bullet points covering the news/discoveries and attach verified, clickable Markdown source links (`[Source Title](https://...)`).

## 3. Save to Google Keep
* Use the **Google Keep** tool/extension (`@Google Keep`) to find the note titled **"[INSERT TOPIC] Information & Tracker"** (or **"[INSERT DISCORD CHANNEL NAME]"**) and append the newly formatted update.

## 4. Queue for Discord in the "Vox Publica" Default Google Tasks List
* Use the **Google Tasks** tool/extension (`@Google Tasks`) to create a new task in the **`Vox Publica`** default task list (do not specify a separate custom list name):
  * **Title:** `[INSERT EMOJI] [INSERT DISCORD CHANNEL NAME] — [Date]: [Main Headline]` (keep under 250 characters; must include `[INSERT DISCORD CHANNEL NAME]` so the Vox Publica relay script can route and move it).
  * **Notes / Details:** Paste the complete Discord-formatted Markdown summary (including verified source links) into the task notes field.
* Leave the task **uncompleted** so the Vox Publica Google Apps Script relay automatically detects it in the `Vox Publica` default list, posts the embed to Discord, and moves the completed task to the **`[INSERT DISCORD CHANNEL NAME] Outbox`** list.