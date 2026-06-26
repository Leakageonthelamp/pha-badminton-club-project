export const SIGN_IN_PREFERENCE_KEY = 'ph:signInPreference';

export type SignInPreference = 'email' | 'phone';

export const loadSignInPreference = (): SignInPreference | null => {
	if (typeof localStorage === 'undefined') return null;

	const value = localStorage.getItem(SIGN_IN_PREFERENCE_KEY);
	return value === 'email' || value === 'phone' ? value : null;
};

export const storeSignInPreference = (preference: SignInPreference): void => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SIGN_IN_PREFERENCE_KEY, preference);
};
