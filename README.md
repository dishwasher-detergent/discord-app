# Discord Reminder Bot

A powerful Discord bot that helps you stay organized by setting reminders for any message in your server. Built with TypeScript, Hono, and deployed on Appwrite Functions.

## 🌟 Features

- **📌 Message-Based Reminders**: Right-click any message to create a reminder
- **⏰ Flexible Scheduling**: Set reminders using simple formats (30m, 2h, 1d)
- **📋 Reminder Management**: List and manage all your reminders
- **🚫 Easy Cancellation**: Cancel pending reminders with interactive dropdowns
- **💬 Private Notifications**: Get reminded via DM with links to original messages
- **🔒 Personal & Secure**: Your reminders are private and only visible to you

## 🛠️ Setup Instructions

### Prerequisites

- [Discord Developer Account](https://discord.com/developers/applications)
- [Appwrite Account](https://appwrite.io/)
- [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation) installed
- Node.js 22+ installed

### Step 1: Discord Bot Setup

1. **Create a Discord Application**

   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" section
   - Click "Add Bot" and confirm

2. **Configure Bot Settings**

   - Under "Bot" section, copy the **Bot Token**
   - Under "OAuth2" > "General", copy the **Client ID** (Application ID)
   - Under "OAuth2" > "General", copy the **Public Key**

3. **Generate Bot Invite URL**
   - Go to "Installation"
   - Select installation method: `User Install`
   - Copy the generated URL and use it to invite the bot to your account

### Step 2: Appwrite Project Setup

1. **Create Appwrite Project**

   - Log into your Appwrite Console
   - Create a new project
   - Note your **Project ID**

2. **Initialize Appwrite CLI**

   ```bash
   cd discord-app
   appwrite login
   ```

3. **Deploy Database and Functions**

   ```bash
   appwrite push all
   ```

4. **Create API Key**
   - In Appwrite Console, go to "Overview" > "Integrations" > "API keys"
   - Create a new key with the following scopes:
     - `documents.read`
     - `documents.write`
   - Copy the **API Key**

### Step 3: Environment Variables

Create environment variables in your Appwrite Functions:

#### For `discord-bot` function:

```env
DISCORD_APPLICATION_ID=your_discord_application_id
DISCORD_TOKEN=your_discord_bot_token
DISCORD_PUBLIC_KEY=your_discord_public_key
API_KEY=your_appwrite_api_key
DATABASE_ID=database
REMINDER_COLLECTION_ID=reminder
```

#### For `remind` function:

```env
DISCORD_APPLICATION_ID=your_discord_application_id
DISCORD_TOKEN=your_discord_bot_token
DISCORD_PUBLIC_KEY=your_discord_public_key
API_KEY=your_appwrite_api_key
DATABASE_ID=database
REMINDER_COLLECTION_ID=reminder
```

### Step 4: Deploy Functions

1. **Deploy to Appwrite**

   ```bash
   appwrite push functions
   ```

2. **Set Discord Interactions URL**
   - Go to Discord Developer Portal
   - Navigate to your application > "General Information"
   - Set "Interactions Endpoint URL" to: `https://<FUNCTION_ID>.<REGION>.appwrite.run/interactions`
   - Save changes

### Step 5: Test the Bot

1. **Verify Deployment**

   - Check Appwrite Console > Functions to ensure both functions are deployed
   - Check function logs for any errors

2. **Test Bot Commands**
   - In Discord, right-click any message and look for "Apps" > "create"
   - Try the slash commands: `/list`, `/cancel`

## 📖 How to Use the Bot

### Creating Reminders

1. **Right-click Method** (Recommended)
   - Right-click any message in Discord
   - Click "Apps" > "create"
   - Enter time format in the modal (e.g., `30m`, `2h`, `1d`)
   - Click "Submit"

### Managing Reminders

1. **List Reminders**

   ```
   /list
   /list status:pending
   /list status:completed
   /list status:cancelled
   ```

2. **Cancel Reminders**
   ```
   /cancel
   ```
   - Select from the dropdown menu to cancel specific reminders

### Time Formats

- **Minutes**: `30m`, `45m`, `90m`
- **Hours**: `1h`, `2h`, `12h`
- **Days**: `1d`, `7d`, `30d`

**Limits:**

- Maximum 30 days in advance
- Maximum 25 pending reminders per user

## 🔧 Development

### Local Development

1. **Install Dependencies**

   ```bash
   cd functions/bot
   npm install

   cd ../remind
   npm install
   ```

2. **Build Functions**

   ```bash
   # In functions/bot
   npm run build

   # In functions/remind
   npm run build
   ```

3. **Register Commands** (after deployment)
   ```bash
   cd functions/bot
   npm run setup
   ```

### Project Structure

```
discord-app/
├── functions/
│   ├── bot/                    # Discord bot function
│   │   ├── src/
│   │   │   ├── main.ts        # Entry point
│   │   │   ├── register-commands.ts
│   │   │   ├── lib/           # Utilities and handlers
│   │   │   └── routes/        # API routes
│   │   └── package.json
│   └── remind/                # Cron reminder function
│       ├── src/
│       │   ├── main.ts
│       │   ├── lib/
│       │   └── routes/
│       └── package.json
├── appwrite.json              # Appwrite configuration
└── README.md
```

## 📄 License

This project is open source. Feel free to modify and distribute as needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Built with ❤️ using TypeScript, Hono, and Appwrite**
