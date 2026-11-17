import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const shell = $('game-shell');
const world = $('world');
const cars = [
  { name: 'Vortex GT-R', year: "'24", subtitle: 'V8 • TWIN TURBO • AWD', power: '612', speed: '3.1', value: '$38.5K', start: 18500, increment: 500, color: 0xc5e748, paint: 0xb9d930, class: 'TRACK SPEC', model: 'coupe' },
  { name: 'Apex RSX', year: "'23", subtitle: 'FLAT-6 • NATURALLY ASPIRATED • RWD', power: '487', speed: '3.8', value: '$32.0K', start: 22400, increment: 600, color: 0xe94c39, paint: 0xb92f25, class: 'RARE FIND', model: 'sports' },
  { name: 'Monarch 560', year: "'25", subtitle: 'V12 • HYBRID • AWD', power: '731', speed: '2.9', value: '$52.0K', start: 31500, increment: 1000, color: 0x54a9d8, paint: 0x257fae, class: 'CONCOURS', model: 'grand' },
  { name: 'Cinder Rally', year: "'22", subtitle: 'I4 • TURBO • AWD', power: '390', speed: '4.4', value: '$26.5K', start: 16000, increment: 400, color: 0xe5a344, paint: 0xc38129, class: 'RALLY READY', model: 'rally' },
];
let currentLot = 0;
let bid = cars[0].start;
let wallet = 24800;
let secs = 34;
let garage = [{ name: 'NOVA S', color: '#91b2b5', sub: 'YOUR FIRST RIDE' }, { name: 'VORTEX GT-R', color: '#c5e748', sub: 'TRACK SPEC' }];
let driving = false;
let orbit = false;
let soundOn = true;
let keys = {};
let toastTimeout;
let currentCar;
let wheels = [];
let lastFrame = 0;
let arenaLights = [];

// A compact, fully procedural 3D arena keeps the game self-contained: cars and the city are built from geometry.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121a19);
scene.fog = new THREE.Fog(0x121a19, 28, 95);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
camera.position.set(8.7, 5.2, 11.6);
camera.lookAt(0, .6, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
world.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9caab8, 0x25231d, 2.15));
const moon = new THREE.DirectionalLight(0xc3d1df, 2.1);
moon.position.set(-5, 12, 7); moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024); moon.shadow.camera.left = -16; moon.shadow.camera.right = 16; moon.shadow.camera.top = 16; moon.shadow.camera.bottom = -16;
scene.add(moon);
const limeGlow = new THREE.PointLight(0xc6f548, 25, 16); limeGlow.position.set(-4, 3.2, 1); scene.add(limeGlow);
const pinkGlow = new THREE.PointLight(0x347bd8, 22, 18); pinkGlow.position.set(7, 4, -4); scene.add(pinkGlow);

const mat = (color, roughness = .58, metalness = .12, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const floorMat = mat(0x252c29, .92);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.07; ground.receiveShadow = true; scene.add(ground);
const roadMat = mat(0x171d1c, .9);
const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 7), roadMat); road.rotation.x = -Math.PI / 2; road.position.set(0, -.045, -8); road.receiveShadow = true; scene.add(road);
const laneMat = new THREE.MeshBasicMaterial({ color: 0x98a498 });
for (let i = -10; i <= 10; i++) { const line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .055), laneMat); line.rotation.x = -Math.PI / 2; line.position.set(i * 5, -.025, -8); scene.add(line); }

const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.65, .35, 64), mat(0x303a33, .36, .34));
platform.position.set(0, .1, 0); platform.receiveShadow = true; platform.castShadow = true; scene.add(platform);
const ring = new THREE.Mesh(new THREE.TorusGeometry(4.24, .035, 8, 100), new THREE.MeshBasicMaterial({ color: 0xc9f944 }));
ring.rotation.x = Math.PI / 2; ring.position.y = .3; scene.add(ring);
const innerRing = new THREE.Mesh(new THREE.TorusGeometry(4.55, .025, 8, 100), new THREE.MeshBasicMaterial({ color: 0x689478 })); innerRing.rotation.x = Math.PI / 2; innerRing.position.y = .14; scene.add(innerRing);
for (let i = 0; i < 16; i++) {
  const a = i * Math.PI / 8;
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(.21, .08, .1), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x83a347 : 0xe9f2d5 }));
  fixture.position.set(Math.cos(a) * 4.25, .31, Math.sin(a) * 4.25); fixture.rotation.y = -a; scene.add(fixture);
}

