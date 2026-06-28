import sanitizeHtml from 'sanitize-html';

const allowedColor = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/;

export const sanitizeRichText = (html: string): string =>
	sanitizeHtml(html.trim(), {
		allowedTags: ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'span', 'mark'],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
			span: ['style'],
			mark: ['style', 'data-color']
		},
		allowedStyles: {
			'*': {
				color: [allowedColor],
				'background-color': [allowedColor]
			}
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer'
			})
		}
	});
