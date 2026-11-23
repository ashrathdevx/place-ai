import * as THREE from 'three';

export function mountPipeline(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true }); }
  catch { return () => {}; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37,1,.1,100);
  camera.position.set(0,0,14);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  host.append(renderer.domElement);
  const group = new THREE.Group();
  scene.add(group);
  const nodes = [
    [-3.5,.2,-.2],[-1.9,1.3,.2],[-.25,.15,1.1],[1.4,1.15,-.4],[3.35,.2,.15],
    [-2.3,-.95,-.8],[.15,-1.1,-.2],[2.22,-1.0,.65],[2.9,1.55,-1.0],
  ].map(point => new THREE.Vector3(...point));
  const edges = [[0,1],[0,5],[1,2],[5,2],[5,6],[2,3],[2,6],[3,4],[3,8],[8,4],[6,7],[7,4],[3,7]];
  const segmentPoints = edges.flatMap(([a,b]) => [nodes[a],nodes[b]]);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(segmentPoints);
  const lineMaterial = new THREE.LineBasicMaterial({color:0x777df1,transparent:true,opacity:.7});
  group.add(new THREE.LineSegments(lineGeometry,lineMaterial));
  const geometry = new THREE.IcosahedronGeometry(.2,2);
  const materials = [
    new THREE.MeshBasicMaterial({color:0xb9f867}),
    new THREE.MeshBasicMaterial({color:0x9e9bff}),
    new THREE.MeshBasicMaterial({color:0xbcc6ff,wireframe:true,transparent:true,opacity:.48}),
  ];
  nodes.forEach((point,index) => {
    const node = new THREE.Mesh(geometry,materials[index === 0 || index === 4 ? 0 : 1]);
    node.position.copy(point);
    if ([0,2,4].includes(index)) node.scale.setScalar(1.48);
    const halo = new THREE.Mesh(geometry,materials[2]);
    halo.scale.setScalar(2.4);
    halo.position.copy(point);
    group.add(node,halo);
  });
  const packets = Array.from({length:5},() => {
    const packet = new THREE.Mesh(geometry,materials[0]);
    packet.scale.setScalar(.25);
    group.add(packet);
    return packet;
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = new THREE.Vector2();
  const onPointer = event => {
    const rect = host.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width-.5,(event.clientY-rect.top)/rect.height-.5);
  };
  const reset = () => pointer.set(0,0);
  const resize = () => {
    const {clientWidth,clientHeight} = host;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth,clientHeight,false);
    camera.aspect = clientWidth/clientHeight;
    camera.position.z = Math.max(12.5,12.5 / camera.aspect);
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  if (!reduced) {
    host.addEventListener('pointermove',onPointer);
    host.addEventListener('pointerleave',reset);
    renderer.setAnimationLoop(time => {
      const t = time/1000;
      group.rotation.y += (pointer.x*.7+Math.sin(t*.55)*.13-group.rotation.y)*.055;
      group.rotation.x += (-pointer.y*.45+Math.cos(t*.5)*.13-group.rotation.x)*.055;
      packets.forEach((packet,index) => {
        const progress = t*.74+index*.52;
        const [a,b] = edges[Math.floor(progress)%edges.length];
        packet.position.lerpVectors(nodes[a],nodes[b],progress%1);
      });
      renderer.render(scene,camera);
    });
  } else {
    packets.forEach((packet,index) => packet.position.lerpVectors(nodes[edges[index][0]],nodes[edges[index][1]],.55));
  }
  resize();
  return () => {
    observer.disconnect();
    host.removeEventListener('pointermove',onPointer);
    host.removeEventListener('pointerleave',reset);
    renderer.setAnimationLoop(null);
    lineGeometry.dispose();
    lineMaterial.dispose();
    geometry.dispose();
    materials.forEach(material => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
