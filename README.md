
\<div align="center"\>
\<img src="[https://i.imgur.com/your-logo.png](https://i.imgur.com/your-logo.png)" alt="Orion Logo" width="150"/\>
\<h1\>Orion Framework\</h1\>
\<p\>
\<strong\>A Powerful, Modular, and Developer-Friendly WhatsApp Bot Framework.\</strong\>
\</p\>
\<p\>
Built on top of \<a href="[https://github.com/WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)"\>Baileys\</a\>, Orion provides high-level abstractions to let you focus on building amazing features, not boilerplate.
\</p\>
\</div\>

## ✨ Core Features

  * ⚡️ **Modular Command System**: Organize your commands in clean, separate files for easy management.
  * 🔄 **Hot Reloading**: Update, add, or remove commands in real-time without restarting the entire bot.
  * 🛡️ **Middleware Architecture**: Intercept and process messages before a command is executed for logging, validation, or modification.
  * 🛠️ **Enhanced Socket Helpers**: The `sock` object is supercharged with dozens of practical helper functions like `sock.reply`, `sock.sendImage`, `sock.downloadMedia`, and more.
  * ⏱️ **Built-in Cooldowns**: Prevent spam with a configurable cooldown system, applicable per-command or globally.
  * ⚙️ **Development Mode**: Isolate the bot to only respond to the owner's JID during development and debugging.
  * 📦 **Ready-to-use Built-ins**: Easily enable common commands (`ping`, `add`, `remove`) and group events (welcomer, goodbye) directly from your `.env` file.

-----

## 🚀 Installation & Quick Start

### 1\. Installation

Start a new project and install the necessary dependencies.

```bash
npm init -y
npm install orion-wa dotenv
```

### 2\. Project Structure

Organize your project with the following structure for maximum scalability.

```
my-bot/
├── commands/
│   └── utility/
│       └── ping.js
├── session/
├── .env
└── index.js
```

### 3\. The `index.js` Entry Point

This file is the heart of your bot.

```javascript
// index.js
require('dotenv').config();
const { Bot } = require('orion-wa');
const path = require('path');

// Initialize the Orion Bot with your configuration
const bot = new Bot({
    // Path to your custom commands directory
    commandsPath: path.join(__dirname, 'commands'),
    
    // Set a default cooldown for all commands (in seconds)
    defaultCommandCooldown: 5 
});

// (Optional) Implement a middleware for logging command executions
const loggerMiddleware = (sock, m, next) => {
    console.log(`[EXEC] Command '${m.command}' from ${m.sender.split('@')[0]}`);
    next(); // Pass control to the next middleware or command
};
bot.use(loggerMiddleware);

// Connect the bot to WhatsApp
bot.connect();
```

-----

## 核心概念 (Core Concepts)

Understanding Orion's core concepts is key to unlocking its full potential.

### 🔹 The Command Object

Every `.js` file inside your `commands` directory is a command module. It must export an object with the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | **Required.** The primary name to trigger the command. |
| `execute` | `function` | **Required.** The function that runs when the command is called. It receives `(sock, m)`. |
| `aliases` | `string[]` | Alternative names for the command. |
| `description`| `string` | A brief explanation used by help commands. |
| `category` | `string` | Used to group commands in help menus. |
| `cooldown` | `number` | A command-specific cooldown in seconds, overriding the default. |
| `isGroupOnly`| `boolean` | If `true`, the command can only be used in groups. |
| `isAdminOnly`| `boolean` | If `true`, only group admins can execute it. |
| `isBotAdminOnly`|`boolean` | If `true`, the command only works if the bot is a group admin. |
| `isOwnerOnly`| `boolean` | If `true`, only the bot owner (defined in `.env`) can use it. |
| `args` | `object` | An object defining validation rules for arguments (see Advanced Usage). |

**Example Command: `commands/utility/ping.js`**

```javascript
module.exports = {
    name: 'ping',
    aliases: ['p'],
    description: 'Checks the bot\'s response time.',
    category: 'utility',
    cooldown: 10, // 10-second cooldown
    async execute(sock, m) {
        const startTime = Date.now();
        await sock.reply(m, 'Pong!');
        const endTime = Date.now();
        await sock.editMessage(m.key, `Pong! (${endTime - startTime}ms)`);
    }
};
```

### 🔹 The Parsed Message Object (`m`)

Every command, middleware, and handler receives a rich, pre-parsed message object `m` for easy interaction.

