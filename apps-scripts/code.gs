/**
 * VOX PUBLICA — Automated Google Tasks to Discord Broadcast & Archive Relay
 * "The Public Voice of Gemini Spark"
 *
 * How this works:
 * 1. Scans your "Vox Publica" default task list ("@default") for uncompleted dispatches
 *    created by Gemini.
 * 2. Filters strictly for tasks containing "[INSERT DISCORD CHANNEL NAME]" in the title
 *    so other tasks and other broadcast channels in "Vox Publica" are never touched.
 * 3. Broadcasts each matching update to your Discord webhook as a rich embed.
 * 4. Moves the task out of "Vox Publica" ("@default") into "[INSERT DISCORD CHANNEL NAME] Outbox"
 *    (creating the archive list automatically if needed), marks it completed there,
 *    and deletes the original from "Vox Publica" to keep the staging queue clean.
 *
 * Prerequisite:
 * Ensure "Tasks API" is enabled via appsscript.json or under "Services" (+) in the left sidebar.
 */

const VOX_CONFIG = {
  DISCORD_WEBHOOK_URL: 'PASTE_YOUR_DISCORD_WEBHOOK_URL_HERE',
  SOURCE_LIST_NAME: 'Vox Publica', // Your renamed @default Google Tasks list
  SOURCE_LIST_ID: '@default',
  TARGET_ARCHIVE_LIST_NAME: '[INSERT DISCORD CHANNEL NAME] Outbox',
  TITLE_FILTER: '[INSERT DISCORD CHANNEL NAME]',
  EMBED_COLOR: 0x8B0000, // Replace with desired hex color (e.g., 0x8B0000 for crimson)
  BOT_USERNAME: '[INSERT DISCORD CHANNEL NAME]',
  FALLBACK_DESCRIPTION: 'New [INSERT TOPIC] broadcast available.',
};

/**
 * Main trigger function — set this on a Time-driven trigger (e.g., every 5 or 15 minutes).
 */
function processVoxPublicaQueue() {
  // Resolves "Vox Publica" by name first, falling back to "@default"
  const sourceListId = findTaskListId_(VOX_CONFIG.SOURCE_LIST_NAME) || VOX_CONFIG.SOURCE_LIST_ID;
  const tasks = getUncompletedTasks_(sourceListId);
  if (tasks.length === 0) {
    return;
  }

  // Ensure the destination archive list exists before moving tasks
  const targetListId = getOrCreateTaskListId_(VOX_CONFIG.TARGET_ARCHIVE_LIST_NAME);

  for (const task of tasks) {
    const title = task.title || '';

    // Strictly process only tasks matching TITLE_FILTER
    if (!title.toLowerCase().includes(VOX_CONFIG.TITLE_FILTER.toLowerCase())) {
      continue;
    }

    const sent = sendDiscordBroadcast_(title, task.notes || '');
    if (sent) {
      moveAndArchiveTask_(sourceListId, targetListId, task);
      Logger.log(
        `[Vox Publica] Broadcasted & moved from "${VOX_CONFIG.SOURCE_LIST_NAME}" to "${VOX_CONFIG.TARGET_ARCHIVE_LIST_NAME}": ${title}`
      );
    }
  }
}

/**
 * Moves a task from sourceListId ("Vox Publica") to targetListId as a completed record:
 * 1. Inserts a completed copy of the task into targetListId.
 * 2. Deletes the original uncompleted task from sourceListId.
 */
function moveAndArchiveTask_(sourceListId, targetListId, task) {
  const completedTimestamp = new Date().toISOString();

  if (!targetListId || sourceListId === targetListId) {
    task.status = 'completed';
    task.completed = completedTimestamp;
    Tasks.Tasks.update(task, sourceListId, task.id);
    return;
  }

  const archivedTask = {
    title: task.title,
    notes: task.notes || '',
    status: 'completed',
    completed: completedTimestamp,
  };

  if (task.due) {
    archivedTask.due = task.due;
  }

  // 1. Create the completed record in the destination archive list
  const inserted = Tasks.Tasks.insert(archivedTask, targetListId);

  // 2. Only delete from "Vox Publica" once the archive copy is confirmed created
  if (inserted && inserted.id) {
    Tasks.Tasks.remove(sourceListId, task.id);
  } else {
    Logger.log(
      `[Vox Publica] Warning: Could not verify archive insert for "${task.title}". Marking complete in "${VOX_CONFIG.SOURCE_LIST_NAME}" instead.`
    );
    task.status = 'completed';
    task.completed = completedTimestamp;
    Tasks.Tasks.update(task, sourceListId, task.id);
  }
}

/**
 * Finds a Google Tasks list ID by name, or creates it if it does not exist.
 */
function getOrCreateTaskListId_(listName) {
  const existingId = findTaskListId_(listName);
  if (existingId) {
    return existingId;
  }

  const createdList = Tasks.Tasklists.insert({ title: listName.trim() });
  Logger.log(`[Vox Publica] Created archive list: "${listName}" (${createdList.id})`);
  return createdList.id;
}

/**
 * Finds a Google Tasks list ID by name.
 */
function findTaskListId_(listName) {
  const response = Tasks.Tasklists.list({ maxResults: 100 });
  const lists = response.items || [];
  for (const list of lists) {
    if (list.title && list.title.trim().toLowerCase() === listName.trim().toLowerCase()) {
      return list.id;
    }
  }
  return null;
}

/**
 * Returns all uncompleted tasks in the specified task list.
 */
function getUncompletedTasks_(taskListId) {
  const response = Tasks.Tasks.list(taskListId, {
    showCompleted: false,
    showHidden: false,
    maxResults: 100,
  });
  return (response.items || []).filter(t => t.status !== 'completed');
}

/**
 * Sends a formatted embed payload to the configured Discord Webhook URL.
 */
function sendDiscordBroadcast_(title, description) {
  const safeDescription = description.length > 4000
    ? description.substring(0, 3997) + '...'
    : description;

  const payload = {
    username: VOX_CONFIG.BOT_USERNAME,
    embeds: [
      {
        title: title.substring(0, 256),
        description: safeDescription || VOX_CONFIG.FALLBACK_DESCRIPTION,
        color: VOX_CONFIG.EMBED_COLOR,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const res = UrlFetchApp.fetch(VOX_CONFIG.DISCORD_WEBHOOK_URL, options);
  const code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    return true;
  }
  Logger.log(`[Vox Publica] Discord webhook error (${code}): ${res.getContentText()}`);
  return false;
}