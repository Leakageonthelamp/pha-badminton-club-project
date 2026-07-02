/**
 * Generates admin-app/src/lib/i18n/messages/en.ts and th.ts with identical keys.
 * Run: node admin-app/scripts/build-admin-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../src/lib/i18n/messages');

/** @type {Record<string, string>} */
const en = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'admin-i18n-en.json'), 'utf8')
);

/** @type {Record<string, string>} */
const th = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'admin-i18n-th.json'), 'utf8')
);

const enKeys = Object.keys(en).sort();
const thKeys = Object.keys(th).sort();
if (enKeys.join('\0') !== thKeys.join('\0')) {
	const missingInTh = enKeys.filter((k) => !th[k]);
	const missingInEn = thKeys.filter((k) => !en[k]);
	throw new Error(
		`Key mismatch. Missing in th: ${missingInTh.length}, missing in en: ${missingInEn.length}`
	);
}

const fmt = (obj, exportName) => {
	const lines = Object.entries(obj)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `\t'${k}': ${JSON.stringify(v)},`);
	return `/** Admin-app strings (${exportName === 'adminEn' ? 'English' : 'Thai'}). Keys must match ${exportName === 'adminEn' ? 'th.ts' : 'en.ts'}. */\nexport const ${exportName}: Record<string, string> = {\n${lines.join('\n')}\n};\n`;
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'en.ts'), fmt(en, 'adminEn'));
fs.writeFileSync(path.join(outDir, 'th.ts'), fmt(th, 'adminTh'));
console.log(`Wrote ${enKeys.length} keys to en.ts and th.ts`);
