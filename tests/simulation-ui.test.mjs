import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as physics from '../dist/physics.mjs';
const root=new URL('../dist/',import.meta.url).pathname,elements=new Map(),tabs=[],links=[];let frames=[];
const gradient={addColorStop(){}};const ctx=new Proxy({createRadialGradient(){return gradient},createLinearGradient(){return gradient}}, {get(o,k){if(k in o)return o[k];return (...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`Non-finite canvas value: ${k}`)}},set(o,k,v){o[k]=v;return true}});
class Element{constructor(id=''){this.id=id;this.dataset={};this.children=[];this.events={};this.value='';this.checked=false;this.hidden=false;const c=new Set;this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x),toggle(x,on){on=on??!c.has(x);on?c.add(x):c.delete(x);return on}}}set innerHTML(s){this.html=s;for(const id of this.dynamic||[])elements.delete(id);this.dynamic=parse(s);if(this.id==='readouts')this.children=[...s.matchAll(/class="readout"/g)].map(()=>new Element); }get innerHTML(){return this.html}setAttribute(k,v){this[k]=v}addEventListener(k,f){this.events[k]=f}querySelector(s){this.parts??={};return this.parts[s]??=new Element}getContext(){return ctx}getBoundingClientRect(){return {width:600,height:450,left:0,top:0}}reportValidity(){return true}scrollIntoView(){}focus(){}click(){this.onclick?.({target:this})}}
function parse(s){let ids=[];for(const m of s.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)){const a=m[2],id=a.match(/\bid="([^"]+)"/)?.[1];if(!id)continue;const e=new Element(id);e.value=a.match(/\bvalue="([^"]*)"/)?.[1]||'';e.checked=/\bchecked\b/.test(a);elements.set(id,e);ids.push(id);const lab=a.match(/\bdata-lab="([^"]+)"/)?.[1];if(lab){e.dataset.lab=lab;tabs.push(e)}}return ids}
const html=fs.readFileSync(root+(process.argv[2]||'gravity.html'),'utf8');parse(html);
const document={querySelector:s=>elements.get(s.slice(1))||null,querySelectorAll:s=>s==='[data-lab]'?tabs:links,body:new Element,addEventListener(){},hidden:false};
document.body.dataset.lab=html.match(/<body[^>]*data-lab="([^"]+)"/)[1];
const context={...physics,document,matchMedia:()=>({matches:false}),requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{constructor(f){this.f=f}observe(){this.f()}},devicePixelRatio:1,location:{hash:''},history:{replaceState(){}},console};
vm.createContext(context);const src=fs.readFileSync(root+'app.mjs','utf8').replace(/^import .*?;\n/,'');vm.runInContext(src,context);
const run=s=>vm.runInContext(s,context);assert.equal(run('active'),document.body.dataset.lab);if(process.argv[3]==='initial'){console.log('PASS: direct page initialization for '+document.body.dataset.lab);process.exit(0)}const change=(id,v)=>{const e=elements.get(id);assert.ok(e,`Missing ${id}`);e.value=String(v);(e.onchange||e.events.input)?.({target:e})};
for(const lab of ['gravity','compact','nuclear','waves','pendulum']){run(`switchLab('${lab}')`);for(let i=0;i<20;i++)run('advance(.03);updateReadouts();draw()');elements.get('challenge-button').click();run('advance(.03);draw()');elements.get('reset').click()}
run("switchLab('gravity')");change('central','blackhole');change('mass',2);change('view',7);change('visitor-mass',5);elements.get('place-coords').click();assert.equal(run('state.gravity.bodies.length'),10);for(let i=0;i<30;i++)run('advance(.03);draw()');elements.get('remove-visitor').click();assert.equal(run('state.gravity.bodies.length'),9);change('central','neutron');assert.equal(run('state.gravity.mass'),1.4);
run("switchLab('compact')");change('object','neutron');change('radius',14);change('distance',1.2);run('advance(.1);draw()');assert.ok(run('state.compact.clock<state.compact.time'));
run("switchLab('nuclear')");change('reaction','fission');change('progress',100);run('draw()');assert.equal(run('state.nuclear.progress'),1);
run("switchLab('waves')");elements.get('cancel').click();assert.equal(run('state.waves.phase'),180);change('frequency',2);change('amplitude',2);run('draw()');
run("switchLab('pendulum')");change('world',1.62);change('angle',80);change('damping',.3);for(let i=0;i<100;i++)run('advance(.03);draw()');assert.ok(Number.isFinite(run('state.pendulum.angle')));
for(const [w,h] of [[320,390],[780,750],[1400,900]])run(`W=${w};H=${h};for(const id of Object.keys(labs)){switchLab(id);draw();}`);
console.log('PASS: all five labs initialize, advance, reset, and render with finite canvas coordinates; dynamic controls, black-hole placement/removal, reactions, and narrow/wide canvas sizes exercised. DOM/canvas stubs used; not a browser layout test.');

