// Units: solar masses, astronomical units, and Julian years in the gravity lab.
export const G = 4 * Math.PI ** 2;
export const AU_KMS = 4.74047;
export const SCHWARZSCHILD_KM = 2.95325;
export const PLANETS = [
 ['Mercury',.387,1.660e-7,'#aaa7ad',3], ['Venus',.723,2.448e-6,'#e2b884',4],
 ['Earth',1,3.003e-6,'#78cfe6',5], ['Mars',1.524,3.227e-7,'#df8269',4],
 ['Jupiter',5.203,9.545e-4,'#cea888',8], ['Saturn',9.537,2.858e-4,'#d9c28d',7],
 ['Uranus',19.191,4.366e-5,'#8ed4d5',6], ['Neptune',30.069,5.151e-5,'#668de8',6]
];
export function solarSystem() {
 const bodies=[{name:'Sun',mass:1,x:0,y:0,vx:0,vy:0,color:'#edbf75',size:14,kind:'star',trail:[]}];
 PLANETS.forEach(([name,r,mass,color,size],i)=>{
  const a=i*.81+.28, v=Math.sqrt(G*(1+mass)/r);
  bodies.push({name,mass,x:r*Math.cos(a),y:r*Math.sin(a),vx:-v*Math.sin(a),vy:v*Math.cos(a),color,size,kind:'planet',trail:[]});
 });
 // Start the barycenter at rest; velocities relative to the Sun are preserved.
 const M=bodies.reduce((s,b)=>s+b.mass,0);
 const vcm={x:bodies.reduce((s,b)=>s+b.mass*b.vx,0)/M,y:bodies.reduce((s,b)=>s+b.mass*b.vy,0)/M};
 bodies.forEach(b=>{b.vx-=vcm.x;b.vy-=vcm.y;});return bodies;
}
function acceleration(bodies) {
 const a=bodies.map(()=>({x:0,y:0}));
 for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
  const dx=bodies[j].x-bodies[i].x,dy=bodies[j].y-bodies[i].y;
  const r2=dx*dx+dy*dy;
  const f=G/Math.pow(Math.max(r2,1e-16),1.5);
  a[i].x+=f*bodies[j].mass*dx;a[i].y+=f*bodies[j].mass*dy;
  a[j].x-=f*bodies[i].mass*dx;a[j].y-=f*bodies[i].mass*dy;
 }return a;
}
export function gravityStep(bodies,dt) {
 const a=acceleration(bodies);
 bodies.forEach((b,i)=>{b.vx+=a[i].x*dt/2;b.vy+=a[i].y*dt/2;b.x+=b.vx*dt;b.y+=b.vy*dt;});
 const next=acceleration(bodies);
 bodies.forEach((b,i)=>{b.vx+=next[i].x*dt/2;b.vy+=next[i].y*dt/2;});
}
export function safeStep(bodies) {
 let dt=.00015;
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const r=Math.hypot(bodies[i].x-bodies[j].x,bodies[i].y-bodies[j].y),mass=bodies[i].mass+bodies[j].mass;
  dt=Math.min(dt,.012*Math.sqrt(r**3/(G*mass)));
  // A free-fall timescale alone misses fast, almost ballistic encounters.
  // Limit relative travel as well, including low-mass planetary collisions.
  const velocity=Math.hypot((bodies[i].vx||0)-(bodies[j].vx||0),(bodies[i].vy||0)-(bodies[j].vy||0));
  if(velocity>0)dt=Math.min(dt,.02*r/velocity);
 }return Math.max(dt,1e-15);
}
export function closeEncounter(bodies) {
 for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
  if(bodies[i].mass<.01&&bodies[j].mass<.01)continue;
  if(Math.hypot(bodies[i].x-bodies[j].x,bodies[i].y-bodies[j].y)<.015)return [bodies[i].name,bodies[j].name];
 }return null;
}
export function energy(bodies) {
 let e=bodies.reduce((s,b)=>s+.5*b.mass*(b.vx**2+b.vy**2),0);
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++) e-=G*bodies[i].mass*bodies[j].mass/Math.hypot(bodies[i].x-bodies[j].x,bodies[i].y-bodies[j].y);
 return e;
}
export function clockRate(mass,rKm) {return Math.sqrt(Math.max(0,1-SCHWARZSCHILD_KM*mass/rKm));}
export function waveAmplitude(a,phaseDeg){return 2*a*Math.abs(Math.cos(phaseDeg*Math.PI/360));}
// Exact undamped period at the release amplitude, using the arithmetic-geometric mean.
// With angleDeg=0 this reduces to the small-angle result.
export function pendulumPeriod(length,g,angleDeg=0){
 let a=1,b=Math.cos(Math.abs(angleDeg)*Math.PI/360);
 if(!(length>0&&g>0)||Math.abs(angleDeg)>=180)return NaN;
 for(let i=0;i<20&&Math.abs(a-b)>1e-14;i++){const next=(a+b)/2;b=Math.sqrt(a*b);a=next;}
 return 2*Math.PI*Math.sqrt(length/g)/a;
}
export function pendulumStep(s,dt,L,g,damping=0){
 const f=(a,v)=>[v,-g/L*Math.sin(a)-damping*v];
 const k1=f(s.angle,s.omega),k2=f(s.angle+k1[0]*dt/2,s.omega+k1[1]*dt/2),k3=f(s.angle+k2[0]*dt/2,s.omega+k2[1]*dt/2),k4=f(s.angle+k3[0]*dt,s.omega+k3[1]*dt);
 s.angle+=dt*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6;s.omega+=dt*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;
}
// AME2020 neutral-atom masses (u). Electron counts balance in both channels;
// electron binding corrections are negligible at the displayed 0.1 MeV precision.
// https://www-nds.iaea.org/amdc/ame2020/mass_1.mas20.txt
export const NUCLEAR_MASS_U={n:1.00866491590,H2:2.014101777844,H3:3.01604928132,He4:4.00260325413,U235:235.043928117,Ba141:140.914403653,Kr92:91.926173092};
export const U_MEV=931.49410242;
export function reactionMassDefect(type){const m=NUCLEAR_MASS_U;return type==='fusion'?m.H2+m.H3-m.He4-m.n:m.U235-m.Ba141-m.Kr92-2*m.n;}
export const REACTIONS={
 fusion:{equation:'²H + ³H → ⁴He + n + 17.6 MeV',energy:reactionMassDefect('fusion')*U_MEV,initial:[{label:'Deuterium · ²H',p:1,n:1},{label:'Tritium · ³H',p:1,n:2}],final:[{label:'Helium · ⁴He',p:2,n:2},{label:'Neutron',p:0,n:1}]},
 fission:{equation:'²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n + 173.3 MeV',energy:reactionMassDefect('fission')*U_MEV,initial:[{label:'Uranium · ²³⁵U',p:92,n:143},{label:'Neutron',p:0,n:1}],final:[{label:'Barium · ¹⁴¹Ba',p:56,n:85},{label:'Krypton · ⁹²Kr',p:36,n:56},{label:'3 neutrons',p:0,n:3}]}
};

