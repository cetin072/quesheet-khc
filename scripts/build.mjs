import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const siteUrlRaw = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
const siteUrl = siteUrlRaw ? new URL('/', siteUrlRaw).href.replace(/\/$/, '') : '';
const imagePath = '/og-thumbnail-v1.5.jpg';

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const copyTargets = [
  'assets', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest',
  'og-thumbnail-v1.5.jpg', 'reset.html', 'sw.js', '_headers', '_redirects'
];
for (const target of copyTargets) {
  await cp(resolve(root, target), resolve(dist, target), { recursive: true });
}

let html = await readFile(resolve(root, 'index.html'), 'utf8');
if (siteUrl) {
  const pageUrl = `${siteUrl}/`;
  const imageUrl = `${siteUrl}${imagePath}`;
  html = html
    .replace('property="og:image" content="/og-thumbnail-v1.5.jpg"', `property="og:image" content="${imageUrl}"`)
    .replace('property="og:image:secure_url" content="/og-thumbnail-v1.5.jpg"', `property="og:image:secure_url" content="${imageUrl}"`)
    .replace('name="twitter:image" content="/og-thumbnail-v1.5.jpg"', `name="twitter:image" content="${imageUrl}"`)
    .replace('<!-- NETLIFY_ABSOLUTE_META -->', `<link rel="canonical" href="${pageUrl}">\n<meta property="og:url" content="${pageUrl}">`);
  console.log(`Open Graph URL injected: ${pageUrl}`);
} else {
  console.warn('Netlify URL environment variable was unavailable. Relative OG image fallback remains.');
}
await writeFile(resolve(dist, 'index.html'), html, 'utf8');
