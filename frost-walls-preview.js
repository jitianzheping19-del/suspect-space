import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFrostMap, frostMapData as data } from './frost-map.js';
import { createFrostNavigation } from './frost-navigation.js';
import { createFrostDoors } from './frost-doors.js';
import { createFrostTasks } from './frost-tasks.js';
import { createFrostMeetingButton } from './frost-meeting.js';

const $ = (id) => document.getElementById(id);
const status = $('status');

async function start() {
  await document.fonts.ready;
  const stage = $('stage');
  const app = $('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'ドラッグで視点を動かせる3Dマップ');
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#d6eafb', '#283952', 2.3));
  const sun = new THREE.DirectionalLight('#f1f8ff', 3.1);
  sun.position.set(-26, 54, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -49, right: 49, top: 49, bottom: -49, near: 1, far: 120 });
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.07;
  sun.shadow.radius = 2;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#a3e0ed', 0.8);
  fill.position.set(24, 18, -35);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280),
    new THREE.MeshStandardMaterial({ color: '#132334', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  const map = createFrostMap();
  const navigation = createFrostNavigation(data);
  const doorView = createFrostDoors(navigation.doors);
  map.root.add(doorView.root);
  scene.add(map.root);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.08, 350);
  const initialSpawn = data.rooms.find((room) => room.id === 'dome').spawn;
  const walker = { x: initialSpawn[0], z: -initialSpawn[1], yaw: 0, pitch: 0 };
  const keys = new Set();
  const stick = { x: 0, y: 0, pointer: null };
  const look = { pointer: null, x: 0, y: 0 };
  const coarsePointer = matchMedia('(pointer: coarse)');
  const raycaster = new THREE.Raycaster();
  const centre = new THREE.Vector3(
    (data.bounds[0] + data.bounds[2]) / 2, 1,
    -(data.bounds[1] + data.bounds[3]) / 2,
  );
  let mode = 'overview';
  let controls = null;
  let dirty = true;
  let contextLost = false;
  let previousTime = 0;
  let currentRoom = '';
  let renderedFrames = 0;
  let nearestTask = null;
  let tap = null;
  let meetingSignalUntil = 0;
  const taskSystem = createFrostTasks(data, {
    onDirty() { dirty = true; renderer.shadowMap.needsUpdate = true; },
    onModal(open) {
      app.dataset.taskOpen = String(open);
      resetInput();
      previousTime = 0;
      dirty = true;
    },
  });
  map.root.add(taskSystem.root);
  const meetingView = createFrostMeetingButton(data.meeting, () => {
    meetingSignalUntil = performance.now() + 2200;
    $('meetingSignal').hidden = false;
    dirty = true;
  });
  map.root.add(meetingView.root);

  function useAction(action) {
    if (!action) return;
    if (action.id === data.meeting.id) meetingView.press();
    else taskSystem.open(action.id);
  }

  for (const room of data.rooms) {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = room.name;
    $('roomPicker').append(option);
  }

  function resetInput() {
    tap = null;
    keys.clear();
    if (stick.pointer !== null && $('joystick').hasPointerCapture(stick.pointer)) {
      $('joystick').releasePointerCapture(stick.pointer);
    }
    if (look.pointer !== null && renderer.domElement.hasPointerCapture(look.pointer)) {
      renderer.domElement.releasePointerCapture(look.pointer);
    }
    stick.x = stick.y = 0;
    stick.pointer = look.pointer = null;
    $('stickThumb').style.transform = '';
  }

  function fitCamera() {
    controls?.dispose();
    const direction = mode === 'top' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0.42, 1.12, 0.92).normalize();
    camera.up.set(0, mode === 'top' ? 0 : 1, mode === 'top' ? -1 : 0);
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    let distance = 0;
    for (const [x, planY] of data.floor.outline) {
      for (const y of [0, data.wallHeight + 0.2]) {
        const point = new THREE.Vector3(x, y, -planY).sub(centre);
        distance = Math.max(distance, point.dot(direction)
          + Math.max(Math.abs(point.dot(right)) / tanH, Math.abs(point.dot(up)) / tanV));
      }
    }
    camera.position.copy(centre).addScaledVector(direction, distance * 1.08 + 3);
    camera.lookAt(centre);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(centre);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enableRotate = mode !== 'top';
    controls.minDistance = 9;
    controls.maxDistance = 260;
    controls.maxPolarAngle = mode === 'top' ? Math.PI : Math.PI * 0.47;
    controls.screenSpacePanning = true;
    controls.addEventListener('change', () => { dirty = true; });
    controls.update();
    dirty = true;
  }

  function applyWalkCamera() {
    camera.up.set(0, 1, 0);
    camera.position.set(walker.x, 1.65, walker.z);
    camera.rotation.set(walker.pitch, walker.yaw, 0, 'YXZ');
    const room = navigation.roomAt(walker.x, walker.z);
    const name = room?.name || '通路';
    if (name !== currentRoom) {
      currentRoom = name;
      $('location').textContent = name;
      if (room) $('roomPicker').value = room.id;
    }
    let task = taskSystem.nearest(walker);
    const meetingDistance = Math.hypot(walker.x - data.meeting.position[0], walker.z + data.meeting.position[1]);
    if (meetingDistance < 2.5 && (!task
      || meetingDistance < Math.hypot(walker.x - task.position[0], walker.z + task.position[1]))) task = data.meeting;
    if (task?.id !== nearestTask?.id) {
      nearestTask = task;
      $('taskAction').hidden = !task;
      $('useTask').disabled = !task;
      $('nearbyTask').textContent = task?.name || '';
      $('useTask').textContent = task?.id === data.meeting.id ? '会議' : '使用';
      $('useTask').dataset.kind = task?.id === data.meeting.id ? 'meeting' : 'task';
    }
  }

  function setMode(nextMode) {
    if (!['overview', 'top', 'walk'].includes(nextMode)) return;
    if (taskSystem.isOpen) taskSystem.close();
    resetInput();
    mode = nextMode;
    camera.fov = mode === 'walk' ? 70 : 43;
    camera.near = mode === 'walk' ? 0.08 : 1;
    camera.updateProjectionMatrix();
    app.dataset.mode = mode;
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === mode));
    });
    if (mode === 'walk') {
      if (controls) controls.enabled = false;
      applyWalkCamera();
      $('hint').textContent = 'WASD / 矢印キーで移動 · ドラッグで視点';
      scene.fog = new THREE.Fog('#132334', 40, 95);
    } else {
      nearestTask = null;
      $('taskAction').hidden = true;
      scene.fog = null;
      fitCamera();
      currentRoom = '';
      $('location').textContent = '氷衛星研究基地';
      $('hint').textContent = mode === 'top'
        ? 'ドラッグで移動 · 端末をクリックして操作'
        : 'ドラッグで回転 · 端末をクリックして操作';
    }
    dirty = true;
  }

  function teleport(roomId) {
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return false;
    walker.x = room.spawn[0];
    walker.z = -room.spawn[1];
    walker.pitch = 0;
    walker.yaw = 0;
    setMode('walk');
    return true;
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (mode !== 'walk') fitCamera();
    dirty = true;
  }
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  document.addEventListener('webkitfullscreenchange', resize);

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.view));
  });
  $('roomPicker').addEventListener('change', (event) => teleport(event.target.value));
  $('useTask').addEventListener('click', () => useAction(nearestTask));
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (app.requestFullscreen) await app.requestFullscreen();
      else app.webkitRequestFullscreen?.();
    } catch { /* The regular view is still fully usable on iOS. */ }
  });
  if (!app.requestFullscreen && !app.webkitRequestFullscreen) $('fullscreen').hidden = true;

  window.addEventListener('keydown', (event) => {
    if (mode !== 'walk' || taskSystem.isOpen || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (event.code === 'KeyE' && nearestTask && !event.repeat) {
      event.preventDefault();
      useAction(nearestTask);
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', () => {
    resetInput();
    previousTime = 0;
    dirty = true;
  });

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!tap) tap = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    if (mode !== 'walk' || look.pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    look.pointer = event.pointerId;
    look.x = event.clientX;
    look.y = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6) tap.moved = true;
    if (mode !== 'walk' || look.pointer !== event.pointerId) return;
    walker.yaw -= (event.clientX - look.x) * 0.004;
    walker.pitch = THREE.MathUtils.clamp(walker.pitch - (event.clientY - look.y) * 0.0035, -1.22, 1.1);
    look.x = event.clientX;
    look.y = event.clientY;
    dirty = true;
  });
  const stopLook = (event) => {
    if (look.pointer === event.pointerId) look.pointer = null;
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    renderer.domElement.addEventListener(type, stopLook);
  }
  renderer.domElement.addEventListener('pointerup', (event) => {
    const candidate = tap;
    tap = null;
    if (!candidate || candidate.id !== event.pointerId || candidate.moved || taskSystem.isOpen) return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.far = 350;
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const taskHit = taskSystem.pick(raycaster);
    const meetingHit = meetingView.pick(raycaster);
    const hit = meetingHit && (!taskHit || meetingHit.distance < taskHit.distance) ? meetingHit : taskHit;
    if (!hit) return;
    const wall = raycaster.intersectObject(map.walls, false)[0];
    if (wall && wall.distance < hit.distance - 0.1) return;
    if (mode === 'walk' && Math.hypot(walker.x - hit.task.position[0], walker.z + hit.task.position[1]) > 2.5) return;
    useAction(hit.task);
  });
  renderer.domElement.addEventListener('pointercancel', () => { tap = null; });

  function updateStick(event) {
    const rect = $('joystick').getBoundingClientRect();
    const radius = rect.width * 0.29;
    let x = event.clientX - rect.left - rect.width / 2;
    let y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    if (length > radius) { x *= radius / length; y *= radius / length; }
    stick.x = x / radius;
    stick.y = y / radius;
    $('stickThumb').style.transform = `translate(${x}px, ${y}px)`;
  }
  $('joystick').addEventListener('pointerdown', (event) => {
    if (stick.pointer !== null) return;
    event.preventDefault();
    stick.pointer = event.pointerId;
    $('joystick').setPointerCapture(event.pointerId);
    updateStick(event);
  });
  $('joystick').addEventListener('pointermove', (event) => {
    if (stick.pointer === event.pointerId) updateStick(event);
  });
  const stopStick = (event) => {
    if (stick.pointer !== event.pointerId) return;
    stick.pointer = null;
    stick.x = stick.y = 0;
    $('stickThumb').style.transform = '';
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    $('joystick').addEventListener(type, stopStick);
  }

  renderer.domElement.addEventListener('dblclick', (event) => {
    if (mode === 'walk' || coarsePointer.matches) return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1,
    ), camera);
    const hit = raycaster.intersectObject(map.floor, false)[0];
    if (!hit || !navigation.canStand(hit.point.x, hit.point.z)) return;
    walker.x = hit.point.x;
    walker.z = hit.point.z;
    walker.pitch = walker.yaw = 0;
    setMode('walk');
  });
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    resetInput();
    status.hidden = false;
    status.textContent = '3D表示を復旧しています…';
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    previousTime = 0;
    resize();
    renderer.shadowMap.needsUpdate = true;
    status.hidden = true;
  });

  function animate(time) {
    if (document.hidden) { previousTime = 0; return; }
    taskSystem.tick();
    if (meetingView.update(time)) { dirty = true; renderer.shadowMap.needsUpdate = true; }
    if (meetingSignalUntil && time > meetingSignalUntil) { $('meetingSignal').hidden = true; meetingSignalUntil = 0; }
    if (contextLost || taskSystem.isOpen) { previousTime = 0; return; }
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    const doorsChanged = navigation.updateDoors(mode === 'walk' ? walker : null, dt);
    if (doorsChanged) {
      doorView.sync();
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
    }
    if (mode === 'walk') {
      let x = stick.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      let forward = -stick.y + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const length = Math.hypot(x, forward);
      if (length > 0.08) {
        if (length > 1) { x /= length; forward /= length; }
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7 : 4.4;
        const dx = (x * Math.cos(walker.yaw) - forward * Math.sin(walker.yaw)) * speed * dt;
        const dz = (-x * Math.sin(walker.yaw) - forward * Math.cos(walker.yaw)) * speed * dt;
        navigation.move(walker, dx, dz);
        dirty = true;
      }
      applyWalkCamera();
    } else if (controls?.update()) dirty = true;
    if (dirty) {
      scene.updateMatrixWorld();
      renderer.render(scene, camera);
      renderedFrames++;
      dirty = false;
    }
  }

  resize();
  setMode('overview');
  status.hidden = true;
  renderer.setAnimationLoop(animate);

  // Inspection hooks for this standalone architectural preview. No game state,
  // Firebase connection, account or multiplayer data is loaded here.
  window.__frostPreview = {
    data, navigation, setMode, teleport, tasks: taskSystem,
    approachMeeting() { return this.setPose(data.meeting.approach[0], -data.meeting.approach[1], 0, -0.28); },
    approachTask(id) {
      const task = data.tasks.find((task) => task.id === id);
      return task ? this.setPose(task.approach[0], -task.approach[1], Math.atan2(task.facing[0], -task.facing[1]), -0.1) : false;
    },
    taskControls() {
      const machine = taskSystem.machine;
      if (!machine) return [];
      const rect = machine.canvas.getBoundingClientRect();
      machine.scene.updateMatrixWorld(true);
      return machine.controls.map((object) => {
        const point = object.getWorldPosition(new THREE.Vector3()).project(machine.camera);
        return { ...object.userData.taskControl, x: rect.x + (point.x + 1) * rect.width / 2,
          y: rect.y + (1 - point.y) * rect.height / 2 };
      });
    },
    setPose(x, z, yaw = 0, pitch = 0) {
      if (!navigation.canStand(x, z)) return false;
      Object.assign(walker, { x, z, yaw, pitch });
      setMode('walk');
      return true;
    },
    state() {
      return {
        mode, walker: { ...walker }, stick: { ...stick }, contextLost, renderedFrames,
        currentRoom, meetingPressed: meetingView.pressed, meetingPressCount: meetingView.pressCount, taskOpen: taskSystem.isOpen, nearestTask: nearestTask?.id || '', aspect: camera.aspect, calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles, memory: { ...renderer.info.memory },
        doors: navigation.doors.map(({ id, open, target }) => ({ id, open, target })),
      };
    },
    project(x, y, z) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      return { x: (point.x + 1) * stage.clientWidth / 2, y: (1 - point.y) * stage.clientHeight / 2, depth: point.z };
    },
    obstruction(from, to) {
      const origin = new THREE.Vector3(...from);
      const delta = new THREE.Vector3(...to).sub(origin);
      scene.updateMatrixWorld(true);
      const probe = new THREE.Raycaster(origin, delta.clone().normalize(), 0, delta.length());
      const obstacles = [map.walls, ...doorView.root.children];
      return probe.intersectObjects(obstacles, false).map((hit) => ({ name: hit.object.name, distance: hit.distance }));
    },
    loseContext() { renderer.forceContextLoss(); },
    restoreContext() { renderer.forceContextRestore(); },
  };
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    renderer.setAnimationLoop(null);
    controls?.dispose();
    taskSystem.dispose();
    meetingView.dispose();
    map.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
    renderer.dispose();
  }, { once: true });
}

start().catch((error) => {
  console.error(error);
  status.hidden = false;
  status.textContent = '3D表示を開始できませんでした。ブラウザのWebGLを有効にして、再読み込みしてください。';
});
