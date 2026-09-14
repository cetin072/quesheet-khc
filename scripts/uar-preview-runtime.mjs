const previewUrl = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!previewUrl) throw new Error('UAR_PREVIEW_RUNTIME_URL_MISSING');
const base = new URL(previewUrl);
if (base.protocol !== 'https:' || !base.hostname.includes('deploy-preview-')) throw new Error(`UAR_PREVIEW_RUNTIME_NOT_PREVIEW:${base.href}`);

async function get(pathname) {
  const response = await fetch(new URL(pathname, `${previewUrl}/`), { cache: 'no-store', redirect: 'follow' });
  const body = await response.text();
  if (!response.ok) throw new Error(`UAR_PREVIEW_RUNTIME_HTTP_${response.status}:${pathname}`);
  return body;
}

const root = await get('/');
for (const marker of ['행사 큐시트 프로그램','name="application-version" content="1.10.3"','id="root"','id="modal"','id="toast"']) {
  if (!root.includes(marker)) throw new Error(`UAR_PREVIEW_RUNTIME_ROOT_MARKER_MISSING:${marker}`);
}

const assets = ['/assets/app-v1.10.3.css','/assets/templates-v1.10.3.js','/assets/app-core-v1.10.3.js','/assets/app-v1.10.3.js','/manifest.webmanifest','/sw.js'];
for (const asset of assets) {
  const body = await get(asset);
  if (!body.trim()) throw new Error(`UAR_PREVIEW_RUNTIME_EMPTY_ASSET:${asset}`);
  if (/Page not found|Not Found/i.test(body.slice(0, 500))) throw new Error(`UAR_PREVIEW_RUNTIME_NOT_FOUND_BODY:${asset}`);
}

console.log(`UAR_PREVIEW_RUNTIME_PASS ${previewUrl} version=1.10.3 assets=${assets.length}`);
