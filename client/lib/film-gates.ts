import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function mountFilmGates(
  host: HTMLElement,
  progress: () => number,
  panels: number,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 6;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const light = new THREE.DirectionalLight(0xffedc7, 3);
  light.position.set(-3, 5, 6);
  scene.add(light, new THREE.HemisphereLight(0xffffff, 0x193a32, 2));
  const hinges = [new THREE.Group(), new THREE.Group()];
  const materials = [
    new THREE.MeshStandardMaterial({
      color: 0xe9c999,
      metalness: 0.35,
      roughness: 0.32,
      transparent: true,
      depthWrite: false,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x193a32,
      metalness: 0.4,
      roughness: 0.3,
      transparent: true,
      depthWrite: false,
    }),
  ];
  const trim = new THREE.MeshStandardMaterial({
    color: 0xd7a65f,
    metalness: 0.8,
    roughness: 0.22,
    transparent: true,
    depthWrite: false,
  });
  const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);
  hinges.forEach((hinge, i) => {
    const door = new THREE.Mesh(geometry, materials[i]);
    door.position.x = i ? -0.5 : 0.5;
    hinge.add(door);
    for (const y of [-0.43, 0.43]) {
      const bar = new THREE.Mesh(geometry, trim);
      bar.scale.set(0.83, 0.008, 1.08);
      bar.position.set(i ? -0.5 : 0.5, y, 0);
      hinge.add(bar);
    }
    const handle = new THREE.Mesh(geometry, trim);
    handle.scale.set(0.018, 0.18, 1.5);
    handle.position.set(i ? -0.83 : 0.83, 0, 0.18);
    hinge.add(handle);
    scene.add(hinge);
  });
  let width = 1,
    height = 1,
    frame = 0,
    visible = false,
    disposed = false,
    lastTravel = NaN;
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    height = 2 * Math.tan(THREE.MathUtils.degToRad(20)) * 6;
    width = height * camera.aspect;
    lastTravel = NaN;
  };
  const render = () => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const travel = progress() * (panels - 1);
    if (travel === lastTravel) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastTravel = travel;
    const fraction = travel - Math.floor(travel);
    const opacity =
      travel >= panels - 1
        ? 0
        : 1 - THREE.MathUtils.smoothstep(fraction, 0.55, 0.95);
    materials.forEach((material) => {
      material.opacity = opacity;
    });
    trim.opacity = opacity;
    const angle =
      THREE.MathUtils.smoothstep(fraction, 0.08, 0.85) * Math.PI * 0.55;
    hinges.forEach((hinge, i) => {
      hinge.position.set(
        -width / 2 + (1 - fraction) * width + (i ? width : 0),
        0,
        0,
      );
      hinge.scale.set(width / 2, height, 0.16);
      hinge.rotation.y = i ? -angle : angle;
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  const wake = () => {
    if (!frame && visible && !document.hidden && !disposed) render();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) wake();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  observer.observe(host);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  document.addEventListener("visibilitychange", wake);
  resize();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", wake);
    geometry.dispose();
    materials.forEach((m) => m.dispose());
    trim.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
