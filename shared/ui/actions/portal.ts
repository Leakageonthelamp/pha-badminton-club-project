/** ponytail: append to body so `fixed` is viewport-relative, not trapped in `.app-scroll` */
export const portal = (node: HTMLElement, target: ParentNode = document.body) => {
	target.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
};
