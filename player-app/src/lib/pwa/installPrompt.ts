import { t } from '@repo/ui/i18n';

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

export function getManualInstallHint(variant: ManualInstallVariant): string {
	return t(`pwa.manual.${variant}`);
}
