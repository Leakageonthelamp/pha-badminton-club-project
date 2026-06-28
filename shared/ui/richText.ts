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

const collapseHtml = (html: string): string => html.replace(/>\s+</g, '><').trim();

/** True when two rich-text values are equivalent (plain text vs TipTap `<p>` wrap, etc.). */
export const richTextEquivalent = (a: string, b: string): boolean => {
	const left = a.trim();
	const right = b.trim();
	if (left === right) return true;
	if (isRichTextEmpty(left) && isRichTextEmpty(right)) return true;
	if (collapseHtml(left) === collapseHtml(right)) return true;

	const plainLeft = richTextPlainText(left);
	const plainRight = richTextPlainText(right);
	if (plainLeft !== plainRight) return false;

	// Same visible text — plain DB value vs TipTap HTML wrapper is not a change.
	const leftHasTags = /<[a-z][^>]*>/i.test(left);
	const rightHasTags = /<[a-z][^>]*>/i.test(right);
	if (!leftHasTags || !rightHasTags) return true;

	// Both HTML with same plain text but different markup (e.g. bold) — changed.
	return false;
};
