import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const previewUrl = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!previewUrl) throw new Error('UAR_VISUAL_PREVIEW_URL_MISSING');
const parsed = new URL(previewUrl);
if (!parsed.hostname.includes('deploy-preview-')) throw new Error(`UAR_VISUAL_NOT_DEPLOY_PREVIEW:${parsed.hostname}`);

function findChrome() {
  for (const candidate of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    try {
      const path = execFileSync('sh',['-lc',`command -v ${candidate}`],{encoding:'utf8'}).trim();
      if (path) return path;
    } catch {}
  }
  throw new Error('UAR_VISUAL_CHROME_NOT_FOUND');
}

const response = await fetch(`${previewUrl}/`, { cache:'no-store', redirect:'follow' });
if (!response.ok) throw new Error(`UAR_VISUAL_PREVIEW_ROOT_HTTP_${response.status}`);
let html = await response.text();
if (!html.includes('id="root"')) throw new Error('UAR_VISUAL_ROOT_MISSING');

html = html.replace(/\b(src|href)=(["'])(\/[^"']+)\2/g, (_match, attr, quote, resource) => `${attr}=${quote}${previewUrl}${resource}${quote}`);
html = html.replace(/<script>\s*\/\/ 주소 끝에 \?reset=1[\s\S]*?<\/script>/, '');

const probe = `<script>
(() => {
  const round = value => Math.round(value * 10) / 10;
  const snap = selectors => ({
    viewport:[window.innerWidth, window.innerHeight],
    scrollHeight:document.documentElement.scrollHeight,
    nodes:Object.fromEntries(selectors.map(selector => {
      const node = document.querySelector(selector);
      if (!node) return [selector,null];
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return [selector,{x:round(rect.x),y:round(rect.y),width:round(rect.width),height:round(rect.height),display:style.display,visibility:style.visibility,opacity:style.opacity}];
    }))
  });
  const sampleSeries = (selectors, count = 8, interval = 200) => new Promise(resolve => {
    const samples=[];
    const timer=setInterval(() => {
      samples.push(snap(selectors));
      if (samples.length < count) return;
      clearInterval(timer);
      resolve(samples);
    }, interval);
  });
  const stable = samples => {
    const serialized=samples.map(item => JSON.stringify(item));
    return serialized.every(item => item === serialized[0]);
  };
  const finish = (result, detail) => {
    const node=document.createElement('div');
    node.id='uarVisualStabilityResult';
    node.dataset.result=result;
    node.dataset.detail=detail;
    node.hidden=true;
    document.body.append(node);
  };
  window.addEventListener('load', () => {
    setTimeout(async () => {
      const homeSelectors=['#root','#optionsBtn','#searchToggle'];
      const home=await sampleSeries(homeSelectors);
      const homeMissing=Object.entries(home[0].nodes).filter(([,value]) => !value).map(([key]) => key);
      if (homeMissing.length) return finish('FAIL','home-missing:'+homeMissing.join(','));
      if (!stable(home)) return finish('FAIL','home-layout-changed');

      const toggle=document.getElementById('searchToggle');
      toggle.click();
      setTimeout(async () => {
        const searchSelectors=['#root','#optionsBtn','#searchToggle','#searchPanel'];
        const search=await sampleSeries(searchSelectors);
        const searchMissing=Object.entries(search[0].nodes).filter(([,value]) => !value).map(([key]) => key);
        if (searchMissing.length) return finish('FAIL','search-missing:'+searchMissing.join(','));
        if (!stable(search)) return finish('FAIL','search-layout-changed');
        finish('PASS','home:8;search:8;viewport:mobile;geometry:stable');
      }, 500);
    }, 1200);
  }, { once:true });
})();
</script>`;
html = html.replace('</body>', `${probe}</body>`);

const temp = mkdtempSync(join(tmpdir(),'quesheet-uar-visual-'));
const fixture = join(temp,'preview-visual-fixture.html');
writeFileSync(fixture, html, 'utf8');
const chrome = findChrome();
const result = spawnSync(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions',
  '--no-first-run','--no-default-browser-check','--allow-file-access-from-files',
  '--window-size=412,915','--virtual-time-budget=7500','--dump-dom',`file://${fixture}`
],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
const dom = String(result.stdout || '');
const stderr = String(result.stderr || '');
rmSync(temp,{recursive:true,force:true});
if (!dom.trim()) throw new Error(`UAR_VISUAL_EMPTY_DOM:${String(result.error?.message || '')}:${stderr.slice(-1000)}`);

const marker = dom.match(/id="uarVisualStabilityResult"[^>]*data-result="([^"]+)"[^>]*data-detail="([^"]*)"/);
if (!marker) throw new Error('UAR_VISUAL_RESULT_MISSING');
if (marker[1] !== 'PASS') throw new Error(`UAR_VISUAL_STABILITY_FAILED:${marker[2]}`);
if (!dom.includes(`${previewUrl}/assets/app-v1.10.3.js`)) throw new Error('UAR_VISUAL_PREVIEW_APP_ASSET_SOURCE_MISSING');

console.log(`UAR_VISUAL_STABILITY_PASS chrome=${chrome} ${marker[2]} preview_assets=true`);
