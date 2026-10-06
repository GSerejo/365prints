"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { DIGITS_365_PATH } from "@/lib/brand";

export type PrinterSceneProps = {
  /** Quanto do "365" está impresso (0 a 1). */
  progress: number;
  /** Bico aquecido: a impressão começa (com um timelapse até `progress`). */
  printing: boolean;
  reducedMotion: boolean;
  /** Texto da telinha da impressora. */
  screenLabel: string;
  onReady: () => void;
  onError: () => void;
  /** Camada (1 a 365) que o bico está imprimindo, a cada mudança. */
  onLayer: (layer: number) => void;
};

// Impressora "bed slinger" no estilo da Bambu Lab A1: a mesa anda para frente e para trás,
// o pórtico sobe a cada camada e o carretel fica em cima da moldura.
const ORANGE = 0xff751f;
const PLASTIC = 0xe6e1db;
const DARK = 0x2a2725;
const METAL = 0xb4b9bf;

const PRINT_WIDTH = 3.8;
const BED_TOP = 0.62;
const VISIBLE_LAYERS = 73; // 365 / 5: uma linha visível a cada 5 dias
const TIMELAPSE_SECONDS = 5.5;
const PARK = { x: -2.2, y: BED_TOP + 2.0 };

/** Onda triangular entre 0 e 1. */
function tri(t: number) {
  const m = ((t % 2) + 2) % 2;
  return 1 - Math.abs(m - 1);
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function damp(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function plateTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1f1c1a";
  ctx.fillRect(0, 0, size, size);
  // Textura de PEI: pontinhos claros.
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(255,240,225,${0.025 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  for (let p = 64; p < size; p += 64) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  // Cantos em L, como as marcas da mesa.
  ctx.strokeStyle = "rgba(255,117,31,0.55)";
  ctx.lineWidth = 6;
  const m = 40;
  const l = 90;
  for (const [x, y, dx, dy] of [
    [m, m, 1, 1],
    [size - m, m, -1, 1],
    [m, size - m, 1, -1],
    [size - m, size - m, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * l, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * l);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,117,31,0.4)";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("365prints · textured PEI", size / 2, size - 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawScreen(canvas: HTMLCanvasElement, label: string, progress: number) {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  ctx.fillStyle = "#0d0c0b";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ff8a3d";
  ctx.font = "700 58px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 26, height * 0.4);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(26, height * 0.74, width - 52, 12);
  ctx.fillStyle = "#ff751f";
  ctx.fillRect(26, height * 0.74, (width - 52) * progress, 12);
}

export default function PrinterScene(props: PrinterSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    propsRef.current = props;
    wakeRef.current();
  });

  useEffect(() => {
    const container = containerRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      propsRef.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "block size-full";
    container.appendChild(renderer.domElement);

    const disposables: { dispose: () => void }[] = [renderer];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const scene = new THREE.Scene();
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const room = new RoomEnvironment();
    scene.environment = track(pmrem.fromScene(room, 0.04).texture);
    scene.environmentIntensity = 0.5;
    room.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Luzes: uma principal quente, um contorno laranja por trás e o brilho do bico.
    scene.add(new THREE.HemisphereLight(0xfff4ea, 0x2a1d14, 0.7));
    const key = new THREE.DirectionalLight(0xfff1e2, 2.2);
    key.position.set(4, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new THREE.DirectionalLight(ORANGE, 2.4);
    rim.position.set(-6, 5, -6);
    scene.add(rim);

    const mat = {
      plastic: track(new THREE.MeshStandardMaterial({ color: PLASTIC, roughness: 0.62 })),
      dark: track(new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.55 })),
      metal: track(new THREE.MeshStandardMaterial({ color: METAL, metalness: 1, roughness: 0.28 })),
      brass: track(new THREE.MeshStandardMaterial({ color: 0xd2a24c, metalness: 1, roughness: 0.3 })),
      accent: track(new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45 })),
    };

    const box = (w: number, h: number, d: number, material: THREE.Material, radius = 0.06) => {
      const mesh = new THREE.Mesh(track(new RoundedBoxGeometry(w, h, d, 3, radius)), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };
    const rod = (length: number, radius: number, material: THREE.Material) =>
      new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, length, 16)), material);

    const printer = new THREE.Group();
    scene.add(printer);

    // Chão que só recebe a sombra.
    const floor = new THREE.Mesh(
      track(new THREE.PlaneGeometry(30, 30)),
      track(new THREE.ShadowMaterial({ opacity: 0.32 })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    printer.add(floor);

    // Base, trilhos do eixo Y e telinha.
    const base = box(6.1, 0.42, 4.5, mat.plastic, 0.12);
    base.position.y = 0.21;
    printer.add(base);
    const baseBand = box(6.12, 0.08, 4.52, mat.dark, 0.03);
    baseBand.position.y = 0.06;
    printer.add(baseBand);
    for (const x of [-1.1, 1.1]) {
      const rail = rod(4.2, 0.045, mat.metal);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, 0.47, 0);
      printer.add(rail);
    }

    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 320;
    screenCanvas.height = 140;
    const screenTexture = track(new THREE.CanvasTexture(screenCanvas));
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    const screenPod = box(1.15, 0.6, 0.16, mat.dark, 0.05);
    screenPod.position.set(2.45, 0.55, 2.35);
    screenPod.rotation.x = -0.45;
    const screen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.0, 0.44)),
      track(new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false })),
    );
    screen.position.z = 0.081;
    screenPod.add(screen);
    printer.add(screenPod);

    // Mesa (anda no eixo Y da impressora = z da cena) com a peça em cima.
    const bed = new THREE.Group();
    printer.add(bed);
    const carriage = box(3.2, 0.06, 2.6, mat.dark, 0.02);
    carriage.position.y = 0.53;
    bed.add(carriage);
    const plate = new THREE.Mesh(
      track(new THREE.BoxGeometry(4.5, 0.06, 3.7)),
      [
        mat.dark,
        mat.dark,
        track(new THREE.MeshStandardMaterial({ map: track(plateTexture()), roughness: 0.85 })),
        mat.dark,
        mat.dark,
        mat.dark,
      ],
    );
    plate.position.y = BED_TOP - 0.03;
    plate.receiveShadow = true;
    bed.add(plate);

    // A peça: o "365" da marca, em pé, com linhas de camada.
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${DIGITS_365_PATH}"/></svg>`);
    const shapes = svg.paths.flatMap((path) => path.toShapes());
    const digits = track(new THREE.ExtrudeGeometry(shapes, { depth: 24, bevelEnabled: false, curveSegments: 12 }));
    digits.rotateX(Math.PI); // no SVG o y cresce para baixo
    digits.computeBoundingBox();
    const bounds = digits.boundingBox!;
    digits.translate(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);
    const scale = PRINT_WIDTH / (bounds.max.x - bounds.min.x);
    digits.scale(scale, scale, scale);
    digits.computeBoundingBox();
    const printHeight = digits.boundingBox!.max.y;
    const printDepth = digits.boundingBox!.max.z * 2;

    const keepBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const keepAbove = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const layerUniforms = {
      uLayer: { value: printHeight / VISIBLE_LAYERS },
      uCut: { value: 0 },
    };
    const printed = track(
      new THREE.MeshStandardMaterial({
        color: ORANGE,
        roughness: 0.5,
        clippingPlanes: [keepBelow],
        clipShadows: true,
      }),
    );
    printed.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, layerUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vLayerY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLayerY = position.y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vLayerY;\nuniform float uLayer;\nuniform float uCut;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float layerT = vLayerY / uLayer;
          float edge = min(fract(layerT), 1.0 - fract(layerT));
          float groove = 1.0 - smoothstep(0.0, max(fwidth(layerT) * 1.5, 0.16), edge);
          diffuseColor.rgb *= 1.0 - 0.3 * groove;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float hot = smoothstep(uCut - uLayer * 3.0, uCut, vLayerY);
          totalEmissiveRadiance += vec3(1.0, 0.38, 0.06) * hot * 0.85;`,
        );
    };
    const printedMesh = new THREE.Mesh(digits, printed);
    printedMesh.castShadow = true;
    printedMesh.receiveShadow = true;
    // Por dentro do corte aparece a "tampa": a camada de cima, ainda quente.
    const capMesh = new THREE.Mesh(
      digits,
      track(new THREE.MeshBasicMaterial({ color: 0xffa25a, side: THREE.BackSide, clippingPlanes: [keepBelow] })),
    );
    // O que falta imprimir: contorno, como na pré-visualização do fatiador.
    const ghostFill = new THREE.Mesh(
      digits,
      track(
        new THREE.MeshBasicMaterial({
          color: ORANGE,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          clippingPlanes: [keepAbove],
        }),
      ),
    );
    const ghostEdges = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(digits, 25)),
      track(
        new THREE.LineBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.5, clippingPlanes: [keepAbove] }),
      ),
    );
    const piece = new THREE.Group();
    piece.position.y = BED_TOP;
    piece.add(printedMesh, capMesh, ghostFill, ghostEdges);
    bed.add(piece);

    // Moldura em U invertido, fusos e carretel.
    const frameZ = -0.6;
    for (const side of [-1, 1]) {
      const tower = box(0.36, 3.5, 0.66, mat.plastic, 0.1);
      tower.position.set(side * 2.9, 0.42 + 1.75, frameZ);
      printer.add(tower);
      const screw = rod(3.1, 0.035, mat.metal);
      screw.position.set(side * 2.6, 0.42 + 1.55, frameZ + 0.3);
      printer.add(screw);
    }
    const topBar = box(6.16, 0.36, 0.66, mat.plastic, 0.1);
    topBar.position.set(0, 3.92, frameZ);
    printer.add(topBar);
    const topStripe = box(1.4, 0.06, 0.02, mat.accent, 0.01);
    topStripe.position.set(-1.8, 3.92, frameZ + 0.34);
    printer.add(topStripe);

    // O carretel fica deitado em cima da moldura, girando no eixo x.
    const spoolMount = new THREE.Group();
    spoolMount.position.set(1.5, 4.82, frameZ - 0.05);
    spoolMount.rotation.y = Math.PI / 2;
    printer.add(spoolMount);
    const spool = new THREE.Group();
    spoolMount.add(spool);
    for (const x of [-0.42, 0.42]) {
      const arm = box(0.1, 0.62, 0.22, mat.dark, 0.03);
      arm.position.set(1.5 + x, 4.4, frameZ - 0.05);
      printer.add(arm);
    }
    const flangeMat = track(
      new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 0.35, transparent: true, opacity: 0.88 }),
    );
    for (const z of [-0.24, 0.24]) {
      const flange = new THREE.Mesh(track(new THREE.CylinderGeometry(0.66, 0.66, 0.04, 48)), flangeMat);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = z;
      flange.castShadow = true;
      spool.add(flange);
    }
    const filamentCanvas = document.createElement("canvas");
    filamentCanvas.width = 8;
    filamentCanvas.height = 64;
    const fctx = filamentCanvas.getContext("2d")!;
    for (let y = 0; y < 64; y += 4) {
      fctx.fillStyle = "#ff751f";
      fctx.fillRect(0, y, 8, 3);
      fctx.fillStyle = "#c9520f";
      fctx.fillRect(0, y + 3, 8, 1);
    }
    const filamentTexture = track(new THREE.CanvasTexture(filamentCanvas));
    filamentTexture.colorSpace = THREE.SRGBColorSpace;
    filamentTexture.wrapS = filamentTexture.wrapT = THREE.RepeatWrapping;
    filamentTexture.repeat.set(1, 6);
    const filament = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.56, 0.56, 0.44, 48, 1, true)),
      track(new THREE.MeshStandardMaterial({ map: filamentTexture, roughness: 0.4 })),
    );
    filament.rotation.x = Math.PI / 2;
    spool.add(filament);
    const hub = rod(0.5, 0.2, mat.dark);
    hub.rotation.x = Math.PI / 2;
    spool.add(hub);
    const axle = rod(0.95, 0.05, mat.metal);
    axle.rotation.x = Math.PI / 2;
    spool.add(axle);
    for (let i = 0; i < 3; i++) {
      const spoke = box(0.08, 1.15, 0.02, mat.dark, 0.01);
      spoke.position.z = 0.27;
      spoke.rotation.z = (i * Math.PI) / 3;
      spool.add(spoke);
    }

    // Pórtico (sobe a cada camada) com a cabeça de impressão.
    const gantry = new THREE.Group();
    printer.add(gantry);
    const beam = box(5.4, 0.34, 0.3, mat.dark, 0.06);
    beam.position.set(0, 0.7, frameZ);
    gantry.add(beam);
    const xRail = rod(5.3, 0.04, mat.metal);
    xRail.rotation.z = Math.PI / 2;
    xRail.position.set(0, 0.62, frameZ + 0.19);
    gantry.add(xRail);

    const head = new THREE.Group();
    gantry.add(head);
    const body = box(0.78, 0.86, 0.62, mat.plastic, 0.1);
    body.position.set(0, 0.68, -0.08);
    head.add(body);
    const headStripe = box(0.6, 0.07, 0.02, mat.accent, 0.01);
    headStripe.position.set(0, 1.0, 0.24);
    head.add(headStripe);
    const fanRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.22, 0.03, 10, 40)), mat.dark);
    fanRing.position.set(0, 0.62, 0.235);
    head.add(fanRing);
    const blades = new THREE.Group();
    blades.position.copy(fanRing.position);
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.19, 0.01)), mat.dark);
      blade.position.y = 0.1;
      const holder = new THREE.Group();
      holder.rotation.z = (i * Math.PI * 2) / 5;
      blade.rotation.y = 0.5;
      holder.add(blade);
      blades.add(holder);
    }
    head.add(blades);
    const heater = box(0.3, 0.16, 0.26, mat.metal, 0.02);
    heater.position.set(0, 0.2, 0);
    head.add(heater);
    const nozzle = new THREE.Mesh(track(new THREE.ConeGeometry(0.075, 0.13, 20)), mat.brass);
    nozzle.rotation.x = Math.PI;
    nozzle.position.y = 0.065;
    head.add(nozzle);
    const tipGlow = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.03, 12, 12)),
      track(new THREE.MeshBasicMaterial({ color: 0xffc08a, toneMapped: false })),
    );
    head.add(tipGlow);
    const nozzleLight = new THREE.PointLight(0xff8a3d, 0, 2.2, 1.6);
    nozzleLight.position.y = 0.05;
    head.add(nozzleLight);

    // Tubo de PTFE do carretel até a cabeça (refeito quando a cabeça anda).
    const tubeMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf6f2ec, roughness: 0.25, transparent: true, opacity: 0.85 }),
    );
    const tube = new THREE.Mesh(new THREE.BufferGeometry(), tubeMat);
    printer.add(tube);
    const tubeStart = new THREE.Vector3();
    const tubeControl = new THREE.Vector3();
    const tubeEnd = new THREE.Vector3(0.95, 4.2, frameZ + 0.15);
    const lastTube = new THREE.Vector2(Infinity, Infinity);
    function updateTube(x: number, y: number) {
      if (Math.abs(lastTube.x - x) < 0.01 && Math.abs(lastTube.y - y) < 0.01) return;
      lastTube.set(x, y);
      tubeStart.set(x, y + 1.1, -0.08);
      tubeControl.set((x + tubeEnd.x) / 2 - 0.3, Math.max(y + 2.4, 5.0), 0.55);
      tube.geometry.dispose();
      tube.geometry = new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(tubeStart, tubeControl, tubeEnd),
        40,
        0.035,
        6,
      );
    }
    disposables.push({ dispose: () => tube.geometry.dispose() });

    // Câmera: enquadra a impressora inteira em qualquer proporção.
    const target = new THREE.Vector3(0, 2.55, 0);
    const azimuth = 0.42;
    const elevation = 0.2;
    let distance = 14;
    function resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      distance = Math.max(6.4 / (2 * tanHalf), 8.0 / (2 * tanHalf * camera.aspect)) + 1.2;
      camera.updateProjectionMatrix();
      wake();
    }

    // Estado da animação.
    const state = {
      fraction: 0,
      headX: PARK.x,
      headY: PARK.y,
      bedZ: 0,
      phase: 0,
      yaw: 0,
      pitch: 0,
      heat: 0,
      timelapseStart: -1,
      timelapseTarget: 0,
      layer: -1,
      screen: "",
      screenProgress: -1,
      time: 0,
    };
    const pointer = { x: 0, y: 0 };

    function updateScreen(label: string, progress: number) {
      if (label === state.screen && Math.abs(progress - state.screenProgress) < 0.002) return;
      state.screen = label;
      state.screenProgress = progress;
      drawScreen(screenCanvas, label, progress);
      screenTexture.needsUpdate = true;
    }

    let last = performance.now();
    let raf = 0;
    let visible = true;
    let readySent = false;

    function frame(now: number) {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      state.time += dt;
      const { progress, printing, reducedMotion, screenLabel, onReady, onLayer } = propsRef.current;
      const motion = reducedMotion ? 0 : 1;

      // Quanto está impresso.
      const goal = printing ? progress : 0;
      if (printing && state.timelapseStart < 0) {
        state.timelapseStart = state.time;
        state.timelapseTarget = progress;
      }
      const timelapse =
        printing &&
        motion > 0 &&
        progress === state.timelapseTarget &&
        state.time - state.timelapseStart < TIMELAPSE_SECONDS;
      if (reducedMotion) state.fraction = goal;
      else if (timelapse)
        state.fraction = goal * easeOutCubic((state.time - state.timelapseStart) / TIMELAPSE_SECONDS);
      else state.fraction = damp(state.fraction, goal, 5, dt);
      const cut = state.fraction * printHeight;
      keepBelow.constant = BED_TOP + cut;
      keepAbove.constant = -(BED_TOP + cut);
      layerUniforms.uCut.value = cut;
      const settled = Math.abs(state.fraction - goal) < 0.0005;

      // Cabeça: parada na origem até aquecer; depois faz o preenchimento da camada.
      state.phase += dt * motion * (timelapse ? 2.4 : 0.55);
      const headTarget = printing
        ? {
            x: motion ? THREE.MathUtils.lerp(-1.75, 1.75, tri(state.phase)) : 0.4,
            y: BED_TOP + cut,
          }
        : PARK;
      const headRate = reducedMotion ? 1000 : 9;
      state.headX = damp(state.headX, headTarget.x, headRate, dt);
      state.headY = damp(state.headY, headTarget.y, headRate, dt);
      state.bedZ = damp(state.bedZ, printing ? (tri(state.phase * 4.3) - 0.5) * printDepth * 0.8 * motion : 0, 12, dt);
      head.position.x = state.headX;
      gantry.position.y = state.headY;
      bed.position.z = state.bedZ;
      updateTube(state.headX, state.headY);

      state.heat = damp(state.heat, printing ? 1 : 0.35, 3, dt);
      const flicker = motion ? 0.85 + 0.15 * Math.sin(state.time * 23) * Math.sin(state.time * 7) : 1;
      nozzleLight.intensity = state.heat * 2.2 * flicker;
      tipGlow.scale.setScalar(0.4 + state.heat * 0.6);

      blades.rotation.z -= dt * 26 * motion * (printing ? 1 : 0.3);
      spool.rotation.z += dt * motion * (printing ? (timelapse ? 2.2 : 0.3) : 0);

      // Leve paralaxe com o mouse e um balanço lento.
      state.yaw = damp(state.yaw, (pointer.x * 0.32 + Math.sin(state.time * 0.25) * 0.05) * motion, 3, dt);
      state.pitch = damp(state.pitch, pointer.y * 0.12 * motion, 3, dt);
      const angle = azimuth + state.yaw;
      const lift = elevation + state.pitch;
      camera.position.set(
        target.x + Math.sin(angle) * Math.cos(lift) * distance,
        target.y + Math.sin(lift) * distance,
        target.z + Math.cos(angle) * Math.cos(lift) * distance,
      );
      camera.lookAt(target);

      const layer = Math.round(state.fraction * 365);
      if (layer !== state.layer) {
        state.layer = layer;
        onLayer(layer);
      }
      updateScreen(screenLabel, state.fraction);

      renderer.render(scene, camera);
      if (!readySent) {
        readySent = true;
        onReady();
      }

      const idle = reducedMotion && settled && Math.abs(state.headY - headTarget.y) < 0.001;
      if (!idle) schedule();
    }

    function schedule() {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function wake() {
      schedule();
    }
    wakeRef.current = wake;

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    intersection.observe(container);
    const onVisibility = () => schedule();
    document.addEventListener("visibilitychange", onVisibility);
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = container.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      pointer.y = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      if (propsRef.current.reducedMotion) return;
      schedule();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    resize();
    schedule();

    return () => {
      wakeRef.current = () => {};
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      for (const item of disposables) item.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
