/* KEERAE: the four game toys. Each one is a small taste of how its game plays,
   drawn in that game's own colors. KIT.toys[id](host, opts) fills host with a canvas
   and returns { stop }. opts.bg === false skips the toy's own background so the world shows through. */
(function () {
  'use strict';
  var K = window.KIT, TAU = Math.PI * 2, rnd = K.rnd, clamp = K.clamp;
  var PLUM = '#4B3A5A', CREAM = '#FFF6E5';

  // ---------------------------------------------------------- runner
  function runner(host, impl, opts) {
    var cv = document.createElement('canvas');
    cv.className = 'k-toy-canvas k-toy-fade';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.touchAction = 'pan-y';
    host.appendChild(cv);
    var g = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var S = { W: 0, H: 0, g: g, cv: cv, host: host, opts: opts || {}, t: 0, pointer: null, down: false, dpr: dpr };
    var game = null;
    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h || (w === S.W && h === S.H)) return;
      S.W = w; S.H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      if (game && game.resize) game.resize(w, h);
    }
    size();
    game = impl(S);
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(host);
    var visible = true, io = window.IntersectionObserver ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }) : null; if (io) io.observe(host);
    var raf = 0, last = performance.now(), alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!visible || document.hidden || !S.W) return;
      S.t += dt; game.step(dt);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S.W, S.H);
      game.draw(g);
    }
    raf = requestAnimationFrame(frame);
    function at(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * S.W / r.width, y: (e.clientY - r.top) * S.H / r.height }; }
    var offs = [];
    function on(t, type, fn, o) { t.addEventListener(type, fn, o); offs.push(function () { t.removeEventListener(type, fn, o); }); }
    on(cv, 'pointerdown', function (e) { e.stopPropagation(); var p = at(e); S.pointer = p; S.down = true; if (game.tap) game.tap(p.x, p.y, e); });
    on(cv, 'pointermove', function (e) { S.pointer = at(e); if (game.move) game.move(S.pointer.x, S.pointer.y, e); });
    on(cv, 'pointerleave', function () { S.pointer = null; });
    on(window, 'pointerup', function () { S.down = false; if (game.up) game.up(); });
    on(window, 'pointercancel', function () { S.down = false; if (game.up) game.up(); });
    on(cv, 'click', function (e) { e.stopPropagation(); });
    on(window, 'keydown', function (e) { if (game.key && !e.metaKey && !e.ctrlKey && game.key(e, true)) e.preventDefault(); });
    on(window, 'keyup', function (e) { if (game.key) game.key(e, false); });
    return {
      canvas: cv, state: S,
      stop: function () { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); offs.forEach(function (f) { f(); }); if (game.stop) game.stop(); cv.remove(); }
    };
  }

  // ------------------------------------------------- shared drawing
  // Squish in canvas form. (x, y) is the bottom centre, or the centre when o.center.
  function drawSquish(g, x, y, h, o) {
    o = o || {};
    var w = h * .78, mood = o.mood || 'awake';
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(o.sx || 1, o.sy || 1);
    var top = o.center ? -h / 2 : -h, bot = o.center ? h / 2 : 0, l = -w / 2, r = w / 2, k = w * .15, dome = w * .56;
    g.beginPath();
    g.moveTo(l, top + dome);
    g.bezierCurveTo(l, top + dome * .1, l + w * .2, top, 0, top);
    g.bezierCurveTo(r - w * .2, top, r, top + dome * .1, r, top + dome);
    g.lineTo(r, bot - k); g.quadraticCurveTo(r, bot, r - k, bot);
    g.lineTo(l + k, bot); g.quadraticCurveTo(l, bot, l, bot - k); g.closePath();
    g.fillStyle = CREAM; g.fill();
    g.save(); g.clip(); g.fillStyle = '#E7DDF4'; g.fillRect(r - w * .15, top, w * .2, h); g.restore();
    g.lineWidth = Math.max(1.5, h * .045); g.strokeStyle = PLUM; g.lineJoin = 'round'; g.stroke();
    var fy = top + h * .5, ex = w * .17, ey = h * .075;
    g.fillStyle = '#F6A6BE';
    g.beginPath(); g.ellipse(-w * .31, fy + h * .11, w * .085, h * .032, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w * .31, fy + h * .11, w * .085, h * .032, 0, 0, TAU); g.fill();
    g.strokeStyle = PLUM; g.fillStyle = PLUM; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, h * .028);
    if (mood === 'asleep' || mood === 'happy') {
      var dir = mood === 'asleep' ? 1 : -1;
      for (var s = -1; s <= 1; s += 2) { g.beginPath(); g.moveTo(s * ex - w * .08, fy - dir * h * .01); g.quadraticCurveTo(s * ex, fy + dir * h * .05, s * ex + w * .08, fy - dir * h * .01); g.stroke(); }
    } else if (mood === 'dizzy') {
      for (var d = -1; d <= 1; d += 2) { var cx = d * ex, q = w * .065; g.beginPath(); g.moveTo(cx - q, fy - q); g.lineTo(cx + q, fy + q); g.moveTo(cx + q, fy - q); g.lineTo(cx - q, fy + q); g.stroke(); }
    } else {
      var big = mood === 'surprised' ? 1.15 : 1, lx = o.look ? o.look * w * .03 : 0;
      for (var e = -1; e <= 1; e += 2) {
        g.fillStyle = PLUM; g.beginPath(); g.ellipse(e * ex + lx, fy, w * .075 * big, ey * big, 0, 0, TAU); g.fill();
        if (h > 26) { g.fillStyle = '#fff'; g.beginPath(); g.arc(e * ex + lx - w * .028, fy - ey * .42, w * .03 * big, 0, TAU); g.fill(); }
      }
    }
    g.lineWidth = Math.max(1.2, h * .026);
    if (mood === 'surprised') { g.fillStyle = '#7A4A5E'; g.beginPath(); g.ellipse(0, fy + h * .15, w * .04, h * .035, 0, 0, TAU); g.fill(); }
    else if (mood === 'dizzy') { g.beginPath(); g.moveTo(-w * .08, fy + h * .15); g.quadraticCurveTo(-w * .04, fy + h * .11, 0, fy + h * .15); g.quadraticCurveTo(w * .04, fy + h * .19, w * .08, fy + h * .15); g.stroke(); }
    else if (mood === 'asleep') { g.fillStyle = '#7A4A5E'; g.beginPath(); g.ellipse(0, fy + h * .14, w * .025, h * .022, 0, 0, TAU); g.fill(); }
    else { g.beginPath(); g.arc(0, fy + h * .1, w * .06, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
    g.restore();
  }
  K.drawSquish = drawSquish;

  function star4(g, x, y, r, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.beginPath();
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2; g.quadraticCurveTo(0, 0, Math.cos(a) * r, Math.sin(a) * r); g.quadraticCurveTo(0, 0, Math.cos(a + Math.PI / 4) * r * .22, Math.sin(a + Math.PI / 4) * r * .22); }
    g.closePath(); g.fill(); g.restore();
  }
  // A real crescent: the disc minus a bite up and to the right, meeting in two clean tips.
  function moon(g, x, y, R) {
    var phi = -.75, d = R * .55, r = R * .82, a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
    var al = Math.atan2(h, a), be = Math.atan2(h, a - d);
    g.save(); g.fillStyle = '#FFE9B8'; g.strokeStyle = PLUM; g.lineWidth = Math.max(1.5, R * .12); g.lineJoin = 'round';
    g.beginPath(); g.arc(x, y, R, phi + al, phi - al, false); g.arc(x + d * Math.cos(phi), y + d * Math.sin(phi), r, phi - be, phi + be, true); g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
  function burstBits(list, x, y, n, cols, sp, life) {
    for (var i = 0; i < n; i++) { var a = Math.random() * TAU, v = rnd(sp * .35, sp); list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, life: life || 1, c: cols[i % cols.length], r: rnd(1.8, 4.2) }); }
  }
  function stepBits(list, dt, grav) {
    for (var j = list.length - 1; j >= 0; j--) { var p = list[j]; p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; if (p.life <= 0) list.splice(j, 1); }
  }
  function drawBits(g, list) {
    for (var j = 0; j < list.length; j++) { var p = list[j]; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }

  // ===================================================== SQUISH N POPS
  // Bubbles bounce to the same height every time. Tap one and it splits in two.
  function bubble(g, x, y, R, s, wob) {
    var fill = s === 3 ? '#A6E9C6' : s === 2 ? '#FFE3A3' : '#F6A6BE';
    var sx = 1 + (wob || 0), sy = 1 - (wob || 0);
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.fillStyle = CREAM; g.beginPath(); g.arc(0, 0, R * 1.1, 0, TAU); g.fill();
    g.fillStyle = PLUM; g.beginPath(); g.arc(0, 0, R * 1.02, 0, TAU); g.fill();
    g.fillStyle = fill; g.beginPath(); g.arc(0, 0, R * .93, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-R * .4, -R * .42, R * .26, R * .14, -.7, 0, TAU); g.fill();
    if (R >= 9) {
      g.fillStyle = PLUM;
      if (s === 1) { // the little ones look cross about it
        g.lineWidth = Math.max(1.2, R * .1); g.strokeStyle = PLUM; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-R * .42, -R * .22); g.lineTo(-R * .14, -R * .1); g.moveTo(R * .42, -R * .22); g.lineTo(R * .14, -R * .1); g.stroke();
        g.beginPath(); g.arc(-R * .27, R * .05, R * .1, 0, TAU); g.arc(R * .27, R * .05, R * .1, 0, TAU); g.fill();
      } else {
        g.beginPath(); g.ellipse(-R * .28, -R * .02, R * .11, R * .14, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(R * .28, -R * .02, R * .11, R * .14, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-R * .25, -R * .07, R * .04, 0, TAU); g.arc(R * .31, -R * .07, R * .04, 0, TAU); g.fill();
        g.strokeStyle = PLUM; g.lineWidth = Math.max(1.4, R * .06); g.lineCap = 'round';
        g.beginPath(); g.arc(0, R * .12, R * .16, .2 * Math.PI, .8 * Math.PI); g.stroke();
      }
    }
    g.restore();
  }
  K.drawBubble = bubble;

  function squish(host, opts) {
    return runner(host, function (S) {
      var o = S.opts, bubbles = [], bits = [], stars = [], R, APEX, VX, G = 1100, floor, top = 4, span, cleared = 0;
      var hero = { x: 0, look: 0, mood: 'awake', moodT: 0 };
      function dims() {
        floor = S.H - (o.floor != null ? o.floor : Math.max(16, S.H * .1));
        span = Math.max(110, floor - top);
        var base = clamp(Math.min(S.W * .9, span) * .09, 15, 46);
        R = [0, base * .44, base * .68, base];
        APEX = [0, span * .42, span * .6, span * .8];
        var sc = clamp(S.W / 640, .55, 1.25);
        VX = [0, 122 * sc, 106 * sc, 90 * sc];
        stars = []; for (var i = 0; i < Math.round(S.W * S.H / 5200); i++) stars.push({ x: rnd(0, S.W), y: rnd(0, floor * .85), r: rnd(.5, 1.5), p: rnd(0, TAU) });
        if (!hero.x) hero.x = S.W / 2;
      }
      dims();
      function spawn() {
        bubbles.push({ x: S.W * .28, y: top + R[3] + 6, vx: VX[3], vy: 0, s: 3, w: 0 });
        bubbles.push({ x: S.W * .72, y: top + R[3] + 30, vx: -VX[3], vy: 0, s: 3, w: 0 });
      }
      spawn();
      return {
        resize: function () { dims(); bubbles.forEach(function (b) { b.x = clamp(b.x, R[b.s], S.W - R[b.s]); b.y = Math.min(b.y, floor - R[b.s]); }); },
        step: function (dt) {
          var ax = K.tilt.live ? K.tilt.x * 600 : 0;
          for (var i = 0; i < bubbles.length; i++) {
            var b = bubbles[i], r = R[b.s];
            if (ax) b.vx = clamp(b.vx + ax * dt, -VX[b.s] * 2.2, VX[b.s] * 2.2);
            b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.w *= Math.pow(.02, dt);
            if (b.y + r > floor) { b.y = floor - r; b.vy = -Math.sqrt(2 * G * Math.max(26, APEX[b.s] - r)); b.w = .12; }
            if (b.x - r < 0) { b.x = r; b.vx = Math.abs(b.vx); }
            if (b.x + r > S.W) { b.x = S.W - r; b.vx = -Math.abs(b.vx); }
          }
          stepBits(bits, dt, 650);
          var tx = S.pointer ? S.pointer.x : S.W / 2;
          hero.x += (clamp(tx, 20, S.W - 20) - hero.x) * Math.min(1, dt * 3);
          var near = null, nd = 1e9;
          bubbles.forEach(function (b) { var d = Math.abs(b.x - hero.x); if (d < nd) { nd = d; near = b; } });
          hero.look += ((near ? clamp((near.x - hero.x) / 120, -1, 1) : 0) - hero.look) * Math.min(1, dt * 6);
          hero.moodT -= dt; if (hero.moodT <= 0) hero.mood = 'awake';
        },
        tap: function (x, y) {
          for (var i = bubbles.length - 1; i >= 0; i--) {
            var b = bubbles[i], r = R[b.s] + (K.touch ? 12 : 5);
            if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) > r * r) continue;
            bubbles.splice(i, 1);
            burstBits(bits, b.x, b.y, 8 + b.s * 5, [CREAM, '#A6E9C6', '#F6A6BE', PLUM, '#FFE3A3'], 260 + b.s * 40);
            K.sfx('pop', b.s / 3);
            if (b.s > 1) {
              var hop = -Math.sqrt(2 * G * span * .17);
              bubbles.push({ x: b.x - R[b.s] * .3, y: b.y, vx: -VX[b.s - 1], vy: hop, s: b.s - 1, w: .2 });
              bubbles.push({ x: b.x + R[b.s] * .3, y: b.y, vx: VX[b.s - 1], vy: hop, s: b.s - 1, w: .2 });
            }
            hero.mood = 'surprised'; hero.moodT = .35;
            if (!bubbles.length) { cleared++; hero.mood = 'happy'; hero.moodT = 1.3; K.sfx('chime'); setTimeout(function () { if (!bubbles.length) spawn(); }, 1200); }
            return true;
          }
          return false;
        },
        draw: function (g) {
          if (o.bg !== false) {
            var gr = g.createLinearGradient(0, 0, 0, S.H); gr.addColorStop(0, '#13152A'); gr.addColorStop(1, '#2A2348');
            g.fillStyle = gr; g.fillRect(0, 0, S.W, S.H);
            g.fillStyle = '#FFF6E5';
            for (var i = 0; i < stars.length; i++) { var st = stars[i]; g.globalAlpha = .35 + .4 * Math.sin(S.t * 1.6 + st.p); g.beginPath(); g.arc(st.x, st.y, st.r, 0, TAU); g.fill(); }
            g.globalAlpha = 1;
            moon(g, S.W - Math.min(70, S.W * .12), Math.min(48, S.H * .14), clamp(S.H * .07, 9, 22));
          }
          if (o.floorBar !== false) {
            g.fillStyle = 'rgba(201,184,240,.5)'; g.fillRect(0, floor, S.W, 3);
            g.fillStyle = 'rgba(201,184,240,.18)'; g.fillRect(0, floor + 3, S.W, S.H - floor);
          }
          for (var j = 0; j < bubbles.length; j++) bubble(g, bubbles[j].x, bubbles[j].y, R[bubbles[j].s], bubbles[j].s, bubbles[j].w);
          drawBits(g, bits);
          drawSquish(g, hero.x, floor + 1, clamp(R[3] * 1.6, 22, 60), { mood: hero.mood, look: hero.look });
        }
      };
    }, opts);
  }

  // ===================================================== INTO EMBER DEPTHS
  // Three bosses from the real sprite sheet wake up and fire rings, spirals and aimed shots.
  function ember(host, opts) {
    return runner(host, function (S) {
      var o = S.opts, sheet = K.img('ember-bosses-1x.png'), CELL = 69, shots = [], embers = [], bosses = [], wakeT = .7, lastPew = 0;
      var COLS = ['#FF7A2F', '#FFB347', '#A06BFF', '#5FE0FF', '#FF4D6D'];
      var cells = []; for (var c = 0; c < 33; c++) cells.push(c);
      cells.sort(function () { return Math.random() - .5; });
      function layout() {
        var n = S.W < 360 ? 2 : 3, sc = Math.max(1, Math.floor(Math.min(S.W / (n * 92), S.H / 190)));
        var keep = bosses.slice();
        bosses = [];
        for (var i = 0; i < n; i++) {
          var b = keep[i] || { cell: cells[i], t: .9 + i * .35, flash: 0, kind: ['ring', 'spiral', 'aim'][i % 3], spiral: null, bob: rnd(0, TAU), shake: 0 };
          b.x = S.W * (n === 2 ? (.3 + i * .4) : (.2 + i * .3)); b.y = S.H * .32; b.sc = sc; b.size = CELL * sc;
          bosses.push(b);
        }
      }
      layout();
      function shoot(x, y, a, sp, col) { if (shots.length < 650) shots.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 6, c: col, r: rnd(2.6, 3.9) }); }
      function fire(b, kind) {
        var col = K.pick(COLS), sp = clamp(S.H / 3, 90, 170);
        b.flash = .3; b.shake = .18;
        if (kind === 'ring') { var n = 16, off = Math.random() * TAU; for (var i = 0; i < n; i++) shoot(b.x, b.y, off + i * TAU / n, sp, col); }
        else if (kind === 'spiral') b.spiral = { left: 24, ang: Math.random() * TAU, every: .05, acc: 0, col: col };
        else { var p = S.pointer || { x: S.W / 2, y: S.H * .92 }, a0 = Math.atan2(p.y - b.y, p.x - b.x); for (var j = -2; j <= 2; j++) shoot(b.x, b.y, a0 + j * .13, sp * 1.6, col); }
        var now = performance.now(); if (now - lastPew > 150) { K.sfx('pew'); lastPew = now; }
      }
      for (var e = 0; e < 26; e++) embers.push({ x: rnd(0, 1), y: rnd(0, 1), v: rnd(.02, .07), s: Math.random() < .3 ? 3 : 2 });
      return {
        resize: layout,
        step: function (dt) {
          wakeT -= dt;
          for (var i = 0; i < bosses.length; i++) {
            var b = bosses[i];
            b.bob += dt * 1.6; b.flash = Math.max(0, b.flash - dt); b.shake = Math.max(0, b.shake - dt);
            if (wakeT > 0) continue;
            b.t -= dt;
            if (b.t <= 0) { fire(b, b.kind); b.kind = K.pick(['ring', 'spiral', 'aim']); b.t = rnd(1.2, 2); }
            if (b.spiral) {
              b.spiral.acc += dt;
              while (b.spiral.acc >= b.spiral.every && b.spiral.left > 0) {
                b.spiral.acc -= b.spiral.every; b.spiral.left--; b.spiral.ang += .42;
                var sp = clamp(S.H / 2.6, 100, 190);
                shoot(b.x, b.y, b.spiral.ang, sp, b.spiral.col); shoot(b.x, b.y, b.spiral.ang + Math.PI, sp, b.spiral.col);
              }
              if (b.spiral.left <= 0) b.spiral = null;
            }
          }
          for (var j = shots.length - 1; j >= 0; j--) {
            var s = shots[j]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
            if (s.life <= 0 || s.x < -20 || s.x > S.W + 20 || s.y < -20 || s.y > S.H + 20) shots.splice(j, 1);
          }
          embers.forEach(function (m) { m.y -= m.v * dt; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); } });
        },
        tap: function (x, y) {
          for (var i = 0; i < bosses.length; i++) {
            var b = bosses[i];
            if (Math.abs(x - b.x) < b.size * .6 && Math.abs(y - b.y) < b.size * .6) { wakeT = 0; fire(b, 'ring'); fire(b, 'aim'); return true; }
          }
          return false;
        },
        draw: function (g) {
          if (o.bg !== false) {
            var gr = g.createLinearGradient(0, 0, 0, S.H); gr.addColorStop(0, '#170E26'); gr.addColorStop(1, '#0A0812');
            g.fillStyle = gr; g.fillRect(0, 0, S.W, S.H);
          }
          for (var m = 0; m < embers.length; m++) {
            var em = embers[m]; g.globalAlpha = .35 + .5 * Math.sin(S.t * 3 + m);
            g.fillStyle = m % 3 ? '#FF7A2F' : '#FFB347'; g.fillRect(Math.round(em.x * S.W), Math.round(em.y * S.H), em.s, em.s);
          }
          g.globalAlpha = 1;
          g.imageSmoothingEnabled = false;
          for (var i = 0; i < bosses.length; i++) {
            var b = bosses[i], dx = b.shake ? rnd(-3, 3) : 0, by = b.y + Math.sin(b.bob) * 4;
            g.fillStyle = 'rgba(255,122,47,' + (.1 + b.flash).toFixed(2) + ')';
            g.beginPath(); g.ellipse(b.x, by + b.size * .48, b.size * .42, b.size * .08, 0, 0, TAU); g.fill();
            if (sheet.complete && sheet.naturalWidth) {
              var col = b.cell % 11, row = Math.floor(b.cell / 11);
              if (wakeT > 0) g.globalAlpha = .55;
              g.drawImage(sheet, col * CELL, row * CELL, CELL, CELL, Math.round(b.x - b.size / 2 + dx), Math.round(by - b.size / 2), b.size, b.size);
              g.globalAlpha = 1;
            }
            if (wakeT > 0) { g.fillStyle = '#C9B8F0'; g.font = '700 ' + Math.round(12 + b.sc * 3) + 'px DynaPuff, sans-serif'; g.fillText('z', b.x + b.size * .4, by - b.size * .4 - Math.sin(S.t * 3) * 3); }
          }
          g.imageSmoothingEnabled = true;
          g.globalCompositeOperation = 'lighter';
          for (var j = 0; j < shots.length; j++) {
            var s = shots[j];
            g.globalAlpha = .28; g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, s.r * 2.3, 0, TAU); g.fill();
            g.globalAlpha = 1; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
            g.fillStyle = '#FFF4E0'; g.beginPath(); g.arc(s.x, s.y, s.r * .45, 0, TAU); g.fill();
          }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
      };
    }, opts);
  }

  // ===================================================== RATTLECUP
  // The Vigil: one candle, five bone dice, and a claim lit up above them.
  var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  var WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five'], FACE = ['', 'ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  var REPLY = ['The Rock calls it.', 'The Owl lets it go.', 'The Peacock raises.', 'The Rock squints at you.', 'The Owl believes you. For now.'];
  function drawDie(g, x, y, D, ang, v, glow) {
    g.save(); g.translate(x, y); g.rotate(ang);
    var r = D * .2, h = D / 2;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = D * .25; g.shadowOffsetY = D * .08;
    g.fillStyle = glow ? '#FFF3D6' : '#EFE4CC';
    g.beginPath(); g.moveTo(-h + r, -h); g.arcTo(h, -h, h, h, r); g.arcTo(h, h, -h, h, r); g.arcTo(-h, h, -h, -h, r); g.arcTo(-h, -h, h, -h, r); g.closePath(); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(90,60,30,.5)'; g.lineWidth = Math.max(1, D * .035); g.stroke();
    g.fillStyle = '#2A1E12';
    PIPS[v].forEach(function (q) { g.beginPath(); g.arc(q[0] * D * .25, q[1] * D * .25, D * .085, 0, TAU); g.fill(); });
    g.restore();
  }
  function rattlecup(host, opts) {
    return runner(host, function (S) {
      var o = S.opts, dice = [], D, floor, claim = null, claimT = 0, reply = '', settledOnce = false, flick = 0;
      function dims() { D = clamp(Math.min(S.W / 9.5, S.H / 5.2), 22, 62); floor = S.H * .84; }
      dims();
      for (var i = 0; i < 5; i++) dice.push({ x: S.W * (.3 + i * .1), y: floor - D / 2, vx: 0, vy: 0, a: 0, av: 0, v: 1 + Math.floor(Math.random() * 6), rest: true, flip: 0 });
      function cx() { return o.candleX != null ? o.candleX * S.W : S.W * .5; }
      function throwAll() {
        claim = null; claimT = 0; settledOnce = false;
        dice.forEach(function (d, i) {
          d.rest = false; d.vy = -rnd(520, 760) * (S.H / 420); d.vx = rnd(-170, 170) + (S.W * (.28 + i * .11) - d.x) * 1.4;
          d.av = rnd(-13, 13); d.flip = 0;
        });
        K.sfx('clack', .5);
      }
      setTimeout(throwAll, 180);
      function makeClaim() {
        var count = {}, best = 1, n = 0;
        dice.forEach(function (d) { count[d.v] = (count[d.v] || 0) + 1; });
        for (var f = 6; f >= 1; f--) if ((count[f] || 0) > n) { n = count[f]; best = f; }
        claim = (n === 1 ? 'One ' + FACE[best].replace(/s$/, '') : WORD[n] + ' ' + FACE[best]).toUpperCase();
        reply = K.pick(REPLY); claimT = 0;
      }
      return {
        resize: function () { dims(); dice.forEach(function (d) { d.x = clamp(d.x, D, S.W - D); if (d.rest) d.y = floor - D / 2; }); },
        step: function (dt) {
          flick += dt;
          var G = 2300 * (S.H / 420), all = true;
          dice.forEach(function (d) {
            if (d.rest) return;
            all = false;
            d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.av * dt;
            d.flip -= dt; if (d.flip <= 0) { d.v = 1 + Math.floor(Math.random() * 6); d.flip = .07; }
            if (d.x < D * .6) { d.x = D * .6; d.vx = Math.abs(d.vx) * .6; }
            if (d.x > S.W - D * .6) { d.x = S.W - D * .6; d.vx = -Math.abs(d.vx) * .6; }
            if (d.y > floor - D / 2) {
              d.y = floor - D / 2;
              if (Math.abs(d.vy) > 140) { K.sfx('clack', clamp(Math.abs(d.vy) / 900, 0, 1)); d.vy *= -.34; d.vx *= .72; d.av *= .6; }
              else { d.vy = 0; d.vx *= .6; d.av *= .5; if (Math.abs(d.vx) < 18) { d.rest = true; d.vx = 0; d.a = Math.round(d.a / (Math.PI / 2)) * (Math.PI / 2) + rnd(-.1, .1); } }
            }
          });
          for (var i = 0; i < dice.length; i++) for (var j = i + 1; j < dice.length; j++) {
            var a = dice[i], b = dice[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, min = D * 1.05;
            if (dist < min) { var push = (min - dist) / 2, nx = dx / dist, ny = dy / dist; a.x -= nx * push; b.x += nx * push; if (!a.rest) a.y -= ny * push; if (!b.rest) b.y += ny * push; }
          }
          if (all && !settledOnce) { settledOnce = true; makeClaim(); }
          if (claim) claimT += dt;
        },
        tap: function () { throwAll(); return true; },
        key: function (e, down) { if (down && (e.key === ' ' || e.key === 'Enter') && e.target === document.body) { throwAll(); return true; } return false; },
        draw: function (g) {
          var x0 = cx(), cy = S.H * .3, fl = 1 + Math.sin(flick * 11) * .04 + Math.sin(flick * 17) * .03;
          if (o.bg !== false) {
            g.fillStyle = '#0E0A06'; g.fillRect(0, 0, S.W, S.H);
            var pool = g.createRadialGradient(x0, cy + S.H * .2, 0, x0, cy + S.H * .2, Math.max(S.W, S.H) * .62 * fl);
            pool.addColorStop(0, 'rgba(255,196,110,.34)'); pool.addColorStop(.45, 'rgba(201,162,79,.12)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = pool; g.fillRect(0, 0, S.W, S.H);
            g.fillStyle = 'rgba(70,42,20,.5)'; g.fillRect(0, floor + D * .02, S.W, S.H - floor);
            g.fillStyle = 'rgba(201,162,79,.35)'; g.fillRect(0, floor, S.W, 2);
          }
          // the candle, which is a little bit alive
          var ch = clamp(S.H * .17, 26, 74), cw = ch * .42, top = cy - ch * .1;
          g.fillStyle = '#EADCC0'; g.beginPath(); g.roundRect ? g.roundRect(x0 - cw / 2, top, cw, ch, cw * .18) : g.rect(x0 - cw / 2, top, cw, ch); g.fill();
          g.fillStyle = '#F7EEDB'; g.beginPath(); g.ellipse(x0 - cw * .18, top + ch * .2, cw * .1, ch * .14, 0, 0, TAU); g.fill();
          g.strokeStyle = '#2A1E12'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, top); g.lineTo(x0, top - ch * .08); g.stroke();
          var fh = ch * .5 * fl, fw = fh * .48, fy = top - ch * .08;
          var glow = g.createRadialGradient(x0, fy - fh * .5, 0, x0, fy - fh * .5, fh * 2.2);
          glow.addColorStop(0, 'rgba(255,220,140,.5)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
          g.fillStyle = glow; g.beginPath(); g.arc(x0, fy - fh * .5, fh * 2.2, 0, TAU); g.fill();
          g.fillStyle = '#FFC861'; g.beginPath(); g.moveTo(x0, fy - fh); g.quadraticCurveTo(x0 + fw, fy - fh * .35, x0, fy); g.quadraticCurveTo(x0 - fw, fy - fh * .35, x0, fy - fh); g.fill();
          g.fillStyle = '#FFF1C4'; g.beginPath(); g.ellipse(x0, fy - fh * .3, fw * .32, fh * .26, 0, 0, TAU); g.fill();
          if (o.faces !== false && fh > 14) { // two sleepy dots on the flame
            g.fillStyle = '#7A3E12'; var blink = (flick % 4.2) < .12 ? .25 : 1;
            g.beginPath(); g.ellipse(x0 - fw * .2, fy - fh * .3, fw * .06, fw * .08 * blink, 0, 0, TAU); g.ellipse(x0 + fw * .2, fy - fh * .3, fw * .06, fw * .08 * blink, 0, 0, TAU); g.fill();
          }
          dice.forEach(function (d) { drawDie(g, d.x, d.y, D, d.a, d.v, false); });
          if (claim) {
            var a = clamp(claimT / .5, 0, 1), fs = clamp(S.W / 16, 18, 34);
            g.save(); g.globalAlpha = a; g.textAlign = 'center';
            g.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif';
            if (g.letterSpacing !== undefined) g.letterSpacing = (fs * .14).toFixed(1) + 'px';
            g.shadowColor = 'rgba(255,200,110,.8)'; g.shadowBlur = 14; g.fillStyle = '#F2D48A';
            g.fillText(claim, S.W / 2, floor - D * 1.35 - (1 - a) * 8);
            g.shadowBlur = 0;
            if (claimT > .9) {
              g.globalAlpha = clamp((claimT - .9) / .4, 0, 1) * .85;
              g.font = 'italic 500 ' + Math.round(fs * .52) + 'px Georgia, serif'; if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
              g.fillStyle = reply.indexOf('calls') > -1 ? '#FF7A6B' : '#D9C49A';
              g.fillText(reply, S.W / 2, floor - D * 1.35 + fs * .9);
            }
            g.restore();
          }
        }
      };
    }, opts);
  }

  // ===================================================== ROLLAWAY
  // Squish on a floating island. Tilt it (or use the arrow keys) and it rolls. Tap Squish to hop.
  function rollaway(host, opts) {
    var t = runner(host, function (S) {
      S.cv.style.touchAction = 'none';
      var o = S.opts, keys = { l: 0, r: 0 }, tilt = 0, ang = 0, isl, sq, stars = [], bits = [], foe, got = 0, clouds = [], skyStars = [];
      function dims() {
        var w = clamp(S.W * .62, 180, 560);
        isl = { cx: S.W / 2, y: S.H * .6, w: w, th: clamp(w * .05, 8, 20), dirt: clamp(w * .16, 26, 70) };
        sq = sq || { u: 0, v: 0, h: 0, vh: 0, air: false, rot: 0, falling: false, fx: 0, fy: 0, fvx: 0, fvy: 0, bubble: 0, mood: 'awake', moodT: 0 };
        sq.size = clamp(w * .13, 24, 58);
        foe = foe || { u: w * .28, dir: -1, hit: 0 };
        clouds = []; for (var i = 0; i < 7; i++) clouds.push({ x: rnd(0, S.W), y: S.H * rnd(.84, 1.02), r: rnd(30, 70) * clamp(S.W / 700, .6, 1.3), v: rnd(4, 10) });
        skyStars = []; for (var k = 0; k < 40; k++) skyStars.push({ x: rnd(0, S.W), y: rnd(0, S.H * .7), r: rnd(.5, 1.5), p: rnd(0, TAU) });
        if (!stars.length) for (var j = 0; j < 3; j++) spawnStar(j);
      }
      function spawnStar(j) { stars[j] = { u: rnd(-.42, .42), lift: rnd(.9, 1.7), p: rnd(0, TAU), alive: true, t: 0 }; }
      dims();
      function world(u, lift) { // island-local to screen
        var ca = Math.cos(ang), sa = Math.sin(ang), x = u, y = -lift;
        return { x: isl.cx + x * ca - y * sa, y: isl.y + x * sa + y * ca };
      }
      function hop() { if (!sq.air && !sq.falling) { sq.air = true; sq.vh = 520 * clamp(S.H / 420, .7, 1.3); K.sfx('boing'); } }
      return {
        resize: function () { dims(); },
        step: function (dt) {
          var input = keys.r - keys.l;
          if (!input && S.down && S.pointer) input = S.pointer.x < S.W / 2 ? -1 : 1;
          if (!input && K.tilt.live) input = K.tilt.x;
          tilt += (clamp(input, -1, 1) - tilt) * Math.min(1, dt * 6);
          ang = tilt * .2;
          var half = isl.w / 2;
          if (!sq.falling) {
            var g = 1500;
            sq.v += Math.sin(ang) * g * dt * 1.4;
            sq.v *= Math.pow(sq.air ? .7 : .35, dt);
            sq.u += sq.v * dt;
            sq.rot += sq.v * dt / (sq.size * .45);
            if (sq.air) { sq.vh -= 1500 * dt; sq.h += sq.vh * dt; if (sq.h <= 0) { sq.h = 0; sq.air = false; sq.vh = 0; } }
            if (Math.abs(sq.u) > half + sq.size * .2) { // rolled off the edge
              var p = world(sq.u, sq.h + sq.size * .5);
              sq.falling = true; sq.fx = p.x; sq.fy = p.y; sq.fvx = sq.v * Math.cos(ang); sq.fvy = sq.v * Math.sin(ang) - 60; sq.mood = 'surprised'; K.sfx('whoosh');
            }
            // the cross little cube
            foe.u += foe.dir * 40 * dt; if (Math.abs(foe.u) > half * .7) { foe.dir *= -1; foe.u = clamp(foe.u, -half * .7, half * .7); }
            foe.hit = Math.max(0, foe.hit - dt);
            if (!sq.air && Math.abs(sq.u - foe.u) < sq.size * .8 && !foe.hit) { sq.v = (sq.u < foe.u ? -1 : 1) * 380; foe.hit = .8; sq.mood = 'dizzy'; sq.moodT = .9; K.sfx('boing'); }
            stars.forEach(function (st, j) {
              if (!st.alive) { st.t -= dt; if (st.t <= 0) spawnStar(j); return; }
              var sx = st.u * isl.w, sy = sq.size * st.lift;
              if (Math.abs(sx - sq.u) < sq.size * .6 && Math.abs(sy - (sq.h + sq.size * .5)) < sq.size * .8) {
                st.alive = false; st.t = 1.6; got++; var pp = world(sx, sy); burstBits(bits, pp.x, pp.y, 14, ['#FFE08A', '#FFF6E5', '#FFC861'], 240); K.sfx('chime');
                sq.mood = 'happy'; sq.moodT = .8;
              }
            });
          } else {
            sq.fvy += 1300 * dt; sq.fx += sq.fvx * dt; sq.fy += sq.fvy * dt; sq.rot += sq.fvx * dt / 30;
            if (sq.fy > S.H + sq.size * 2) { sq.falling = false; sq.u = 0; sq.v = 0; sq.h = S.H * .55; sq.vh = 0; sq.air = true; sq.bubble = 1; sq.mood = 'asleep'; }
          }
          if (sq.bubble && sq.air) { sq.vh = Math.max(sq.vh, -90); } // drifting down in a bubble, no hurry
          if (sq.bubble && !sq.air) { sq.bubble = 0; var bp = world(sq.u, sq.size * .5); burstBits(bits, bp.x, bp.y, 12, ['#CFEAFF', '#FFF6E5'], 200); K.sfx('pop', .5); sq.mood = 'awake'; }
          sq.moodT -= dt; if (sq.moodT <= 0 && !sq.bubble && !sq.falling) sq.mood = 'awake';
          stepBits(bits, dt, 420);
          clouds.forEach(function (c) { c.x += c.v * dt; if (c.x - c.r > S.W) c.x = -c.r; });
        },
        tap: function (x, y) {
          var p = sq.falling ? { x: sq.fx, y: sq.fy } : world(sq.u, sq.h + sq.size * .5);
          if (Math.abs(x - p.x) < sq.size && Math.abs(y - p.y) < sq.size * 1.1) { hop(); S.down = false; return true; }
          return false;
        },
        key: function (e, down) {
          var k = e.key;
          if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.l = down ? 1 : 0; return true; }
          if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.r = down ? 1 : 0; return true; }
          if ((k === 'ArrowUp' || k === 'w' || k === 'W' || (k === ' ' && e.target === document.body)) && down) { hop(); return true; }
          return false;
        },
        draw: function (g) {
          var night = K.night;
          if (o.bg !== false) {
            var gr = g.createLinearGradient(0, 0, 0, S.H);
            if (night) { gr.addColorStop(0, '#1B1E3A'); gr.addColorStop(1, '#3A2F66'); } else { gr.addColorStop(0, '#AFC8F5'); gr.addColorStop(1, '#E9E1F8'); }
            g.fillStyle = gr; g.fillRect(0, 0, S.W, S.H);
            if (night) { g.fillStyle = '#FFF6E5'; skyStars.forEach(function (s) { g.globalAlpha = .4 + .4 * Math.sin(S.t * 1.5 + s.p); g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); }); g.globalAlpha = 1; }
            g.fillStyle = night ? 'rgba(200,190,240,.35)' : 'rgba(255,255,255,.9)';
            clouds.forEach(function (c) { g.beginPath(); g.arc(c.x, c.y, c.r, 0, TAU); g.arc(c.x + c.r * .9, c.y + c.r * .15, c.r * .75, 0, TAU); g.arc(c.x - c.r * .9, c.y + c.r * .2, c.r * .65, 0, TAU); g.fill(); });
          }
          // island
          g.save(); g.translate(isl.cx, isl.y); g.rotate(ang);
          var w = isl.w, hw = w / 2, th = isl.th, dh = isl.dirt;
          g.fillStyle = '#7D6BC9'; g.beginPath(); g.moveTo(-hw * .7, dh); g.lineTo(-hw * .12, dh + w * .2); g.lineTo(hw * .18, dh + w * .13); g.lineTo(hw * .62, dh); g.closePath(); g.fill();
          g.fillStyle = '#9B8BE0'; g.beginPath(); g.moveTo(-hw * .7, dh); g.lineTo(-hw * .12, dh + w * .2); g.lineTo(-hw * .25, dh); g.closePath(); g.fill();
          var bands = ['#D98B4E', '#E8A060', '#C9783F', '#E09356'];
          for (var b = 0; b < 4; b++) { g.fillStyle = bands[b]; g.fillRect(-hw, th + (dh - th) * b / 4, w, (dh - th) / 4 + 1); }
          g.fillStyle = '#8FCF6A'; g.beginPath(); g.roundRect ? g.roundRect(-hw - 4, -2, w + 8, th + 6, 6) : g.rect(-hw - 4, -2, w + 8, th + 6); g.fill();
          g.fillStyle = '#A9E07F'; g.fillRect(-hw - 2, -2, w + 4, th * .45);
          for (var gx = -hw + 10; gx < hw - 6; gx += 22) { g.fillStyle = '#6FB552'; g.beginPath(); g.moveTo(gx, th + 4); g.quadraticCurveTo(gx + 5, th + 12, gx + 10, th + 4); g.fill(); }
          // the cube that does not like you
          var fx = foe.u, fs = sq.size * .62;
          g.fillStyle = '#E8595B'; g.strokeStyle = '#7A2E34'; g.lineWidth = 2;
          g.beginPath(); g.roundRect ? g.roundRect(fx - fs / 2, -fs - 1, fs, fs, fs * .18) : g.rect(fx - fs / 2, -fs - 1, fs, fs); g.fill(); g.stroke();
          g.strokeStyle = '#4B2030'; g.lineWidth = Math.max(1.4, fs * .07); g.lineCap = 'round';
          var fd = foe.dir;
          g.beginPath(); g.moveTo(fx - fs * .3 + fd * 3, -fs * .72); g.lineTo(fx - fs * .08 + fd * 3, -fs * .62); g.moveTo(fx + fs * .3 + fd * 3, -fs * .72); g.lineTo(fx + fs * .08 + fd * 3, -fs * .62); g.stroke();
          g.fillStyle = '#4B2030'; g.beginPath(); g.arc(fx - fs * .17 + fd * 3, -fs * .5, fs * .06, 0, TAU); g.arc(fx + fs * .17 + fd * 3, -fs * .5, fs * .06, 0, TAU); g.fill();
          // sparkles to collect
          g.fillStyle = '#FFE08A';
          stars.forEach(function (st) { if (!st.alive) return; var bob = Math.sin(S.t * 2.4 + st.p) * 4; g.save(); g.shadowColor = 'rgba(255,224,138,.9)'; g.shadowBlur = 10; star4(g, st.u * w, -sq.size * st.lift + bob, sq.size * .3, S.t * .6 + st.p); g.restore(); });
          if (!sq.falling) {
            var sqy = -sq.h - sq.size * .5;
            if (sq.bubble) { g.fillStyle = 'rgba(206,236,255,.45)'; g.strokeStyle = 'rgba(75,58,90,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(sq.u, sqy, sq.size * .95, 0, TAU); g.fill(); g.stroke(); }
            drawSquish(g, sq.u, sqy, sq.size, { center: true, rot: sq.air && !sq.bubble ? sq.rot * .2 : sq.rot, mood: sq.mood, sx: sq.air ? .95 : 1.03, sy: sq.air ? 1.05 : .97 });
          }
          g.restore();
          if (sq.falling) drawSquish(g, sq.fx, sq.fy, sq.size, { center: true, rot: sq.rot, mood: 'surprised' });
          drawBits(g, bits);
          if (got) { g.font = '700 ' + clamp(S.W / 30, 13, 18) + 'px Fredoka, sans-serif'; g.fillStyle = night ? '#FFF6E5' : PLUM; g.textAlign = 'right'; g.fillText('★ ' + got, S.W - 12, 24); g.textAlign = 'left'; }
        }
      };
    }, opts);
    return t;
  }

  K.toys = { squish: squish, ember: ember, rattlecup: rattlecup, rollaway: rollaway };
})();
