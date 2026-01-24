# Add by Username & Add by URL

## Overview

Add two new methods to the "Add Repositories" page:
1. **Add by Username** - Enter a GitHub username, list all their repos with checkboxes
2. **Add by URL** - Enter any URL, extract GitHub repo links from the page

## IPC Handlers

### `fetch-user-repos(username)`

Location: `electron/ipc-handlers.js`

- Call GitHub REST API: `GET /users/{username}/repos`
- Use existing `getGitHubToken()` for authentication
- Paginate through all results (100 per page max, use `per_page=100`)
- Include private repos the token has access to
- Return: `Array<{ owner: string, name: string, url: string }>`

### `fetch-repos-from-url(url)`

Location: `electron/ipc-handlers.js`

- Fetch URL content using Node fetch
- Parse response text for GitHub repo URLs
- Regex pattern: `https://github\.com/([^/\s"'<>]+)/([^/\s"'<>#?]+)`
- Deduplicate results
- Return: `Array<{ owner: string, name: string, url: string }>`

## Components

### `AddByUsername.svelte`

Location: `src/lib/components/AddByUsername.svelte`

UI elements:
- Text input for GitHub username
- "Search" button
- Loading spinner during API call
- Error message display
- Results list with checkboxes (same pattern as AddFolder)
- "Select All" checkbox with indeterminate state
- Selection count: "X of Y repositories selected"
- "Add Selected" button
- "Clear Results" button

State:
- `username: string` - input value
- `loading: boolean` - API call in progress
- `repos: Array<{owner, name, url}>` - fetched repos
- `selectedRepos: Set<string>` - selected URLs
- `error: string | null` - error message

### `AddByUrl.svelte`

Location: `src/lib/components/AddByUrl.svelte`

UI elements:
- Text input for URL
- "Scan URL" button
- Loading spinner during fetch
- Error message display
- Results list with checkboxes
- "Select All" checkbox with indeterminate state
- Selection count
- "Add Selected" button
- "Clear Results" button

State:
- `url: string` - input value
- `loading: boolean` - fetch in progress
- `repos: Array<{owner, name, url}>` - parsed repos
- `selectedRepos: Set<string>` - selected URLs
- `error: string | null` - error message

## Layout Update

File: `src/routes/add/+page.svelte`

Current: 2 columns (AddFolder, AddManual)
New: 2x2 grid using CSS grid (not tables)

```
Row 1: AddFolder     | AddManual
Row 2: AddByUsername | AddByUrl
```

Responsive: 1 column on mobile, 2 columns on tablet+

## Type Updates

File: `src/lib/types.ts`

Add to ElectronAPI interface:
```typescript
fetchUserRepos: (username: string) => Promise<Array<{owner: string, name: string, url: string}>>;
fetchReposFromUrl: (url: string) => Promise<Array<{owner: string, name: string, url: string}>>;
```

## Files to Modify

1. `electron/ipc-handlers.js` - Add two new handlers
2. `electron/main.js` - Register new IPC handlers
3. `electron/preload.js` - Expose new APIs
4. `src/lib/types.ts` - Add type definitions
5. `src/lib/components/AddByUsername.svelte` - New component
6. `src/lib/components/AddByUrl.svelte` - New component
7. `src/routes/add/+page.svelte` - Update layout, import new components
