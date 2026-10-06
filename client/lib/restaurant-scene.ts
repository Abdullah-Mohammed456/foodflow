import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function labelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#f64924";
  c.fillRect(0, 0, 2048, 2048);
  c.strokeStyle = "#ffaf48";
  c.lineWidth = 90;
  for (let i = -3; i < 7; i++) {
    c.beginPath();
    c.arc(1024, 2900, 700 + i * 210, Math.PI, 0);
    c.stroke();
  }
  c.textAlign = "center";
  c.fillStyle = "#fff3d9";
  c.font = "900 200px Arial";
  c.fillText("FOOD", 1024, 670);
  c.fillText("FLOW", 1024, 870);
  c.font = "700 48px Arial";
  c.fillText("GOOD FOOD. GOOD MOOD.", 1024, 1030);
  c.font = "700 34px Arial";
  c.fillText("THE PERFECT PLUS ONE", 1024, 1550);
  c.lineWidth = 4;
  c.strokeStyle = "#fff3d9";
  c.beginPath();
  c.arc(1024, 1240, 110, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(1024, 1230, 55, 0, Math.PI);
  c.stroke();
  c.beginPath();
  c.arc(990, 1200, 6, 0, Math.PI * 2);
  c.arc(1058, 1200, 6, 0, Math.PI * 2);
  c.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function citrus() {
  const group = new THREE.Group();
  const rind = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.16, 64),
    new THREE.MeshStandardMaterial({ color: "#ff8c19", roughness: 0.8 }),
  );
  group.add(rind);
  const flesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.17, 64),
    new THREE.MeshStandardMaterial({ color: "#ffe6a6", roughness: 0.55 }),
  );
  group.add(flesh);
  for (let i = 0; i < 10; i++) {
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.625,
        0.625,
        0.18,
        12,
        1,
        false,
        (i * Math.PI) / 5 + 0.025,
        Math.PI / 5 - 0.05,
      ),
      new THREE.MeshPhysicalMaterial({
        color: i % 2 ? "#ffae23" : "#ffc440",
        roughness: 0.3,
        clearcoat: 0.7,
      }),
    );
    group.add(segment);
  }
  group.rotation.x = Math.PI / 2;
  return group;
}

