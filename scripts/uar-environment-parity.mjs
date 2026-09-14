const previewUrl = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!previewUrl) throw new Error('UAR_ENV_PREVIEW_URL_MISSING');
const base = new URL(previewUrl);
if (base.protocol !== 'https:' || !base.hostname.includes('deploy-preview-')) throw new Error(`UAR_ENV_NOT_DEPLOY_PREVIEW:${base.href}`);

async function get(pathname) {
  const response = await fetch(new URL(pathname, `${previewUrl}/`), { cache: 'no-store', redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) throw new Error(`UAR_ENV_HTTP_${response.status}:${pathname}`);
  return { response, text };
}

const index = await get('/index.html');
const indexCache = String(index.response.headers.get('cache-control') || '').toLowerCase();
if (!indexCache.includes('no-cache') || !indexCache.includes('no-store')) throw new Error(`UAR_ENV_INDEX_CACHE_POLICY_BAD:${indexCache}`);

const sw = await get('/sw.js');
const swCache = String(sw.response.headers.get('cache-control') || '').toLowerCase();
if (!swCache.includes('no-cache') || !swCache.includes('no-store')) throw new Error(`UAR_ENV_SW_CACHE_POLICY_BAD:${swCache}`);

const manifest = await get('/manifest.webmanifest');
let manifestJson;
try { manifestJson = JSON.parse(manifest.text); } catch { throw new Error('UAR_ENV_MANIFEST_INVALID_JSON'); }
if (!String(manifestJson?.name || manifestJson?.short_name || '').trim()) throw new Error('UAR_ENV_MANIFEST_NAME_MISSING');

const assets = ['/assets/app-v1.10.3.css','/assets/templates-v1.10.3.js','/assets/app-core-v1.10.3.js','/assets/app-v1.10.3.js'];
for (const asset of assets) {
  const result = await get(asset);
  if (!result.text.trim()) throw new Error(`UAR_ENV_EMPTY_ASSET:${asset}`);
  if (!index.text.includes(asset)) throw new Error(`UAR_ENV_INDEX_ASSET_MISMATCH:${asset}`);
}
for (const asset of assets) {
  if (!sw.text.includes(asset.replace(/^\//, '')) && !sw.text.includes(asset)) throw new Error(`UAR_ENV_SW_ASSET_MISMATCH:${asset}`);
}

console.log(`UAR_ENVIRONMENT_PARITY_PASS preview=${base.hostname} assets=${assets.length} cache_headers=true`);
