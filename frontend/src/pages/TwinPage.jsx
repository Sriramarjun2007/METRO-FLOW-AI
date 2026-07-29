import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Shield, CloudRain, Cpu, Activity, Leaf, Truck, ChevronDown, ChevronUp } from 'lucide-react';

export default function UrbanVerseSimulation() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

  // Multi-Agent State Engine Signals
  const [activeScenario, setActiveScenario] = useState('NORMAL_RUSH_HOUR');
  const [activePlan, setActivePlan] = useState('Plan_A');
  const [agentLogs, setAgentLogs] = useState([]);
  
  // UI Minimization State
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [isXaiMinimized, setIsXaiMinimized] = useState(false);

  // Dashboard Telemetry
  const [telemetry, setTelemetry] = useState({
    activeFleet: 0,
    avgSpeedKmh: '0.0',
    sensorTrustVision: '95%',
    neighborSpillbackRisk: 'Low (12%)',
    activePriority: 'NORMAL (P5)',
    sdgDelayReduction: '88.2%',
    sdgCo2Saved: '120 g/km',
    fps: 60,
  });

  const scenarioRef = useRef(activeScenario);
  useEffect(() => { scenarioRef.current = activeScenario; }, [activeScenario]);

  useEffect(() => {
    const stageEl = stageRef.current;
    const canvasEl = canvasRef.current;
    if (!stageEl || !canvasEl) return undefined;

    /* =========================================================================
     * 1. THREE.JS SCENE SETUP & RENDERER
     * ========================================================================= */
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(stageEl.clientWidth, stageEl.clientHeight, false);
    renderer.setClearColor(0x090d16, 1.0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d16, 0.005);

    const camera = new THREE.PerspectiveCamera(38, stageEl.clientWidth / stageEl.clientHeight, 0.5, 400);
    camera.position.set(85, 80, 100);

    let camTarget = new THREE.Vector3(0, 0, 0);
    let camAzimuth = Math.PI / 4;
    let camElevation = 0.65;
    let camDistance = 120;
    let isDragging = false;
    let prevMouseX = 0, prevMouseY = 0;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    function updateCameraPosition() {
      const x = camTarget.x + camDistance * Math.cos(camElevation) * Math.sin(camAzimuth);
      const y = camTarget.y + camDistance * Math.sin(camElevation);
      const z = camTarget.z + camDistance * Math.cos(camElevation) * Math.cos(camAzimuth);
      camera.position.set(x, y, z);
      camera.lookAt(camTarget);
    }
    updateCameraPosition();

    const onPointerDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      camAzimuth -= dx * 0.005;
      camElevation = clamp(camElevation - dy * 0.005, 0.1, 1.4);
      updateCameraPosition();
    };
    const onPointerUp = () => { isDragging = false; };
    const onWheel = (e) => {
      camDistance = clamp(camDistance + e.deltaY * 0.05, 30, 220);
      updateCameraPosition();
      e.preventDefault();
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });

    function onWindowResize() {
      if (!stageEl) return;
      const w = stageEl.clientWidth;
      const h = stageEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onWindowResize);

    /* =========================================================================
     * 2. ENVIRONMENT & LIGHTING
     * ========================================================================= */
    const ambientLight = new THREE.AmbientLight(0x90a4c0, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sunLight.position.set(60, 90, 40);
    sunLight.castShadow = true;
    scene.add(sunLight);

    /* Ground Base & Grid */
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d131d, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const gridHelper = new THREE.GridHelper(400, 80, 0x1a2638, 0x111a28);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    /* Weather Particle System */
    const rainCount = 1500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 200;
      rainPositions[i + 1] = Math.random() * 80;
      rainPositions[i + 2] = (Math.random() - 0.5) * 200;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x77aaff,
      size: 0.35,
      transparent: true,
      opacity: 0.0,
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    /* =========================================================================
     * 3. VEHICLE BUILDERS
     * ========================================================================= */
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111c24,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

    function createWheelMesh(radius = 0.35, width = 0.25) {
      const group = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), wheelMat);
      tire.rotation.z = Math.PI / 2;
      group.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.02, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      group.add(rim);
      return group;
    }

    function buildSedanMesh(colorHex) {
      const vGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.4 });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 1.8), bodyMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;
      vGroup.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.6), bodyMat);
      cabin.position.set(-0.2, 1.15, 0);
      cabin.castShadow = true;
      vGroup.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.52), glassMat);
      windshield.position.set(0.8, 1.1, 0);
      windshield.rotation.z = -0.3;
      vGroup.add(windshield);

      const wOffsets = [[1.2, 0.35, 0.9], [1.2, 0.35, -0.9], [-1.2, 0.35, 0.9], [-1.2, 0.35, -0.9]];
      vGroup.userData.wheels = [];
      wOffsets.forEach(([x, y, z]) => {
        const w = createWheelMesh(0.35, 0.22);
        w.position.set(x, y, z);
        vGroup.add(w);
        vGroup.userData.wheels.push(w);
      });

      vGroup.userData.length = 4.4;
      vGroup.userData.width = 1.9;
      return vGroup;
    }

    function buildAmbulanceMesh() {
      const vGroup = new THREE.Group();
      const ambMat = new THREE.MeshStandardMaterial({ color: 0xf0f3f8, roughness: 0.3 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.1, 2.0), ambMat);
      body.position.y = 1.2;
      body.castShadow = true;
      vGroup.add(body);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.22, 0.35, 2.02), new THREE.MeshBasicMaterial({ color: 0xdd2222 }));
      stripe.position.y = 1.1;
      vGroup.add(stripe);

      const sirenMat = new THREE.MeshBasicMaterial({ color: 0x0055ff });
      const siren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), sirenMat);
      siren.position.set(1.2, 2.35, 0);
      vGroup.add(siren);
      vGroup.userData.sirenMat = sirenMat;

      const wOffsets = [[1.5, 0.38, 1.0], [1.5, 0.38, -1.0], [-1.5, 0.38, 1.0], [-1.5, 0.38, -1.0]];
      vGroup.userData.wheels = [];
      wOffsets.forEach(([x, y, z]) => {
        const w = createWheelMesh(0.38, 0.24);
        w.position.set(x, y, z);
        vGroup.add(w);
        vGroup.userData.wheels.push(w);
      });

      vGroup.userData.length = 5.4;
      vGroup.userData.width = 2.0;
      return vGroup;
    }

    /* =========================================================================
     * 4. CITY ROAD NETWORK & BUILDINGS + HOSPITAL
     * ========================================================================= */
    const ROAD_WIDTH = 15.0;
    const INTERSECTIONS_POS = [
      { id: 'N1', x: -45, z:  30 }, { id: 'N2', x: 0, z:  30 }, { id: 'N3', x: 45, z:  30 },
      { id: 'S1', x: -45, z: -30 }, { id: 'S2', x: 0, z: -30 }, { id: 'S3', x: 45, z: -30 },
    ];

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.9 });

    function createRoadCorridor(x1, z1, x2, z2) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);

      const road = new THREE.Mesh(new THREE.PlaneGeometry(len, ROAD_WIDTH), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = angle;
      road.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
      road.receiveShadow = true;
      scene.add(road);

      [-0.15, 0.15].forEach((off) => {
        const yellowLine = new THREE.Mesh(
          new THREE.PlaneGeometry(len, 0.12),
          new THREE.MeshBasicMaterial({ color: 0xebac23 })
        );
        yellowLine.rotation.x = -Math.PI / 2;
        yellowLine.rotation.z = angle;
        const perpX = -Math.sin(angle) * off;
        const perpZ =  Math.cos(angle) * off;
        yellowLine.position.set((x1 + x2) / 2 + perpX, 0.025, (z1 + z2) / 2 + perpZ);
        scene.add(yellowLine);
      });
    }

    createRoadCorridor(-90,  30, 90,  30);
    createRoadCorridor(-90, -30, 90, -30);
    createRoadCorridor(-45, -70, -45, 70);
    createRoadCorridor(  0, -70,   0, 70);
    createRoadCorridor( 45, -70,  45, 70);

    /* Buildings placed strictly outside road corridors */
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 });
    const blockCoords = [
      { x: -22.5, z: 0, w: 16, d: 24 },
      { x: 22.5, z: 0, w: 16, d: 24 },
      { x: -22.5, z: 52, w: 16, d: 20 },
      { x: 22.5, z: 52, w: 16, d: 20 },
      { x: -22.5, z: -52, w: 16, d: 20 },
      { x: 22.5, z: -52, w: 16, d: 20 },
    ];

    blockCoords.forEach(b => {
      const bHeight = 8 + Math.random() * 6;
      const geom = new THREE.BoxGeometry(b.w, bHeight, b.d);
      const mesh = new THREE.Mesh(geom, buildingMat);
      mesh.position.set(b.x, bHeight / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    /* Hospital Building */
    const hospitalGroup = new THREE.Group();
    hospitalGroup.position.set(65, 0, 52);
    const hospBaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const hospCore = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 16), hospBaseMat);
    hospCore.position.y = 6;
    hospCore.castShadow = true;
    hospitalGroup.add(hospCore);

    const crossMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1.8), crossMat);
    c1.position.set(0, 12.1, 0);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 5), crossMat);
    c2.position.set(0, 12.1, 0);
    hospitalGroup.add(c1);
    hospitalGroup.add(c2);
    scene.add(hospitalGroup);

    /* =========================================================================
     * 5. TRAFFIC SIGNALS & SIMULATION LOOP
     * ========================================================================= */
    const signalState = { phase: 'NS_GREEN', timer: 0, duration: 10.0 };

    function createSignalGantry(x, z) {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.0), new THREE.MeshStandardMaterial({ color: 0x222a36 }));
      pole.position.y = 2.5;
      group.add(pole);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }));
      head.position.set(0, 4.8, 0);
      group.add(head);

      const redBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0x330000 }));
      redBulb.position.set(0, 5.2, 0.21);
      group.add(redBulb);

      const greenBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0x003300 }));
      greenBulb.position.set(0, 4.4, 0.21);
      group.add(greenBulb);

      group.userData = { redBulb, greenBulb };
      return group;
    }

    const signalGantries = [];
    INTERSECTIONS_POS.forEach((ip) => {
      const gNS = createSignalGantry(ip.x - 8.5, ip.z - 8.5);
      const gEW = createSignalGantry(ip.x + 8.5, ip.z - 8.5);
      gEW.rotation.y = -Math.PI / 2;
      scene.add(gNS);
      scene.add(gEW);
      signalGantries.push({ node: ip.id, gNS, gEW });
    });

    function updateSignalLights() {
      const isNSGreen = signalState.phase === 'NS_GREEN';
      signalGantries.forEach(({ gNS, gEW }) => {
        gNS.userData.greenBulb.material.color.setHex(isNSGreen ? 0x00ff44 : 0x002200);
        gNS.userData.redBulb.material.color.setHex(isNSGreen ? 0x220000 : 0xff1111);

        gEW.userData.greenBulb.material.color.setHex(isNSGreen ? 0x002200 : 0x00ff44);
        gEW.userData.redBulb.material.color.setHex(isNSGreen ? 0xff1111 : 0x00ff44);
      });
    }
    updateSignalLights();

    /* Flexible Dynamic Path Options across all city roads for the ambulance */
    function generatePathSpline(type) {
      const points = [];
      const R = 3.75;
      if (type === 'NS_STRAIGHT') {
        points.push(new THREE.Vector3(-45 - R, 0, -80), new THREE.Vector3(-45 - R, 0, 80));
      } else if (type === 'SN_STRAIGHT') {
        points.push(new THREE.Vector3(-45 + R, 0, 80), new THREE.Vector3(-45 + R, 0, -80));
      } else if (type === 'EW_STRAIGHT') {
        points.push(new THREE.Vector3(-90, 0, 30 - R), new THREE.Vector3(90, 0, 30 - R));
      } else if (type === 'AMBULANCE_ROUTE_ALPHA') {
        // Dynamic Route Option 1: South-to-North corridor switching through central avenues
        points.push(
          new THREE.Vector3(-45 - R, 0, -70),
          new THREE.Vector3(-45 - R, 0, -30),
          new THREE.Vector3(-45 - R, 0, 30),
          new THREE.Vector3(0, 0, 30),
          new THREE.Vector3(45, 0, 30),
          new THREE.Vector3(45, 0, 70)
        );
      } else if (type === 'AMBULANCE_ROUTE_BETA') {
        // Dynamic Route Option 2: East-West cross boulevard routing
        points.push(
          new THREE.Vector3(-80, 0, -30 + R),
          new THREE.Vector3(-45, 0, -30 + R),
          new THREE.Vector3(0, 0, -30 + R),
          new THREE.Vector3(0, 0, 30 - R),
          new THREE.Vector3(45, 0, 30 - R),
          new THREE.Vector3(80, 0, 30 - R)
        );
      } else {
        points.push(new THREE.Vector3(90, 0, 30 + R), new THREE.Vector3(-90, 0, 30 + R));
      }
      return new THREE.CatmullRomCurve3(points);
    }

    const PATH_TYPES = ['NS_STRAIGHT', 'SN_STRAIGHT', 'EW_STRAIGHT', 'WE_STRAIGHT'];
    const pathSplines = {};
    PATH_TYPES.forEach(pt => { pathSplines[pt] = generatePathSpline(pt); });
    
    // Multiple varied routes for the ambulance
    const AMBULANCE_ROUTES = ['AMBULANCE_ROUTE_ALPHA', 'AMBULANCE_ROUTE_BETA'];
    AMBULANCE_ROUTES.forEach(rt => { pathSplines[rt] = generatePathSpline(rt); });

    const vehiclesList = [];
    const vehicleContainerGroup = new THREE.Group();
    scene.add(vehicleContainerGroup);

    function spawnVehicle(isEmergency = false) {
      let pathType;
      if (isEmergency) {
        // Pick randomly from available roadway corridors so the ambulance can take different valid paths
        pathType = AMBULANCE_ROUTES[Math.floor(Math.random() * AMBULANCE_ROUTES.length)];
      } else {
        pathType = PATH_TYPES[Math.floor(Math.random() * PATH_TYPES.length)];
      }

      const curve = pathSplines[pathType];
      const spawnPos = curve.getPointAt(0);

      for (const v of vehiclesList) {
        if (v.mesh.position.distanceTo(spawnPos) < 14.0) return null;
      }

      const mesh = isEmergency ? buildAmbulanceMesh() : buildSedanMesh(0x3b6db3);
      vehicleContainerGroup.add(mesh);

      const carObj = {
        id: Math.random().toString(36).substr(2, 9),
        mesh,
        curve,
        progress: 0.0,
        speed: isEmergency ? 16.0 : 9.0 + Math.random() * 3.0,
        targetSpeed: isEmergency ? 18.0 : 12.0,
        length: mesh.userData.length,
        width: mesh.userData.width,
        isEmergency,
      };

      vehiclesList.push(carObj);
      return carObj;
    }

    for (let i = 0; i < 16; i++) {
      const v = spawnVehicle();
      if (v) v.progress = Math.random() * 0.7;
    }

    /* Spatial Collision & Lane Separation Logic */
    function updateVehiclePhysics(v, dt) {
      const currentPos = v.curve.getPointAt(v.progress);
      const curveLength = v.curve.getLength();
      const lookAheadT = Math.min(1.0, v.progress + 0.01);
      const aheadPos = v.curve.getPointAt(lookAheadT);
      const heading = new THREE.Vector3().subVectors(aheadPos, currentPos).normalize();

      v.mesh.position.copy(currentPos);
      if (heading.lengthSq() > 0.001) {
        v.mesh.rotation.y = Math.atan2(heading.x, heading.z) - Math.PI / 2;
      }

      if (v.isEmergency && v.mesh.userData.sirenMat) {
        const flash = Math.sin(Date.now() * 0.01) > 0 ? 0x0055ff : 0xff0000;
        v.mesh.userData.sirenMat.color.setHex(flash);
      }

      let safeGap = 100.0;

      for (const other of vehiclesList) {
        if (other.id === v.id) continue;
        const toOther = new THREE.Vector3().subVectors(other.mesh.position, currentPos);
        const forwardDot = toOther.dot(heading);
        if (forwardDot > 0 && forwardDot < 25.0) {
          const lateralDist = Math.abs(toOther.cross(heading).y);
          if (lateralDist < (v.width / 2 + other.width / 2 + 0.6)) {
            const gap = forwardDot - (v.length / 2 + other.length / 2);
            if (gap < safeGap) safeGap = gap;
          }
        }
      }

      let effectiveGap = safeGap;
      if (!v.isEmergency) {
        INTERSECTIONS_POS.forEach((ip) => {
          const dist = Math.hypot(ip.x - currentPos.x, ip.z - currentPos.z);
          if (dist < 16.0 && dist > 4.0) {
            const isNSHeading = Math.abs(heading.z) > Math.abs(heading.x);
            const isRed = isNSHeading ? (signalState.phase !== 'NS_GREEN') : (signalState.phase === 'NS_GREEN');
            if (isRed) effectiveGap = Math.min(effectiveGap, dist - 5.0);
          }
        });
      }

      if (effectiveGap < 1.0) {
        v.speed = 0;
      } else if (effectiveGap < 22.0 && !v.isEmergency) {
        const targetV = Math.max(0, (effectiveGap - 3.0) / 1.8);
        v.speed = THREE.MathUtils.lerp(v.speed, targetV, dt * 4.0);
      } else {
        v.speed = THREE.MathUtils.lerp(v.speed, v.targetSpeed, dt * 1.5);
      }

      const ds = v.speed * dt;
      v.progress = Math.max(0.0, Math.min(1.0, v.progress + ds / curveLength));

      if (v.mesh.userData.wheels) {
        const rotVel = (v.speed / 0.35) * dt;
        v.mesh.userData.wheels.forEach(w => { w.rotation.x += rotVel; });
      }
    }

    let animFrameId;
    let clock = new THREE.Clock();
    let frameCount = 0;
    let fpsTimer = 0;

    function animate() {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      fpsTimer += dt;
      frameCount++;

      const activeScen = scenarioRef.current;
      if (activeScen === 'HEAVY_RAIN_EVENT') {
        rainMat.opacity = 0.65;
        const positions = rainParticles.geometry.attributes.position.array;
        for (let i = 1; i < rainCount * 3; i += 3) {
          positions[i] -= 40 * dt;
          if (positions[i] < 0) positions[i] = 80;
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      } else {
        rainMat.opacity = 0.0;
      }

      signalState.timer += dt;
      if (signalState.timer >= signalState.duration) {
        signalState.timer = 0;
        if (activeScen === 'AMBULANCE_EXPRESS') {
          signalState.phase = 'NS_GREEN';
        } else {
          signalState.phase = (signalState.phase === 'NS_GREEN') ? 'EW_GREEN' : 'NS_GREEN';
        }
        updateSignalLights();
      }

      for (let i = vehiclesList.length - 1; i >= 0; i--) {
        const v = vehiclesList[i];
        updateVehiclePhysics(v, dt);
        if (v.progress >= 0.99) {
          vehicleContainerGroup.remove(v.mesh);
          vehiclesList.splice(i, 1);
        }
      }

      if (vehiclesList.length < 18) {
        const isEmergencyScenario = activeScen === 'AMBULANCE_EXPRESS';
        const hasEmergencyCar = vehiclesList.some(v => v.isEmergency);
        spawnVehicle(isEmergencyScenario && !hasEmergencyCar);
      }

      if (fpsTimer >= 0.5) {
        const currentFps = Math.round(frameCount / fpsTimer);
        const avgSpd = vehiclesList.reduce((acc, v) => acc + v.speed, 0) / (vehiclesList.length || 1);

        let sensorTrust = '95%';
        let priorityName = 'NORMAL (P5)';
        let planName = 'Plan_A';
        let spillback = 'Low (12%)';

        const ambActive = vehiclesList.some(v => v.isEmergency);

        if (activeScen === 'AMBULANCE_EXPRESS') {
          priorityName = 'EMERGENCY (P0)';
          planName = 'Plan_B (Multi-Corridor Dynamic Routing)';
          spillback = 'Low (15%)';
        } else if (activeScen === 'HEAVY_RAIN_EVENT') {
          sensorTrust = '55% (Rain Impact)';
          priorityName = 'EVENT_SURGE (P2)';
          planName = 'Plan_C (Capacity Flush)';
          spillback = 'Elevated (42%)';
        }

        setActivePlan(planName);
        setTelemetry({
          activeFleet: vehiclesList.length,
          avgSpeedKmh: (avgSpd * 3.6).toFixed(1),
          sensorTrustVision: sensorTrust,
          neighborSpillbackRisk: spillback,
          activePriority: priorityName,
          sdgDelayReduction: '88.2%',
          sdgCo2Saved: '120 g/km',
          fps: currentFps,
        });

        setAgentLogs([
          `[Traffic State Agent]: Vision Trust adjusted to ${sensorTrust}.`,
          `[Priority Ingestion]: Multi-Route Corridor Secured: ${ambActive ? 'ACTIVE' : 'NORMAL'}.`,
          `[Shadow Agent]: Selected Plan: ${planName}.`,
          `[Consensus Agent]: Zero Collision Buffer Enforced.`
        ]);

        fpsTimer = 0;
        frameCount = 0;
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', onWindowResize);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={stageRef} style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#090d16', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Top Header Scenario Controls */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        backgroundColor: 'rgba(13, 19, 29, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '8px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <button
          onClick={() => setActiveScenario('NORMAL_RUSH_HOUR')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: activeScenario === 'NORMAL_RUSH_HOUR' ? '#0284c7' : 'rgba(255,255,255,0.05)',
            color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
          }}>
          <Activity size={14} /> Morning Rush
        </button>

        <button
          onClick={() => setActiveScenario('AMBULANCE_EXPRESS')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: activeScenario === 'AMBULANCE_EXPRESS' ? '#dc2626' : 'rgba(255,255,255,0.05)',
            color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
          }}>
          <Truck size={14} /> Ambulance Express
        </button>

        <button
          onClick={() => setActiveScenario('HEAVY_RAIN_EVENT')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: activeScenario === 'HEAVY_RAIN_EVENT' ? '#7c3aed' : 'rgba(255,255,255,0.05)',
            color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
          }}>
          <CloudRain size={14} /> Heavy Rain & Event
        </button>
      </div>

      {/* Left Minimizable HUD Telemetry */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: '280px',
        backgroundColor: 'rgba(13, 19, 29, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#e2e8f0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div 
          onClick={() => setIsHudMinimized(!isHudMinimized)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
            <Cpu size={16} /> URBANVERSE AI HUDS
          </div>
          <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            {isHudMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {!isHudMinimized && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Sensor Trust:</span>
              <span style={{ fontWeight: '600', color: telemetry.sensorTrustVision.includes('55%') ? '#f87171' : '#4ade80' }}>
                {telemetry.sensorTrustVision}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Priority:</span>
              <span style={{ fontWeight: '600', color: telemetry.activePriority.includes('P0') ? '#ef4444' : '#38bdf8' }}>
                {telemetry.activePriority}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Selected Plan:</span>
              <span style={{ fontWeight: '600', color: '#facc15' }}>{activePlan}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Avg Speed:</span>
              <span style={{ fontWeight: '600', color: '#4ade80' }}>{telemetry.avgSpeedKmh} km/h</span>
            </div>

            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#4ade80', marginBottom: '4px' }}>
                <Leaf size={12} /> UN SDG IMPACT
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8' }}>CO2 Output:</span>
                <span style={{ fontWeight: '600' }}>{telemetry.sdgCo2Saved}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Minimizable XAI Reasoning Stream */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: '600px',
        backgroundColor: 'rgba(13, 19, 29, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#e2e8f0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div 
          onClick={() => setIsXaiMinimized(!isXaiMinimized)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#facc15' }}>
            <Shield size={14} /> EXPLAINABLE AI LOGS
          </div>
          <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            {isXaiMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {!isXaiMinimized && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#cbd5e1' }}>
            {agentLogs.map((log, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '6px' }}>
                <span style={{ color: '#64748b' }}>&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}