// Reusable low-poly 3D scene props for storyboard-driven environments.
import * as THREE from "three";

const mat = (color, roughness = 1, transparent = false, opacity = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true, transparent, opacity });
const box = (w,h,d,m,x=0,y=0,z=0) => { const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; return o; };
const cyl = (r1,r2,h,m,x=0,y=0,z=0,segments=8) => { const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m); o.position.set(x,y,z); o.castShadow=true; return o; };
const sphere = (r,m,x=0,y=0,z=0) => { const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m); o.position.set(x,y,z); o.castShadow=true; return o; };

function tree() {
  const g=new THREE.Group(), trunk=mat("#765038"), leaves=mat("#477b48");
  g.add(cyl(.22,.32,2.3,trunk,0,1.15,0));
  g.add(sphere(1.05,leaves,0,2.65,0),sphere(.72,mat("#5b914d"),-.48,2.95,.08),sphere(.68,mat("#356c43"),.48,2.8,-.08));
  return g;
}
function house() {
  const g=new THREE.Group(), wall=mat("#d5b58a"), roof=mat("#8d5140"), dark=mat("#493b35");
  g.add(box(2.8,2.1,2.5,wall,0,1.05,0));
  const r=new THREE.Mesh(new THREE.ConeGeometry(2.15,1.45,4),roof); r.position.set(0,2.82,0); r.rotation.y=Math.PI/4; r.castShadow=true; g.add(r);
  g.add(box(.62,1.15,.08,dark,0,.58,1.29),box(.48,.65,.08,mat("#83a9b8"),-.83,1.25,1.29),box(.48,.65,.08,mat("#83a9b8"),.83,1.25,1.29));
  return g;
}
function lamp() {
  const g=new THREE.Group(), metal=mat("#333a43"), glow=mat("#f5d88b");
  g.add(cyl(.07,.09,4.1,metal,0,2.05,0,8),box(.85,.09,.09,metal,.38,3.95,0),sphere(.22,glow,.76,3.78,0));
  return g;
}
function car() {
  const g=new THREE.Group(), body=mat("#376b9c"), glass=mat("#9ec5d4"), tire=mat("#25282c");
  g.add(box(2.6,.72,1.25,body,0,.72,0),box(1.35,.68,1.08,glass,-.12,1.36,0));
  for(const x of [-.85,.85]) for(const z of [-.68,.68]) g.add(cyl(.34,.34,.18,tire,x,.38,z,12));
  return g;
}
function bicycle() {
  const g=new THREE.Group(), metal=mat("#454b52"), tire=mat("#25282c"), seat=mat("#49352c");
  for(const x of [-.72,.72]) { const w=new THREE.Mesh(new THREE.TorusGeometry(.48,.055,6,18),tire); w.position.set(x,.52,0); g.add(w); }
  g.add(box(1.1,.06,.06,metal,0,.82,0),box(.06,.68,.06,metal,-.3,.82,0),box(.06,.58,.06,metal,.32,.8,0),box(.42,.09,.12,seat,-.32,1.18,0),box(.48,.06,.06,metal,.85,1.18,0));
  return g;
}
function motorcycle() {
  const g=new THREE.Group(), metal=mat("#3e4852"), body=mat("#bd493f"), rubber=mat("#25282c"), chrome=mat("#aeb7bd");
  for(const x of [-.72,.72]) {
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.38,.075,7,18),rubber);
    wheel.position.set(x,.42,0); wheel.rotation.y=Math.PI/2; wheel.castShadow=true; g.add(wheel);
    g.add(cyl(.08,.08,.16,chrome,x,.42,0,10));
  }
  g.add(box(1.15,.12,.16,metal,0,.76,0),sphere(.28,body,-.08,1.02,0),box(.58,.12,.3,mat("#242b32"),.35,1.02,0));
  g.add(box(.5,.08,.28,mat("#343a40"),-.48,.95,0),box(.12,.55,.12,metal,.55,1.18,0));
  g.add(box(.62,.07,.08,chrome,.52,1.42,0),sphere(.13,mat("#f4d58a"),-.72,.9,0));
  return g;
}
function bird() {
  const g=new THREE.Group(), wing=mat("#343943");
  g.add(sphere(.18,wing,0,0,0),box(.55,.06,.1,wing,-.28,.12,0),box(.55,.06,.1,wing,.28,.12,0));
  return g;
}
function road() {
  const g=new THREE.Group(), asphalt=mat("#45494d"), line=mat("#e7d9a7");
  g.add(box(5,.12,28,asphalt,0,.05,0));
  for(let z=-11;z<=11;z+=4) g.add(box(.12,.025,1.6,line,0,.125,z));
  return g;
}
function tent() {
  const g=new THREE.Group(), canvas=mat("#c5a66b"), dark=mat("#654b34");
  const a=new THREE.Mesh(new THREE.ConeGeometry(2.2,2.7,4),canvas); a.position.y=1.35; a.rotation.y=Math.PI/4; g.add(a);
  g.add(box(.9,1.35,.08,dark,0,.68,1.02));
  return g;
}
function bridge() {
  const g=new THREE.Group(), wood=mat("#795638");
  g.add(box(5,.22,9,wood,0,1.1,0));
  for(const x of [-2.25,2.25]) {
    g.add(box(.14,1.1,9,wood,x,1.55,0));
    for(let z=-4;z<=4;z+=2) g.add(box(.14,.55,.14,wood,x,2.25,z));
  }
  return g;
}
function fence() {
  const g=new THREE.Group(), wood=mat("#876342");
  for(let x=-3;x<=3;x+=1.5) g.add(box(.12,1.1,.12,wood,x,.55,0));
  g.add(box(6,.12,.12,wood,0,.8,0),box(6,.12,.12,wood,0,.35,0));
  return g;
}
function bench() {
  const g=new THREE.Group(), wood=mat("#8c603c"), metal=mat("#42484d");
  g.add(box(2,.14,.62,wood,0,.85,0),box(2,.72,.12,wood,0,1.25,-.24));
  for(const x of [-.75,.75]) g.add(box(.12,.8,.12,metal,x,.4,0));
  return g;
}
function sign() {
  const g=new THREE.Group(), post=mat("#594630"), board=mat("#d7c18a");
  g.add(cyl(.08,.1,2.5,post,0,1.25,0),box(1.8,.75,.12,board,0,2.15,0));
  return g;
}
function water() {
  const g=new THREE.Group(), blue=mat("#4e9fc0",.35,true,.82);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(18,32),blue); plane.rotation.x=-Math.PI/2; plane.position.y=.08; g.add(plane);
  return g;
}
const factories={tree,house,lamp,car,bicycle,motorcycle,bird,road,tent,bridge,fence,bench,sign,water};
export function createSceneProps(scene) {
  const root=new THREE.Group(); root.name="storyboard-scene-props";
  const groups={};
  for(const [kind,make] of Object.entries(factories)) {
    groups[kind]=[];
    const count=kind==="tree"?5:kind==="bird"?3:kind==="lamp"||kind==="house"||kind==="fence"?2:1;
    for(let i=0;i<count;i++){ const obj=make(); root.add(obj); groups[kind].push(obj); }
  }
  scene.add(root);
  const layout={
    tree:(s,r)=>[s*(8+r*2),0,12+r*5], motorcycle:(s)=>[s*5.2,0,16], house:(s,r)=>[s*11,0,20+r*8],
    lamp:(s,r)=>[s*5.5,0,10+r*14], car:(s)=>[s*4.8,0,18],
    bicycle:(s)=>[s*4.5,0,13], bird:(s,r)=>[s*(3+r*2),6+r,9+r*5],
    road:()=>[0,0,22],tent:(s)=>[s*8,0,17],bridge:()=>[0,0,25],
    fence:(s)=>[s*8,0,16],bench:(s)=>[s*5,0,12],sign:(s)=>[s*6,0,10],water:()=>[0,0,32]
  };
  return (requested=[]) => {
    const kinds=new Set(requested);
    for(const [kind,items] of Object.entries(groups)) items.forEach((o,i)=>{
      o.visible=kinds.has(kind); if(!o.visible) return;
      const side=i%2===0?-1:1, row=Math.floor(i/2);
      const offset=layout[kind](side,row); o.position.set(...offset);
      if(kind==="car") o.rotation.y=side<0?-.16:Math.PI+.16;
      if(kind==="bicycle") o.rotation.y=side<0?-.35:Math.PI+.35;\n      if(kind==="motorcycle") o.rotation.y=side<0?-.25:Math.PI+.25;
      if(kind==="house"||kind==="tent"||kind==="bench") o.rotation.y=side<0?-.25:Math.PI+.25;
      if(kind==="water"||kind==="bridge") o.rotation.y=0;
    });
  };
}
