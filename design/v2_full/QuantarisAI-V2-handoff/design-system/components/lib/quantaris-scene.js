/* QuantarisScene 1.0 — the spatial intelligence layer (Level 1 map, Level 2 ecosystem, Level 3 factory twin).
   Classic script. Needs window.THREE (r128). Colours come from the design tokens on the host element, so the
   scenes follow light/dark themes. Engineering reference: every builder maps 1:1 to a React Three Fiber component. */
(function () {
  var T = function () { return window.THREE; };
  var TAU = Math.PI * 2;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ---------- tokens ---------- */
  var TOKEN_NAMES = ['surface', 'surface-raised', 'surface-sunken', 'line', 'line-strong', 'ink', 'ink-muted', 'saffron', 'saffron-strong',
    'blue', 'blue-2', 'green', 'red', 'amber', 'grey', 'ashoka', 'scene-ground', 'scene-plinth', 'scene-building', 'scene-roof',
    'scene-glass', 'scene-machine', 'scene-field', 'scene-sea', 'flow-material', 'flow-energy', 'flow-renewable', 'flow-water',
    'flow-waste', 'flow-circular'];
  var FALLBACK = { 'surface': '#F7F5F0', 'surface-raised': '#FFFFFF', 'surface-sunken': '#EFECE5', 'line': '#E2DDD3', 'line-strong': '#8C8577', 'ink': '#101A2E',
    'ink-muted': '#525C6E', 'saffron': '#F28A1E', 'saffron-strong': '#DD6F00', 'blue': '#1E3A8A', 'blue-2': '#5A72B8', 'green': '#117534', 'red': '#B42318',
    'amber': '#8A5A00', 'grey': '#8B92A0', 'ashoka': '#0B1733', 'scene-ground': '#E9E5DC', 'scene-plinth': '#CFC8BA', 'scene-building': '#FBFAF7',
    'scene-roof': '#DCD7CD', 'scene-glass': '#33415E', 'scene-machine': '#5A6474', 'scene-field': '#E2DAC6', 'scene-sea': '#D5DEE8',
    'flow-material': '#525C6E', 'flow-energy': '#1E3A8A', 'flow-renewable': '#117534', 'flow-water': '#2B7A9E', 'flow-waste': '#8B92A0', 'flow-circular': '#117534' };
  function readTokens(el) {
    var cs = getComputedStyle(el), o = {};
    TOKEN_NAMES.forEach(function (n) { var v = (cs.getPropertyValue('--' + n) || '').trim(); o[n] = v && v.indexOf('var(') < 0 ? v : FALLBACK[n]; });
    o.dark = (document.documentElement.getAttribute('data-theme') === 'dark') || (el.closest && el.closest('[data-theme="dark"]') != null);
    return o;
  }
  function col(hex) { var c = new (T().Color)(hex); c.convertSRGBToLinear(); return c; }

  /* ---------- engine ---------- */
  function Stage(container, opts) {
    var THREE = T(), self = this;
    this.el = container; this.opts = opts || {};
    this.tok = readTokens(container);
    this.w = container.clientWidth || 800; this.h = container.clientHeight || 480;
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!this.opts.capture });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(this.w, this.h);
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.display = 'block'; r.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.zoom = this.opts.zoom || 13;
    var a = this.w / this.h, z = Math.max(this.zoom, (this.opts.fitW || 0) / a);
    this.camera = new THREE.OrthographicCamera(-z * a, z * a, z, -z, -200, 400);
    this.az = this.opts.azimuth != null ? this.opts.azimuth : Math.PI / 4; this.el_ = this.opts.elevation || 0.62;
    this.target = new THREE.Vector3(0, 0, 0); this.placeCamera();
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c4, 0.75); this.scene.add(this.hemi);
    var sun = this.sun = new THREE.DirectionalLight(0xfff6ea, 1.05);
    sun.position.set(-14, 26, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4; this.scene.add(sun);
    this.fill = new THREE.DirectionalLight(0xdfe6ff, 0.25); this.fill.position.set(16, 10, -12); this.scene.add(this.fill);
    this.mats = {}; this.tick = []; this.pickables = []; this.anchors = {}; this.time = 0; this.live = !reduced() && this.opts.motion !== 'paused';
    this.overlay = document.createElement('div'); this.overlay.className = 'qs-overlay';
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    container.style.position = container.style.position || 'relative'; container.appendChild(this.overlay);
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    this._onClick = function (e) { self.pick(e); };
    r.domElement.addEventListener('click', this._onClick);
    if (this.opts.orbit !== false) this.enableOrbit();
    this._ro = window.ResizeObserver ? new ResizeObserver(function () { self.resize(); }) : null; if (this._ro) this._ro.observe(container);
    this._mo = new MutationObserver(function () { self.retheme(); });
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.retheme(true);
    this._last = performance.now();
    var loop = function (t) { if (self.dead) return; self._raf = requestAnimationFrame(loop); self.frame(t); };
    this._raf = requestAnimationFrame(loop);
  }
  Stage.prototype.placeCamera = function () {
    var d = 60, e = this.el_;
    this.camera.position.set(this.target.x + d * Math.cos(e) * Math.sin(this.az), this.target.y + d * Math.sin(e), this.target.z + d * Math.cos(e) * Math.cos(this.az));
    this.camera.lookAt(this.target); this.camera.updateProjectionMatrix(); this.dirty = true;
  };
  Stage.prototype.enableOrbit = function () {
    var self = this, el = this.renderer.domElement, down = null, base = this.az;
    el.style.cursor = 'grab'; el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, az: self.az, moved: false }; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', function (e) {
      if (!down) { self.hover(e); return; }
      var dx = e.clientX - down.x; if (Math.abs(dx) > 3) down.moved = true;
      self.az = clamp(down.az - dx * 0.006, base - 0.6, base + 0.6); self.placeCamera(); });
    el.addEventListener('pointerup', function () { if (down && down.moved) self._suppress = true; down = null; el.style.cursor = 'grab'; });
    el.addEventListener('wheel', function (e) { e.preventDefault(); self.zoom = clamp(self.zoom * (e.deltaY > 0 ? 1.08 : 0.93), 5, 24); self.resize(); }, { passive: false });
  };
  Stage.prototype.resize = function () {
    var w = this.el.clientWidth || this.w, h = this.el.clientHeight || this.h; this.w = w; this.h = h;
    this.renderer.setSize(w, h); var a = w / h, z = Math.max(this.zoom, (this.opts.fitW || 0) / a), c = this.camera;
    c.left = -z * a; c.right = z * a; c.top = z; c.bottom = -z; c.updateProjectionMatrix(); this.dirty = true;
  };
  Stage.prototype.mat = function (key, hex, o) {
    var THREE = T(), k = key + (o && o.opacity != null ? '@' + o.opacity : '');
    if (!this.mats[k]) {
      var m = new THREE.MeshStandardMaterial({ color: col(hex), roughness: o && o.rough != null ? o.rough : 0.82, metalness: o && o.metal || 0 });
      if (o && o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = o.opacity > 0.6; m.userData.base = o.opacity; }
      if (o && o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei || 0.35; }
      m.userData = Object.assign({ token: key, hexFallback: hex }, m.userData); this.mats[k] = m;
    }
    return this.mats[k];
  };
  Stage.prototype.settle = function () { for (var k = 0; k < 6; k++) for (var i = 0; i < this.tick.length; i++) this.tick[i](1, this.time, false); this.dirty = true; };
  Stage.prototype.centerOn = function (objs) {
    var THREE = T(), b = new THREE.Box3(), v = new THREE.Vector3();
    objs.forEach(function (o) { b.expandByPoint(o.position); });
    if (b.isEmpty()) return; b.getCenter(v); this.target.set(v.x, 0, v.z); this.placeCamera();
  };
  Stage.prototype.ghost = function (on) {
    var self = this; if (this._ghost === on) return; this._ghost = on;
    Object.keys(this.mats).forEach(function (k) { var m = self.mats[k], t = m.userData.token || '';
      if (/^flow-|^saffron|^green|^red/.test(t) || k.indexOf('-tube') > -1 || k.indexOf('-pk') > -1 || m.userData.base != null && m.userData.base < 1) return;
      m.transparent = on; m.opacity = on ? 0.22 : 1; m.depthWrite = !on; m.needsUpdate = true; });
    this.dirty = true;
  };
  Stage.prototype.tk = function (name) { return this.tok[name] || FALLBACK[name]; };
  Stage.prototype.retheme = function (first) {
    var THREE = T(), t = this.tok = readTokens(this.el), self = this;
    Object.keys(this.mats).forEach(function (k) { var m = self.mats[k], n = m.userData.token; if (t[n]) m.color.copy(col(t[n])); if (m.emissive && m.userData.em && t[m.userData.em]) m.emissive.copy(col(t[m.userData.em])); });
    this.hemi.intensity = t.dark ? 0.55 : 0.75; this.hemi.groundColor = new THREE.Color(t.dark ? 0x0b1220 : 0xd9d2c4);
    this.sun.intensity = t.dark ? 0.8 : 1.05; this.dirty = true;
    if (!first && this.onRetheme) this.onRetheme();
  };
  Stage.prototype.addPick = function (obj, id) { obj.traverse(function (o) { o.userData.pickId = id; }); this.pickables.push(obj); };
  Stage.prototype.pick = function (e) {
    if (this._suppress) { this._suppress = false; return; }
    var hit = this.hit(e); if (this.opts.onPick) this.opts.onPick(hit);
  };
  Stage.prototype.hit = function (e) {
    var b = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    var hits = this.ray.intersectObjects(this.pickables, true);
    for (var i = 0; i < hits.length; i++) if (hits[i].object.userData.pickId) return hits[i].object.userData.pickId;
    return null;
  };
  Stage.prototype.hover = function (e) { if (!this.opts.onPick) return; var id = this.hit(e); this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab'; };
  Stage.prototype.anchor = function (id, x, y, z) { this.anchors[id] = new (T().Vector3)(x, y, z); };
  Stage.prototype.project = function (id) {
    var v = this.anchors[id]; if (!v) return null; var p = v.clone().project(this.camera);
    return { x: (p.x + 1) / 2 * this.w, y: (1 - p.y) / 2 * this.h };
  };
  Stage.prototype.placeOverlays = function () {
    var self = this, nodes = (this.opts.overlayRoot || this.el).querySelectorAll('[data-anchor]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], p = self.project(n.getAttribute('data-anchor'));
      if (!p) { n.style.visibility = 'hidden'; continue; }
      n.style.visibility = ''; n.style.position = 'absolute'; n.style.left = '0'; n.style.top = '0';
      n.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px)';
    }
  };
  Stage.prototype.frame = function (t) {
    var dt = Math.min(0.05, (t - this._last) / 1000); this._last = t;
    var busy = false; if (this.live) this.time += dt;
    for (var i = 0; i < this.tick.length; i++) if (this.tick[i](dt, this.time, this.live)) busy = true;
    if (busy || this.live || this.dirty) { this.renderer.render(this.scene, this.camera); this.placeOverlays(); this.dirty = false; }
  };
  Stage.prototype.dispose = function () {
    this.dead = true; cancelAnimationFrame(this._raf); if (this._ro) this._ro.disconnect(); this._mo.disconnect();
    this.renderer.domElement.removeEventListener('click', this._onClick); this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
  };

  /* ---------- geometry kit ---------- */
  function edges(S, mesh, tokenName, opacity) {
    var THREE = T(), g = new THREE.EdgesGeometry(mesh.geometry, 30);
    var key = 'edge-' + tokenName + '-' + opacity;
    if (!S.mats[key]) { var m = new THREE.LineBasicMaterial({ color: col(S.tk(tokenName)), transparent: true, opacity: opacity }); m.userData = { token: tokenName }; S.mats[key] = m; }
    var l = new THREE.LineSegments(g, S.mats[key]); mesh.add(l); return l;
  }
  function box(S, w, h, d, token, o) {
    var THREE = T(), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), S.mat(token, S.tk(token), o));
    m.castShadow = true; m.receiveShadow = true; if (!o || o.edges !== false) edges(S, m, 'line-strong', S.tok.dark ? 0.35 : 0.22); return m;
  }
  function cyl(S, rt, rb, h, token, seg, o) {
    var THREE = T(), m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), S.mat(token, S.tk(token), o));
    m.castShadow = true; m.receiveShadow = true; return m;
  }
  /* building with optional sawtooth roof and a glazing band — the factory archetype */
  function building(S, w, d, h, o) {
    var THREE = T(), g = new THREE.Group(); o = o || {};
    var body = box(S, w, h, d, 'scene-building'); body.position.y = h / 2; g.add(body);
    var band = box(S, w * 1.002, h * 0.16, d * 1.002, 'scene-glass', { edges: false, rough: 0.35 }); band.position.y = h * 0.62; g.add(band);
    if (o.sawtooth) {
      var n = o.sawtooth, step = w / n, shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(step, 0); shape.lineTo(step, h * 0.32); shape.lineTo(0, 0);
      var geo = new THREE.ExtrudeGeometry(shape, { depth: d * 0.96, bevelEnabled: false });
      for (var i = 0; i < n; i++) {
        var r = new THREE.Mesh(geo, S.mat('scene-roof', S.tk('scene-roof'))); r.castShadow = true; r.receiveShadow = true;
        r.position.set(-w / 2 + i * step, h, -d * 0.48); g.add(r); edges(S, r, 'line-strong', 0.2);
        var gl = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.96, h * 0.3), S.mat('scene-glass', S.tk('scene-glass'), { rough: 0.3 }));
        gl.rotation.y = Math.PI / 2; gl.position.set(-w / 2 + (i + 1) * step - 0.01, h + h * 0.15, 0); g.add(gl);
      }
    } else {
      var roof = box(S, w * 1.02, 0.12, d * 1.02, 'scene-roof'); roof.position.y = h + 0.06; g.add(roof);
    }
    if (o.chimney) { var c = cyl(S, 0.22, 0.28, h * 1.9, 'scene-machine', 16); c.position.set(w / 2 - 0.5, h * 0.95, -d / 2 + 0.5); g.add(c); }
    return g;
  }
  function tank(S, r, h) {
    var g = new (T().Group)(), b = cyl(S, r, r, h, 'scene-building', 32); b.position.y = h / 2; g.add(b);
    var top = cyl(S, r * 1.02, r * 1.02, 0.08, 'scene-roof', 32); top.position.y = h; g.add(top);
    var ring = cyl(S, r * 1.03, r * 1.03, 0.1, 'flow-water', 32); ring.position.y = h * 0.35; g.add(ring); return g;
  }
  function slab(S, w, d, t, top, side) {
    var THREE = T(), g = new THREE.Group();
    var s = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [S.mat(side, S.tk(side)), S.mat(side, S.tk(side)), S.mat(top, S.tk(top)), S.mat(side, S.tk(side)), S.mat(side, S.tk(side)), S.mat(side, S.tk(side))]);
    s.position.y = -t / 2; s.receiveShadow = true; g.add(s); return g;
  }
  function label(S, id, x, y, z) { S.anchor(id, x, y, z); }

  /* flows: a tube along a path + packets that move along it (motion explains the system) */
  function Flow(S, pts, o) {
    var THREE = T(); o = o || {};
    this.S = S; this.token = o.token || 'flow-material'; this.grow = o.grow != null ? o.grow : 1; this.target = this.grow; this.visible = 1; this.vTarget = 1;
    var v = pts.map(function (p) { return p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p[0], o.y || 0.08, p[1]); });
    this.curve = new THREE.CatmullRomCurve3(v, false, 'centripetal', 0.2);
    var seg = Math.max(24, Math.round(this.curve.getLength() * 6));
    var geo = new THREE.TubeGeometry(this.curve, seg, (o.r || 0.07) * 1.7, 10, false);
    this.mesh = new THREE.Mesh(geo, S.mat(this.token + '-tube', S.tk(this.token), { opacity: o.opacity != null ? o.opacity : 0.9, emissive: S.tk(this.token), ei: 0.15 }));
    this.mesh.material.userData.token = this.token; this.mesh.material.userData.em = this.token;
    this.total = geo.index.count; this.segCount = seg; geo.setDrawRange(0, Math.floor(this.total * this.grow / 6) * 6);
    S.scene.add(this.mesh);
    this.n = o.packets != null ? o.packets : Math.max(2, Math.round(this.curve.getLength() / 2.2));
    var pg = o.packet === 'pulse' ? new THREE.SphereGeometry(0.13, 12, 8) : o.packet === 'drop' ? new THREE.SphereGeometry(0.11, 12, 8) : new THREE.BoxGeometry(0.26, 0.18, 0.26);
    this.inst = new THREE.InstancedMesh(pg, S.mat(this.token + '-pk', S.tk(this.token), { emissive: S.tk(this.token), ei: o.packet === 'pulse' ? 0.6 : 0.2 }), this.n);
    this.inst.material.userData.token = this.token; this.inst.material.userData.em = this.token;
    this.inst.castShadow = true; S.scene.add(this.inst); this.speed = o.speed || 0.05; this.dummy = new THREE.Object3D();
    var self = this; S.tick.push(function (dt, time, live) { return self.step(dt, time, live); });
  }
  Flow.prototype.step = function (dt, time) {
    var busy = false;
    if (Math.abs(this.grow - this.target) > 0.002) { this.grow += (this.target - this.grow) * Math.min(1, dt * 1.6); busy = true; }
    else this.grow = this.target;
    if (Math.abs(this.visible - this.vTarget) > 0.01) { this.visible += (this.vTarget - this.visible) * Math.min(1, dt * 3); busy = true; } else this.visible = this.vTarget;
    this.mesh.geometry.setDrawRange(0, Math.floor(this.total * this.grow / 6) * 6);
    this.mesh.visible = this.visible > 0.02 && this.grow > 0.005;
    var showPk = this.grow > 0.98 && this.visible > 0.5;
    for (var i = 0; i < this.n; i++) {
      var u = ((i / this.n) + (time || 0) * this.speed) % 1; if (!(u >= 0)) u = 0; u = Math.min(0.999, u);
      this.curve.getPoint(u, this.dummy.position); this.dummy.position.y += 0.12;
      var s = showPk ? 1 : 0.0001; this.dummy.scale.set(s, s, s); this.dummy.updateMatrix(); this.inst.setMatrixAt(i, this.dummy.matrix);
    }
    this.inst.instanceMatrix.needsUpdate = true; return busy;
  };
  Flow.prototype.set = function (grow, vis) { if (grow != null) this.target = grow; if (vis != null) this.vTarget = vis; this.S.dirty = true; };

  /* appear/disappear: elements materialise by growing up from the ground */
  function Appear(S, obj, on) {
    this.obj = obj; this.v = on ? 1 : 0; this.t = this.v; obj.scale.set(1, Math.max(0.001, this.v), 1); obj.visible = this.v > 0.01;
    var self = this; S.tick.push(function (dt) {
      if (Math.abs(self.v - self.t) < 0.002) { self.v = self.t; return false; }
      self.v += (self.t - self.v) * Math.min(1, dt * 2.4); var e = ease(self.v);
      self.obj.scale.set(0.85 + 0.15 * e, Math.max(0.001, e), 0.85 + 0.15 * e); self.obj.visible = self.v > 0.01; return true; });
  }
  function ring(S, r, token, y) {
    var THREE = T(), m = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 48), S.mat(token + '-ring', S.tk(token), { opacity: 0.9 }));
    m.material.userData.token = token; m.rotation.x = -Math.PI / 2; m.position.y = y || 0.03; return m;
  }
  function UV(u, v) { return [(u + v) / 2, (v - u) / 2]; }
  function UVe(u, v) { return UV(u * 1.3, v * 1.3); } /* ecosystem layout spacing */ /* author in screen-aligned coordinates: u → right, v → toward viewer */

  /* =================== LEVEL 2 — LIVING INDUSTRIAL ECOSYSTEM =================== */
  var ECO_ORDER = ['farms', 'mill', 'site', 'factory', 'energy', 'water', 'workforce', 'logistics', 'waste'];
  function ecosystem(S, state) {
    var THREE = T(), api = { el: {}, flows: {} };
    var plinth = slab(S, 40, 33, 0.6, 'scene-ground', 'scene-plinth'); var pc = UVe(0, 1.5); plinth.position.set(pc[0], 0, pc[1]); plinth.rotation.y = Math.PI / 4; S.scene.add(plinth);
    var sea = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 6), S.mat('scene-sea', S.tk('scene-sea'), { rough: 0.25 }));
    var sp = UVe(0, 11.5); sea.position.set(sp[0], -0.27, sp[1]); sea.rotation.y = Math.PI / 4; sea.receiveShadow = true; S.scene.add(sea);
    function put(id, obj, u, v, rot) { var p = UVe(u, v); obj.position.set(p[0], 0, p[1]); obj.rotation.y = Math.PI / 4 + (rot || 0); S.scene.add(obj); api.el[id] = new Appear(S, obj, false); S.addPick(obj, id); return obj; }
    /* raw materials — cotton fields */
    var farms = new THREE.Group();
    [[-1.7, -1.3], [1.7, -1.3], [-1.7, 1.3], [1.7, 1.3]].forEach(function (q) {
      var f = box(S, 3.1, 0.12, 2.3, 'scene-field'); f.position.set(q[0], 0.06, q[1]); farms.add(f);
      for (var i = 0; i < 6; i++) { var row = box(S, 2.9, 0.1, 0.12, 'scene-building', { edges: false }); row.position.set(q[0], 0.15, q[1] - 0.95 + i * 0.38); farms.add(row); }
    });
    put('farms', farms, -11, -5); label(S, 'farms', UVe(-11, -5)[0], 1.2, UVe(-11, -5)[1]);
    /* supplier — spinning mill */
    var mill = building(S, 4.2, 3, 2.2, { sawtooth: 4 }); put('mill', mill, -5.5, -1.5); label(S, 'mill', UVe(-5.5, -1.5)[0], 3.6, UVe(-5.5, -1.5)[1]);
    /* main factory — Tiruppur knit-garment unit */
    var fac = building(S, 6.6, 4.4, 2.8, { sawtooth: 6, chimney: true }); put('factory', fac, 0.5, 0.5);
    var sel = ring(S, 4.6, 'saffron-strong'); var fp = UVe(0.5, 0.5); sel.position.set(fp[0], 0.04, fp[1]); S.scene.add(sel); api.sel = new Appear(S, sel, false);
    label(S, 'factory', fp[0], 4.4, fp[1]); label(S, 'cutting', UVe(-1.4, 2.2)[0], 3.0, UVe(-1.4, 2.2)[1]);
    /* energy — grid substation + solar field (renewable share drives the lit rows) */
    var solar = new THREE.Group(); api.panels = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) {
      var p = box(S, 0.9, 0.06, 1.3, 'scene-glass', { rough: 0.25 }); p.position.set(-2.7 + c * 1.08, 0.55, -2.1 + r * 1.5); p.rotation.x = -0.45; solar.add(p);
      var leg = box(S, 0.06, 0.5, 0.06, 'scene-machine', { edges: false }); leg.position.set(p.position.x, 0.25, p.position.z); solar.add(leg); api.panels.push(p);
    }
    put('energy', solar, 5, -7.5); label(S, 'energy', UVe(5, -7.5)[0], 1.8, UVe(5, -7.5)[1]);
    var grid = new THREE.Group();
    [-0.7, 0.7].forEach(function (x) { var t = box(S, 0.2, 3.4, 0.2, 'scene-machine', { edges: false }); t.position.set(x, 1.7, 0); grid.add(t); });
    var arm = box(S, 2, 0.14, 0.14, 'scene-machine', { edges: false }); arm.position.y = 3.2; grid.add(arm);
    var xf = box(S, 1.2, 0.9, 0.9, 'scene-building'); xf.position.set(0, 0.45, 1.2); grid.add(xf);
    put('grid', grid, 10, -5); label(S, 'grid', UVe(10, -5)[0], 4, UVe(10, -5)[1]);
    /* water — treatment and recovery */
    var water = new THREE.Group(); [[-1, 0, 1], [1.1, 0.2, 0.8], [0, 1.7, 0.7]].forEach(function (q) { var t = tank(S, q[2], 1.4); t.position.set(q[0], 0, q[1]); water.add(t); });
    put('water', water, 9, -0.5); label(S, 'water', UVe(9, -0.5)[0], 2.4, UVe(9, -0.5)[1]);
    /* workforce housing */
    var homes = new THREE.Group();
    for (var i = 0; i < 6; i++) { var hb = box(S, 1, 0.8 + (i % 3) * 0.3, 1, 'scene-building'); hb.position.set((i % 3) * 1.4 - 1.4, (0.8 + (i % 3) * 0.3) / 2, Math.floor(i / 3) * 1.4 - 0.7); homes.add(hb); }
    put('workforce', homes, -9, 4); label(S, 'workforce', UVe(-9, 4)[0], 2, UVe(-9, 4)[1]);
    /* logistics — warehouse + port */
    var wh = building(S, 3.4, 2.4, 1.6, {}); put('warehouse', wh, 5.5, 4); label(S, 'warehouse', UVe(5.5, 4)[0], 2.4, UVe(5.5, 4)[1]);
    var port = new THREE.Group();
    var cols = ['scene-building', 'blue-2', 'scene-roof', 'line-strong'];
    for (var k = 0; k < 14; k++) { var cbox = box(S, 1.1, 0.5, 0.5, cols[k % 4]); cbox.position.set((k % 4) * 1.2 - 1.8, 0.25 + Math.floor(k / 8) * 0.5, Math.floor((k % 8) / 4) * 0.6 - 0.3); port.add(cbox); }
    var crane = new THREE.Group(); [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]].forEach(function (q) { var l = box(S, 0.12, 3, 0.12, 'ashoka', { edges: false }); l.position.set(q[0], 1.5, q[1]); crane.add(l); });
    var beam = box(S, 0.2, 0.2, 3.4, 'ashoka', { edges: false }); beam.position.set(0, 3, 0.8); crane.add(beam); crane.position.set(2.8, 0, 0.4); port.add(crane);
    put('logistics', port, 11.5, 6.5); label(S, 'logistics', UVe(11.5, 6.5)[0], 3.6, UVe(11.5, 6.5)[1]);
    /* waste yard — offcut bales */
    var waste = new THREE.Group();
    for (var b = 0; b < 7; b++) { var bale = box(S, 0.62, 0.5, 0.62, 'grey'); bale.position.set((b % 4) * 0.7 - 1, 0.25 + Math.floor(b / 4) * 0.5, (b % 2) * 0.1); waste.add(bale); }
    put('waste', waste, -1.6, 5); label(S, 'waste', UVe(-1.6, 5)[0], 1.6, UVe(-1.6, 5)[1]);
    /* circular economy — recycler + secondary-material plant (Factory B) */
    var rec = building(S, 3, 2.2, 1.7, { sawtooth: 3 }); var rr = ring(S, 2.0, 'green'); rec.add(rr);
    put('recycler', rec, -6.5, 8.5); label(S, 'recycler', UVe(-6.5, 8.5)[0], 2.8, UVe(-6.5, 8.5)[1]);
    var fb = building(S, 4.4, 3, 2.1, { sawtooth: 4 }); var fr = ring(S, 2.9, 'green'); fb.add(fr);
    put('factoryB', fb, 2, 10.5); label(S, 'factoryB', UVe(2, 10.5)[0], 3.4, UVe(2, 10.5)[1]);
    /* flows */
    function F(id, pts, o) { api.flows[id] = new Flow(S, pts.map(function (q) { return UVe(q[0], q[1]); }), Object.assign({ grow: 0 }, o)); }
    F('material', [[-9, -4], [-7.5, -2.5], [-3.4, -1.2], [-2.6, -0.2]], { token: 'flow-material' });
    F('product', [[3.6, 1.6], [4.4, 3], [7, 4.6], [10, 6.2]], { token: 'flow-material' });
    F('grid', [[9.5, -4], [6, -2.4], [3.4, -1.4]], { token: 'flow-energy', packet: 'pulse', speed: 0.11, r: 0.05 });
    F('renewable', [[4, -5.6], [3, -3.4], [2, -1.8]], { token: 'flow-renewable', packet: 'pulse', speed: 0.11, r: 0.05 });
    F('water', [[7.6, -0.7], [5.5, -0.6], [3.7, -0.2]], { token: 'flow-water', packet: 'drop', speed: 0.06, r: 0.06 });
    F('waterback', [[3.6, 0.8], [5.6, 0.7], [7.7, 0.5]], { token: 'flow-water', packet: 'drop', speed: 0.06, r: 0.05, opacity: 0.6 });
    F('workforce', [[-7.5, 3.6], [-4.5, 2.6], [-2.6, 1.6]], { token: 'ink-muted', packets: 3, speed: 0.03, r: 0.035, opacity: 0.5 });
    F('waste', [[-1.2, 2.4], [-1.4, 3.6], [-1.6, 4.2]], { token: 'flow-waste', speed: 0.04 });
    F('circular', [[-2.2, 5.6], [-3.6, 7], [-5.2, 8.2]], { token: 'flow-circular', speed: 0.05, r: 0.09 });
    F('circularLoop', [[-7.8, 7.6], [-9.2, 4], [-7.6, 0.5], [-6.6, -0.2]], { token: 'flow-circular', speed: 0.05, r: 0.09 });
    F('expansion', [[-5, 9.4], [-2.4, 10.4], [-0.2, 10.6]], { token: 'flow-circular', speed: 0.05, r: 0.09 });
    api.set = function (st) {
      st = st || {}; var ph = st.phase == null ? 99 : st.phase;
      var on = { farms: ph >= 1, mill: ph >= 2, factory: ph >= 3, energy: ph >= 4, grid: ph >= 4, water: ph >= 5, workforce: ph >= 6, warehouse: ph >= 7, logistics: ph >= 7, waste: ph >= 8,
        recycler: st.circular === 'discovered' || !!st.expanded, factoryB: !!st.expanded };
      Object.keys(api.el).forEach(function (k) { api.el[k].t = on[k] ? 1 : 0; });
      api.sel.t = ph >= 3 && st.selected !== false ? 1 : 0;
      var L = st.layers || null, lay = function (n) { return !L || L.indexOf(n) > -1 ? 1 : 0.0; };
      api.flows.material.set(ph >= 3 ? 1 : 0, lay('material')); api.flows.product.set(ph >= 7 ? 1 : 0, lay('material'));
      var ren = st.renewable == null ? 0.3 : st.renewable;
      api.flows.grid.set(ph >= 4 && ren < 0.98 ? 1 : 0, lay('energy')); api.flows.renewable.set(ph >= 4 && ren > 0.02 ? 1 : 0, lay('energy'));
      api.flows.grid.inst.count = Math.max(1, Math.round(api.flows.grid.n * (1 - ren))); api.flows.renewable.inst.count = Math.max(1, Math.round(api.flows.renewable.n * ren));
      var lit = Math.round(api.panels.length * ren);
      api.panels.forEach(function (p, i) { p.visible = i < Math.max(lit, 4); });
      api.flows.water.set(ph >= 5 ? 1 : 0, lay('water')); api.flows.waterback.set(ph >= 5 ? 1 : 0, lay('water'));
      api.flows.workforce.set(ph >= 6 ? 1 : 0, lay('workforce'));
      api.flows.waste.set(ph >= 8 ? 1 : 0, lay('waste'));
      var c = st.circular === 'discovered' ? 1 : st.circular === 'analysing' ? 0.45 : 0;
      api.flows.circular.set(c, lay('circular')); api.flows.circularLoop.set(st.circular === 'discovered' ? 1 : 0, lay('circular'));
      api.flows.expansion.set(st.expanded ? 1 : 0, lay('circular'));
      S.ghost(!!st.ghost);
      S.dirty = true;
    };
    api.set(state); return api;
  }

  /* =================== LEVEL 3 — GENERATIVE FACTORY TWIN =================== */
  var PROCESSES = [
    { id: 'raw', label: 'Raw materials', u: -9, v: -2.6 }, { id: 'knitting', label: 'Knitting', u: -4.6, v: -2.6 },
    { id: 'dyeing', label: 'Dyeing', u: 0, v: -2.6 }, { id: 'cutting', label: 'Cutting', u: 4.6, v: -2.6 },
    { id: 'sewing', label: 'Sewing', u: 4.6, v: 2.6 }, { id: 'finishing', label: 'Finishing / QC', u: 0, v: 2.6 }, { id: 'product', label: 'Product', u: -4.6, v: 2.6 }];
  function factory(S, state) {
    var THREE = T(), api = { zones: {}, flows: {} };
    var floor = slab(S, 26, 14, 0.5, 'scene-ground', 'scene-plinth'); floor.rotation.y = Math.PI / 4; S.scene.add(floor);
    /* cutaway walls: back two sides only, with clerestory glazing */
    var wb = box(S, 22.6, 2.6, 0.3, 'scene-building'); var p = UV(-1.7, -7); wb.position.set(p[0], 1.3, p[1]); wb.rotation.y = Math.PI / 4; S.scene.add(wb);
    var gl = box(S, 22, 0.5, 0.32, 'scene-glass', { edges: false, rough: .3 }); gl.position.set(p[0], 2.1, p[1]); gl.rotation.y = Math.PI / 4; S.scene.add(gl);
    
    /* energy bus along the back wall */
    var busP = [[-12, -6.4], [9.2, -6.4]].map(function (q) { var x = UV(q[0], q[1]); return [x[0], 2.4, x[1]]; });
    api.flows.bus = new Flow(S, busP, { token: 'flow-energy', packet: 'pulse', r: 0.09, speed: 0.08, y: 2.4 });
    function zone(pr) {
      var g = new THREE.Group(), base = box(S, 4, 0.08, 3.6, 'surface-raised', { edges: true }); base.position.y = 0.04; g.add(base);
      var m;
      if (pr.id === 'raw') for (var i = 0; i < 9; i++) { m = cyl(S, 0.38, 0.38, 0.9, 'scene-building', 20); m.rotation.z = Math.PI / 2; m.position.set((i % 3) * 1.05 - 1.05, 0.45 + Math.floor(i / 6) * 0.7, Math.floor((i % 6) / 3) * 1.1 - 0.6); g.add(m); }
      if (pr.id === 'knitting') for (var k = 0; k < 6; k++) { m = cyl(S, 0.5, 0.42, 1.3, 'scene-machine', 24, { metal: .4, rough: .45 }); m.position.set((k % 3) * 1.25 - 1.25, 0.65, Math.floor(k / 3) * 1.4 - 0.7); g.add(m); var hd = cyl(S, 0.56, 0.56, 0.14, 'scene-building', 24); hd.position.copy(m.position); hd.position.y = 1.36; g.add(hd); }
      if (pr.id === 'dyeing') for (var d = 0; d < 3; d++) { m = cyl(S, 0.55, 0.55, 2.8, 'scene-building', 24); m.rotation.x = Math.PI / 2; m.position.set(d * 1.25 - 1.25, 0.75, 0); g.add(m); var bd = box(S, 0.3, 0.75, 2.4, 'flow-water', { edges: false }); bd.position.set(d * 1.25 - 1.25, 0.37, 0); g.add(bd); }
      if (pr.id === 'cutting') for (var c = 0; c < 2; c++) { m = box(S, 3.4, 0.9, 1.1, 'scene-building'); m.position.set(0, 0.45, c * 1.5 - 0.75); g.add(m); var hd2 = box(S, 0.4, 0.5, 1.2, 'scene-machine'); hd2.position.set(c ? 0.8 : -0.6, 1.15, c * 1.5 - 0.75); g.add(hd2); }
      if (pr.id === 'sewing') for (var s = 0; s < 12; s++) { m = box(S, 0.62, 0.7, 0.5, 'scene-building'); m.position.set((s % 4) * 0.9 - 1.35, 0.35, Math.floor(s / 4) * 1.05 - 1.05); g.add(m); var mm = box(S, 0.3, 0.22, 0.2, 'scene-machine', { edges: false }); mm.position.set(m.position.x, 0.82, m.position.z); g.add(mm); }
      if (pr.id === 'finishing') { for (var f = 0; f < 2; f++) { m = box(S, 3.2, 0.85, 0.9, 'scene-building'); m.position.set(0, 0.42, f * 1.4 - 0.7); g.add(m); } var st = box(S, 0.9, 1.6, 0.9, 'scene-roof'); st.position.set(1.4, 0.8, 0); g.add(st); }
      if (pr.id === 'product') for (var q = 0; q < 6; q++) { m = box(S, 0.95, 0.6 + (q % 2) * 0.3, 0.95, 'scene-roof'); m.position.set((q % 3) * 1.1 - 1.1, (0.6 + (q % 2) * 0.3) / 2, Math.floor(q / 3) * 1.15 - 0.55); g.add(m); }
      var pp = UV(pr.u, pr.v); g.position.set(pp[0], 0, pp[1]); g.rotation.y = Math.PI / 4; S.scene.add(g); S.addPick(g, pr.id);
      var hi = ring(S, 3.1, 'saffron-strong', 0.1); hi.position.set(pp[0], 0.1, pp[1]); S.scene.add(hi);
      api.zones[pr.id] = { g: g, hi: new Appear(S, hi, false), on: new Appear(S, g, false) };
      label(S, pr.id, pp[0], 2.2, pp[1]);
      /* energy drop from the bus to the machines */
      if (['knitting', 'dyeing', 'cutting', 'sewing', 'finishing'].indexOf(pr.id) > -1) {
        var top = UV(pr.u, -6.4), dropPts = [[top[0], 2.4, top[1]], [pp[0], 2.4, pp[1] + 0.001], [pp[0], 1.6, pp[1]]];
        if (pr.v > 0) { var mid = UV(pr.u, 0); dropPts = [[top[0], 2.4, top[1]], [mid[0], 2.4, mid[1]], [pp[0], 2.4, pp[1]], [pp[0], 1.6, pp[1]]]; }
        api.flows['e-' + pr.id] = new Flow(S, dropPts, { token: 'flow-energy', packet: 'pulse', r: 0.04, speed: 0.12, packets: 2, opacity: 0.7 });
      }
    }
    PROCESSES.forEach(zone);
    /* material path through the processes */
    var path = [[-9, -2.6], [-4.6, -2.6], [0, -2.6], [4.6, -2.6], [7.6, -2.6], [7.6, 2.6], [4.6, 2.6], [0, 2.6], [-4.6, 2.6]].map(function (q) { return UV(q[0], q[1]); });
    api.flows.material = new Flow(S, path, { token: 'flow-material', y: 0.25, speed: 0.025 });
    /* water into dyeing, effluent out to treatment */
    var dz = UV(0, -2.6);
    api.flows.water = new Flow(S, [UV(0, -9.5), UV(0, -6.8), [dz[0], dz[1]]], { token: 'flow-water', packet: 'drop', y: 0.3, speed: 0.07 });
    api.flows.effluent = new Flow(S, [[dz[0] + 0.6, dz[1] - 0.4], UV(2.4, -6.8), UV(2.4, -9.5)], { token: 'flow-water', packet: 'drop', y: 0.3, speed: 0.07, opacity: 0.55, r: 0.05 });
    /* waste leaves cutting through the side wall */
    var cz = UV(4.6, -2.6), out = UV(10.6, -2.6), bin = new THREE.Group();
    for (var b = 0; b < 5; b++) { var bale = box(S, 0.6, 0.5, 0.6, 'grey'); bale.position.set((b % 3) * 0.66 - 0.66, 0.25 + Math.floor(b / 3) * 0.5, 0); bin.add(bale); }
    var bp = UV(11.7, -2.6); bin.position.set(bp[0], 0, bp[1]); bin.rotation.y = Math.PI / 4; S.scene.add(bin); S.addPick(bin, 'offcuts');
    api.wasteBin = new Appear(S, bin, false); label(S, 'offcuts', bp[0], 1.4, bp[1]);
    api.flows.waste = new Flow(S, [[cz[0] + 1.2, cz[1] + 1.2], [out[0], out[1]], [bp[0] - 0.6, bp[1] - 0.6]], { token: 'flow-waste', y: 0.25, speed: 0.04 });
    var gp = UV(11.8, 2.6), rec = building(S, 2.4, 2, 1.4, { sawtooth: 2 }); rec.position.set(gp[0], 0, gp[1]); rec.rotation.y = Math.PI / 4; S.scene.add(rec);
    api.recycler = new Appear(S, rec, false); label(S, 'recovery', gp[0], 2.4, gp[1]); S.addPick(rec, 'recovery');
    api.flows.circular = new Flow(S, [[bp[0] + 0.3, bp[1] + 0.3], UV(12.3, 0.2), [gp[0] - 0.2, gp[1] - 0.6]], { token: 'flow-circular', y: 0.25, r: 0.09, speed: 0.05 });
    /* workforce marker near sewing */
    label(S, 'workforce', UV(4.6, 4.8)[0], 0.5, UV(4.6, 4.8)[1]);
    api.set = function (st) {
      st = st || {}; var ph = st.phase == null ? 99 : st.phase;
      PROCESSES.forEach(function (pr, i) { var z = api.zones[pr.id]; z.on.t = ph >= i + 1 ? 1 : 0; z.hi.t = st.selected === pr.id ? 1 : 0; });
      api.flows.bus.set(ph >= 3 ? 1 : 0); Object.keys(api.flows).forEach(function (k) { if (k.indexOf('e-') === 0) api.flows[k].set(ph >= 4 ? 1 : 0); });
      api.flows.material.set(ph >= 7 ? 1 : 0); api.flows.water.set(ph >= 3 ? 1 : 0); api.flows.effluent.set(ph >= 3 ? 1 : 0);
      api.wasteBin.t = ph >= 8 ? 1 : 0; api.flows.waste.set(ph >= 8 ? 1 : 0);
      var c = st.circular === 'discovered'; api.recycler.t = c ? 1 : 0; api.flows.circular.set(c ? 1 : st.circular === 'analysing' ? 0.4 : 0);
      S.dirty = true;
    };
    api.set(state); return api;
  }

  /* =================== LEVEL 1 — INDIA INDUSTRIAL INTELLIGENCE MAP ===================
     Places are positioned by real coordinates. Only the COASTLINE is drawn; land frontiers are intentionally
     not drawn here — production uses an officially compliant basemap (see engineering-handoff). */
  var COAST = [[23.6, 68.4], [22.4, 68.95], [21.6, 69.6], [20.9, 70.4], [20.7, 71.05], [21.2, 72.1], [21.8, 72.25], [22.3, 72.6], [21.7, 72.75], [21.1, 72.7],
    [20.4, 72.83], [19.0, 72.82], [17.0, 73.3], [15.4, 73.8], [14.8, 74.1], [12.9, 74.82], [11.25, 75.78], [9.95, 76.25], [8.5, 76.95], [8.08, 77.55],
    [8.8, 78.15], [9.3, 79.3], [10.3, 79.85], [11.9, 79.83], [13.1, 80.3], [14.4, 80.15], [15.6, 80.2], [16.2, 81.15], [16.95, 82.25], [17.7, 83.3],
    [19.3, 84.95], [19.8, 85.85], [20.3, 86.6], [21.5, 87.0], [21.6, 87.5], [21.65, 88.05], [21.7, 88.9]];
  function geo(lat, lon) { return [(lon - 82) * 0.62, (22 - lat) * 0.66]; }
  var SITES = {
    tiruppur: { name: 'Tiruppur', lat: 11.11, lon: 77.34, kind: 'candidate' }, surat: { name: 'Surat', lat: 21.17, lon: 72.83, kind: 'candidate' },
    ludhiana: { name: 'Ludhiana', lat: 30.9, lon: 75.85, kind: 'candidate' }, rajkot: { name: 'Rajkot', lat: 22.3, lon: 70.8, kind: 'raw' },
    nagpur: { name: 'Vidarbha', lat: 21.15, lon: 79.09, kind: 'raw' }, warangal: { name: 'Warangal', lat: 17.97, lon: 79.59, kind: 'raw' },
    coimbatore: { name: 'Coimbatore', lat: 11.02, lon: 76.96, kind: 'cluster' }, panipat: { name: 'Panipat', lat: 29.39, lon: 76.97, kind: 'cluster' },
    bhiwandi: { name: 'Bhiwandi', lat: 19.3, lon: 73.06, kind: 'cluster' }, mundra: { name: 'Mundra', lat: 22.84, lon: 69.72, kind: 'port' },
    nhava: { name: 'Nhava Sheva', lat: 18.95, lon: 72.95, kind: 'port' }, tuticorin: { name: 'Thoothukudi', lat: 8.76, lon: 78.13, kind: 'port' },
    chennai: { name: 'Chennai', lat: 13.08, lon: 80.29, kind: 'port' }, kolkata: { name: 'Kolkata', lat: 22.57, lon: 88.36, kind: 'port' },
    muppandal: { name: 'Muppandal wind', lat: 8.25, lon: 77.55, kind: 'renewable' }, bhadla: { name: 'Bhadla solar', lat: 27.53, lon: 71.91, kind: 'renewable' },
    pavagada: { name: 'Pavagada solar', lat: 14.1, lon: 77.28, kind: 'renewable' }, punjabwater: { name: 'Groundwater stress', lat: 30.3, lon: 75.4, kind: 'constraint' },
    noyyal: { name: 'River effluent limits', lat: 11.0, lon: 77.6, kind: 'constraint-soft' } };
  function map(S, state) {
    var THREE = T(), api = { cols: {}, marks: {}, arcs: {} };
    var pl = slab(S, 26, 26, 0.7, 'scene-sea', 'scene-plinth'); S.scene.add(pl);
    /* physical land mass: coastline + plinth edges. No land frontier is drawn anywhere — the plinth crops the land. */
    var E = 13, ring_ = [[-E, geo(25.2, 61)[1]]].concat([[25.3, 64.5], [25.4, 66.6], [24.8, 67.0], [24.2, 67.6]].map(function (q) { return geo(q[0], q[1]); }))
      .concat(COAST.map(function (q) { return geo(q[0], q[1]); }))
      .concat([[22.4, 89.6], [22.6, 90.5], [22.2, 91.8], [20.8, 92.4], [19.5, 93.6], [18.0, 94.4], [16.8, 94.6], [16.2, 95.4], [16.5, 97.6], [14.0, 98.2], [11.0, 98.7], [9.0, 98.4]].map(function (q) { return geo(q[0], q[1]); }))
      .concat([[E, geo(9.0, 98.4)[1]], [E, -E], [-E, -E]]);
    function landShape(pts) { var sh = new THREE.Shape(); pts.forEach(function (q, i) { var x = clamp(q[0], -E, E), z = clamp(q[1], -E, E); if (i) sh.lineTo(x, -z); else sh.moveTo(x, -z); }); return sh; }
    function island(lat, lon, rx, rz, rot) { var c = geo(lat, lon), pts = []; for (var a = 0; a < 18; a++) { var t = a / 18 * TAU, x = Math.cos(t) * rx, z = Math.sin(t) * rz, cr = Math.cos(rot || 0), sr = Math.sin(rot || 0); pts.push([c[0] + x * cr - z * sr, c[1] + x * sr + z * cr]); } return landShape(pts); }
    var shapes = [landShape(ring_), landShape([[9.8, 80.2], [9.0, 81.2], [7.9, 81.85], [6.9, 81.9], [6.05, 80.6], [6.2, 80.05], [7.2, 79.85], [8.3, 79.8]].map(function (q) { return geo(q[0], q[1]); })),
      island(12.3, 92.8, 0.18, 0.95, 0.12), island(8.0, 93.6, 0.14, 0.45, 0.2), island(10.6, 72.6, 0.1, 0.18, 0), island(11.3, 72.8, 0.08, 0.12, 0)];
    var landGeo = new THREE.ExtrudeGeometry(shapes, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 });
    var land = new THREE.Mesh(landGeo, S.mat('scene-ground', S.tk('scene-ground'))); land.rotation.x = -Math.PI / 2; land.receiveShadow = true; land.castShadow = true; S.scene.add(land);
    var landPts = ring_.map(function (q) { return [clamp(q[0], -E, E), clamp(q[1], -E, E)]; });
    function onLand(x, z) { var inside = false; for (var i = 0, j = landPts.length - 1; i < landPts.length; j = i++) { var a = landPts[i], b = landPts[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside; } return inside; }
    /* dot field — the industrial grid of the subcontinent's extent */
    var cells = []; for (var gi = 0; gi < 52; gi++) for (var gj = 0; gj < 52; gj++) { var gx = -12.75 + gi * 0.5, gz = -12.75 + gj * 0.5; if (onLand(gx, gz)) cells.push([gx, gz]); }
    var dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 6), S.mat('line-strong-dot', S.tk('line-strong'), { opacity: 0.45 }), cells.length);
    dots.material.userData.token = 'line-strong'; var dm = new THREE.Object3D();
    cells.forEach(function (c, k) { dm.position.set(c[0], 0.16, c[1]); dm.updateMatrix(); dots.setMatrixAt(k, dm.matrix); });
    S.scene.add(dots);
    
    /* sea hint — a soft tint beyond the coast, below the plinth top */
    Object.keys(SITES).forEach(function (id) {
      var s = SITES[id], g = geo(s.lat, s.lon), o;
      if (s.kind === 'candidate') {
        o = new THREE.Group(); var c = box(S, 0.95, 1, 0.95, 'scene-building'); c.position.y = 0.5; o.add(c);
        var cap = box(S, 0.97, 0.08, 0.97, 'ink', { edges: false }); cap.position.y = 1.0; o.add(cap); api.cols[id] = { g: o, body: c, cap: cap, h: 1, ht: 0.01 };
        var hr = ring(S, 1.2, 'saffron-strong', 0.05); o.add(hr); api.cols[id].ring = new Appear(S, hr, false);
      } else if (s.kind === 'raw') { o = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), S.mat('blue-2', S.tk('blue-2'))); o.position.y = 0.4; o.castShadow = true; }
      else if (s.kind === 'cluster') { o = cyl(S, 0.42, 0.42, 0.22, 'blue', 24); o.position.y = 0.11; }
      else if (s.kind === 'port') { o = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 3), S.mat('surface-raised', S.tk('surface-raised'))); o.position.y = 0.3; o.castShadow = true; edges(S, o, 'blue', 0.9); }
      else if (s.kind === 'renewable') { o = new THREE.Group(); for (var k = 0; k < 4; k++) { var pn = box(S, 0.34, 0.04, 0.5, 'flow-renewable', { edges: false }); pn.position.set((k % 2) * 0.4 - 0.2, 0.2, Math.floor(k / 2) * 0.56 - 0.28); pn.rotation.x = -0.4; o.add(pn); } }
      else { o = new THREE.Mesh(new THREE.CircleGeometry(s.kind === 'constraint' ? 1.6 : 0.9, 40), S.mat('red-zone', S.tk('red'), { opacity: s.kind === 'constraint' ? 0.16 : 0.12 })); o.material.userData.token = 'red'; o.rotation.x = -Math.PI / 2; o.position.y = 0.02; }
      var wrap = new THREE.Group(); wrap.add(o); wrap.position.set(g[0], 0.15, g[1]); S.scene.add(wrap); S.addPick(wrap, id);
      api.marks[id] = new Appear(S, wrap, false); label(S, id, g[0], s.kind === 'candidate' ? 1.3 : 0.7, g[1]);
    });
    S.tick.push(function (dt) { var busy = false; Object.keys(api.cols).forEach(function (id) { var c = api.cols[id]; if (Math.abs(c.h - c.ht) > 0.005) { c.h += (c.ht - c.h) * Math.min(1, dt * 2); busy = true; } else c.h = c.ht;
      c.body.scale.y = Math.max(0.01, c.h); c.body.position.y = c.h / 2; c.cap.position.y = c.h + 0.02; }); return busy; });
    function arc(id, a, b, token, lift) {
      var A = geo(SITES[a].lat, SITES[a].lon), B = geo(SITES[b].lat, SITES[b].lon), m = [(A[0] + B[0]) / 2, lift, (A[1] + B[1]) / 2], pts = [];
      for (var t = 0; t <= 1.0001; t += 0.1) { var x = (1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * m[0] + t * t * B[0], y = 2 * (1 - t) * t * m[1] + 0.3, z = (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * m[2] + t * t * B[1]; pts.push([x, y, z]); }
      api.arcs[id] = new Flow(S, pts, { token: token, r: 0.05, grow: 0, packets: 2, speed: 0.06, packet: 'pulse' });
    }
    arc('warangal-tiruppur', 'warangal', 'tiruppur', 'saffron-strong', 2.2); arc('tiruppur-tuticorin', 'tiruppur', 'tuticorin', 'saffron-strong', 1.2);
    arc('pavagada-tiruppur', 'pavagada', 'tiruppur', 'flow-renewable', 1.3); arc('rajkot-surat', 'rajkot', 'surat', 'blue-2', 1.2);
    arc('surat-nhava', 'surat', 'nhava', 'blue-2', 1.0); arc('ludhiana-panipat', 'ludhiana', 'panipat', 'blue-2', 1.0); arc('tiruppur-panipat', 'tiruppur', 'panipat', 'flow-circular', 5.5);
    api.set = function (st) {
      st = st || {}; var ph = st.phase == null ? 99 : st.phase, L = st.layers || ['raw', 'cluster', 'port', 'renewable', 'constraint', 'logistics'];
      var score = st.scores || { tiruppur: 0.86, surat: 0.71, ludhiana: 0.58 };
      Object.keys(SITES).forEach(function (id) {
        var k = SITES[id].kind, layer = k === 'constraint-soft' ? 'constraint' : k;
        api.marks[id].t = (k === 'candidate' ? ph >= 2 : ph >= 1) && (k === 'candidate' || L.indexOf(layer) > -1) ? 1 : 0; });
      Object.keys(api.cols).forEach(function (id) {
        var c = api.cols[id], rec = (st.recommended || 'tiruppur') === id && ph >= 4;
        c.ht = ph >= 3 ? 0.4 + score[id] * 5.2 : ph >= 2 ? 0.35 : 0.01;
        c.body.material = rec ? S.mat('saffron', S.tk('saffron')) : S.mat('scene-building', S.tk('scene-building'));
        c.ring.t = rec ? 1 : 0; });
      var logi = L.indexOf('logistics') > -1;
      api.arcs['warangal-tiruppur'].set(ph >= 5 && logi ? 1 : 0); api.arcs['tiruppur-tuticorin'].set(ph >= 5 && logi ? 1 : 0);
      api.arcs['pavagada-tiruppur'].set(ph >= 5 && L.indexOf('renewable') > -1 ? 1 : 0);
      api.arcs['rajkot-surat'].set(ph >= 3 && logi ? 1 : 0); api.arcs['surat-nhava'].set(ph >= 3 && logi ? 1 : 0); api.arcs['ludhiana-panipat'].set(ph >= 3 && logi ? 1 : 0);
      api.arcs['tiruppur-panipat'].set(st.circular ? 1 : 0); S.dirty = true;
    };
    api.set(state); return api;
  }

  function mount(container, opts) {
    if (!window.THREE) { container.setAttribute('data-qs-error', 'three.js not loaded'); return null; }
    opts = opts || {};
    var zoom = { map: 7.4, ecosystem: 10.5, factory: 8.4 }[opts.kind] || 12;
    var S = new Stage(container, Object.assign({ zoom: zoom, fitW: { map: 7.6, ecosystem: 15.5, factory: 11.2 }[opts.kind] || 0, elevation: opts.kind === 'map' ? 0.74 : 0.6155, azimuth: opts.kind === 'map' ? 0.0001 : 0.0001 }, opts));
    if (opts.kind === 'map') { S.target.set(-0.4, 0, 0.3); S.placeCamera(); }
    var api = opts.kind === 'map' ? map(S, opts.state) : opts.kind === 'factory' ? factory(S, opts.state) : ecosystem(S, opts.state);
    if (opts.kind === 'ecosystem') S.centerOn(Object.keys(api.el).map(function (k) { return api.el[k].obj; }));
    if (opts.kind === 'factory') S.centerOn(Object.keys(api.zones).map(function (k) { return api.zones[k].g; }).concat([api.recycler.obj]));
    var instant = opts.instant || reduced(); if (instant) S.settle();
    return { stage: S, api: api, set: function (st) { api.set(st); if (instant) S.settle(); }, settle: function () { S.settle(); }, setMotion: function (on) { S.live = on && !reduced(); S.dirty = true; },
      snapshot: function () { S.renderer.render(S.scene, S.camera); return S.renderer.domElement.toDataURL('image/png'); },
      dispose: function () { S.dispose(); }, sites: SITES, processes: PROCESSES };
  }
  window.QuantarisScene = { mount: mount, version: '1.0.0', ECO_ORDER: ECO_ORDER, PROCESSES: PROCESSES, SITES: SITES };
})();
