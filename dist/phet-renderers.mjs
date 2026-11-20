import {fieldAt, MATERIALS, kepler, scattering} from './phet-models.mjs';
export function createPhetRenderers(api){
 const {line,path,label,dot,box,arrow,fmt,gold,cyan,pink,muted,ink}=api;
 const setup=()=>({...api.size(),p:api.params(),t:api.time()});
 function curve(fn,x0,y0,width,height,lo,hi,max,color=gold,log=false){const pts=[];for(let i=0;i<=220;i++){const x=log?lo*(hi/lo)**(i/220):lo+(hi-lo)*i/220;pts.push([x0+width*i/220,y0-height*fn(x)/max]);}path(pts,color,2);}
 return {
 track(d){const {W,H,p}=setup(),s=Math.min((W-65)/(2*p.radius),(H*.37)/p.radius),bottom=H*.47,cx=W/2;
 const bowl=[];for(let i=0;i<=100;i++){const a=(-80+1.6*i)*Math.PI/180;bowl.push([cx+p.radius*Math.sin(a)*s,bottom-p.radius*(1-Math.cos(a))*s]);}path(bowl,muted,3);
 const x=cx+d.x*s,y=bottom-d.y*s;dot(x,y-6,7,gold);arrow(x,y-15,Math.sign(d.speed)*Math.cos(d.angle)*Math.min(36,Math.abs(d.speed)*5),Math.sign(d.speed)*Math.sin(d.angle)*Math.min(36,Math.abs(d.speed)*5),cyan);
 line(30,bottom,W-30,bottom,'#344856',1,[4,5]);label('h = 0',W-20,bottom+21,muted,'right');label(`Height ${fmt(d.height)} m`,W/2,27,gold,'center');
 const rows=[['Kinetic',d.kinetic,cyan],['Potential',d.potential,gold],['Thermal',d.thermal,pink]];
 rows.forEach(([name,value,color],i)=>{const yy=H*.63+i*H*.095;label(`${name}: ${fmt(value)} J`,35,yy,color);box(35,yy+7,W-70,5,'#24313e','#24313e');box(35,yy+7,(W-70)*Math.min(1,Math.max(0,value/d.initial)),5,color,color);});label(`Total: ${fmt(d.total)} J`,W/2,H-15,ink,'center');
 },
 forces(d){const {W,H,p}=setup(),cx=W/2,y=H*.5,s=(W-75)/12,ground=y+24;line(20,ground,W-20,ground,muted,2);box(cx-21,y-21,42,42,'#57452f',gold);
 const forceScale=Math.min(85,W*.28)/Math.max(Math.abs(p.force),Math.abs(d.friction),1);arrow(cx,y-48,p.force*forceScale,0,gold);arrow(cx,y+65,d.friction*forceScale,0,pink);label('Applied force',35,28,gold);label('Friction',W-20,50,pink,'right');
 for(let k=Math.floor(d.x/2)-4;k<=Math.floor(d.x/2)+4;k++){const xx=cx+(2*k-d.x)*s;if(xx>25&&xx<W-25){line(xx,ground+4,xx,ground+12);label(fmt(2*k,0),xx,ground+32,muted,'center');}}
 label(d.a===0?'Static friction holds the block':`Camera follows block · a = ${fmt(d.a)} m/s²`,W/2,H-53,ink,'center');label('Position (m) · Right is positive',W/2,H-25,muted,'center');
 },
 balance(d){const {W,H,p}=setup(),cx=W/2,s=(W-90)/4.4,y=H*.49,x1=cx-p.left*s,x2=cx+p.right*s;
 line(cx-2.1*s,y,cx+2.1*s,y,muted,5);path([[cx,y+4],[cx-15,y+37],[cx+15,y+37],[cx,y+4]],cyan,2);
 box(x1-11,y-36,22,32,'#59472e',gold);box(x2-11,y-36,22,32,'#214653',cyan);const fs=H*.18/Math.max(p.m1,p.m2);arrow(x1,y+3,0,p.m1*fs,gold);arrow(x2,y+3,0,p.m2*fs,cyan);
 label(`Left: ${fmt(p.m1)} kg · ${fmt(p.left)} m`,30,30,gold);label(`Right: ${fmt(p.m2)} kg · ${fmt(p.right)} m`,W-20,57,cyan,'right');label('Pivot',cx,y+62,muted,'center');
 label(d.balanced?'Balanced · No holding torque':d.net>0?'If released: counterclockwise':'If released: clockwise',W/2,H-51,d.balanced?ink:pink,'center');label('Beam held horizontal',W/2,H-25,muted,'center');
 },
 pressure(d){const {W,H,p}=setup(),x=35,y=H*.2,width=W-70,depth=H*.63;box(x,y,width,depth,'#163749','#648397');line(x,y,x+width,y,cyan,2);
 for(let i=0;i<=10;i+=2){const yy=y+depth*i/10;line(x+width-7,yy,x+width,yy);label(`${i} m`,x+width-13,yy+5,muted,'right');}
 const px=W*.43,py=y+depth*p.depth/10;dot(px,py,7,gold);line(px,y,px,py,gold,1,[4,5]);for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]])arrow(px+dx*1.8,py+dy*1.8,-dx,-dy,cyan);
 label(`Surface: ${fmt(p.atmosphere,1)} kPa`,W/2,30,cyan,'center');label(`Probe: ${fmt(d.absolute/1000,1)} kPa absolute`,W/2,H-22,gold,'center');
 },
 capacitor(d){const {W,H,p}=setup(),left=W*.25,right=W*.75,top=H*.18,bottom=H*.52;line(left,top,left,bottom,gold,5);line(right,top,right,bottom,cyan,5);
 label(d.charge>0?'+Q':d.charge<0?'−Q':'Q = 0',left,top-10,gold,'center');label(d.charge>0?'−Q':d.charge<0?'+Q':'Q = 0',right,top-10,cyan,'center');
 if(p.dielectric>1){box(left+6,top+8,right-left-12,bottom-top-16,'#203544','#3a596c');label(`εᵣ = ${fmt(p.dielectric)}`,W/2,top+29,muted,'center');}
 if(d.field!==0)for(let i=1;i<=3;i++){const yy=top+(bottom-top)*i/4,start=d.field>0?left+17:right-17,end=d.field>0?right-17:left+17;arrow(start,yy,end-start,0,pink);}
 label(`E = ${fmt(d.field)} V/m`,W/2,bottom+24,pink,'center');
 const gx=45,gy=H*.82,gw=W-90,gh=H*.15,max=Math.max(Math.abs(d.voltage),1);line(gx,gy,gx+gw,gy,muted);line(gx,gy-gh,gx,gy+gh*.25,muted);const base=gy-(d.voltage<0?gh*.3:0);line(gx,base-gh*d.voltage/max,gx+gw,base,gold,2);label('Potential V(x)',gx,H*.61,gold);label(`${fmt(d.voltage)} V`,gx,base-gh*d.voltage/max-8,gold);label('0 V',gx+gw,base+20,cyan,'right');label(p.mode==='connected'?'Connected · Fixed voltage':'Isolated · Fixed charge',W/2,H-16,muted,'center');
 },
 fields(d){const {W,H,p}=setup(),s=Math.min((W-40)/4,(H-85)/2.8),cx=W/2,cy=H*.52,X=x=>cx+x*s,Y=y=>cy-y*s;
 for(let ix=-9;ix<=9;ix++)for(let iy=-6;iy<=6;iy++){const x=ix*.2,y=iy*.2,f=fieldAt(p,x,y);if(!f.valid||f.field<1e-8||Math.hypot(x+.5,y)<.12||Math.hypot(x-.5,y)<.12)continue;const length=Math.min(13,s*.15);arrow(X(x),Y(y),length*f.ex/f.field,-length*f.ey/f.field,'#557482');}
 for(const [x,q] of [[-.5,p.q1],[.5,p.q2]]){dot(X(x),Y(0),8,q>0?gold:q<0?cyan:muted);label(q>0?'+':q<0?'−':'0',X(x),Y(0)+5,'#080e18','center');}
 const px=X(p.x),py=Y(p.y);line(px-6,py,px+6,py,pink,2);line(px,py-6,px,py+6,pink,2);
 if(d.valid&&d.field>1e-8)arrow(px,py,32*d.ex/d.field,-32*d.ey/d.field,pink);
 label('Arrows show field direction',W/2,27,muted,'center');label(`Probe (${fmt(p.x)}, ${fmt(p.y)}) m`,W/2,H-24,pink,'center');
 },
 wire(d){const {W,H,p}=setup(),length=(W-65)*(.3+.7*p.length/20),thick=8+25*Math.sqrt(p.area/5),x=(W-length)/2,y=H*.39;
 box(x,y,length,thick,'#5b452d',gold);line(x,y+thick/2,20,y+thick/2,cyan,2);line(x+length,y+thick/2,W-20,y+thick/2,cyan,2);
 label(MATERIALS[p.material].name,W/2,31,gold,'center');line(x,y-23,x+length,y-23,muted);label(`L = ${fmt(p.length)} m`,W/2,y-35,muted,'center');label(`A = ${fmt(p.area)} mm²`,W/2,y+thick+35,cyan,'center');
 label(`R = ${fmt(d.resistance,4)} Ω`,W/2,H*.72,ink,'center',20);label(`${fmt(p.voltage)} V across wire`,W/2,H*.83,muted,'center');label('20°C · Heating omitted',W/2,H-18,muted,'center');
 },
 blackbody(d){const {W,H,p}=setup(),x0=65,y0=H-65,gw=W-90,gh=H-135,lo=.1,hi=30,X=l=>x0+gw*Math.log(l/lo)/Math.log(hi/lo),max=d.spectrum(d.peak)*1e-6;
 box(X(.38),y0-gh,X(.75)-X(.38),gh,'#22343a','#22343a');line(x0,y0,x0+gw,y0,muted);line(x0,y0-gh,x0,y0,muted);
 curve(l=>d.spectrum(l*1e-6)*1e-6,x0,y0,gw,gh,.1,30,max,gold,true);
 line(X(d.peak*1e6),y0-gh,X(d.peak*1e6),y0,cyan,1,[4,5]);
 for(const l of [.1,1,10,30]){line(X(l),y0,X(l),y0+6);label(String(l),X(l),y0+23,muted,'center');}label('Wavelength (μm, log scale)',W/2,H-16,muted,'center');label('0',x0-12,y0+4,muted,'right');label(fmt(max),x0-7,y0-gh+5,gold,'right',12);label('Spectral flux (W/m²/μm)',x0,27,gold);label('Visible band: 0.38–0.75 μm',W/2,49,cyan,'center');
 },
 kepler(d){const {W,H,p,t}=setup(),s=Math.min((W-70)/(2*p.axis*1.05),(H-95)/(2*p.axis*1.05)),cx=W/2+p.axis*p.eccentricity*s,cy=H*.53,X=x=>cx+x*s,Y=y=>cy-y*s;
 const relative=[],starTrail=[],planetTrail=[];for(let i=0;i<=160;i++){const v=kepler(p,d.period*i/160);relative.push([X(v.x),Y(v.y)]);starTrail.push([X(v.starX),Y(v.starY)]);planetTrail.push([X(v.planetX),Y(v.planetY)]);}path(relative,'#3c5162',1,[4,5]);path(planetTrail,cyan,1.5);path(starTrail,gold,1);
 // Relative-vector sectors represent equal physical time intervals, each T/12.
 const phase=((t/d.period)%1+1)%1,sectorStart=Math.floor(phase*12)*d.period/12,sector=[[X(0),Y(0)]];for(let i=0;i<=22;i++){const v=kepler(p,sectorStart+d.period/12*i/22);sector.push([X(v.x),Y(v.y)]);}sector.push([X(0),Y(0)]);path(sector,'#786144',1);
 line(X(d.starX),Y(d.starY),X(d.planetX),Y(d.planetY),muted,1);dot(X(d.starX),Y(d.starY),7,gold);dot(X(d.planetX),Y(d.planetY),5,cyan);line(X(0)-4,Y(0),X(0)+4,Y(0),pink);line(X(0),Y(0)-4,X(0),Y(0)+4,pink);
 label('Gold: star · Blue: planet',W/2,27,ink,'center');label('Pink cross: barycenter',W/2,49,pink,'center');label('Sector: one T/12 interval',W/2,H-19,muted,'center');
 },
 fourier(d){const {W,H,p,t}=setup(),x0=35,gw=W-70,cy=H*.43,scale=H*.18/(1.3*p.amplitude),phase=2*Math.PI*p.frequency*t;
 line(x0,cy,x0+gw,cy,muted);for(const {n,value} of d.coefficients){if(value===0)continue;const points=[];for(let i=0;i<=180;i++)points.push([x0+gw*i/180,cy-value*Math.sin(4*Math.PI*n*i/180-n*phase)*scale]);path(points,'#405d6c',1);}const sum=[];for(let i=0;i<=260;i++)sum.push([x0+gw*i/260,cy-d.displacement(2*p.length*i/260)*scale]);path(sum,gold,2.5);
 label('Gold: sum · Blue: harmonics',W/2,27,ink,'center');label(`+${fmt(p.amplitude)} cm`,x0,cy-p.amplitude*scale-8,muted);label(`−${fmt(p.amplitude)} cm`,x0,cy+p.amplitude*scale+20,muted);
 const gy=H*.9,gh=H*.13,max=Math.max(...d.coefficients.map(a=>Math.abs(a.value)),.001),bw=gw/p.terms;d.coefficients.forEach(({n,value},i)=>{const x=x0+i*bw+bw*.2;box(x,gy-gh*Math.abs(value)/max,bw*.6,gh*Math.abs(value)/max,value<0?pink:cyan,value<0?pink:cyan);label(String(n),x+bw*.3,gy+19,muted,'center');});label('Coefficients · Pink negative',W/2,H*.7,muted,'center');
 },
 scattering(d){const {W,H,p}=setup(),pathPoints=[];let xmin=0,xmax=0,ymin=0,ymax=0;for(let i=0;i<=180;i++){const v=scattering(p,d.duration*i/180);pathPoints.push(v);xmin=Math.min(xmin,v.x);xmax=Math.max(xmax,v.x);ymin=Math.min(ymin,v.y);ymax=Math.max(ymax,v.y);}
 const span=Math.max(xmax-xmin,1),ys=Math.max(ymax-ymin,1),s=Math.min((W-65)/span,(H-105)/ys),cx=(W-(xmax+xmin)*s)/2,cy=(H+(ymax+ymin)*s)/2,X=x=>cx+x*s,Y=y=>cy-y*s;
 const guide=pathPoints.map(v=>[X(v.x),Y(v.y)]);path(guide,'#4a5b68',1,[4,5]);path(guide.slice(0,Math.max(1,1+Math.floor(180*d.time/d.duration))),gold,2);dot(X(0),Y(0),7,pink);dot(X(d.x),Y(d.y),5,gold);
 const v=Math.hypot(d.vx,d.vy);if(v>1e-8)arrow(X(d.x),Y(d.y),30*d.vx/v,-30*d.vy/v,cyan);
 label('Pink: nucleus · Gold: alpha',W/2,27,ink,'center');if(W<420){label(`Closest: ${fmt(d.min)} fm`,W/2,H-43,muted,'center');label(`Deflection: ${fmt(d.angle,1)}°`,W/2,H-22,muted,'center');}else label(`Closest approach ${fmt(d.min)} fm · Deflection ${fmt(d.angle,1)}°`,W/2,H-22,muted,'center');
 },
 atom(d){const {W,H,p}=setup(),cx=W/2,cy=H*.49,maxR=Math.min(W*.37,H*.32),count=p.protons+p.neutrons,nucleusR=Math.min(25,maxR*.28);
 for(let i=0;i<count;i++){const radius=nucleusR*Math.sqrt((i+.5)/count),a=i*2.3999632297,proton=Math.floor((i+1)*p.protons/count)>Math.floor(i*p.protons/count);dot(cx+radius*Math.cos(a),cy+radius*Math.sin(a),3,proton?gold:muted);}
 const rings=d.shells[2]>0?3:d.shells[1]>0?2:1;d.shells.forEach((n,index)=>{if(n===0)return;const r=maxR*(.5+(index/(Math.max(2,rings)-1))*.45);const circle=[];for(let i=0;i<=100;i++)circle.push([cx+r*Math.cos(i*Math.PI/50),cy+r*Math.sin(i*Math.PI/50)]);path(circle,'#455967',1);for(let i=0;i<n;i++){const a=2*Math.PI*i/n+.35*index;dot(cx+r*Math.cos(a),cy+r*Math.sin(a),4,cyan);}});
 label(`${d.name} · ${d.symbol}-${d.mass}`,W/2,27,ink,'center',18);label(`Nucleus: ${p.protons} p + ${p.neutrons} n`,W/2,H-48,gold,'center');label(`Electrons: ${p.electrons} · Charge ${d.charge>0?'+':''}${d.charge}e`,W/2,H-23,cyan,'center');
 }
 };
}
