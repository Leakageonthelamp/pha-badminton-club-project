import sanitizeHtml from 'sanitize-html';

export const sanitizeRichText = (html: string): string =>
	sanitizeHtml(html.trim(), {
		allowedTags: ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br'],
		allowedAttributes: {
			a: ['href', 'target', 'rel']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				target: '_blank',
				rel: 'noopener noreferrer'
			})
		}
	});
