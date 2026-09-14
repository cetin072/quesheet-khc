import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const requiredIds = ['root', 'modal', 'modalBody', 'toast'];
for (const id of requiredIds) {
  if (!new RegExp(`id=["']${id}["']`).test(html)) throw new Error(`UAR_UI_CONTRACT_MISSING_ID:${id}`);
}

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) throw new Error(`UAR_UI_CONTRACT_DUPLICATE_IDS:${duplicates.join(',')}`);

if (!html.includes('name="application-version" content="1.10.3"')) throw new Error('UAR_UI_CONTRACT_APP_VERSION_MISSING');
if (!html.includes('rel="manifest" href="/manifest.webmanifest"')) throw new Error('UAR_UI_CONTRACT_MANIFEST_MISSING');

const assets = [
  '/assets/app-v1.10.3.css',
  '/assets/templates-v1.10.3.js',
  '/assets/app-core-v1.10.3.js',
  '/assets/app-v1.10.3.js'
];
for (const asset of assets) {
  if (!html.includes(asset)) throw new Error(`UAR_UI_CONTRACT_ASSET_LINK_MISSING:${asset}`);
  if (!fs.existsSync(asset.replace(/^\//, ''))) throw new Error(`UAR_UI_CONTRACT_ASSET_FILE_MISSING:${asset}`);
}

const app = fs.readFileSync('assets/app-v1.10.3.js', 'utf8');
for (const marker of ['id="optionsBtn"', 'id="searchToggle"', 'id="searchPanel"']) {
  if (!app.includes(marker)) throw new Error(`UAR_UI_CONTRACT_DYNAMIC_HOME_MARKER_MISSING:${marker}`);
}

const sw = fs.readFileSync('sw.js', 'utf8');
for (const asset of assets) {
  const name = asset.replace(/^\//, '');
  if (!sw.includes(name)) throw new Error(`UAR_UI_CONTRACT_SW_ASSET_MISSING:${name}`);
}

console.log(`UAR_UI_CONTRACT_PASS shell_ids=${requiredIds.length} versioned_assets=${assets.length}`);
