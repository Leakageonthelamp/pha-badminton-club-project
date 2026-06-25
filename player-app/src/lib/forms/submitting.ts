import type { SubmitFunction } from '@sveltejs/kit';

export function whileSubmitting(setLoading: (loading: boolean) => void): SubmitFunction {
	return () => {
		setLoading(true);
		return async ({ update }) => {
			await update();
			setLoading(false);
		};
	};
}
