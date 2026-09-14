import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const previewUrl = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!previewUrl) throw new Error('UAR_SMOKE_PREVIEW_URL_MISSING');
const parsed = new URL(previewUrl);
if (!parsed.hostname.includes('deploy-preview-')) throw new Error(`UAR_SMOKE_NOT_DEPLOY_PREVIEW:${parsed.hostname}`);

function findChrome() {
  for (const candidate of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    try {
      const path = execFileSync('sh',['-lc',`command -v ${candidate}`],{encoding:'utf8'}).trim();
      if (path) return path;
    } catch {}
  }
  throw new Error('UAR_SMOKE_CHROME_NOT_FOUND');
}

const response = await fetch(`${previewUrl}/`, { cache:'no-store', redirect:'follow' });
if (!response.ok) throw new Error(`UAR_SMOKE_PREVIEW_ROOT_HTTP_${response.status}`);
let html = await response.text();
if (!html.includes('id="root"')) throw new Error('UAR_SMOKE_ROOT_MISSING');

// Run the exact JavaScript/CSS URLs served by this Preview in an isolated local
// document. This prevents service-worker/background browser noise from masking
// the deterministic question: can the deployed app assets build the home UI?
html = html.replace(/\b(src|href)=(["'])(\/[^"']+)\2/g, (_match, attr, quote, resource) => `${attr}=${quote}${previewUrl}${resource}${quote}`);
html = html.replace(/<script>\s*\/\/ 주소 끝에 \?reset=1[\s\S]*?<\/script>/, '');

// searchPanel is intentionally not mounted on the initial home DOM. Exercise the
// real deployed search toggle and verify the panel appears after the interaction.
const interaction = `<script>
window.addEventListener('load', () => {
  setTimeout(() => {
    const toggle = document.getElementById('searchToggle');
    if (!toggle) {
      document.documentElement.dataset.uarSearch = 'toggle-missing';
      return;
    }
    toggle.click();
    document.documentElement.dataset.uarSearch = document.getElementById('searchPanel') ? 'opened' : 'panel-missing';
  }, 100);
});
</script>`;
html = html.replace('</body>', `${interaction}</body>`);

const temp = mkdtempSync(join(tmpdir(),'quesheet-uar-'));
const fixture = join(temp,'preview-fixture.html');
writeFileSync(fixture, html, 'utf8');
const chrome = findChrome();
const result = spawnSync(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions',
  '--no-first-run','--no-default-browser-check','--allow-file-access-from-files',
  '--virtual-time-budget=5000','--dump-dom',`file://${fixture}`
],{encoding:'utf8',timeout:25000,maxBuffer:8*1024*1024});
const dom = String(result.stdout || '');
const stderr = String(result.stderr || '');
rmSync(temp,{recursive:true,force:true});
if (!dom.trim()) throw new Error(`UAR_SMOKE_EMPTY_DOM:${String(result.error?.message || '')}:${stderr.slice(-1000)}`);

for (const marker of ['id="optionsBtn"','id="searchToggle"']) {
  if (!dom.includes(marker)) throw new Error(`UAR_SMOKE_INITIAL_HOME_MARKER_MISSING:${marker}`);
}
if (!dom.includes('data-uar-search="opened"')) {
  const state = dom.match(/data-uar-search="([^"]+)"/)?.[1] || 'missing';
  throw new Error(`UAR_SMOKE_SEARCH_INTERACTION_FAILED:${state}`);
}
if (!dom.includes('id="searchPanel"')) throw new Error('UAR_SMOKE_SEARCH_PANEL_NOT_RENDERED_AFTER_CLICK');
if (!dom.includes(`${previewUrl}/assets/app-v1.10.3.js`)) throw new Error('UAR_SMOKE_PREVIEW_APP_ASSET_SOURCE_MISSING');
if (/Page not found|Site not found|Application Error/i.test(dom)) throw new Error('UAR_SMOKE_FATAL_PAGE_ERROR_VISIBLE');

console.log(`UAR_REPRESENTATIVE_SMOKE_PASS chrome=${chrome} preview_assets=true dynamic_home=true search_interaction=true`);