// Low-poly harbor skyline, runway lights and distant cranes frame the auction lot.
let seed = 41;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const buildingMats = [0x273432, 0x222e30, 0x303538, 0x273039].map(c => mat(c, .88, .08));
for (let i = 0; i < 32; i++) {
  const x = (random() - .5) * 70, z = -23 - random() * 29;
  const w = 1.8 + random() * 4, h = 3 + random() * 13, d = 2 + random() * 3.5;
  const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMats[i % buildingMats.length]);
  building.position.set(x, h / 2 - .1, z); building.castShadow = true; building.receiveShadow = true; scene.add(building);
  const windowMat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xb5c879 : 0x588f9d, transparent: true, opacity: .46 });
  for (let row = 0; row < Math.min(5, Math.floor(h / 2)); row++) {
    if (random() > .35) { const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(.12, .22, .025), windowMat); windowMesh.position.set(x - w * .2 + random() * w * .4, .9 + row * 1.5, z + d / 2 + .02); scene.add(windowMesh); }
  }
}
const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 25), mat(0x15272a, .24, .28));
water.rotation.x = -Math.PI / 2; water.position.set(0, -.02, -28); scene.add(water);
for (let i = 0; i < 14; i++) {
  const pole = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .09, 3.4, 7), mat(0x505c52, .75)); stem.position.y = 1.7; pole.add(stem);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.38, .11, .16), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xd8f080 : 0x9bc7ce })); lamp.position.set(0, 3.42, 0); pole.add(lamp);
  pole.position.set(-19 + i * 2.9, 0, i % 2 ? -7 : 3.5); scene.add(pole);
  const light = new THREE.PointLight(i % 2 ? 0xbbe655 : 0x61a7ba, 7, 8); light.position.set(pole.position.x, 3.2, pole.position.z); scene.add(light); arenaLights.push(light);
}

