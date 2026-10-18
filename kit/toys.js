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
      peek: function () { return game.peek ? game.peek() : null; },
      stop: function () {
        alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); offs.forEach(function (f) { f(); }); if (game.stop) game.stop(); cv.remove();
        [].slice.call(host.querySelectorAll('.k-secret')).forEach(function (e) { e.remove(); });
      }
    };
  }

  // ------------------------------------------------- shared drawing
  // Squish in canvas form: the same outline and face as the SVG in kit.js, drawn in its
  // viewBox units. (x, y) is the bottom centre, or the centre when o.center. h is the body's
  // height in px (it is a touch wider than tall).
  var SQP;
  function sqPaths() {
    if (SQP) return SQP;
    var P = function (d) { return new Path2D(d); };
    return (SQP = {
      body: P(K.SQ.body), hi: P(K.SQ.hi),
      smile: P('M56.5 73Q64 80.5 71.5 73'),
      lids: P('M32 57.6Q42 61.2 52 57.6M76 57.6Q86 61.2 96 57.6'), lidFill: P('M31 44H53V57.5Q42 61 31 57.5ZM75 44H97V57.5Q86 61 75 57.5Z'),
      shut: P('M32 55Q42 63 52 55M76 55Q86 63 96 55'),
      joy: P('M32 58Q42 47 52 58M76 58Q86 47 96 58'), grin: P('M53 68Q64 88 75 68Z'), tongue: P('M58.5 78.5Q64 74.5 69.5 78.5Q64 82.5 58.5 78.5Z'),
      squint: P('M33 48L47 55L33 62M95 48L81 55L95 62'),
      xs: P('M35 48L49 62M49 48L35 62M79 48L93 62M93 48L79 62'), wave: P('M53 76Q58.5 70.5 64 76T75 76')
    });
  }
  function oval(g, x, y, rx, ry, fill) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
  function drawSquish(g, x, y, h, o) {
    o = o || {};
    var mood = o.mood || 'awake', s = h / 100, P = sqPaths(), px = 1 / s, MOUTH = '#7A4A5E';
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale((o.sx || 1) * s, (o.sy || 1) * s);
    g.translate(-64, o.center ? -60 : -110);
    g.fillStyle = CREAM; g.fill(P.body);
    g.save(); g.clip(P.body); oval(g, 120, 64, 17, 58, '#E7DDF4'); oval(g, 64, 119, 64, 13, '#EFE7F8'); g.restore();
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (h > 30) { g.strokeStyle = '#fff'; g.lineWidth = 5.5; g.stroke(P.hi); }
    oval(g, 26.5, 73, 9.5, 5.4, 'rgba(246,166,190,.9)'); oval(g, 101.5, 73, 9.5, 5.4, 'rgba(246,166,190,.9)');
    g.strokeStyle = PLUM; g.lineWidth = Math.max(3.6, 1.2 * px);
    if (mood === 'asleep') { g.stroke(P.shut); oval(g, 64, 74, 2.9, 3.4, MOUTH); }
    else if (mood === 'happy') { g.stroke(P.joy); g.fillStyle = MOUTH; g.fill(P.grin); g.lineWidth = Math.max(2.8, px); g.stroke(P.grin); g.fillStyle = '#F6A6BE'; g.fill(P.tongue); }
    else if (mood === 'yawn') { g.stroke(P.squint); oval(g, 64, 78, 7.5, 9.5, MOUTH); g.lineWidth = Math.max(2.8, px); g.stroke(); oval(g, 64, 83.5, 4.4, 2.8, '#F6A6BE'); }
    else if (mood === 'dizzy') { g.stroke(P.xs); g.lineWidth = Math.max(3.2, px); g.stroke(P.wave); }
    else {
      var sur = mood === 'surprised', dr = mood === 'drowsy', lx = (o.look || 0) * 3, ey = sur ? 54 : dr ? 56 : 55, rx = sur ? 9.5 : 8.5, ry = sur ? 12.5 : dr ? 10 : 11;
      g.save(); g.translate(lx, 0);
      for (var e = 42; e <= 86; e += 44) {
        oval(g, e, ey, rx, ry, PLUM);
        if (h > 26 && dr) oval(g, e - 2.5, 61.2, 1.9, 1.9, '#fff');
        else if (h > 26) { oval(g, e - (sur ? 3.6 : 3.2), ey - (sur ? 5.4 : 4.6), sur ? 4 : 3.5, sur ? 4 : 3.5, '#fff'); if (h > 60) oval(g, e + (sur ? 3.6 : 3), ey + (sur ? 6.4 : 5), 1.6, 1.6, '#fff'); }
      }
      g.restore();
      if (dr) { g.fillStyle = CREAM; g.fill(P.lidFill); g.stroke(P.lids); oval(g, 64, 75, 2.8, 3.3, MOUTH); }
      else if (sur) { oval(g, 64, 77, 4.2, 5, MOUTH); g.lineWidth = Math.max(2.4, px); g.stroke(); }
      else { g.lineWidth = Math.max(3.4, 1.1 * px); g.stroke(P.smile); }
    }
    g.lineWidth = Math.max(5, 1.5 * px); g.stroke(P.body);
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

  // A secret found: a little gold card drops into the toy for a few seconds.
  var STAR_D = 'M0-11Q1.6-1.6 11 0Q1.6 1.6 0 11Q-1.6 1.6-11 0Q-1.6-1.6 0-11Z';
  function secretCard(S, id, line) {
    var r = K.findSecret(id), el = document.createElement('div');
    el.className = 'k-secret'; el.setAttribute('role', 'status');
    el.innerHTML = '<svg class="k-secret-star" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><path d="' + STAR_D + '"/></svg><b></b><small></small>';
    el.querySelector('b').textContent = K.SECRETS[id];
    el.querySelector('small').textContent = !r.fresh ? line : r.all ? 'That\u2019s all four. Squish is throwing a party up top.' : 'Secret ' + r.n + ' of ' + r.total + '. ' + line;
    var old = S.host.querySelector('.k-secret'); if (old) old.remove();
    S.host.appendChild(el);
    setTimeout(function () { el.classList.add('k-out'); setTimeout(function () { el.remove(); }, 450); }, r.fresh && r.all ? 7000 : 4500);
    return r;
  }

  // ===================================================== SQUISH N POPS
  // Bubbles bounce to the same height every time. Tap one and it splits in two.
  function bubble(g, x, y, R, s, wob, gold) {
    var fill = gold ? '#FFD45E' : s === 3 ? '#A6E9C6' : s === 2 ? '#FFE3A3' : '#F6A6BE';
    var sx = 1 + (wob || 0), sy = 1 - (wob || 0);
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.fillStyle = CREAM; g.beginPath(); g.arc(0, 0, R * 1.1, 0, TAU); g.fill();
    g.fillStyle = PLUM; g.beginPath(); g.arc(0, 0, R * 1.02, 0, TAU); g.fill();
    g.fillStyle = fill; g.beginPath(); g.arc(0, 0, R * .93, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-R * .4, -R * .42, R * .26, R * .14, -.7, 0, TAU); g.fill();
    if (R >= 9) {
      g.fillStyle = PLUM;
      if (gold) { // the golden one is very pleased with itself
        g.strokeStyle = PLUM; g.lineWidth = Math.max(1.4, R * .07); g.lineCap = 'round';
        g.beginPath(); g.arc(-R * .28, R * .02, R * .13, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
        g.beginPath(); g.arc(R * .28, R * .02, R * .13, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
        g.fillStyle = 'rgba(246,166,190,.85)'; g.beginPath(); g.ellipse(-R * .5, R * .2, R * .12, R * .07, 0, 0, TAU); g.ellipse(R * .5, R * .2, R * .12, R * .07, 0, 0, TAU); g.fill();
        g.fillStyle = '#7A4A5E'; g.beginPath(); g.moveTo(-R * .17, R * .17); g.quadraticCurveTo(0, R * .5, R * .17, R * .17); g.closePath(); g.fill(); g.stroke();
      } else if (s === 1) { // the little ones look cross about it
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
      // The secret: clear the screen and a golden bubble drops in. Pop that too.
      function goldBubble() {
        var x = S.W * rnd(.35, .65);
        bubbles.push({ x: x, y: top + R[3] + 6, vx: (Math.random() < .5 ? -1 : 1) * VX[3] * .8, vy: 0, s: 3, w: 0, gold: true });
        burstBits(bits, x, top + R[3], 16, ['#FFD45E', '#FFF1C4', CREAM], 200); K.sfx('chime');
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
            if (b.gold) {
              for (var k = 0; k < 4; k++) burstBits(bits, b.x + rnd(-.5, .5) * R[3], b.y + rnd(-.5, .5) * R[3], 14, ['#FFD45E', '#FFF1C4', '#FFE08A', CREAM], 360);
              K.sfx('pop', 1); hero.mood = 'happy'; hero.moodT = 2.4;
              secretCard(S, 'squish', 'Every bubble, even the gold one.');
              setTimeout(function () { if (!bubbles.length) spawn(); }, 1800);
              return true;
            }
            burstBits(bits, b.x, b.y, 8 + b.s * 5, [CREAM, '#A6E9C6', '#F6A6BE', PLUM, '#FFE3A3'], 260 + b.s * 40);
            K.sfx('pop', b.s / 3);
            if (b.s > 1) {
              var hop = -Math.sqrt(2 * G * span * .17);
              bubbles.push({ x: b.x - R[b.s] * .3, y: b.y, vx: -VX[b.s - 1], vy: hop, s: b.s - 1, w: .2 });
              bubbles.push({ x: b.x + R[b.s] * .3, y: b.y, vx: VX[b.s - 1], vy: hop, s: b.s - 1, w: .2 });
            }
            hero.mood = 'surprised'; hero.moodT = .35;
            if (!bubbles.length) { cleared++; hero.mood = 'happy'; hero.moodT = 1.3; K.sfx('chime'); setTimeout(function () { if (!bubbles.length) goldBubble(); }, 1000); }
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
          for (var j = 0; j < bubbles.length; j++) {
            var bb = bubbles[j];
            if (bb.gold) { // a warm glow, and sparkles circling the golden one
              var gg = g.createRadialGradient(bb.x, bb.y, R[3] * .8, bb.x, bb.y, R[3] * 2.1);
              gg.addColorStop(0, 'rgba(255,212,94,.45)'); gg.addColorStop(1, 'rgba(255,212,94,0)');
              g.fillStyle = gg; g.beginPath(); g.arc(bb.x, bb.y, R[3] * 2.1, 0, TAU); g.fill();
              g.fillStyle = '#FFE08A';
              for (var q = 0; q < 4; q++) { var qa = S.t * 1.4 + q * TAU / 4; star4(g, bb.x + Math.cos(qa) * R[3] * 1.55, bb.y + Math.sin(qa) * R[3] * 1.55, R[3] * (.3 + .1 * Math.sin(S.t * 5 + q)), S.t); }
            }
            bubble(g, bb.x, bb.y, R[bb.s], bb.s, bb.w, bb.gold);
          }
          drawBits(g, bits);
          drawSquish(g, hero.x, floor + 1, clamp(R[3] * 1.6, 22, 60), { mood: hero.mood, look: hero.look });
        },
        peek: function () { return { bubbles: bubbles, R: R, cleared: cleared }; }
      };
    }, opts);
  }

  // ===================================================== INTO EMBER DEPTHS
  // Three bosses from the real sprite sheet wake up and fire rings, spirals and aimed shots.
  function ember(host, opts) {
    return runner(host, function (S) {
      var o = S.opts, sheet = K.img('ember-bosses-1x.png'), CELL = 69, shots = [], embers = [], bosses = [], wakeT = .7, lastPew = 0;
      // The secret: the cursor (or a finger held down) is the player. Twenty seconds in the arena without a scratch.
      var dodge = { t: 0, hit: 0, calm: 0 }, sparks = [];
      S.cv.style.cursor = 'none';
      function player() {
        if (!S.pointer || (K.touch && !S.down)) return null;
        return K.touch ? { x: S.pointer.x, y: Math.max(8, S.pointer.y - 44) } : S.pointer;
      }
      function untouchable() {
        dodge.t = 0; dodge.calm = 4.5; wakeT = 4.5;
        shots.forEach(function (q) { burstBits(sparks, q.x, q.y, 2, ['#FFB347', '#FF7A2F', '#FFE08A'], 70, 1.4); });
        shots.length = 0;
        bosses.forEach(function (b) { b.spiral = null; b.flash = .6; });
        secretCard(S, 'ember', 'Twenty seconds without a scratch. They need a nap.');
      }
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
        else { var p = player() || S.pointer || { x: S.W / 2, y: S.H * .92 }, a0 = Math.atan2(p.y - b.y, p.x - b.x); for (var j = -2; j <= 2; j++) shoot(b.x, b.y, a0 + j * .13, sp * 1.6, col); }
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
          var pl = player();
          dodge.hit = Math.max(0, dodge.hit - dt); dodge.calm = Math.max(0, dodge.calm - dt);
          if (!pl || wakeT > 0 || dodge.calm > 0) dodge.t = 0;
          else {
            var hitR = K.touch ? 9 : 5, hit = false;
            for (var h = shots.length - 1; h >= 0; h--) {
              var q = shots[h], qx = q.x - pl.x, qy = q.y - pl.y, rr = q.r + hitR;
              if (qx * qx + qy * qy < rr * rr) { hit = true; burstBits(sparks, q.x, q.y, 5, [q.c, '#FFF4E0'], 120, .8); shots.splice(h, 1); }
            }
            if (hit) { dodge.t = 0; dodge.hit = .45; K.sfx('blip'); }
            else { dodge.t += dt; if (dodge.t >= 20) untouchable(); }
          }
          stepBits(sparks, dt, -50);
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
          drawBits(g, sparks);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          var pl = player();
          if (pl) { // you: a little cream heart of a dot, and a gold ring that fills as you last
            var pr = K.touch ? 7 : 5;
            if (dodge.hit > 0) { g.strokeStyle = 'rgba(255,77,109,' + Math.min(1, dodge.hit * 2.2).toFixed(2) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(pl.x, pl.y, pr + (.45 - dodge.hit) * 50, 0, TAU); g.stroke(); }
            g.fillStyle = 'rgba(255,246,229,.22)'; g.beginPath(); g.arc(pl.x, pl.y, pr * 2.2, 0, TAU); g.fill();
            g.fillStyle = CREAM; g.beginPath(); g.arc(pl.x, pl.y, pr, 0, TAU); g.fill();
            g.fillStyle = '#F6A6BE'; g.beginPath(); g.arc(pl.x, pl.y, pr * .55, 0, TAU); g.fill();
            if (dodge.t > 2) { g.strokeStyle = '#FFE08A'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.arc(pl.x, pl.y, pr * 2.7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, dodge.t / 20)); g.stroke(); }
          }
        },
        peek: function () { return { shots: shots, bosses: bosses, dodge: dodge, wake: function () { return wakeT; } }; }
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
      // The secret: five of a kind, ones wild. Until someone finds it, the dice get kinder the longer they keep throwing.
      var throws = 0, five = false, sparks = [];
      function dims() { D = clamp(Math.min(S.W / 9.5, S.H / 5.2), 22, 62); floor = S.H * .84; }
      dims();
      for (var i = 0; i < 5; i++) dice.push({ x: S.W * (.3 + i * .1), y: floor - D / 2, vx: 0, vy: 0, a: 0, av: 0, v: 1 + Math.floor(Math.random() * 6), rest: true, flip: 0 });
      function cx() { return o.candleX != null ? o.candleX * S.W : S.W * .5; }
      function throwAll() {
        claim = null; claimT = 0; settledOnce = false; five = false; throws++;
        var fin = null;
        if (!K.found('rattlecup') && (throws >= 20 || Math.random() < Math.pow(clamp((throws - 5) / 15, 0, 1), 2))) {
          var face = 2 + Math.floor(Math.random() * 5), wild = Math.floor(Math.random() * 3);
          fin = []; for (var k = 0; k < 5; k++) fin.push(k < wild ? 1 : face);
          fin.sort(function () { return Math.random() - .5; });
        }
        dice.forEach(function (d, i) {
          d.rest = false; d.vy = -rnd(520, 760) * (S.H / 420); d.vx = rnd(-170, 170) + (S.W * (.28 + i * .11) - d.x) * 1.4;
          d.av = rnd(-13, 13); d.flip = 0; d.final = fin ? fin[i] : 0;
        });
        K.sfx('clack', .5);
      }
      setTimeout(throwAll, 180);
      function makeClaim() { // ones are wild, the way the game plays
        var count = [0, 0, 0, 0, 0, 0, 0], best = 6, n = 0;
        dice.forEach(function (d) { count[d.v]++; });
        if (count[1] === 5) { best = 1; n = 5; }
        else for (var f = 6; f >= 2; f--) if (count[f] + count[1] > n) { n = count[f] + count[1]; best = f; }
        claim = (n === 1 ? 'One ' + FACE[best].replace(/s$/, '') : WORD[n] + ' ' + FACE[best]).toUpperCase();
        claimT = 0;
        if (n === 5) {
          five = true; throws = 0; reply = 'The Blind King stands up.';
          secretCard(S, 'rattlecup', 'Ones wild. The House noticed you.');
        } else reply = K.pick(REPLY);
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
              else { d.vy = 0; d.vx *= .6; d.av *= .5; if (Math.abs(d.vx) < 18) { d.rest = true; d.vx = 0; d.a = Math.round(d.a / (Math.PI / 2)) * (Math.PI / 2) + rnd(-.1, .1); if (d.final) d.v = d.final; } }
            }
          });
          for (var i = 0; i < dice.length; i++) for (var j = i + 1; j < dice.length; j++) {
            var a = dice[i], b = dice[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, min = D * 1.05;
            if (dist < min) { var push = (min - dist) / 2, nx = dx / dist, ny = dy / dist; a.x -= nx * push; b.x += nx * push; if (!a.rest) a.y -= ny * push; if (!b.rest) b.y += ny * push; }
          }
          if (all && !settledOnce) { settledOnce = true; makeClaim(); }
          if (claim) claimT += dt;
          if (five && Math.random() < dt * 14) burstBits(sparks, cx() + rnd(-6, 6), S.H * .3 - clamp(S.H * .17, 26, 74) * .5, 1, ['#FFE08A', '#FFF1C4', '#FFC861'], 70, 1.2);
          stepBits(sparks, dt, -60);
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
          var fh = ch * .5 * fl * (five ? 1.5 : 1), fw = fh * .48, fy = top - ch * .08;
          var glow = g.createRadialGradient(x0, fy - fh * .5, 0, x0, fy - fh * .5, fh * 2.2);
          glow.addColorStop(0, 'rgba(255,220,140,.5)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
          g.fillStyle = glow; g.beginPath(); g.arc(x0, fy - fh * .5, fh * 2.2, 0, TAU); g.fill();
          g.fillStyle = '#FFC861'; g.beginPath(); g.moveTo(x0, fy - fh); g.quadraticCurveTo(x0 + fw, fy - fh * .35, x0, fy); g.quadraticCurveTo(x0 - fw, fy - fh * .35, x0, fy - fh); g.fill();
          g.fillStyle = '#FFF1C4'; g.beginPath(); g.ellipse(x0, fy - fh * .3, fw * .32, fh * .26, 0, 0, TAU); g.fill();
          if (o.faces !== false && fh > 14) { // two sleepy dots on the flame
            g.fillStyle = '#7A3E12'; var blink = (flick % 4.2) < .12 ? .25 : 1;
            g.beginPath(); g.ellipse(x0 - fw * .2, fy - fh * .3, fw * .06, fw * .08 * blink, 0, 0, TAU); g.ellipse(x0 + fw * .2, fy - fh * .3, fw * .06, fw * .08 * blink, 0, 0, TAU); g.fill();
          }
          drawBits(g, sparks);
          if (five) dice.forEach(function (d) {
            var gl = g.createRadialGradient(d.x, d.y, D * .2, d.x, d.y, D * 1.15);
            gl.addColorStop(0, 'rgba(255,224,138,.75)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
            g.fillStyle = gl; g.beginPath(); g.arc(d.x, d.y, D * 1.15, 0, TAU); g.fill();
          });
          dice.forEach(function (d) { drawDie(g, d.x, d.y, D, d.a, d.v, five); });
          if (claim) {
            var a = clamp(claimT / .5, 0, 1), fs = clamp(S.W / 16, 18, 34);
            g.save(); g.globalAlpha = a; g.textAlign = 'center';
            g.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif';
            if (g.letterSpacing !== undefined) g.letterSpacing = (fs * .14).toFixed(1) + 'px';
            g.shadowColor = 'rgba(255,200,110,.8)'; g.shadowBlur = five ? 30 : 14; g.fillStyle = five ? '#FFE9A8' : '#F2D48A';
            g.fillText(claim, S.W / 2, floor - D * 1.35 - (1 - a) * 8);
            g.shadowBlur = 0;
            if (claimT > .9) {
              g.globalAlpha = clamp((claimT - .9) / .4, 0, 1) * .85;
              g.font = 'italic 500 ' + Math.round(fs * .52) + 'px Georgia, serif'; if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
              g.fillStyle = five ? '#FFE08A' : reply.indexOf('calls') > -1 ? '#FF7A6B' : '#D9C49A';
              g.fillText(reply, S.W / 2, floor - D * 1.35 + fs * .9);
            }
            g.restore();
          }
        },
        peek: function () { return { dice: dice, five: function () { return five; }, throws: function () { return throws; }, claim: function () { return claim; } }; }
      };
    }, opts);
  }

  // ================================================ SQUISH ON A ROLL (codename Rollaway)
  // Squish on a floating island. Tilt it (or use the arrow keys) and it rolls. Tap Squish to hop.
  function rollaway(host, opts) {
    var t = runner(host, function (S) {
      S.cv.style.touchAction = 'none';
      var o = S.opts, keys = { l: 0, r: 0 }, tilt = 0, ang = 0, isl, sq, stars = [], bits = [], foe, got = 0, clouds = [], skyStars = [];
      // The secret: ten stars in a row without falling off. A rainbow comes out.
      var streak = 0, rainbow = 0;
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
              sq.falling = true; sq.fx = p.x; sq.fy = p.y; sq.fvx = sq.v * Math.cos(ang); sq.fvy = sq.v * Math.sin(ang) - 60; sq.mood = 'surprised'; K.sfx('whoosh'); streak = 0;
            }
            // the cross little cube
            foe.u += foe.dir * 40 * dt; if (Math.abs(foe.u) > half * .7) { foe.dir *= -1; foe.u = clamp(foe.u, -half * .7, half * .7); }
            foe.hit = Math.max(0, foe.hit - dt);
            if (!sq.air && Math.abs(sq.u - foe.u) < sq.size * .8 && !foe.hit) { sq.v = (sq.u < foe.u ? -1 : 1) * 380; foe.hit = .8; sq.mood = 'dizzy'; sq.moodT = .9; K.sfx('boing'); }
            stars.forEach(function (st, j) {
              if (!st.alive) { st.t -= dt; if (st.t <= 0) spawnStar(j); return; }
              var sx = st.u * isl.w, sy = sq.size * st.lift;
              if (Math.abs(sx - sq.u) < sq.size * .6 && Math.abs(sy - (sq.h + sq.size * .5)) < sq.size * .8) {
                st.alive = false; st.t = 1.6; got++; streak++; var pp = world(sx, sy); burstBits(bits, pp.x, pp.y, 14, ['#FFE08A', '#FFF6E5', '#FFC861'], 240); K.sfx('chime');
                sq.mood = 'happy'; sq.moodT = .8;
                if (streak === 10) {
                  rainbow = 9; sq.moodT = 2.5;
                  var sp = world(sq.u, sq.h + sq.size * .5);
                  for (var k = 0; k < 3; k++) burstBits(bits, sp.x + rnd(-30, 30), sp.y - rnd(0, 30), 16, ['#F6A6BE', '#FFE08A', '#A6E9C6', '#BFD3F7', '#C9B8F0'], 300);
                  secretCard(S, 'rollaway', 'Ten stars without falling once.');
                }
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
          rainbow = Math.max(0, rainbow - dt);
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
          if (rainbow > 0) { // the secret's rainbow, arched over the island
            var RC = ['#F6A6BE', '#FFC9A3', '#FFE08A', '#A6E9C6', '#BFD3F7', '#C9B8F0'], bw = clamp(isl.w * .035, 5, 14), r0 = isl.w * .64;
            g.save(); g.globalAlpha = Math.min(1, (9 - rainbow) / .8, rainbow / 1.2) * .85; g.lineWidth = bw;
            for (var rc = 0; rc < RC.length; rc++) { g.strokeStyle = RC[rc]; g.beginPath(); g.arc(isl.cx, isl.y + isl.th, r0 - rc * bw, Math.PI, TAU); g.stroke(); }
            g.restore();
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
          if (streak) { g.font = '700 ' + clamp(S.W / 30, 13, 18) + 'px Fredoka, sans-serif'; g.fillStyle = night ? '#FFF6E5' : PLUM; g.textAlign = 'left'; g.fillText('★ ' + streak, 16, 26); }
        },
        peek: function () { return { sq: sq, stars: stars, isl: isl, streak: function () { return streak; }, rainbow: function () { return rainbow; } }; }
      };
    }, opts);
    return t;
  }

  K.toys = { squish: squish, ember: ember, rattlecup: rattlecup, rollaway: rollaway };
})();
