# Release Tracker

A desktop application to monitor GitHub releases and commits across all your repositories in one place.

![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)

## Features

- **Track Multiple Repositories** - Add repos by scanning local folders or entering GitHub URLs manually
- **View Latest Releases** - See release notes, tags, and dates for all tracked repositories
- **Commit Tracking** - For repos without releases, view the latest commit information
- **Clone & Update** - Clone missing repositories or pull updates with one click
- **GitHub API Integration** - Efficient GraphQL queries with rate limit monitoring
- **Export/Import Data** - Backup and migrate your tracking data as JSON
- **Cross-Platform** - Works on Windows, macOS, and Linux

## Installation

### Download

Download the latest release for your platform from the [Releases](../../releases) page.

### Build from Source

**Prerequisites:** Node.js 18+, Git

```bash
# Clone the repository
git clone https://github.com/ogomez92/releasetracker.git
cd release_tracker

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

### Adding Repositories

**From folders:** Click "Add from Folder" and select a directory. The app will scan for all Git repositories within.

**Manually:** Click "Add Manual" and enter the GitHub owner and repository name (e.g., `microsoft/vscode`).

### Viewing Releases

Navigate to the Releases page to see the latest releases from all tracked repositories. Repositories without releases will show their latest commit instead.

### Updating Repositories

The Update page lets you clone missing repositories or pull the latest changes. Select a base folder where repos will be organized as `owner/repo-name`.

### Settings

- **GitHub Token** - Add a personal access token for higher API rate limits (60 → 5,000 requests/hour) and access to private repositories
- **Rate Limit** - Check your current GitHub API rate limit status
- **Export/Import** - Backup your tracked repositories and settings

## Configuration

### GitHub Token (Optional)

For increased rate limits and private repo access, [create a personal access token](https://github.com/settings/tokens) with `repo` scope and add it in Settings.

### Data Storage

All data is stored locally:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\releasetracker\` |
| macOS | `~/Library/Application Support/releasetracker/` |
| Linux | `~/.config/releasetracker/` |

## License

MIT
