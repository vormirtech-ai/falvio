// FALVIO — 3D glass bottle driven by scroll. Poses live on each .step[data-pose] in index.html.
(function () {
  'use strict';
  var canvas = document.getElementById('stage');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step[data-pose]'));
  if (!canvas || !steps.length) return;
  var fail = function () { document.documentElement.classList.add('no-webgl'); canvas.style.display = 'none'; };
  if (!window.THREE || !window.FALVIO_TEX) return fail();

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return fail(); }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(); });

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  var BG = 0xFAFAF8;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  /* ---------- studio environment: soft boxes for highlights, dark flags so glass edges read on white ---------- */
  var pmrem = new THREE.PMREMGenerator(renderer);
  var studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), new THREE.MeshBasicMaterial({ color: 0xcfd0d3, side: THREE.BackSide })));
  function panel(w, h, hex, power, x, y, z) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(power);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    studio.add(m);
  }
  panel(2.6, 10, 0xffffff, 7, -7, 1, 4);
  panel(2.2, 10, 0xffffff, 5, 7, 1, 3);
  panel(10, 3, 0xffffff, 4, 0, 7, 1);
  panel(4, 10, 0x141518, 1, -4, 0, -8);
  panel(4, 10, 0x141518, 1, 5, 0, -8);
  panel(3, 10, 0x2a2b2f, 1, 9, 0, -2);
  panel(16, 4, 0x77787c, 1, 0, -7, 0);
  scene.environment = pmrem.fromScene(studio, 0.03).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 6, 8);
  scene.add(key);

  /* ---------- geometry helpers ---------- */
  function roundedBox(w, h, d, r, b) {
    var x = -w / 2 + b, y = -h / 2 + b, W = w - 2 * b, H = h - 2 * b;
    r = Math.min(r, W / 2, H / 2);
    var s = new THREE.Shape();
    s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r);
    s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
    s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 12 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return g;
  }
  function gradientTexture(stops, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h || w;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var loader = new THREE.TextureLoader();
  var pending = 2;
  var ready = function () { if (--pending === 0) requestAnimationFrame(function () { canvas.classList.remove('off'); }); };
  var woodTex = loader.load(window.FALVIO_TEX.wood, ready, undefined, ready);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var labelTex = loader.load(window.FALVIO_TEX.label, ready, undefined, ready);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = woodTex.anisotropy;

  /* ---------- the bottle (proportions from the product photograph; base at y = 0) ---------- */
  var BODY_W = 2.0, BODY_H = 3.0, BODY_D = 1.15;
  var model = new THREE.Group();

  var glass = new THREE.Mesh(roundedBox(BODY_W, BODY_H, BODY_D, 0.16, 0.09), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.35, ior: 1.5,
    clearcoat: 0.6, clearcoatRoughness: 0.04, envMapIntensity: 1.1, specularIntensity: 1, side: THREE.DoubleSide
  }));
  glass.position.y = BODY_H / 2;
  model.add(glass);

  var liquid = new THREE.Mesh(roundedBox(1.64, 2.62, 0.78, 0.1, 0.05), new THREE.MeshPhysicalMaterial({
    color: 0xdba84e, roughness: 0.35, metalness: 0, emissive: 0x7a4a0e, emissiveIntensity: 0.16, envMapIntensity: 0.3
  }));
  liquid.position.y = 0.24 + 1.31;
  model.add(liquid);

  var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xc9a660, roughness: 0.5 }));
  tube.position.set(0.1, 1.62, 0.392);
  model.add(tube);

  // crown + monogram printed on the outer front face, like the real bottle; alphaTest keeps edges crisp
  var label = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.26), new THREE.MeshStandardMaterial({
    map: labelTex, alphaTest: 0.35, metalness: 0.8, roughness: 0.28, envMapIntensity: 1.3
  }));
  label.position.set(0, 1.66, BODY_D / 2 + 0.004);
  model.add(label);

  var hardware = new THREE.MeshStandardMaterial({ color: 0xcdbb94, metalness: 1, roughness: 0.2, envMapIntensity: 1.2 });
  var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 48), hardware);
  collar.position.y = BODY_H + 0.08;
  model.add(collar);
  var pump = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.44, 48), hardware);
  pump.position.y = BODY_H + 0.16 + 0.22;
  model.add(pump);
  var nozzle = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: 0x3a3a3c }));
  nozzle.position.set(0, BODY_H + 0.48, 0.232);
  model.add(nozzle);

  var CAP_H = 0.74;
  var capGeo = roundedBox(BODY_W, CAP_H, BODY_D, 0.05, 0.035);
  woodTex.repeat.set(1 / BODY_W, 1 / CAP_H);   // extrude UVs are in model units
  woodTex.offset.set(0.5, 0.5);
  var cap = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }));
  var CAP_Y = BODY_H + 0.16 + CAP_H / 2;
  cap.position.y = CAP_Y;
  model.add(cap);

  var TOTAL_H = CAP_Y + CAP_H / 2;
  model.position.y = -TOTAL_H / 2;            // rotate around the bottle's centre

  var spin = new THREE.Group();                // rotations
  spin.add(model);
  var rig = new THREE.Group();                 // position + scale
  rig.add(spin);
  scene.add(rig);

  // soft contact shadow and a silver halo behind the bottle (opaque so it shows through the glass)
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.4), new THREE.MeshBasicMaterial({
    map: gradientTexture([[0, 'rgba(40,42,48,.42)'], [0.45, 'rgba(40,42,48,.14)'], [1, 'rgba(40,42,48,0)']], 256), transparent: true, depthWrite: false, toneMapped: false
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -TOTAL_H / 2 - 0.01;
  rig.add(shadow);

  var halo = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({
    map: gradientTexture([[0, '#e3e4e6'], [0.35, '#eeeeee'], [0.75, '#FAFAF8'], [1, '#FAFAF8']], 512), toneMapped: false
  }));
  halo.position.z = -6;
  scene.add(halo);

  // silver mist
  var MIST = 180, mistPos = new Float32Array(MIST * 3), mistSeed = new Float32Array(MIST);
  for (var i = 0; i < MIST; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 6;
    mistPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    mistSeed[i] = Math.random();
  }
  var mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  var mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({
    size: 0.07, map: gradientTexture([[0, 'rgba(150,153,160,1)'], [0.5, 'rgba(170,173,180,.5)'], [1, 'rgba(170,173,180,0)']], 64),
    transparent: true, opacity: 0, depthWrite: false, toneMapped: false
  }));
  rig.add(mist);

  /* ---------- scroll choreography ---------- */
  var KEYS = ['x', 'y', 's', 'rx', 'ry', 'cap', 'mist'];
  var BASE = { x: 0, y: 0, s: 1, rx: 0, ry: 0, cap: 0, mist: 0 };
  var mobileQuery = matchMedia('(max-width: 960px)');
  var poses;
  function readPoses() {
    var attr = mobileQuery.matches ? 'data-pose-m' : 'data-pose';
    poses = steps.map(function (el) {
      var p = {}, src = JSON.parse(el.getAttribute(attr) || el.getAttribute('data-pose'));
      KEYS.forEach(function (k) { p[k] = k in src ? src[k] : BASE[k]; });
      return p;
    });
  }
  readPoses();
  var cur = Object.assign({}, poses[0]);
  var ease = function (t) { return t * t * (3 - 2 * t); };

  function targetPose() {
    var mid = window.innerHeight / 2, idx = 0, f = 0;
    var centers = steps.map(function (el) { var r = el.getBoundingClientRect(); return r.top + r.height / 2; });
    for (var i = 0; i < centers.length; i++) if (centers[i] <= mid) idx = i;
    if (idx < centers.length - 1 && centers[idx] <= mid) f = ease(Math.min(1, (mid - centers[idx]) / (centers[idx + 1] - centers[idx])));
    var a = poses[idx], b = poses[Math.min(idx + 1, poses.length - 1)], out = {};
    KEYS.forEach(function (k) { out[k] = a[k] + (b[k] - a[k]) * f; });
    return out;
  }

  var pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  var w = 0, h = 0;
  function resize() {
    var nw = window.innerWidth, nh = window.innerHeight;
    if (nw === w && Math.abs(nh - h) < 2) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the bottle comfortably inside narrow portrait screens
    camera.position.z = camera.aspect < 0.75 ? 13 + (0.75 - camera.aspect) * 9 : 13;
    camera.updateProjectionMatrix();
    readPoses();
  }
  window.addEventListener('resize', resize);
  mobileQuery.addEventListener ? mobileQuery.addEventListener('change', readPoses) : mobileQuery.addListener(readPoses);
  resize();

  var last = performance.now(), visible = true;
  var storyEnd = steps[steps.length - 1];
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // hand over to the page once the story has scrolled away
    var gone = storyEnd.getBoundingClientRect().bottom < window.innerHeight * 0.2;
    if (gone !== !visible) { visible = !gone; canvas.classList.toggle('off', gone); }
    if (!visible) return;

    var t = targetPose(), k = reduce ? 1 : 1 - Math.exp(-dt * 5);
    KEYS.forEach(function (key) { cur[key] += (t[key] - cur[key]) * k; });
    var time = now / 1000, idle = reduce ? 0 : 1;

    rig.position.set(cur.x, cur.y + Math.sin(time * 0.8) * 0.05 * idle, 0);
    rig.scale.setScalar(cur.s);
    spin.rotation.set(cur.rx + pointer.y * 0.08 * idle, cur.ry + Math.sin(time * 0.35) * 0.07 * idle + pointer.x * 0.16 * idle, 0);
    cap.position.y = CAP_Y + cur.cap;
    cap.rotation.y = cur.cap * 0.35;
    halo.position.x = cur.x * 0.85;
    halo.position.y = cur.y;
    shadow.material.opacity = Math.max(0, 1 - cur.cap * 0.15);

    mist.material.opacity = cur.mist * 0.9;
    if (cur.mist > 0.01 && idle) {
      var p = mistGeo.attributes.position.array;
      for (var i = 0; i < MIST; i++) {
        p[i * 3 + 1] += dt * (0.25 + mistSeed[i] * 0.35);
        p[i * 3] += Math.sin(time + mistSeed[i] * 9) * dt * 0.08;
        if (p[i * 3 + 1] > 3.2) p[i * 3 + 1] = -3;
      }
      mistGeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
