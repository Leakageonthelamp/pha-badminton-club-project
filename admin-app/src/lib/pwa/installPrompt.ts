export type ManualInstallVariant = 'ios' | 'samsung' | 'android';

export function readDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
	return window.__pwaDeferredPrompt ?? null;
}

export function isStandaloneMode(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		('standalone' in navigator &&
			(navigator as Navigator & { standalone?: boolean }).standalone === true)
	);
}

export function isIosDevice(): boolean {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

export function isSamsungBrowser(): boolean {
	return /SamsungBrowser/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
	return /Android/i.test(navigator.userAgent);
}

export function manualInstallVariant(): ManualInstallVariant | null {
	if (isIosDevice()) return 'ios';
	if (isSamsungBrowser()) return 'samsung';
	if (isAndroid()) return 'android';
	return null;
}

export const manualInstallHint: Record<ManualInstallVariant, string> = {
	ios: 'Tap the Share button, then choose Add to Home Screen.',
	samsung: 'Tap Menu at the bottom, then Add page to → Home screen.',
	android: 'Tap the browser menu, then Install app or Add to Home screen.'
};