// Regression cases for controls that previously left stale settings or clipped objects.
for(const lab of ['gravity','compact','nuclear','waves','pendulum']){
 run(`switchLab('${lab}');state[active].time=99;speed=2;resetLab()`);
 assert.equal(run('JSON.stringify(state[active])'),run('JSON.stringify(initialState()[active])'));
 assert.equal(run('running'),false);assert.equal(run('speed'),1);
}
run("switchLab('gravity');setRunning(false)");change('visitor-mass',.1);run('placeVisitor(40,40)');
assert.equal(elements.get('visitor-mass').value,'0.1');assert.ok(run('state.gravity.view>Math.hypot(40,40)'));
assert.equal(run('state.gravity.bodies.at(-1).mass'),.1);
let arcs=[];ctx.arc=(...args)=>arcs.push(args);
run("switchLab('compact');W=320;H=410");let lastDistance=0;
for(const distance of [1.1,4,8,10]){
 arcs=[];run(`state.compact.distance=${distance};drawCompact()`);
 const marker=arcs.find(a=>a[2]===3);assert.ok(marker,'observer marker');
 const measured=Math.hypot(marker[0]-160,marker[1]-410*.39);
 assert.ok(measured>lastDistance,'observer position must respond across entire slider');lastDistance=measured;
 assert.ok(marker[0]>0&&marker[0]<320&&marker[1]>0&&marker[1]<410,'observer stays on canvas');
}
run("switchLab('pendulum')");change('angle',80);assert.ok(elements.get('readouts').children[0].querySelector('strong').innerHTML.startsWith(physics.pendulumPeriod(1.5,9.81,80).toFixed(2)));
console.log('PASS: Reset restores every default and pauses, 0.1-solar-mass selection survives rebuild, distant placements fit the camera, observer movement is monotonic, and the period readout matches the release angle.');
run("switchLab('gravity');startBinary()");const initialSunX=run('state.gravity.bodies[0].x');
for(let i=0;i<100;i++)run('advance(.2)');assert.ok(Math.abs(run('state.gravity.bodies[0].x')-initialSunX)>.01,'Sun visibly moves in center-of-mass frame');assert.equal(run('running'),true);
run("resetLab();state.gravity.launch='infall';placeVisitor(1,0)");
for(let i=0;i<800;i++)run('advance(.1)');assert.equal(run('running'),true,'encounter does not pause');assert.ok(run('state.gravity.bodies.some(b=>b.unresolved)'),'encounter recorded');assert.ok(run('state.gravity.time>.2'),'system continues after encounter');run('draw();updateReadouts()');
run("switchLab('nuclear');resetLab();setRunning(true);advance(61)");assert.equal(run('running'),true,'repeat nuclear sequence continues');assert.equal(run('state.nuclear.cycles'),2);run('draw();updateReadouts()');
console.log('PASS: Sun moves, direct infall combines without stopping, post-encounter readouts render, and 30-second reactions repeat for over a minute.');
run("switchLab('gravity');resetLab();W=900;H=600");
const beforeNavigation=run('JSON.stringify(state.gravity.bodies)');
run('zoomSpace(4);panSpace(100,50)');assert.equal(run('state.gravity.view'),140);assert.notEqual(run('state.gravity.panX'),0);assert.equal(run('state.gravity.autoFit'),false);
run('recenterSpace();fitSpace()');assert.equal(run('state.gravity.panX'),0);assert.ok(run('state.gravity.view>30'));
assert.equal(run('JSON.stringify(state.gravity.bodies)'),beforeNavigation,'navigation cannot change physical positions or velocities');
change('space-scene','galaxy');run('draw();zoomSpace(.5);panSpace(40,20)');assert.equal(run('state.gravity.scene'),'galaxy');assert.equal(run('state.gravity.galaxyView'),30000);run('advance(.1)');assert.ok(run('state.gravity.time>0'),'local physics continues in map view');
change('space-scene','solar');run('panSpace(80,0);placing=true');const expectedX=run('cameraCenter().x+100/(Math.min(W,H-70)/(2*state.gravity.view))');
elements.get('simulation').events.pointerdown({clientX:550,clientY:305});assert.ok(Math.abs(run('state.gravity.bodies.at(-1).x')-expectedX)<1e-9,'placement uses panned camera coordinates');
elements.get('hide-controls').click();assert.equal(document.body.classList.contains('controls-hidden'),true);elements.get('hide-controls').click();assert.equal(document.body.classList.contains('controls-hidden'),false);
console.log('PASS: wide zoom, pan, fit/recenter, map switching without losing physics, panned-coordinate placement, and controls visibility.');