| Property | Type | Description |
| :--- | :--- | :--- |
| `msg` | `object` | The raw message object from Baileys. |
| `key` | `object` | The unique key of the message (`id`, `remoteJid`, etc.). |
| `chat` | `string` | The JID of the chat (group or private). |
| `sender` | `string` | The JID of the message author. |
| `isGroup` | `boolean` | `true` if the message is from a group. |
| `body` | `string` | The full text content of the message. |
| `args` | `string[]` | An array of arguments that follow the command. |
| `command` | `string` | The command name that was executed. |
| `isMedia` | `boolean` | `true` if the message contains media (image, video, sticker). |
| `isQuoted` | `boolean` | `true` if the message is a reply to another message. |
| `quoted` | `object` | Contains details of the replied message (`key`, `sender`, `msg`). |
| `groupMetadata`|`object`| Group metadata (if `isGroup`), contains subject, participants, etc. |
| `isAdmin` | `boolean` | `true` if the sender is a group admin. |
| `isBotAdmin` | `boolean` | `true` if the bot is an admin in the group. |

### 🔹 The Enhanced Socket (`sock`) Helpers

The `sock` object is decorated with numerous helper methods to simplify common actions. Here are a few key examples:

  * **`sock.reply(m, text, options?)`**: Replies to a message, automatically quoting it.
    ```javascript
    await sock.reply(m, 'This is a reply!');
    ```
  * **`sock.sendText(jid, text, options?)`**: Sends a simple text message.
    ```javascript
    await sock.sendText(m.chat, 'Hello world!');
    ```
  * **`sock.sendImage(jid, source, caption?, options?)`**: Sends an image from a URL or Buffer.
    ```javascript
    const imageUrl = 'https://example.com/image.jpg';
    await sock.sendImage(m.chat, imageUrl, 'Here is an image.');
    ```
  * **`sock.downloadMedia(m)`**: Downloads media from the current message or its quoted reply. Returns a `Buffer`.
    ```javascript
    if (m.isMedia || m.isQuoted) {
        const buffer = await sock.downloadMedia(m);
        // Do something with the buffer, e.g., save it or process it
    }
    ```
  * **`sock.react(m, emoji)`**: Sends an emoji reaction to a message.
    ```javascript
    await sock.react(m, '👍');
    ```
  * **`sock.editMessage(key, newText)`**: Edits a message previously sent by the bot.
    ```javascript
    const sentMsg = await sock.reply(m, 'Loading...');
    await sock.editMessage(sentMsg.key, 'Done!');
    ```

### 🔹 The Middleware System

Middleware functions are executed sequentially before a command's `execute` function is called. They are perfect for logging, user permission checks, or modifying the message object.

A middleware function receives `(sock, m, next)`. You **must** call `next()` to pass control to the next function in the chain.

**Example: A middleware to block users from a specific group.**

```javascript
// in index.js
const blockGroupMiddleware = (sock, m, next) => {
    const blockedGroupId = '1234567890@g.us';
    if (m.isGroup && m.chat === blockedGroupId) {
        // Do not call next(), effectively stopping execution
        console.log(`[BLOCK] Ignored command from blocked group ${m.chat}`);
        return; 
    }
    // If not from the blocked group, continue
    next();
};

bot.use(blockGroupMiddleware);
```

### 🔹 Event Handlers

Orion automatically handles core Baileys events. The main handlers are located in the `src/handlers/` directory.

  * **`onConnectionUpdate.js`**: Manages the connection state (`'open'`, `'close'`), handles QR code generation in the terminal, and implements automatic reconnection logic.
  * **`onMessage.js`**: This is the core handler. It parses incoming messages, checks for commands, runs validations and middleware, and finally executes the command.
  * **`onGroupUpdate.js`**: Handles events like members joining (`'add'`) or leaving (`'remove'`) a group. This is used for the built-in welcomer and goodbye features.

-----

## ⚙️ Configuration (`.env`)

Create a `.env` file in your project root to configure your bot.

```env
# --- CORE CONFIGURATION ---
# The name of the session file to be created
SESSION_NAME=mysession
# The prefix for all commands
PREFIX=!

# --- DEVELOPMENT SETTINGS ---
# Set to 'true' to make the bot only respond to the owner
DEVELOPMENT_MODE=false
# Your WhatsApp number (format: 1234567890@s.whatsapp.net)
BOT_OWNER_JID=

# --- BUILT-IN FEATURES (set to 'true' to enable) ---
BUILTIN_COMMAND_PING_ENABLED=true
BUILTIN_COMMAND_ADD_ENABLED=true
BUILTIN_COMMAND_REMOVE_ENABLED=true

# --- BUILT-IN GROUP EVENTS ---
BUILTIN_WELCOMER_ENABLED=true
BUILTIN_WELCOMER_MESSAGE="Hi %%mention%%! Welcome to %%group%%. Don't forget to read the description!"
BUILTIN_GOODBYE_ENABLED=true
BUILTIN_GOODBYE_MESSAGE="Well, %%mention%% has left us..."
```

-----

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

This project is distributed under the MIT License. See `LICENSE` for more information.