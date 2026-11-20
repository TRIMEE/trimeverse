import assert from 'node:assert/strict';
import * as m from '../dist/lab-models.mjs';
import {LABS,CATALOG} from '../dist/lab-library.mjs';
const near=(a,b,rel=1e-9)=>assert.ok(Math.abs(a-b)<=rel*Math.max(Math.abs(a),Math.abs(b),1e-10),`${a} differs from ${b}`);
const derivative=(f,t,h=1e-5)=>(f(t+h)-f(t-h))/(2*h);
assert.equal(CATALOG.length,32);assert.equal(new Set(CATALOG.map(l=>l.file)).size,CATALOG.length);
for(const [id,lab] of Object.entries(LABS)){
 const variants=[lab.defaults,...lab.controls.flatMap(c=>c.options?c.options.map(([v])=>({...lab.defaults,[c.key]:v})):[{...lab.defaults,[c.key]:c.min},{...lab.defaults,[c.key]:c.max}])];
 for(const p of variants)for(const time of [0,.01,1,10,1000])for(const [k,v] of Object.entries(m.MODELS[id](p,time)))if(typeof v==='number')assert.ok(Number.isFinite(v),`${id} ${k} at ${time} is not finite`);
}
// Ballistic trajectories satisfy Newton's law, meet the ground, and have complementary-angle symmetry.
const projectile={...LABS.projectile.defaults};const b=m.projectile(projectile);near(b.range,400/9.81);near(m.projectile(projectile,b.flight).y,0);near(m.projectile({...projectile,angle:30}).range,m.projectile({...projectile,angle:60}).range);
const t=.8;near(derivative(t=>m.projectile(projectile,t).x,t),m.projectile(projectile,t).vx,1e-7);near(derivative(t=>m.projectile(projectile,t).vy,t),-projectile.gravity,1e-7);
const raised=m.projectile({...projectile,height:8});assert.ok(raised.range>b.range);near(m.projectile({...projectile,height:8},raised.flight).y,0);
// Static friction adjusts to weight's downhill component; acceleration is independent of mass.
const resting=m.incline({mass:3,angle:20,mu:.9});near(resting.a,0);near(resting.friction,3*9.81*Math.sin(20*Math.PI/180));
const sliding=m.incline({mass:3,angle:35,mu:.1},.4);near(sliding.a,m.incline({mass:6,angle:35,mu:.1}).a);near(sliding.a*3,3*9.81*Math.sin(35*Math.PI/180)-sliding.friction);
// Spring kinetic + potential energy remains constant, and velocity is dx/dt.
const spring={...LABS.spring.defaults};for(const t of [0,.123,.7,2.1]){const d=m.spring(spring,t);near(d.kinetic+d.potential,d.energy);near(derivative(t=>m.spring(spring,t).x,t),d.v,1e-7);}
near(m.spring({...spring,mass:spring.mass*4}).period,m.spring(spring).period*2);
// Collision momentum, restitution, energy conversion, and finite cart contact geometry.
for(const e of [0,.35,1])for(const p of [{m1:1,m2:1,v1:2,v2:0,e},{m1:2.5,m2:.5,v1:3,v2:-2,e}]){
 const before=m.collision(p),at=m.collision(p,before.tc),after=m.collision(p,before.tc+2);near(at.x2-at.x1,.6);near(p.m1*after.v1+p.m2*after.v2,before.momentum);near(after.v2-after.v1,e*(p.v1-p.v2));near(after.energy+after.loss,before.energy);if(e===0)near(after.x2-after.x1,.6);if(e===1)near(after.energy,before.energy);
}
// Uniform circular motion: displacement perpendicular to velocity and correct acceleration.
const circular=LABS.circular.defaults,c=m.circular(circular,.4),vx=derivative(t=>m.circular(circular,t).x,.4),vy=derivative(t=>m.circular(circular,t).y,.4);near(Math.hypot(vx,vy),circular.speed,1e-7);assert.ok(Math.abs(c.x*vx+c.y*vy)<1e-8);near(c.force,circular.mass*c.a);near(m.circular({...circular,speed:2*circular.speed}).force,4*c.force);
near(m.buoyancy({object:800,fluid:1000,volume:.01,immersion:.8}).net,0);assert.ok(m.buoyancy({object:2000,fluid:1000,volume:.01,immersion:1}).net<0);
// Kirchhoff current/voltage rules and the power balance of both connections.
for(const mode of ['series','parallel']){const p={voltage:12,r1:10,r2:20,mode},d=m.circuit(p);if(mode==='series'){near(d.i1,d.i2);near(d.v1+d.v2,p.voltage);}else{near(d.i1+d.i2,d.current);near(d.v1,p.voltage);near(d.v2,p.voltage);}near(d.i1**2*p.r1+d.i2**2*p.r2,d.power);}
near(m.circuit({...LABS.circuit.defaults,voltage:0}).current,0);
const charges=LABS.coulomb.defaults,f=m.coulomb(charges);near(m.coulomb({...charges,distance:2*charges.distance}).force,f.force/4);near(-derivative(r=>m.coulomb({...charges,distance:r}).potential,charges.distance),f.signed,1e-7);assert.ok(f.signed<0);assert.ok(m.coulomb({...charges,q2:2}).signed>0);near(m.coulomb({...charges,q2:0}).force,0);
// Lorentz force bends positive/negative particles oppositely while speed remains constant.
for(const particle of ['electron','proton']){const p={particle,speed:100,field:1},d=m.magnetic(p),t=d.period*.17,h=d.period*1e-5;near(Math.hypot(derivative(t=>m.magnetic(p,t).x,t,h),derivative(t=>m.magnetic(p,t).y,t,h)),d.speed,1e-7);near(Math.hypot(m.magnetic(p,d.period).x,m.magnetic(p,d.period).y),0,1e-3);near(d.force,d.mass*d.speed**2/d.radius);assert.equal(Math.sign(m.magnetic(p,d.period*.25).y),particle==='proton'?-1:1);}
// Induction sign and phase come from the negative flux derivative, not a decorative waveform.
const induction=LABS.induction.defaults;for(const t of [.08,.28,.51]){const d=m.induction(induction,t);near(d.emf,-induction.turns*derivative(t=>m.induction(induction,t).flux,t),1e-7);near(d.current*induction.resistance,d.emf);}
near(m.induction({...induction,turns:40}).peak,m.induction(induction).peak*2);
// Principal lens rays meet at the computed image for both real and virtual cases.
for(const p of [{type:'converging',focal:15,distance:40},{type:'converging',focal:15,distance:10},{type:'diverging',focal:15,distance:40}]){const d=m.lens(p);near(6*(1-d.image/d.f),d.height);near(-6*d.image/p.distance,d.height);}
assert.equal(m.lens({type:'converging',focal:15,distance:15}).image,null);
const refract=m.refraction({n1:1,n2:1.5,angle:45});near(1.5*Math.sin(refract.angle*Math.PI/180),Math.sin(Math.PI/4));assert.ok(m.refraction({n1:1.5,n2:1,angle:45}).tir);assert.equal(m.refraction({n1:1,n2:1.5,angle:85}).tir,false);near(m.refraction({n1:1.4,n2:1.4,angle:37}).angle,37);
// State equation scaling and kinetic-theory speed; energy transfer is conservative.
const gas=LABS.gas.defaults;near(m.gas({...gas,volume:gas.volume/2}).pressure,2*m.gas(gas).pressure);near(m.gas({...gas,temperature:4*gas.temperature}).rms,2*m.gas(gas).rms);near(m.gas({moles:1,temperature:300,volume:30}).pressure,83144.62618);
const heat={m1:1,m2:2,t1:80,t2:20,conductance:5},start=m.heat(heat);for(const t of [1,10,100,1000]){const d=m.heat(heat,t);near(d.energy,start.energy);assert.ok(Math.abs(derivative(t=>m.heat(heat,t).t1,t,.001)*heat.m1*385+d.flow)<1e-6);assert.ok(Math.abs(derivative(t=>m.heat(heat,t).t2,t,.001)*heat.m2*385-d.flow)<1e-6);assert.ok(d.t1>=d.t2);}
near(start.equilibrium,40);near(m.heat(heat,10000).t1,40);
// Wave mode boundary conditions and the one-dimensional wave equation.
const standing=LABS.standing.defaults,w=m.standing(standing,.002);for(let i=0;i<=standing.mode;i++)near(w.displacement(i*standing.length/standing.mode),0,1e-2);
const x=.37,wt=.002,h=1e-5,k=.00001;const yxx=(w.displacement(x+h)-2*w.displacement(x)+w.displacement(x-h))/h**2,ytt=(m.standing(standing,wt+k).displacement(x)-2*w.displacement(x)+m.standing(standing,wt-k).displacement(x))/k**2;near(ytt,w.speed**2*yxx,1e-5);
console.log('PASS: all 27 model domains; conservation, force balance, trajectories, electrical rules, optical rays, thermal equilibrium, and the wave equation.');
