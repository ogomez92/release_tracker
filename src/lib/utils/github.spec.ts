import { describe, it, expect } from 'vitest';
import { parseRepoInput } from './github';

describe('parseRepoInput', () => {
	it('parses plain owner/repo', () => {
		expect(parseRepoInput('sveltejs/kit')).toEqual({ owner: 'sveltejs', name: 'kit' });
	});

	it('parses a full https repo URL', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses a /releases URL', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit/releases')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses a deep URL (releases/tag/...)', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit/releases/tag/v2.0.0')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses a tree/blob URL', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit/tree/main/packages/kit')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses a URL without protocol', () => {
		expect(parseRepoInput('github.com/sveltejs/kit')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses a www. URL', () => {
		expect(parseRepoInput('https://www.github.com/sveltejs/kit/issues')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('strips a trailing .git', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit.git')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('parses an SSH clone URL', () => {
		expect(parseRepoInput('git@github.com:sveltejs/kit.git')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('ignores query strings and fragments', () => {
		expect(parseRepoInput('https://github.com/sveltejs/kit?tab=readme#install')).toEqual({
			owner: 'sveltejs',
			name: 'kit'
		});
	});

	it('handles surrounding whitespace', () => {
		expect(parseRepoInput('   sveltejs/kit   ')).toEqual({ owner: 'sveltejs', name: 'kit' });
	});

	it('keeps dotted repo names', () => {
		expect(parseRepoInput('https://github.com/lodash/lodash.com')).toEqual({
			owner: 'lodash',
			name: 'lodash.com'
		});
	});

	it('rejects reserved GitHub site paths', () => {
		expect(parseRepoInput('https://github.com/orgs/nodejs/repositories')).toBeNull();
		expect(parseRepoInput('https://github.com/sponsors/sindresorhus')).toBeNull();
	});

	it('rejects a profile URL (owner only)', () => {
		expect(parseRepoInput('https://github.com/sveltejs')).toBeNull();
	});

	it('rejects non-github hosts (e.g. gists)', () => {
		expect(parseRepoInput('https://gist.github.com/user/abc123')).toBeNull();
	});

	it('rejects empty / nonsense input', () => {
		expect(parseRepoInput('')).toBeNull();
		expect(parseRepoInput('   ')).toBeNull();
		expect(parseRepoInput('not-a-repo')).toBeNull();
	});
});
