type ErrorCopy = {
	title: string;
	hint: string;
};

const errorCopyByStatus: Record<number, ErrorCopy> = {
	400: {
		title: 'Invalid request',
		hint: 'Something in the request was not valid. Please check and try again.'
	},
	401: {
		title: 'Sign in required',
		hint: 'You need to log in before opening this page.'
	},
	403: {
		title: 'Access denied',
		hint: 'You do not have permission to view this page.'
	},
	404: {
		title: 'Page not found',
		hint: 'This page does not exist or may have been moved.'
	},
	500: {
		title: 'Something went wrong',
		hint: 'An unexpected error occurred. Please try again in a moment.'
	}
};

const defaultErrorCopy: ErrorCopy = errorCopyByStatus[500];

export const getErrorCopy = (status: number): ErrorCopy =>
	errorCopyByStatus[status] ?? defaultErrorCopy;
