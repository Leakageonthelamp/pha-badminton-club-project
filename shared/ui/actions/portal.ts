export function portal(node: HTMLElement, target: string | HTMLElement = document.body) {
	const targetEl =
		typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;

	if (!targetEl) {
		console.warn('portal: target not found');
		return;
	}

	targetEl.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
}
