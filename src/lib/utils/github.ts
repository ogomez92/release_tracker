// Parse a user-supplied repository reference into { owner, name }.
//
// Accepts many shapes that all "come from GitHub", e.g.:
//   sveltejs/kit
//   https://github.com/sveltejs/kit
//   https://github.com/sveltejs/kit/releases
//   https://github.com/sveltejs/kit/releases/tag/v1.2.3
//   github.com/sveltejs/kit
//   www.github.com/sveltejs/kit/tree/main/packages
//   https://github.com/sveltejs/kit.git
//   git@github.com:sveltejs/kit.git
//
// Returns null when no GitHub owner/repo can be recognized.

// First path segment values that are GitHub site pages, never repo owners.
const RESERVED_OWNERS = new Set([
	'orgs',
	'sponsors',
	'marketplace',
	'topics',
	'collections',
	'trending',
	'settings',
	'notifications',
	'explore',
	'about',
	'pricing',
	'features',
	'login',
	'join',
	'new',
	'organizations',
	'dashboard',
	'search',
	'watching',
	'apps',
	'codespaces'
]);

const VALID_SEGMENT = /^[a-zA-Z0-9-_.]+$/;

function clean(rawOwner: string, rawName: string): { owner: string; name: string } | null {
	const owner = rawOwner.trim();
	const name = rawName.trim().replace(/\.git$/i, '');

	if (!owner || !name) return null;
	if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;
	if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(name)) return null;

	return { owner, name };
}

export function parseRepoInput(raw: string): { owner: string; name: string } | null {
	if (!raw) return null;
	const input = raw.trim();
	if (!input) return null;

	// SSH / scp-like form: git@github.com:owner/repo(.git)
	const ssh = input.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
	if (ssh) return clean(ssh[1], ssh[2]);

	// Anything that references github.com -> parse as a URL and read the path.
	if (/github\.com/i.test(input)) {
		let urlStr = input;
		// Add a scheme when missing so the URL parser has something to work with.
		if (!/:\/\//.test(urlStr)) {
			urlStr = 'https://' + urlStr.replace(/^\/+/, '');
		}

		try {
			const url = new URL(urlStr);
			if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;

			const segments = url.pathname.split('/').filter(Boolean);
			if (segments.length < 2) return null;

			return clean(segments[0], segments[1]);
		} catch {
			return null;
		}
	}

	// Plain "owner/repo" (possibly with trailing path the user pasted, take first two).
	const segments = input.replace(/^\/+|\/+$/g, '').split('/');
	if (segments.length >= 2 && segments[0] && segments[1]) {
		return clean(segments[0], segments[1]);
	}

	return null;
}
