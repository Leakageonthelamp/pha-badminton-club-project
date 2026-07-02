import { describe, expect, it } from 'vitest';
import { playerAppInstallUrl } from './config';

describe('playerAppInstallUrl', () => {
	it('returns default when empty', () => {
		expect(playerAppInstallUrl('')).toBe('https://player.antonsmash.app');
		expect(playerAppInstallUrl('   ')).toBe('https://player.antonsmash.app');
	});

	it('strips trailing slash and hash', () => {
		expect(playerAppInstallUrl('https://player.example.com/')).toBe('https://player.example.com');
		expect(playerAppInstallUrl('https://player.example.com/#install')).toBe(
			'https://player.example.com'
		);
	});

	it('falls back on invalid URL', () => {
		expect(playerAppInstallUrl('not-a-url')).toBe('https://player.antonsmash.app');
	});
});