export function centerOfMass(bodies){
 const mass=bodies.reduce((sum,b)=>sum+b.mass,0);
 return {mass,...Object.fromEntries(['x','y','vx','vy'].map(k=>[k,bodies.reduce((sum,b)=>sum+b.mass*b[k],0)/mass]))};
}
export function radiusAU(b){
 if(b.kind==='blackhole')return SCHWARZSCHILD_KM*b.mass/149597870.7;
 if(b.kind==='neutron')return 12/149597870.7;
 if(b.kind==='star')return .00465047*Math.pow(b.mass,.8);
 const radii={Mercury:2440,Venus:6052,Earth:6371,Mars:3390,Jupiter:69911,Saturn:58232,Uranus:25362,Neptune:24622};
 return b.radiusAU??(radii[b.name]||6371)/149597870.7;
}
export function encounterRadius(a,b){
 const contact=radiusAU(a)+radiusAU(b);
 if(a.kind!=='blackhole'&&b.kind!=='blackhole')return contact;
 const hole=a.kind==='blackhole'?a:b,other=hole===a?b:a;
 // An explicit unresolved-region prescription, not a relativistic accretion calculation.
 return Math.max(contact,other.kind==='blackhole'?0:radiusAU(other)*Math.cbrt(hole.mass/other.mass),.0001);
}
export function resolveEncounters(bodies){
 const events=[];
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const a=bodies[i],b=bodies[j];if(Math.hypot(a.x-b.x,a.y-b.y)>encounterRadius(a,b))continue;
  const cm=centerOfMass([a,b]),hole=a.kind==='blackhole'||b.kind==='blackhole';
  const angular=(a.spinMomentum||0)+(b.spinMomentum||0)+a.mass*((a.x-cm.x)*(a.vy-cm.vy)-(a.y-cm.y)*(a.vx-cm.vx))+b.mass*((b.x-cm.x)*(b.vy-cm.vy)-(b.y-cm.y)*(b.vx-cm.vx));
  const name=hole?'Black hole + unresolved material':'Merged '+a.name+' / '+b.name;
  events.push({names:[a.name,b.name],hole});
  bodies[i]={...a,...cm,name,kind:hole?'blackhole':a.kind==='star'||b.kind==='star'?'star':a.kind,visitor:false,trail:[],spinMomentum:angular,radiusAU:Math.cbrt(radiusAU(a)**3+radiusAU(b)**3),unresolved:true,color:hole?'#e2b774':a.color};
  bodies.splice(j,1);j--;i=-1;break;
 }return events;
}
// Positions in a zero-total-momentum frame. The display time is deliberately slowed.
export function reactionReactants(type,separation){
 if(type==='fusion')return [{p:1,n:1,label:'²H',mass:2,x:-3*separation/5,y:0},{p:1,n:2,label:'³H',mass:3,x:2*separation/5,y:0}];
 return [{p:92,n:143,label:'²³⁵U',mass:235,x:separation/236,y:0},{p:0,n:1,label:'n',mass:1,x:-235*separation/236,y:0}];
}
// Distribute the displayed protons throughout a schematic nucleus, rather than
// implying a proton core surrounded by a separate neutron shell.
export function protonAt(index,p,n){const total=p+n;return Math.floor((index+1)*p/total)>Math.floor(index*p/total);}
export function reactionProducts(type,spread){
 if(type==='fusion')return [{p:2,n:2,label:'⁴He',mass:4,x:-spread/4,y:0},{p:0,n:1,label:'n',mass:1,x:spread,y:0}];
 return [{p:56,n:85,label:'¹⁴¹Ba',mass:141,x:-spread*92/141,y:0},{p:36,n:56,label:'⁹²Kr',mass:92,x:spread,y:0},...[0,1,2].map(i=>({p:0,n:1,label:'n',mass:1,x:spread*2*Math.cos(Math.PI/6+i*2*Math.PI/3),y:spread*2*Math.sin(Math.PI/6+i*2*Math.PI/3)}))];
}
