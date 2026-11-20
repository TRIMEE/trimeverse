import assert from 'node:assert/strict';
import {PHET_LABS} from '../dist/phet-lab-library.mjs';
import {energyTrack,forces,balance,pressure,capacitor,fields,wire,blackbody,kepler,fourier,scattering,atom,labTime} from '../dist/phet-models.mjs';
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(Math.abs(b),1e-12),`${a} ≠ ${b}`);
// Track energy and contact across the entire control range, with and without drag.
for(const mass of [20,100])for(const radius of [2,6])for(const angle of [10,75])for(const drag of [0,10]){
 const p={mass,radius,angle,drag};let prevThermal=0,prevMechanical=Infinity;
 for(const t of [0,.25,1,4,15,60]){const d=energyTrack(p,t);close(d.total,d.initial,2e-7);assert.ok(d.normal>0);assert.ok(d.thermal+1e-8>=prevThermal);if(drag>0)assert.ok(d.kinetic+d.potential<=prevMechanical+1e-5);prevThermal=d.thermal;prevMechanical=d.kinetic+d.potential;}
}
// Independent finite-difference acceleration verifies the actual differential equation.
{const p={...PHET_LABS.track.defaults,drag:4},dt=.005,t=2,a=energyTrack(p,t-dt),b=energyTrack(p,t+dt),d=energyTrack(p,t);close((b.omega-a.omega)/(2*dt),-9.81/p.radius*Math.sin(d.angle)-p.drag/p.mass*d.omega,3e-5);}
assert.equal(forces({mass:20,force:50,mu:.3},8).x,0);
for(const force of [-100,100]){const p={mass:20,force,mu:.2},d=forces(p,8);close(d.net,p.mass*d.a);assert.equal(Math.sign(d.v),Math.sign(force));close(d.kinetic,d.net*d.x);}
close(balance({m1:10,m2:30,left:1.5,right:.5}).net,0);
{const p={density:1000,gravity:9.81,atmosphere:101.3,depth:4},d=pressure(p);close(d.gauge,39240);close(d.absolute,140540);close(pressure({...p,depth:8}).gauge,2*d.gauge);}
// Battery-connected and isolated capacitors respond differently to a dielectric.
{const p={...PHET_LABS.capacitor.defaults},a=capacitor(p),b=capacitor({...p,dielectric:3});close(b.C,3*a.C);close(b.charge,3*a.charge);close(b.voltage,a.voltage);const c=capacitor({...p,mode:'isolated'}),d=capacitor({...p,mode:'isolated',dielectric:3});close(d.charge,c.charge);close(d.voltage,c.voltage/3);close(d.energy,c.energy/3);close(c.energy,c.charge**2/(2*c.C));assert.ok(capacitor({...p,voltage:-10}).field<0);}
{const d=fields({q1:2,q2:-2,x:0,y:0});close(d.potential,0);assert.ok(d.ex>0);close(d.ey,0);assert.equal(fields({q1:2,q2:0,x:-.5,y:0}).valid,false);assert.equal(fields({q1:0,q2:0,x:-.5,y:0}).valid,true);const p={q1:2,q2:-2,x:.1,y:.4},dt=1e-5;close(-(fields({...p,x:p.x+dt}).potential-fields({...p,x:p.x-dt}).potential)/(2*dt),fields(p).ex,1e-8);}
{const p=PHET_LABS.wire.defaults,d=wire(p);close(d.resistance,.084);close(wire({...p,length:10}).resistance,2*d.resistance);close(wire({...p,area:2}).resistance,d.resistance/2);close(d.power,d.current**2*d.resistance);}
// Integrate Planck's law on a wide logarithmic wavelength grid, independently of σT⁴.
for(const temperature of [300,5800,12000]){const d=blackbody({temperature}),lo=d.peak/100,hi=d.peak*1000,N=16000,delta=Math.log(hi/lo)/N;let sum=0;for(let i=0;i<=N;i++){const l=lo*Math.exp(i*delta);sum+=d.spectrum(l)*l*(i===0||i===N?.5:1);}close(sum*delta,d.power,5e-8);const epsilon=.0001;assert.ok(d.spectrum(d.peak)>d.spectrum(d.peak*(1-epsilon)));assert.ok(d.spectrum(d.peak)>d.spectrum(d.peak*(1+epsilon)));close(blackbody({temperature:temperature*2}).power,16*d.power);}
// True Kepler trajectories: energy, angular momentum, barycenter, and equal swept areas.
for(const eccentricity of [0,.35,.8])for(const planet of [1,1000]){
 const p={star:1,planet,axis:1,eccentricity},initial=kepler(p),mu=4*Math.PI**2*(initial.starMass+initial.planetMass);close(initial.r,1-eccentricity);close(kepler(p,initial.period/2).r,1+eccentricity);
 for(let i=0;i<24;i++){const d=kepler(p,initial.period*i/24),v=Math.hypot(d.vx,d.vy);close(.5*v*v-mu/d.r,d.specificEnergy);close(d.x*d.vy-d.y*d.vx,2*d.sweep);close(d.starMass*d.starX+d.planetMass*d.planetX,0,1e-3);close(d.starMass*d.starY+d.planetMass*d.planetY,0,1e-3);}
 const areas=[];for(let j=0;j<12;j++){let area=0,prev=kepler(p,initial.period*j/12);for(let i=1;i<=500;i++){const d=kepler(p,initial.period*(j+i/500)/12);area+=(prev.x*d.y-prev.y*d.x)/2;prev=d;}areas.push(area);}for(const area of areas)close(area,initial.sweep*initial.period/12,3e-5);
 close(kepler({...p,axis:2}).period/initial.period,Math.sqrt(8));
}
// Harmonic selection and traveling-wave phase agree across time and space.
for(const shape of ['square','sawtooth','triangle']){const p={shape,terms:12,amplitude:1,frequency:2,length:3},d=fourier(p,.4);for(const x of [.2,.7,1.4])close(d.displacement(x),fourier(p,0).displacement(x-d.waveSpeed*.4));if(shape!=='sawtooth')for(const c of d.coefficients.filter(a=>a.n%2===0))assert.equal(c.value,0);}
// Coulomb hyperbola: speed-derived kinetic energy, asymptotic angle, head-on reversal.
for(const impact of [-200,-80,0,80,200])for(const energy of [2,10]){
 const p={protons:79,impact,energy},d0=scattering(p),end=scattering(p,d0.duration),middle=scattering(p,d0.duration/2);close(middle.r,d0.min);close(d0.kinetic+d0.potential,energy);
 for(const t of [0,.1,.5,.9,1]){const d=scattering(p,d0.duration*t);close(.5*6.6446573357e-27*((d.vx/1e15)**2+(d.vy/1e15)**2)/1.602176634e-13,d.kinetic,1e-7);}
 if(impact===0){assert.ok(d0.vx>0&&end.vx<0);close(middle.y,0);close(middle.kinetic,0,1e-2);}else {assert.equal(Math.sign(end.y),Math.sign(impact));assert.ok(Math.abs(d0.angle)<180);}
}
{const p={protons:79,energy:5,impact:80};assert.ok(scattering({...p,energy:10}).min<scattering(p).min);}
{const a=atom({protons:6,neutrons:6,electrons:4});assert.equal(a.name,'Carbon');assert.equal(a.mass,12);assert.equal(a.charge,2);assert.deepEqual(a.shells,[2,2,0]);}
assert.ok(labTime('scattering',PHET_LABS.scattering.defaults,34)>0);assert.equal(labTime('forces',PHET_LABS.forces.defaults,30),8);
console.log('PASS: 12 new labs — energy, differential equations, field gradients, capacitor constraints, Planck integration, Kepler invariants, Fourier phase, and scattering trajectories.');
