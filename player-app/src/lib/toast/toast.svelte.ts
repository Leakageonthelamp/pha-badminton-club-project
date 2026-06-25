export type ToastVariant = 'error' | 'success' | 'warning' | 'info';

export type ToastItem = {
	id: string;
	message: string;
	variant: ToastVariant;
	duration: number;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
	error: 6000,
	success: 4000,
	warning: 5500,
	info: 4000
};

let items = $state<ToastItem[]>([]);

const dismiss = (id: string) => {
	items = items.filter((item) => item.id !== id);
};

const show = (message: string, variant: ToastVariant = 'info', duration?: number) => {
	const trimmed = message.trim();
	if (!trimmed) return null;

	const id = crypto.randomUUID();
	const ms = duration ?? DEFAULT_DURATION[variant];

	items = [...items, { id, message: trimmed, variant, duration: ms }];
	return id;
};

export const toast = {
	get items() {
		return items;
	},
	dismiss,
	show,
	error: (message: string, duration?: number) => show(message, 'error', duration),
	success: (message: string, duration?: number) => show(message, 'success', duration),
	warning: (message: string, duration?: number) => show(message, 'warning', duration),
	info: (message: string, duration?: number) => show(message, 'info', duration)
};