function createCar(spec) {
  const group = new THREE.Group();
  const paint = mat(spec.paint, .23, .62, { metalness: .65 });
  const dark = mat(0x101514, .35, .18);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x142126, roughness: .15, metalness: .52, transparent: true, opacity: .88, clearcoat: .8 });
  const tireMat = mat(0x111314, .84, .04);
  const rimMat = mat(0x909a91, .27, .8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xeaffbf });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff4937 });
  function box(w, h, d, material, x, y, z, bevel = false) {
    let geo = new THREE.BoxGeometry(w, h, d);
    if (bevel) { geo = new THREE.BoxGeometry(w, h, d, 2, 1, 2); }
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  const scale = spec.model === 'grand' ? 1.07 : spec.model === 'rally' ? 1.02 : 1;
  box(2.04 * scale, .34, 4.15 * scale, paint, 0, .64, 0, true);
  const hood = box(1.91 * scale, .12, 1.48 * scale, paint, 0, .83, -1.05);
  const trunk = box(1.86 * scale, .12, .86 * scale, paint, 0, .82, 1.48);
  const roof = box(1.45 * scale, .38, 1.82 * scale, paint, 0, 1.04, .12);
  roof.scale.z = spec.model === 'grand' ? 1.05 : 1;
  // Side glass inserts and windshield create a clearly readable coupe silhouette.
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.25, .41, .07), glass); frontGlass.position.set(0, 1.04, -.79); frontGlass.rotation.x = -.35; group.add(frontGlass);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.22, .36, .07), glass); rearGlass.position.set(0, 1.04, 1.03); rearGlass.rotation.x = .35; group.add(rearGlass);
  for (const side of [-1, 1]) {
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(.06, .34, 1.36), glass); sideWindow.position.set(side * .735, 1.04, .12); group.add(sideWindow);
    box(.08, .23, 3.1, dark, side * 1.01, .64, 0);
    // Door accent and mirror
    box(.035, .045, .48, mat(0x68706b, .3, .72), side * 1.056, .64, .05);
    box(.15, .09, .2, paint, side * 1.03, .91, -.67);
  }
  box(1.65, .09, .15, dark, 0, .44, -2.05);
  box(.55, .12, .18, lampMat, -.64, .69, -2.12);
  box(.55, .12, .18, lampMat, .64, .69, -2.12);
  box(.5, .12, .12, tailMat, -.66, .7, 2.1);
  box(.5, .12, .12, tailMat, .66, .7, 2.1);
  box(1.78, .12, .2, dark, 0, .42, 2.04);
  if (spec.model === 'rally') { box(1.9, .11, .18, dark, 0, 1.16, 1.81); box(.1, .32, .12, dark, -.78, 1.02, 1.78); box(.1, .32, .12, dark, .78, 1.27, 1.78); }
  if (spec.model === 'sports') box(1.96, .08, .16, dark, 0, 1.47, 1.64);
  if (spec.model === 'grand') { box(.07, .22, .07, dark, -.83, 1.38, 1.38); box(.07, .22, .07, dark, .83, 1.38, 1.38); }
  wheels = [];
  for (const x of [-.99, .99]) for (const z of [-1.34, 1.34]) {
    const wheel = new THREE.Group(); wheel.position.set(x, .48, z); wheel.rotation.z = Math.PI / 2;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .22, 20), tireMat); tire.castShadow = true; wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .235, 12), rimMat); wheel.add(rim);
    for (let spoke = 0; spoke < 5; spoke++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.045, .34, .045), mat(0xb7c0b7, .3, .75)); s.rotation.z = spoke * Math.PI / 5; wheel.add(s); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .25, 12), dark); wheel.add(cap); group.add(wheel); wheels.push(wheel);
  }
  group.scale.setScalar(scale);
  return group;
}
function showCar(index, hidePrevious = true) {
  if (currentCar && hidePrevious) scene.remove(currentCar);
  currentLot = index; const spec = cars[index];
  currentCar = createCar(spec); currentCar.position.set(0, .32, 0); scene.add(currentCar);
  $('car-name').textContent = spec.name; $('car-year').textContent = spec.year; $('car-subtitle').textContent = spec.subtitle;
  $('car-power').innerHTML = `${spec.power} <small>HP</small>`; $('car-speed').innerHTML = `${spec.speed} <small>SEC</small>`; $('car-value').textContent = spec.value;
  $('bidder-label').innerHTML = 'by <strong>TurboTom</strong>';
  bid = spec.start; secs = 34; renderBid(); updateGarage();
}
function renderBid() {
  $('current-bid').textContent = `$${bid.toLocaleString('en-US')}`;
  $('bid-amount').textContent = `$${(bid + cars[currentLot].increment).toLocaleString('en-US')}`;
  $('wallet-top').textContent = `$${wallet.toLocaleString('en-US')}`;
  $('timer').textContent = `00:${String(Math.max(0, secs)).padStart(2, '0')}`;
  $('timer-bar').style.width = `${Math.max(0, secs / 34 * 100)}%`;
}
function showToast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => node.classList.remove('show'), 2200);
}
function placeBid() {
  const next = bid + cars[currentLot].increment;
  if (wallet < next) { showToast('Not enough cash for this bid. Try a different lot!'); return; }
  bid = next; secs = Math.max(secs, 8); $('bidder-label').innerHTML = 'by <strong>YOU</strong>'; renderBid();
  showToast(`You're in! Current bid: $${bid.toLocaleString('en-US')}`);
  if (soundOn) beep(660, .09);
}
function settleAuction() {
  if ($('bidder-label').textContent.includes('YOU')) {
    wallet -= bid;
    garage.unshift({ name: cars[currentLot].name.toUpperCase(), color: `#${cars[currentLot].color.toString(16).padStart(6, '0')}`, sub: 'JUST WON · YOURS' });
    showToast(`SOLD! ${cars[currentLot].name} is yours. Welcome to the garage!`);
    updateGarage(); renderBid(); if (soundOn) { beep(740, .12); setTimeout(() => beep(990, .18), 130); }
  } else {
    showToast('LOT CLOSED — The next legend is rolling in...');
    bid += Math.floor(200 + Math.random() * 4) * 100;
  }
  const next = (currentLot + 1) % cars.length;
  setTimeout(() => { showCar(next); }, 1750);
}
function updateGarage() {
  $('garage-count').textContent = String(garage.length).padStart(2, '0');
  $('garage-cars').innerHTML = garage.slice(0, 6).map((car, i) => `<button class="garage-car ${i === 0 ? 'selected' : ''}" style="--carcolor:${car.color}" data-garage="${i}"><i class="mini-car"></i><span>${car.name}<small>${car.sub}</small></span></button>`).join('') + (garage.length < 12 ? `<button class="garage-car locked" style="--carcolor:#758078"><span>LOCKED SLOT<small>WIN AN AUCTION</small></span></button>` : '');
}
function openCatalog() {
  $('catalog-list').innerHTML = cars.map((car, i) => `<article class="catalog-item"><div class="catalog-swatch" style="--swatch:#${car.color.toString(16).padStart(6, '0')}"></div><div class="catalog-detail"><b>${car.name} <span style="color:#9ba198;font-size:13px">${car.year}</span></b><small>${car.class} &nbsp;·&nbsp; ${car.power} HP &nbsp;·&nbsp; EST. ${car.value}</small></div><div class="catalog-price">$${car.start.toLocaleString('en-US')}<small>STARTING BID</small></div></article>`).join('');
  $('catalog-modal').classList.remove('hidden');
}
$('bid-button').addEventListener('click', placeBid);
$('catalog-button').addEventListener('click', openCatalog);
$('modal-close').addEventListener('click', () => $('catalog-modal').classList.add('hidden'));
$('back-to-block').addEventListener('click', () => $('catalog-modal').classList.add('hidden'));
$('catalog-modal').addEventListener('click', e => { if (e.target === $('catalog-modal')) $('catalog-modal').classList.add('hidden'); });
$('sound-button').addEventListener('click', e => { soundOn = !soundOn; e.currentTarget.classList.toggle('muted', !soundOn); showToast(soundOn ? 'Sound enabled' : 'Sound muted'); });
$('home-button').addEventListener('click', () => { driving = false; shell.classList.remove('drive-mode'); document.querySelectorAll('.action-chip[data-mode]').forEach(x => x.classList.toggle('active', x.dataset.mode === 'auction')); showCar(0); showToast('Back at the auction block'); });
document.querySelectorAll('.action-chip[data-mode]').forEach(button => button.addEventListener('click', () => {
  driving = button.dataset.mode === 'drive'; shell.classList.toggle('drive-mode', driving);
  document.querySelectorAll('.action-chip[data-mode]').forEach(x => x.classList.toggle('active', x === button));
  showToast(driving ? 'Test drive on! Use WASD, arrows, or touch controls.' : 'Back to the live auction.');
}));
$('camera-button').addEventListener('click', () => { orbit = !orbit; showToast(orbit ? 'Orbit camera enabled — drag to look around.' : 'Camera centered.'); });
window.addEventListener('keydown', e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); keys[e.key.toLowerCase()] = true; keys[e.key] = true; if ((e.key === ' ' || e.key.toLowerCase() === 'e') && driving) keys.brake = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; keys[e.key] = false; keys.brake = false; });
document.querySelectorAll('.mobile-controls button').forEach(button => {
  const down = e => { e.preventDefault(); keys[button.dataset.key] = true; };
  const up = e => { e.preventDefault(); keys[button.dataset.key] = false; };
  button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up);
});
let drag = null;
world.addEventListener('pointerdown', e => { if (orbit) drag = { x: e.clientX, y: e.clientY }; });
world.addEventListener('pointermove', e => { if (drag && orbit) { camera.position.applyAxisAngle(new THREE.Vector3(0,1,0), (drag.x - e.clientX) * .004); drag.x = e.clientX; drag.y = e.clientY; camera.lookAt(0, .5, 0); } });
window.addEventListener('pointerup', () => drag = null);
let audioContext;
function beep(freq, duration) { try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const o = audioContext.createOscillator(), g = audioContext.createGain(); o.frequency.value = freq; o.type = 'sine'; g.gain.setValueAtTime(.035, audioContext.currentTime); g.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration); } catch {} }

