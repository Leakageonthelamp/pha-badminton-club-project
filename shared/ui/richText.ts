/** Strip HTML tags for length / empty checks (client + server safe). */
export const richTextPlainText = (html: string): string =>
	html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

export const isRichTextEmpty = (html: string): boolean => !richTextPlainText(html);

export const richTextPlainTextLength = (html: string): number => richTextPlainText(html).length;

/** Short plain-text excerpt for list cards. */
export const richTextExcerpt = (html: string, maxLength = 120): string => {
	const text = richTextPlainText(html);
	if (!text) return '';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};
