// Reusable low-poly 3D scene props for storyboard-driven environments.
import * as THREE from "three";

const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
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
  const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(2.15,1.45,4),roof); roofMesh.position.set(0,2.82,0); roofMesh.rotation.y=Math.PI/4; roofMesh.castShadow=true; g.add(roofMesh);
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
const factories={tree,house,lamp,car,bicycle,bird,road};
export function createSceneProps(scene) {
  const root=new THREE.Group(); root.name="storyboard-scene-props";
  const groups={};
  for(const [kind,make] of Object.entries(factories)) {
    groups[kind]=[];
    const count=kind==="tree"?5:kind==="bird"?3:kind==="lamp"?2:kind==="house"?2:1;
    for(let i=0;i<count;i++){ const obj=make(); root.add(obj); groups[kind].push(obj); }
  }
  scene.add(root);
  return (requested=[]) => {
    const kinds=new Set(requested);
    for(const [kind,items] of Object.entries(groups)) items.forEach((o,i)=>{
      o.visible=kinds.has(kind);
      if(!o.visible) return;
      const side=i%2===0?-1:1, row=Math.floor(i/2);
      const offsets={
        tree:[side*(7.5+row*2.2),0,12+row*4],
        house:[side*10,0,18+row*7],
        lamp:[side*5.2,0,9+row*13],
        car:[side*4.8,0,17],
        bicycle:[side*4.4,0,13],
        bird:[side*(3+row*2),5+row*1.1,9+row*4],
        road:[0,0,20]
      }[kind];
      o.position.set(...offsets);
      if(kind==="car") o.rotation.y=side<0?-.16:Math.PI+.16;
      if(kind==="bicycle") o.rotation.y=side<0?-.35:Math.PI+.35;
      if(kind==="house") o.rotation.y=side<0?-.25:Math.PI+.25;
    });
  };
}
