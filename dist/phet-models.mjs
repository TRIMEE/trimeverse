// Original Trimeverse teaching models. SI unless a control explicitly names other units.
export const G0=9.81, EPS0=8.8541878128e-12, COULOMB=8.9875517923e9;
const rad=x=>x*Math.PI/180;
// A constrained bead/skater in a circular bowl, with linear tangential drag.
// The cached RK4 solution is independent of drawing cadence and playback speed.
let trackCache;
export function energyTrack(p,t=0){
 const key=JSON.stringify(p),h=.005,index=Math.floor(Math.max(0,t)/h),frac=Math.max(0,t)/h-index;
 if(!trackCache||trackCache.key!==key||index<trackCache.index)trackCache={key,index:0,state:[rad(p.angle),0,0]};
 const f=([a,w,q])=>[w,-G0/p.radius*Math.sin(a)-p.drag/p.mass*w,p.drag*p.radius**2*w*w];
 const step=s=>{const k1=f(s),k2=f(s.map((v,i)=>v+h*k1[i]/2)),k3=f(s.map((v,i)=>v+h*k2[i]/2)),k4=f(s.map((v,i)=>v+h*k3[i]));return s.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);};
 // Keep only the current state: memory stays bounded during long-running experiments.
 while(trackCache.index<index){trackCache.state=step(trackCache.state);trackCache.index++;}
 const next=frac>0?step(trackCache.state):trackCache.state,[angle,omega,thermal]=trackCache.state.map((v,j)=>v+(next[j]-v)*frac);
 const height=p.radius*(1-Math.cos(angle)),speed=p.radius*omega,kinetic=.5*p.mass*speed**2,potential=p.mass*G0*height,initial=p.mass*G0*p.radius*(1-Math.cos(rad(p.angle)));
 return {angle,omega,height,speed,kinetic,potential,thermal,total:kinetic+potential+thermal,initial,normal:p.mass*(G0*Math.cos(angle)+speed**2/p.radius),x:p.radius*Math.sin(angle),y:height,time:t};
}
export function forces(p,t=0){const friction=Math.sign(p.force)*Math.min(Math.abs(p.force),p.mu*p.mass*G0),net=p.force-friction,a=net/p.mass;return {friction:-friction,net,a,x:.5*a*t*t,v:a*t,kinetic:.5*p.mass*(a*t)**2,weight:p.mass*G0,time:t};}
export function balance(p){const left=p.m1*G0*p.left,right=p.m2*G0*p.right;return {left,right,net:left-right,reaction:(p.m1+p.m2)*G0,balanced:Math.abs(left-right)<1e-8};}
export function pressure(p){return {gauge:p.density*p.gravity*p.depth,absolute:p.atmosphere*1000+p.density*p.gravity*p.depth,surface:p.atmosphere*1000};}
export function capacitor(p){const area=p.area*1e-4,d=p.distance*1e-3,C=EPS0*p.dielectric*area/d,voltage=p.mode==='connected'?p.voltage:p.charge*1e-9/C,charge=C*voltage;return {C,voltage,charge,field:voltage/d,energy:.5*C*voltage**2,area,d};}
export function fieldAt(p,x,y){let ex=0,ey=0,potential=0;for(const [cx,q] of [[-.5,p.q1],[.5,p.q2]]){if(q===0)continue;const dx=x-cx,dy=y,r=Math.hypot(dx,dy);if(r<.06)return {valid:false,ex:null,ey:null,field:null,potential:null};ex+=COULOMB*q*1e-6*dx/r**3;ey+=COULOMB*q*1e-6*dy/r**3;potential+=COULOMB*q*1e-6/r;}return {valid:true,ex,ey,field:Math.hypot(ex,ey),potential};}
export const fields=p=>fieldAt(p,p.x,p.y);
export const MATERIALS={copper:{name:'Copper',rho:1.68e-8},aluminium:{name:'Aluminium',rho:2.82e-8},nichrome:{name:'Nichrome',rho:1.1e-6}};
export function wire(p){const rho=MATERIALS[p.material].rho,resistance=rho*p.length/(p.area*1e-6),current=p.voltage/resistance;return {rho,resistance,current,power:p.voltage*current,field:p.voltage/p.length,currentDensity:current/(p.area*1e-6)};}
const hPlanck=6.62607015e-34,cLight=299792458,kBoltzmann=1.380649e-23;
export function planckExitance(wavelength,T){const z=hPlanck*cLight/(wavelength*kBoltzmann*T);return z>700?0:2*Math.PI*hPlanck*cLight**2/(wavelength**5*Math.expm1(z));}
export function blackbody(p){return {peak:2.897771955e-3/p.temperature,power:5.670374419e-8*p.temperature**4,spectrum:l=>planckExitance(l,p.temperature)};}
export function kepler(p,t=0){const small=p.planet*3.0034896e-6,total=p.star+small,n=Math.sqrt(4*Math.PI**2*total/p.axis**3),M=((n*t)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);let E=M;for(let i=0;i<20;i++){const d=(E-p.eccentricity*Math.sin(E)-M)/(1-p.eccentricity*Math.cos(E));E-=d;if(Math.abs(d)<1e-13)break;}const e=p.eccentricity,a=p.axis,root=Math.sqrt(1-e*e),x=a*(Math.cos(E)-e),y=a*root*Math.sin(E),r=a*(1-e*Math.cos(E)),vx=-a*n*Math.sin(E)/(1-e*Math.cos(E)),vy=a*n*root*Math.cos(E)/(1-e*Math.cos(E)),speed=Math.hypot(vx,vy),specificH=Math.sqrt(4*Math.PI**2*total*a*(1-e*e));return {x,y,vx,vy,r,speed:speed*4.74047046,period:2*Math.PI/n,peri:a*(1-e),apo:a*(1+e),sweep:specificH/2,specificEnergy:-4*Math.PI**2*total/(2*a),starX:-small/total*x,starY:-small/total*y,planetX:p.star/total*x,planetY:p.star/total*y,starMass:p.star,planetMass:small,time:t};}
export function fourier(p,t=0){const coefficients=Array.from({length:p.terms},(_,i)=>{const n=i+1,value=p.shape==='square'?(n%2?4/(Math.PI*n):0):p.shape==='sawtooth'?2*(n%2?1:-1)/(Math.PI*n):n%2?8*((n-1)/2%2?-1:1)/(Math.PI**2*n*n):0;return {n,value:p.amplitude*value};}),displacement=x=>coefficients.reduce((sum,{n,value})=>sum+value*Math.sin(2*Math.PI*n*(x/p.length-p.frequency*t)),0);return {coefficients,displacement,waveSpeed:p.length*p.frequency,highest:p.terms*p.frequency,time:t};}
const alphaMass=6.6446573357e-27,mevJ=1.602176634e-13;
export function scattering(p,t=0){
 // Exact repulsive Coulomb hyperbola; fixed, infinitely massive point nucleus.
 const alpha=2*p.protons*1.439964548,a=alpha/(2*p.energy),b=Math.abs(p.impact),e=Math.sqrt(1+(b/a)**2),h=b/a,v=Math.sqrt(2*p.energy*mevJ/alphaMass)*1e15,L=Math.max(800,8*a,5*b),ub=Math.acosh((L/a-1)/e),scale=a/v,half=scale*(e*Math.sinh(ub)+ub),duration=2*half,target=Math.max(-half,Math.min(half,t-half))/scale;
 let u=Math.asinh(target/e);for(let i=0;i<20;i++){const change=(e*Math.sinh(u)+u-target)/(e*Math.cosh(u)+1);u-=change;if(Math.abs(change)<1e-13)break;}
 const X=a*(e+Math.cosh(u)),Y=b*Math.sinh(u),dx=a*Math.sinh(u),dy=b*Math.cosh(u),sign=p.impact<0?-1:1,D=scale*(e*Math.cosh(u)+1),x=(-X+h*Y)/e,y=sign*(h*X+Y)/e,vx=(-dx+h*dy)/e/D,vy=sign*(h*dx+dy)/e/D,r=a*(e*Math.cosh(u)+1);
 return {x,y,r,vx,vy,duration,min:a*(e+1),angle:2*Math.atan2(a,b)*180/Math.PI*(p.impact<0?-1:1),energy:p.energy,potential:alpha/r,kinetic:p.energy-alpha/r,extent:L,time:Math.max(0,Math.min(t,duration))};
}
export const ELEMENTS=[null,['H','Hydrogen'],['He','Helium'],['Li','Lithium'],['Be','Beryllium'],['B','Boron'],['C','Carbon'],['N','Nitrogen'],['O','Oxygen'],['F','Fluorine'],['Ne','Neon']];
export function atom(p){return {symbol:ELEMENTS[p.protons][0],name:ELEMENTS[p.protons][1],mass:p.protons+p.neutrons,charge:p.protons-p.electrons,shells:[Math.min(p.electrons,2),Math.min(Math.max(p.electrons-2,0),8),Math.max(p.electrons-10,0)]};}
export const PHET_MODELS={track:energyTrack,forces,balance,pressure,capacitor,fields,wire,blackbody,kepler,fourier,scattering,atom};
export function labTime(id,p,elapsed){if(id==='forces')return Math.min((elapsed%36)/30,1)*8;if(id==='kepler')return elapsed*kepler(p).period/36;if(id==='fourier')return elapsed/(8*p.frequency);if(id==='scattering')return scattering(p).duration*Math.min((elapsed%40)/34,1);return elapsed;}
export function labMetrics(id,p,d){switch(id){
 case 'track':return [['Speed',Math.abs(d.speed),'m/s'],['Kinetic energy',d.kinetic,'J'],['Gravitational energy',d.potential,'J'],['Thermal energy',d.thermal,'J']];
 case 'forces':return [['Net force',d.net,'N'],['Acceleration',d.a,'m/s²'],['Velocity',d.v,'m/s'],['Displacement',d.x,'m']];
 case 'balance':return [['Left CCW torque',d.left,'N·m'],['Right CW torque',d.right,'N·m'],['Net torque (CCW +)',d.net,'N·m'],['Pivot reaction',d.reaction,'N']];
 case 'pressure':return [['Gauge pressure',d.gauge/1000,'kPa'],['Absolute pressure',d.absolute/1000,'kPa'],['Depth',p.depth,'m'],['Surface pressure',p.atmosphere,'kPa']];
 case 'capacitor':return [['Capacitance',d.C*1e12,'pF'],['Plate charge (left)',d.charge*1e9,'nC'],['Potential difference',d.voltage,'V'],['Stored energy',d.energy*1e9,'nJ']];
 case 'fields':return d.valid?[['Field magnitude',d.field,'N/C'],['Field x component',d.ex,'N/C'],['Field y component',d.ey,'N/C'],['Potential',d.potential,'V']]:[['Probe location','Too close to a charge',''],['Field magnitude','Move probe ≥ 0.06 m away',''],['Field components','Not sampled here',''],['Potential','Not sampled here','']];
 case 'wire':return [['Resistance',d.resistance,'Ω'],['Current',d.current,'A'],['Power',d.power,'W'],['Resistivity',d.rho,'Ω·m']];
 case 'blackbody':return [['Peak wavelength',d.peak*1e6,'μm'],['Total emitted flux',d.power,'W/m²'],['Temperature',p.temperature,'K'],['Peak spectral flux',d.spectrum(d.peak)*1e-6,'W/m²/μm']];
 case 'kepler':return [['Period',d.period,'yr'],['Separation',d.r,'AU'],['Relative speed',d.speed,'km/s'],['Swept area / time',d.sweep,'AU²/yr']];
 case 'fourier':return [['Number of terms',p.terms,''],['Fundamental frequency',p.frequency,'Hz'],['Highest harmonic',d.highest,'Hz'],['Wave speed',d.waveSpeed,'m/s']];
 case 'scattering':return [['Deflection',d.angle,'°'],['Closest approach',d.min,'fm'],['Separation now',d.r,'fm'],['Kinetic energy now',d.kinetic,'MeV']];
 case 'atom':return [['Element',d.name,''],['Atomic number',p.protons,''],['Mass number',d.mass,''],['Net charge',d.charge,'e']];
}}