export function mountRestaurantScene(section: HTMLElement) {
  const host = section.querySelector<HTMLElement>(".restaurant-scene")!;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    section.dataset.scene = "fallback";
    window.dispatchEvent(new Event("foodflow:scene-ready"));
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 10);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x644e33, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffba76, 1.5);
  rim.position.set(4, 1, -3);
  scene.add(rim);
  const world = new THREE.Group();
  const tilt = new THREE.Group();
  const can = new THREE.Group();
  scene.add(world);
  world.add(tilt);
  tilt.add(can);
  const metal = new THREE.MeshStandardMaterial({
    color: "#e2e5e7",
    metalness: 1,
    roughness: 0.23,
  });
  const points = [
    [0.56, -1.35],
    [0.62, -1.32],
    [0.67, -1.2],
    [0.69, -1.05],
    [0.69, 1.03],
    [0.66, 1.16],
    [0.57, 1.26],
    [0.57, 1.34],
  ].map(([x, y]) => new THREE.Vector2(x!, y!));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 96), metal);
  can.add(shell);
  const texture = labelTexture();
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.696, 0.696, 2.15, 96, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.33,
      metalness: 0.15,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    }),
  );
  label.rotation.y = Math.PI;
  can.add(label);
  for (const y of [-1.34, 1.34]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.575, 0.035, 12, 96),
      metal,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    can.add(ring);
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.565, 0.565, 0.025, 64),
      metal,
    );
    lid.position.y = y;
    can.add(lid);
  }
  const groove = new THREE.Mesh(
    new THREE.TorusGeometry(0.49, 0.012, 8, 64),
    metal,
  );
  groove.rotation.x = Math.PI / 2;
  groove.position.y = 1.36;
  can.add(groove);
  const tab = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.045, 12, 32),
    metal,
  );
  tab.rotation.x = Math.PI / 2;
  tab.scale.y = 1.7;
  tab.position.set(0, 1.38, 0.12);
  can.add(tab);
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 32),
    new THREE.MeshStandardMaterial({ color: "#282828", roughness: 0.5 }),
  );
  hole.rotation.x = -Math.PI / 2;
  hole.scale.y = 1.45;
  hole.position.set(0, 1.367, -0.22);
  can.add(hole);
  const dropMaterial = new THREE.MeshPhysicalMaterial({
    color: "#fff7e5",
    roughness: 0.05,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
    clearcoat: 1,
  });
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    dropMaterial,
    80,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 80; i++) {
    const a = i * 2.39996;
    const s = 0.013 + (i % 5) * 0.004;
    dummy.position.set(
      Math.sin(a) * 0.71,
      -1 + (i % 19) / 9,
      Math.cos(a) * 0.71,
    );
    dummy.scale.set(s, s * 1.3, s * 0.5);
    dummy.rotation.y = a;
    dummy.updateMatrix();
    drops.setMatrixAt(i, dummy.matrix);
  }
  can.add(drops);
  const sliceA = citrus();
  sliceA.position.set(-1.6, -0.7, 0.1);
  sliceA.rotation.z = 0.35;
  world.add(sliceA);
  const sliceB = citrus();
  sliceB.scale.setScalar(0.7);
  sliceB.position.set(1.3, 1.4, -0.8);
  sliceB.rotation.set(1, 0.5, -0.4);
  world.add(sliceB);
  // White frosted glass, illuminated separately from the warm product lighting.
  const iceMaterial = new THREE.MeshPhysicalMaterial({
    color: "#FFFFFF",
    transmission: 0,
    thickness: 0.35,
    roughness: 0.1,
    ior: 1.31,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.8,
    specularIntensity: 1,
    emissive: "#FFF1D6",
    emissiveIntensity: 0.35,
    attenuationColor: "#FFFFFF",
    attenuationDistance: 2,
  });
  // Fresnel highlights make thin glass edges catch white light without adding geometry.
  iceMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <tonemapping_fragment>",
      `
      #include <tonemapping_fragment>
      float iceEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), iceEdge);
      gl_FragColor.a = mix(gl_FragColor.a, 0.9, iceEdge);
    `,
    );
  };
  const ice = Array.from({ length: 3 }, (_, i) => {
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.07),
      iceMaterial,
    );
    m.position.set(
      i === 0 ? -1.2 : 1.1 + i * 0.25,
      i === 0 ? 1.7 : -1.2 + i * 0.4,
      i * 0.3,
    );
    m.rotation.set(i * 0.6, 0.3, i * 0.9);
    world.add(m);
    return m;
  });
  // A white light on a dedicated layer illuminates only ice, preserving the can and citrus.
  ice.forEach((cube) => cube.layers.set(1));
  const iceLight = new THREE.PointLight(0xffffff, 45, 12, 2);
  iceLight.position.set(1.5, 3, 4);
  iceLight.layers.set(1);
  world.add(iceLight);
  const pose = { p: 0, pointerX: 0, pointerY: 0, pointerDepth: 0 };
  let frame = 0;
  let visible = true;
  let disposed = false;
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const render = () => {
    const mobile = host.clientWidth < 700;
    const p = pose.p;
    const path =
      p < 0.35
        ? THREE.MathUtils.smoothstep(p, 0, 0.35)
        : p < 0.68
          ? THREE.MathUtils.smoothstep(p, 0.35, 0.68)
          : THREE.MathUtils.smoothstep(p, 0.68, 1);
    const x =
      p < 0.35
        ? THREE.MathUtils.lerp(1.35, 0, path)
        : p < 0.68
          ? THREE.MathUtils.lerp(0, -2.1, path)
          : THREE.MathUtils.lerp(-2.1, 1.35, path);
    world.position.set(
      mobile ? Math.sin(p * Math.PI * 2) * 0.25 : x,
      mobile ? -1.45 : Math.sin(p * Math.PI) * 0.2,
      0,
    );
    world.scale.setScalar(mobile ? 0.67 : 1.12 - Math.sin(p * Math.PI) * 0.1);
    can.rotation.set(
      0.18 + Math.sin(p * Math.PI) * 0.9,
      p * Math.PI * 2,
      -0.18 + Math.sin(p * Math.PI * 2) * 0.45,
    );
    can.position.y = Math.sin(p * Math.PI) * 0.4;
    tilt.rotation.set(pose.pointerY, pose.pointerX, -pose.pointerX * 0.22);
    tilt.position.set(
      pose.pointerX * 0.5,
      -pose.pointerY * 0.45,
      pose.pointerDepth,
    );
    sliceA.position.x = -1.6 + p * 3;
    sliceA.position.y = -0.7 - p * 0.7;
    sliceA.rotation.z = 0.35 + p * 2;
    sliceB.position.y = 1.4 + p * 0.5;
    sliceB.rotation.z = -0.4 - p * 2;
    ice.forEach((m, i) => {
      m.rotation.y = p * 3 + i;
      m.position.x =
        (i === 0 ? -1.2 : 1.1 + i * 0.25) - Math.sin(p * Math.PI) * 1.8;
    });
    camera.position.z = mobile
      ? 10 - Math.sin(p * Math.PI) * 1.2
      : 10 - Math.sin(p * Math.PI) * 2;
    // Render ice with its own white light; the original warm lighting stays on the can/citrus.
    camera.layers.set(0);
    renderer.autoClear = true;
    renderer.render(scene, camera);
    camera.layers.set(1);
    renderer.autoClear = false;
    renderer.render(scene, camera);
    camera.layers.set(0);
    renderer.autoClear = true;
  };
  let lastPose = "";
  const tick = () => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const current = `${pose.p}:${pose.pointerX}:${pose.pointerY}:${pose.pointerDepth}`;
    if (current !== lastPose) {
      render();
      lastPose = current;
    }
    if (!media.matches) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && visible && !document.hidden && !disposed) tick();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) wake();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  observer.observe(section);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const ctx = gsap.matchMedia();
  ctx.add(
    "(prefers-reduced-motion: no-preference)",
    () => {
      gsap.set(".restaurant-copy", { y: 0 });
      gsap.fromTo(
        ".restaurant-copy > *",
        { y: 35, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out" },
      );
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      tl.to(pose, { p: 1, duration: 1, ease: "none" }, 0)
        .to(".restaurant-copy", { y: -90, autoAlpha: 0, duration: 0.14 }, 0.02)
        .fromTo(
          ".restaurant-third",
          { y: 60, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.1 },
          0.48,
        )
        .to(".restaurant-third", { y: -45, autoAlpha: 0, duration: 0.08 }, 0.64)
        .fromTo(
          ".restaurant-fourth",
          { y: 65, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.08 },
          0.71,
        )
        .to(".restaurant-fourth", { y: -55, autoAlpha: 0, duration: 0.07 }, 0.8)
        .fromTo(
          ".restaurant-second",
          { y: 60, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.12 },
          0.88,
        )
        .to(
          ".restaurant-orbit",
          { scale: 1.7, rotation: 100, duration: 1, ease: "none" },
          0,
        )
        .to(
          ".restaurant-stage",
          { backgroundColor: "#f6ad91", duration: 0.12 },
          0.2,
        )
        .to(".restaurant-foot", { color: "#432819", duration: 0.12 }, 0.2)
        .to(
          ".restaurant-stage",
          { backgroundColor: "#35232b", duration: 0.14 },
          0.36,
        )
        .to(".restaurant-foot", { color: "#E8DFCF", duration: 0.17 }, 0.36)
        .to(
          ".restaurant-stage",
          { backgroundColor: "#141C33", duration: 0.12 },
          0.6,
        )
        .to(
          ".restaurant-stage",
          { backgroundColor: "#FFE0A3", duration: 0.12 },
          0.83,
        )
        .to(".restaurant-foot", { color: "#432819", duration: 0.12 }, 0.83);
    },
    section,
  );
  const moveX = gsap.quickTo(pose, "pointerX", {
    duration: 0.55,
    ease: "power3.out",
  });
  const moveY = gsap.quickTo(pose, "pointerY", {
    duration: 0.55,
    ease: "power3.out",
  });
  const moveDepth = gsap.quickTo(pose, "pointerDepth", {
    duration: 0.7,
    ease: "power3.out",
  });
  const move = (e: PointerEvent) => {
    if (media.matches || e.pointerType !== "mouse") return;
    const r = host.getBoundingClientRect();
    const x = gsap.utils.clamp(
      -1,
      1,
      ((e.clientX - r.left) / r.width - 0.5) * 2,
    );
    const y = gsap.utils.clamp(
      -1,
      1,
      ((e.clientY - r.top) / r.height - 0.5) * 2,
    );
    moveX(x * 0.42);
    moveY(y * 0.26);
    moveDepth(0.32 * (1 - Math.min(1, Math.hypot(x, y))));
  };
  const leave = () => {
    moveX(0);
    moveY(0);
    moveDepth(0);
  };
  const motionChange = () => {
    if (media.matches) {
      pose.p = 0;
      leave();
    }
    wake();
    render();
  };
  const lost = (e: Event) => {
    e.preventDefault();
    visible = false;
    cancelAnimationFrame(frame);
    frame = 0;
    section.dataset.scene = "fallback";
  };
  section.addEventListener("pointermove", move);
  section.addEventListener("pointerleave", leave);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", wake);
  media.addEventListener("change", motionChange);
  section.dataset.scene = "ready";
  resize();
  wake();
  window.dispatchEvent(new Event("foodflow:scene-ready"));
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    ctx.revert();
    moveX.tween.kill();
    moveY.tween.kill();
    moveDepth.tween.kill();
    observer.disconnect();
    ro.disconnect();
    section.removeEventListener("pointermove", move);
    section.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", wake);
    media.removeEventListener("change", motionChange);
    renderer.domElement.removeEventListener("webglcontextlost", lost);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    texture.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
