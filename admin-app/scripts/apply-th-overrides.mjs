/**
 * Merges th-overrides.json into admin-i18n-th.json and rebuilds th.ts.
 * Run: node admin-app/scripts/apply-th-overrides.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, string>} */
const th = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'admin-i18n-th.json'), 'utf8')
);

/** @type {Record<string, string>} */
const overrides = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'th-overrides.json'), 'utf8')
);

let applied = 0;
for (const [key, value] of Object.entries(overrides)) {
	if (!(key in th)) {
		throw new Error(`Override key not in admin-i18n-th.json: ${key}`);
	}
	th[key] = value;
	applied++;
}

fs.writeFileSync(
	path.join(__dirname, 'admin-i18n-th.json'),
	JSON.stringify(th, null, 2) + '\n'
);

execSync('node admin-app/scripts/build-admin-i18n.mjs', {
	stdio: 'inherit',
	cwd: path.join(__dirname, '../..')
});

console.log(`Applied ${applied} overrides to admin-i18n-th.json`);