function resize() { const w = world.clientWidth, h = world.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize(); showCar(0); updateGarage();
let elapsed = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000 || 0, .05); lastFrame = now; elapsed += dt;
  if (currentCar) {
    const moving = driving && (keys.w || keys.arrowup || keys.ArrowUp || keys.s || keys.arrowdown || keys.ArrowDown);
    if (moving) {
      const forward = keys.w || keys.arrowup || keys.ArrowUp;
      const reverse = keys.s || keys.arrowdown || keys.ArrowDown;
      const turn = (keys.a || keys.arrowleft || keys.ArrowLeft ? 1 : 0) - (keys.d || keys.arrowright || keys.ArrowRight ? 1 : 0);
      currentCar.rotation.y += turn * dt * 1.15;
      const dir = forward ? 1 : -0.52;
      currentCar.position.x += Math.sin(currentCar.rotation.y) * dir * dt * 3.3;
      currentCar.position.z += Math.cos(currentCar.rotation.y) * dir * dt * 3.3;
      currentCar.position.x = THREE.MathUtils.clamp(currentCar.position.x, -3.1, 3.1);
      currentCar.position.z = THREE.MathUtils.clamp(currentCar.position.z, -3.1, 3.1);
      wheels.forEach(wheel => wheel.rotation.x += dt * (keys.brake ? 2 : 8) * dir);
    } else if (!driving) {
      currentCar.position.y = .32 + Math.sin(elapsed * 1.1) * .025;
      currentCar.rotation.y = Math.sin(elapsed * .17) * .035;
    }
  }
  if (orbit && !drag && !driving) { const a = dt * .09; camera.position.applyAxisAngle(new THREE.Vector3(0,1,0), a); camera.lookAt(0, .5, 0); }
  arenaLights.forEach((light, i) => { light.intensity = 5.8 + Math.sin(elapsed * 1.3 + i) * .8; });
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
setInterval(() => { if ($('catalog-modal').classList.contains('hidden')) { secs--; if (secs <= 0) { secs = 0; renderBid(); settleAuction(); } else renderBid(); } }, 1000);