run("switchLab('gravity');resetLab()");assert.equal(run('state.gravity.referenceOrbits'),true);change('mass',2);assert.equal(run('state.gravity.referenceOrbits'),false,'initial circular guides cannot imply the changed trajectories');
run("resetLab();placeVisitor(8,0)");elements.get('remove-visitor').click();assert.equal(run('state.gravity.referenceOrbits'),false,'removing a visitor does not restore original orbits');
run("switchLab('nuclear');state.nuclear.cycles=7;state.nuclear.progress=.8");elements.get('challenge-button').click();assert.equal(run('state.nuclear.cycles'),0);assert.equal(run('state.nuclear.type'),'fission');assert.ok(elements.get('readouts').children[0].querySelector('strong').innerHTML.startsWith('173.3'));
run('state.nuclear.progress=.8;updateReadouts()');elements.get('run-reaction').click();assert.equal(elements.get('progress').value,0,'Run immediately updates the timeline');
run("switchLab('pendulum');resetLab();state.pendulum.g=24.79;state.pendulum.length=.5;state.pendulum.angle0=80;releasePendulum();advance(2)");
assert.ok(run('state.pendulum.history.length>60'),'history sampled during integration');assert.ok(run('state.pendulum.history.every((v,i,a)=>i===0||v[0]-a[i-1][0]<.031)'),'fast playback cannot skip a swing in the history');
// Verify the actual rendered wave ordinates, including full cancellation at the maximum amplitude.
const paths=[];let path=[];ctx.beginPath=()=>path=[];ctx.moveTo=(x,y)=>path.push([x,y]);ctx.lineTo=(x,y)=>path.push([x,y]);ctx.stroke=()=>{if(path.length>100)paths.push(path.slice());};
run("switchLab('waves');W=600;H=450;state.waves.amplitude=2;state.waves.phase=180;state.waves.frequency=2;state.waves.time=.137");paths.length=0;run('drawWaves()');assert.equal(paths.length,3);
const row=(450-38)/3,half=(row-42)/2,scale=half/4;for(let i=0;i<paths[0].length;i++){const values=paths.map((p,j)=>(j*row+26+half-p[i][1])/scale);assert.ok(Math.abs(values[0]+values[1]-values[2])<1e-12);assert.ok(Math.abs(values[2])<1e-12,'drawn resultant cancels');assert.ok(Math.abs(values[0])<=2.000001);}
console.log('PASS: corrected guide behavior, fission Q readout, immediate reaction restart, pendulum history sampling, and rendered wave superposition at maximum settings.');

run("switchLab('gravity');resetLab();panSpace(80,20)");const invalidBefore=run('JSON.stringify(state.gravity)');run('placeVisitor(0,0)');assert.equal(run('JSON.stringify(state.gravity)'),invalidBefore,'invalid placement cannot change the camera or system');console.log('PASS: invalid black-hole placement preserves the existing view and physical state.');
