import assert from 'node:assert/strict';
import {G,AU_KMS,solarSystem,gravityStep,safeStep,closeEncounter,energy,clockRate,waveAmplitude,pendulumPeriod,pendulumStep,REACTIONS} from '../dist/physics.mjs';
const near=(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} vs ${b}`);
// Independent orbital benchmarks in AU, years and solar masses.
const circular=[{mass:1,x:0,y:0,vx:0,vy:0},{mass:0,x:1,y:0,vx:0,vy:2*Math.PI}];
for(let i=0;i<10000;i++)gravityStep(circular,.0001);
near(circular[1].x,1,1e-6,'one-year orbit x');near(circular[1].y,0,1e-5,'one-year orbit y');near(2*Math.PI*AU_KMS,29.785,0.002,'Earth circular speed km/s');
const system=solarSystem(),initialEnergy=energy(system);
for(let i=0;i<15000;i++)gravityStep(system,.0001);
assert.ok(Math.abs((energy(system)-initialEnergy)/initialEnergy)<1e-7,'solar-system energy drift');
const star=solarSystem(),hole=solarSystem();hole[0].kind='blackhole';for(let i=0;i<1000;i++){gravityStep(star,.0001);gravityStep(hole,.0001)}near(star[3].x,hole[3].x,1e-12,'same-mass black hole gravity');
assert.ok(safeStep([{mass:1,x:0,y:0},{mass:10,x:.02,y:0}])<safeStep([{mass:1,x:0,y:0},{mass:10,x:1,y:0}]));
assert.deepEqual(closeEncounter([{name:'A',mass:1,x:0,y:0},{name:'B',mass:1,x:.01,y:0}]),['A','B']);
near(clockRate(5,4*2.95325*5),Math.sqrt(.75),1e-12,'clock at four Schwarzschild radii');assert.ok(clockRate(5,100)>clockRate(5,20));
for(const phase of [0,60,90,180,270,360]){let peak=0;for(let i=0;i<10000;i++){const x=2*Math.PI*i/10000;peak=Math.max(peak,Math.abs(Math.sin(x)+Math.sin(x+phase*Math.PI/180)))}near(waveAmplitude(1,phase),peak,1e-6,'wave sum peak '+phase)}
// Measure successive downward zero crossings of the nonlinear ODE independently
// from the elliptic-integral period; checks Earth and Moon, including 80-degree swings.
for(const g of [9.81,1.62])for(const degrees of [5,25,80]){
 const s={angle:degrees*Math.PI/180,omega:0},crossings=[];let time=0;
 while(crossings.length<2&&time<40){const old=s.angle;pendulumStep(s,.001,1.5,g,0);if(old>0&&s.angle<=0)crossings.push(time+.001*old/(old-s.angle));time+=.001;}
 near(pendulumPeriod(1.5,g,degrees),crossings[1]-crossings[0],1e-5,'nonlinear period '+g+'/'+degrees);
}
near(pendulumPeriod(1,9.81,0),2*Math.PI/Math.sqrt(9.81),1e-12,'small-angle limit');assert.ok(pendulumPeriod(1.5,9.81,80)>pendulumPeriod(1.5,9.81,5));
const damped={angle:1,omega:0},E=s=>9.81*(1-Math.cos(s.angle))+.5*s.omega**2;let previous=E(damped);for(let i=0;i<2000;i++){pendulumStep(damped,.005,1,9.81,.3);assert.ok(E(damped)<=previous+1e-9,'damping cannot add energy');previous=E(damped)}
for(const reaction of Object.values(REACTIONS))for(const type of ['p','n'])assert.equal(reaction.initial.reduce((a,b)=>a+b[type],0),reaction.final.reduce((a,b)=>a+b[type],0),'reaction conserves '+type);
console.log('PASS: orbital period/speed, gravity energy conservation, equal-mass comparison, close-encounter resolution, clock rates, wave peaks, finite-angle periods, damping and reaction balance.');

const {centerOfMass,resolveEncounters,reactionProducts}=await import('../dist/physics.mjs');
// Isolated binary: both masses move, separation stays circular, barycenter stays fixed.
const v=Math.sqrt(G*6/8),binary=[{name:'Sun',kind:'star',mass:1,x:-8*5/6,y:0,vx:0,vy:-v*5/6,trail:[]},{name:'BH',kind:'blackhole',mass:5,x:8/6,y:0,vx:0,vy:v/6,trail:[]}];
const period=Math.sqrt(8**3/6),start=structuredClone(binary);
for(let i=0;i<20000;i++)gravityStep(binary,period/20000);
near(binary[0].x,start[0].x,1e-5,'Sun completes barycentric orbit');near(binary[1].x,start[1].x,1e-5,'black hole completes barycentric orbit');near(centerOfMass(binary).x,0,1e-10,'binary barycenter');
const colliders=[{name:'Sun',kind:'star',mass:1,x:0,y:0,vx:3,vy:2,color:'#ffffff',trail:[]},{name:'BH',kind:'blackhole',mass:5,x:.001,y:0,vx:-1,vy:4,color:'#ffffff',trail:[]}];const cmBefore=centerOfMass(colliders),LBefore=colliders.reduce((a,b)=>a+b.mass*(b.x*b.vy-b.y*b.vx),0);assert.equal(resolveEncounters(colliders).length,1);assert.equal(colliders.length,1);const cmAfter=centerOfMass(colliders);for(const k of ['mass','x','y','vx','vy'])near(cmAfter[k],cmBefore[k],1e-12,'encounter conserves '+k);near(colliders[0].spinMomentum+cmAfter.mass*(cmAfter.x*cmAfter.vy-cmAfter.y*cmAfter.vx),LBefore,1e-12,'unresolved angular momentum retained');
for(const type of ['fusion','fission'])for(const spread of [0,1,100]){const products=reactionProducts(type,spread);for(const k of ['x','y'])near(products.reduce((sum,p)=>sum+p.mass*p[k],0),0,1e-10,'zero product momentum '+type);for(const k of ['p','n'])assert.equal(products.reduce((sum,p)=>sum+p[k],0),REACTIONS[type].initial.reduce((sum,p)=>sum+p[k],0));}
console.log('PASS: mutual binary orbit, encounter mass/linear/angular momentum bookkeeping, and nuclear product momentum and nucleon balance.');

// Regression: the old free-fall-only timestep let fast planets cross unnoticed.
const {encounterRadius,reactionReactants,reactionMassDefect,protonAt}=await import('../dist/physics.mjs');
function fastPair(offset=0){return [{name:'Earth',kind:'planet',mass:3.003e-6,x:-.001,y:0,vx:100,vy:0,trail:[]},{name:'Earth',kind:'planet',mass:3.003e-6,x:.001,y:offset,vx:-100,vy:0,trail:[]}];}
const fast=fastPair(),contact=encounterRadius(...fast),contactTime=(.002-contact)/200;let elapsed=0,count=0;
while(fast.length>1&&count++<1000){const h=safeStep(fast);assert.ok(200*h<=.020001*Math.hypot(fast[1].x-fast[0].x,fast[1].y-fast[0].y));gravityStep(fast,h);elapsed+=h;resolveEncounters(fast);}
assert.equal(fast.length,1,'fast collision must be detected');near(elapsed,contactTime,contactTime*.02,'fast collision time');near(fast[0].mass,6.006e-6,1e-15,'fast collision mass');near(fast[0].vx,0,1e-12,'fast collision momentum');
const miss=fastPair(.0002);let missTime=0;while(missTime<.000025){const h=Math.min(safeStep(miss),.000025-missTime);gravityStep(miss,h);missTime+=h;assert.equal(resolveEncounters(miss).length,0,'a fast near miss must not be merged');}
// Channel-specific mass defects from AME2020, rather than generic reactor energy.
near(REACTIONS.fusion.energy,17.5893,.0001,'D-T channel Q value');near(REACTIONS.fission.energy,173.278,.001,'Ba-141/Kr-92 channel Q value');near(reactionMassDefect('fission'),.1860215402,1e-9,'fission atomic-mass deficit');
for(const type of ['fusion','fission'])for(const separation of [0,1,30,100]){
 const reactants=reactionReactants(type,separation);near(reactants.reduce((a,b)=>a+b.mass*b.x,0),0,1e-10,'reactant center of mass '+type);
 for(const species of ['p','n'])assert.equal(reactants.reduce((a,b)=>a+b[species],0),REACTIONS[type].initial.reduce((a,b)=>a+b[species],0));
}
const recoil1=reactionReactants('fission',100),recoil2=reactionReactants('fission',50);near((recoil2[0].x-recoil1[0].x)/(recoil2[1].x-recoil1[1].x),-1/235,1e-12,'uranium recoil versus incoming neutron');
for(const [p,n] of [[92,143],[92,144],[56,85],[36,56],[2,2],[0,1]]){const protons=Array.from({length:p+n},(_,i)=>protonAt(i,p,n));assert.equal(protons.filter(Boolean).length,p,'exact diagram proton count');if(p+n>20){assert.ok(protons.slice(0,20).includes(true));assert.ok(protons.slice(0,20).includes(false),'do not draw a proton-only core');}}
for(const mass of [3,5,30])for(const distance of [1.1,4,10])near(clockRate(mass,2.95325*mass*distance),Math.sqrt(1-1/distance),1e-12,'clock rate at a fixed horizon multiple');
for(const mass of [1.1,1.4,2.3])for(const radius of [10,12,16])for(const distance of [1.1,10]){const rate=clockRate(mass,radius*distance);assert.ok(rate>0&&rate<1,'all neutron-star settings give valid exterior clock rates');}
console.log('PASS: high-speed contact versus near miss, collision timing, channel-specific Q values, incoming recoil, mixed nucleon counts, and every compact-object control boundary.');
