import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_HIDDEN_REVALIDATE_MS, attachVisibilityRevalidate } from './visibilityRevalidate';

describe('attachVisibilityRevalidate', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('revalidates only after hidden longer than threshold', () => {
		const onRevalidate = vi.fn();
		const listeners = new Map<string, Set<EventListener>>();
		let visibilityState: DocumentVisibilityState = 'visible';

		vi.stubGlobal('document', {
			get visibilityState() {
				return visibilityState;
			},
			addEventListener(type: string, listener: EventListener) {
				if (!listeners.has(type)) listeners.set(type, new Set());
				listeners.get(type)!.add(listener);
			},
			removeEventListener(type: string, listener: EventListener) {
				listeners.get(type)?.delete(listener);
			},
			dispatchEvent(event: Event) {
				listeners.get(event.type)?.forEach((listener) => listener(event));
				return true;
			}
		});

		const dispatch = () => {
			document.dispatchEvent(new Event('visibilitychange'));
		};

		const detach = attachVisibilityRevalidate(onRevalidate, 30_000);

		visibilityState = 'hidden';
		dispatch();

		vi.spyOn(Date, 'now').mockReturnValue(10_000);
		visibilityState = 'visible';
		dispatch();
		expect(onRevalidate).not.toHaveBeenCalled();

		visibilityState = 'hidden';
		dispatch();

		vi.mocked(Date.now).mockReturnValue(50_000);
		visibilityState = 'visible';
		dispatch();
		expect(onRevalidate).toHaveBeenCalledOnce();

		detach();
	});
});

describe('APP_HIDDEN_REVALIDATE_MS', () => {
	it('defaults to 30 seconds', () => {
		expect(APP_HIDDEN_REVALIDATE_MS).toBe(30_000);
	});
});
