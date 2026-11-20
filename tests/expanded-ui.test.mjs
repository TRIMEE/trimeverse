import {PHET_MODELS,labTime,labMetrics} from '../dist/phet-models.mjs';
import {createPhetRenderers} from '../dist/phet-renderers.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {MODELS} from '../dist/lab-models.mjs';import {LABS,CATALOG} from '../dist/lab-library.mjs';
const dist=new URL('../dist/',import.meta.url),src=fs.readFileSync(new URL('classical-labs.mjs',dist),'utf8').replace(/^import .*;\n/gm,'');
for(const [id,lab] of Object.entries(LABS)){
 const elements=new Map(),frames=[],documentEvents={};let draws=0;
 const ctx=new Proxy({measureText(s){return {width:String(s).length*7}}},{get(o,k){if(k in o)return o[k];return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`${id}: non-finite ${k}`);draws++;}},set(o,k,v){o[k]=v;return true}});
 class Element{
  constructor(id=''){this.id=id;this.value='';this.events={};this.dataset={};const classes=new Set;this.classList={contains:x=>classes.has(x),remove:x=>classes.delete(x),toggle(x){classes.has(x)?classes.delete(x):classes.add(x);return classes.has(x)}};}
  set innerHTML(s){this.html=s;if(this.id==='controls'){for(const [id] of elements)if(id.startsWith('setting-')||id.startsWith('value-'))elements.delete(id);parse(s);}}get innerHTML(){return this.html}
  setAttribute(k,v){this[k]=v}addEventListener(k,f){this.events[k]=f}getContext(){return ctx}getBoundingClientRect(){return {width:720,height:480}}scrollIntoView(){}click(){this.events.click?.({target:this})}
 }
 function parse(s){for(const tag of s.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)){const attr=tag[2],id=attr.match(/\bid="([^"]+)"/)?.[1];if(id){const e=new Element(id);e.value=attr.match(/\bvalue="([^"]*)"/)?.[1]||'';e.min=Number(attr.match(/\bmin="([^"]*)"/)?.[1]);e.max=Number(attr.match(/\bmax="([^"]*)"/)?.[1]);elements.set(id,e);}}}
 const html=fs.readFileSync(new URL(lab.file,dist),'utf8');parse(html);assert.ok(html.includes(`data-new-lab="${id}"`));
 const document={body:new Element,getElementById:id=>elements.get(id),addEventListener:(e,f)=>documentEvents[e]=f,hidden:false};document.body.dataset.newLab=id;
 const context={PHET_MODELS,labTime,labMetrics,createPhetRenderers,MODELS,LABS,document,location:{href:''},matchMedia:()=>({matches:false}),devicePixelRatio:2,ResizeObserver:class{constructor(f){this.f=f}observe(){this.f()}},requestAnimationFrame:f=>frames.push(f)};vm.createContext(context);vm.runInContext(src,context);
 const run=s=>vm.runInContext(s,context),change=(key,value)=>{const e=elements.get('setting-'+key);assert.ok(e);e.value=String(value);(e.events.input||e.events.change)({target:e});};
 assert.equal(run('id'),id);assert.ok(elements.get('readouts').innerHTML.includes('readout'));assert.equal(run('running'),!lab.static);
 // Exercise every slider and selection at both boundaries, with long-running and responsive diagrams.
 for(const field of lab.controls)for(const v of field.options?field.options.map(([v])=>v):[field.min,field.max]){change(field.key,v);run('advance(.1);refresh()');assert.equal(run('elapsed'),lab.static?0:.1);}
 elements.get('challenge-button').click();assert.equal(run('elapsed'),0);for(const [w,h] of [[280,440],[600,480],[1200,600]])for(const t of [0,12,25,29,31,1000])run(`W=${w};H=${h};elapsed=${t};refresh()`);
 assert.ok(!elements.get('readouts').innerHTML.includes('NaN'));assert.ok(!elements.get('readouts').innerHTML.includes('Infinity'));
 if(id==='lens'){change('type','converging');change('focal',15);change('distance',15);run('refresh()');assert.ok(elements.get('readouts').innerHTML.includes('At infinity'));}
 if(id==='circuit'){change('voltage',0);run('refresh()');assert.equal(run('result().current'),0);}
 if(id==='capacitor'){change('mode','connected');assert.equal(elements.get('setting-charge').disabled,true);change('mode','isolated');assert.equal(elements.get('setting-voltage').disabled,true);}
 if(id==='fields'){change('q1',2);change('x',-.5);change('y',0);assert.ok(elements.get('readouts').innerHTML.includes('Too close'));}
 if(id==='standing'){change('mode',6);change('length',.5);assert.ok(run('p.amplitude*p.mode*Math.PI/p.length<=.2'));assert.equal(elements.get('setting-amplitude').max,run('p.amplitude'));}
 elements.get('cinema').click();assert.ok(document.body.classList.contains('focus-mode'));documentEvents.keydown({key:'Escape'});assert.equal(document.body.classList.contains('focus-mode'),false);
 elements.get('reset').click();assert.equal(run('JSON.stringify(p)'),JSON.stringify(lab.defaults));assert.equal(run('elapsed'),0);assert.equal(run('running'),false);assert.equal(run('speed'),1);
 if(!lab.static){elements.get('play').click();run('advance(61);refresh()');assert.equal(run('running'),true);assert.equal(run('elapsed'),61);elements.get('play').click();run('advance(1)');assert.equal(run('elapsed'),61);}
 else assert.equal(elements.get('play').disabled,true);
 elements.get('lab-picker').events.change({target:{value:'/gravity.html'}});assert.equal(context.location.href,'/gravity.html');
 assert.ok(draws>100);assert.ok(frames.length);console.log(`PASS: ${lab.name} initialization, controls, long playback, reset, challenge, navigation, and finite narrow/wide canvas drawing.`);
}
// Every lab is linked from the catalog, local assets exist, and no duplicate IDs were introduced.
const catalog=fs.readFileSync(new URL('simulations.html',dist),'utf8');assert.equal((catalog.match(/class="simulation-card"/g)||[]).length,CATALOG.length);for(const lab of CATALOG)assert.ok(catalog.includes(`href="/${lab.file}"`));
for(const file of fs.readdirSync(dist).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(new URL(file,dist),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`${file}: duplicate IDs`);for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){let url=m[1].split(/[?#]/)[0];if(/^(https?:|data:)/.test(url))continue;url=url.replace(/^\//,'')||'index.html';assert.ok(fs.existsSync(new URL(url,dist)),`${file}: missing ${url}`);}}
console.log(`PASS: ${CATALOG.length} catalog entries, all local routes/assets, and unique page IDs. DOM/canvas mocks used; not a browser layout test.`);
