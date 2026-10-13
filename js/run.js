/* KEERAE run mode.
 *
 * Loaded the first time someone presses Run, after matter.min.js (MIT, see
 * matter-LICENSE.txt). Whatever is on screen when Run is pressed plays:
 * each game does its own thing, and everything that isn't a game falls into
 * a pile you can throw around. Stop puts every element back where it was.
 *
 *   Squish n Pops      bubbles that split in two when you tap them
 *   Into Ember Depths  the bosses wake up and fire bullet patterns
 *   Rattlecup          a candle and five dice
 *   Rollaway           a ball. Not the game. Just a ball.
 */
(function () {
  'use strict';
  var K = window.KEERAE, M = window.Matter;
  if (!K || !M) return;

  var S = null; // everything that exists while running
  var TAU = Math.PI * 2;

  function rel(el, vr) {
    var r = el.getBoundingClientRect();
    return { x: r.left - vr.left, y: r.top - vr.top, w: r.width, h: r.height };
  }
  function onScreen(r, W, H) { return r.w > 1 && r.h > 1 && r.x + r.w > 0 && r.x < W && r.y + r.h > 0 && r.y < H; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var touchy = 'ontouchstart' in window;

  // =====================================================================
  // Squish n Pops. Same rules as the game: every hit splits a bubble into
  // two smaller ones, each size always bounces back to the same height, and
  // nothing ever speeds up.
  // =====================================================================
  function squish(sec, r, clip) {
    var W = S.W, floor = Math.min(S.H, r.y + r.h) - 2, top = Math.max(0, r.y);
    var span = Math.max(160, floor - top);
    var base = clamp(Math.min(W, span) * 0.075, 24, 46);
    var RAD = [0, base * 0.42, base * 0.66, base];
    var APEX = [0, span * 0.42, span * 0.58, span * 0.74];
    var VX = [0, 128, 112, 92];
    var G = 1150;
    var bubbles = [], bits = [], cleared = 0;

    function spawn() {
      bubbles.push({ x: W * 0.28, y: top + RAD[3] + 8, vx: VX[3], vy: 0, s: 3 });
      bubbles.push({ x: W * 0.72, y: top + RAD[3] + 40, vx: -VX[3], vy: 0, s: 3 });
    }
    spawn();
    K.log('run', 'Squish n Pops: tap a bubble. It splits in two.');

    function burst(b) {
      var n = 8 + b.s * 5, cols = ['#FFF6E5', '#A6E9C6', '#F6A6BE', '#4B3A5A'];
      for (var i = 0; i < n; i++) {
        var a = Math.random() * TAU, sp = rnd(120, 340);
        bits.push({ x: b.x + Math.cos(a) * RAD[b.s] * .8, y: b.y + Math.sin(a) * RAD[b.s] * .8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90, life: 1, c: cols[i % 4], r: rnd(2, 4.5) });
      }
    }
    return {
      name: 'squish',
      step: function (dt) {
        var ax = (S.gx || 0) * 700;
        for (var i = 0; i < bubbles.length; i++) {
          var b = bubbles[i], R = RAD[b.s];
          if (ax) b.vx = clamp(b.vx + ax * dt, -VX[b.s] * 2.2, VX[b.s] * 2.2);
          b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.y + R > floor) { b.y = floor - R; b.vy = -Math.sqrt(2 * G * Math.max(30, APEX[b.s] - R)); }
          if (b.x - R < 0) { b.x = R; b.vx = Math.abs(b.vx); }
          if (b.x + R > W) { b.x = W - R; b.vx = -Math.abs(b.vx); }
        }
        for (var j = bits.length - 1; j >= 0; j--) {
          var p = bits[j]; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.7;
          if (p.life <= 0) bits.splice(j, 1);
        }
      },
      tap: function (x, y) {
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i], R = RAD[b.s] + (touchy ? 10 : 4);
          if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) > R * R) continue;
          bubbles.splice(i, 1); burst(b); K.sfx('pop', b.s / 3);
          if (b.s > 1) {
            var hop = -Math.sqrt(2 * G * span * 0.16);
            bubbles.push({ x: b.x - RAD[b.s] * .3, y: b.y, vx: -VX[b.s - 1], vy: hop, s: b.s - 1 });
            bubbles.push({ x: b.x + RAD[b.s] * .3, y: b.y, vx: VX[b.s - 1], vy: hop, s: b.s - 1 });
          }
          if (!bubbles.length) {
            cleared++;
            K.log('ok', cleared === 1 ? 'Squish n Pops: cleared. In the real game that’s a win.' : 'Squish n Pops: cleared again (' + cleared + ').');
            setTimeout(function () { if (S && bubbles.length === 0) spawn(); }, 1300);
          }
          return true;
        }
        return false;
      },
      draw: function (g) {
        for (var i = 0; i < bubbles.length; i++) drawBubble(g, bubbles[i].x, bubbles[i].y, RAD[bubbles[i].s], bubbles[i].s);
        for (var j = 0; j < bits.length; j++) {
          var p = bits[j]; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c;
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
    };
  }
  // In the game's own style: cream rim, plum outline, mint or pink, a face.
  function drawBubble(g, x, y, R, s) {
    g.fillStyle = '#FFF6E5'; g.beginPath(); g.arc(x, y, R * 1.1, 0, TAU); g.fill();
    g.fillStyle = '#4B3A5A'; g.beginPath(); g.arc(x, y, R * 1.02, 0, TAU); g.fill();
    g.fillStyle = s === 1 ? '#F6A6BE' : '#A6E9C6'; g.beginPath(); g.arc(x, y, R * .93, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.72)';
    g.beginPath(); g.ellipse(x - R * .4, y - R * .42, R * .26, R * .14, -.7, 0, TAU); g.fill();
    if (R < 13) return;
    g.fillStyle = '#4B3A5A';
    g.beginPath(); g.ellipse(x - R * .28, y - R * .02, R * .11, R * .14, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x + R * .28, y - R * .02, R * .11, R * .14, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x - R * .25, y - R * .07, R * .04, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + R * .31, y - R * .07, R * .04, 0, TAU); g.fill();
    g.strokeStyle = '#4B3A5A'; g.lineWidth = Math.max(1.5, R * .06); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + R * .12, R * .16, .2 * Math.PI, .8 * Math.PI); g.stroke();
  }

  // =====================================================================
  // Into Ember Depths. The bosses on the sheet wake up and fire patterns.
  // =====================================================================
  function ember(sec, r, clip) {
    var W = S.W, H = S.H;
    var sheet = sec.querySelector('#ember-sheet');
    var sr = sheet ? rel(sheet, S.vr) : null;
    var cells = [];
    if (sr && onScreen(sr, W, H)) {
      var cw = sr.w / 11, ch = sr.h / 3;
      for (var row = 0; row < 3; row++) for (var col = 0; col < 11; col++) {
        var cx = sr.x + (col + .5) * cw, cy = sr.y + (row + .5) * ch;
        if (cx > 0 && cx < W && cy > 0 && cy < H) cells.push({ x: cx, y: cy, w: cw, h: ch });
      }
    }
    // No sheet on screen: three bosses fire in from just above the top edge.
    if (!cells.length) for (var k = 0; k < 3; k++) cells.push({ x: W * (.2 + k * .3), y: Math.max(0, clip.y) - 10, w: 0, h: 0, off: true });
    cells.sort(function () { return Math.random() - .5; });
    var em = cells.slice(0, Math.min(6, cells.length)).map(function (c, i) {
      return { c: c, t: .25 + i * .32, flash: 0, spiral: null, kind: ['ring', 'spiral', 'aim'][i % 3] };
    });
    var shots = [], COLS = ['#FF7A2F', '#FFB347', '#A06BFF', '#5FE0FF', '#FF4D6D'];
    var lastPew = 0;
    function shoot(x, y, a, sp, col) { if (shots.length < 700) shots.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 6, c: col, r: rnd(2.6, 3.8) }); }
    function fire(e, kind) {
      var c = e.c, col = COLS[Math.floor(Math.random() * COLS.length)];
      e.flash = .35;
      if (kind === 'ring') { var n = 16, off = Math.random() * TAU; for (var i = 0; i < n; i++) shoot(c.x, c.y, off + i * TAU / n, 120, col); }
      else if (kind === 'spiral') { e.spiral = { left: 22, ang: Math.random() * TAU, every: .045, acc: 0, col: col }; }
      else { var p = S.pointer || { x: W / 2, y: H * .8 }, a0 = Math.atan2(p.y - c.y, p.x - c.x); for (var j = -2; j <= 2; j++) shoot(c.x, c.y, a0 + j * .12, 210, col); }
      var now = performance.now(); if (now - lastPew > 160) { K.sfx('pew', .6); lastPew = now; }
    }
    K.log('run', 'Into Ember Depths: the bosses are awake. Click one.');
    return {
      name: 'ember',
      step: function (dt) {
        for (var i = 0; i < em.length; i++) {
          var e = em[i];
          e.t -= dt; e.flash = Math.max(0, e.flash - dt);
          if (e.t <= 0) { fire(e, e.kind); e.kind = ['ring', 'spiral', 'aim'][Math.floor(Math.random() * 3)]; e.t = rnd(1.3, 2.1); }
          if (e.spiral) {
            e.spiral.acc += dt;
            while (e.spiral.acc >= e.spiral.every && e.spiral.left > 0) {
              e.spiral.acc -= e.spiral.every; e.spiral.left--; e.spiral.ang += .42;
              shoot(e.c.x, e.c.y, e.spiral.ang, 150, e.spiral.col); shoot(e.c.x, e.c.y, e.spiral.ang + Math.PI, 150, e.spiral.col);
            }
            if (e.spiral.left <= 0) e.spiral = null;
          }
        }
        for (var j = shots.length - 1; j >= 0; j--) {
          var s = shots[j]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
          if (s.life <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) shots.splice(j, 1);
        }
      },
      tap: function (x, y) {
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i]; if (c.off) continue;
          if (Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2) {
            var e = { c: c, flash: 0 }; fire(e, 'ring'); fire(e, 'aim');
            em.forEach(function (m) { if (m.c === c) m.flash = .35; });
            return true;
          }
        }
        return false;
      },
      draw: function (g) {
        for (var i = 0; i < em.length; i++) {
          var e = em[i]; if (!e.flash || e.c.off) continue;
          g.strokeStyle = 'rgba(255,122,47,' + (e.flash * 2.4).toFixed(2) + ')'; g.lineWidth = 2;
          g.strokeRect(e.c.x - e.c.w / 2 + 3, e.c.y - e.c.h / 2 + 3, e.c.w - 6, e.c.h - 6);
        }
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
  }

  // =====================================================================
  // Rattlecup. The Vigil: a candle, and five bone dice on whatever's there.
  // =====================================================================
  function rattlecup(sec, r, clip) {
    var W = S.W, D = clamp(Math.min(W, S.H) * .05 + 10, 30, 48);
    var dice = [], settled = 0, said = false;
    var words = ['', 'one', 'two', 'three', 'four', 'five'];
    for (var i = 0; i < 5; i++) {
      var b = M.Bodies.rectangle(clamp(clip.x + clip.w * .22 + i * D * 1.5, D, W - D), Math.max(0, clip.y) - D * 1.6 - i * 26, D, D,
        { chamfer: { radius: D * .2 }, restitution: .32, friction: .45, frictionAir: .008, density: .003 });
      M.Body.setAngularVelocity(b, rnd(-.25, .25)); M.Body.setVelocity(b, { x: rnd(-2, 2), y: rnd(0, 2) });
      b.isDie = true;
      dice.push({ b: b, v: 1 + Math.floor(Math.random() * 6), flip: 0 });
    }
    M.Composite.add(S.engine.world, dice.map(function (d) { return d.b; }));
    K.log('run', 'Rattlecup: a candle and five dice. Click the dice to throw again.');
    var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

    function call() {
      var vals = dice.map(function (d) { return d.v; }), count = {}, best = 1, n = 0;
      vals.forEach(function (v) { count[v] = (count[v] || 0) + 1; });
      for (var f = 6; f >= 1; f--) if ((count[f] || 0) > n) { n = count[f]; best = f; }
      var claim = Math.min(5, n + 1);
      K.log('info', 'Rattlecup: ' + vals.join(' ') + '. ' + (n === 1 ? 'One ' + best : words[n].charAt(0).toUpperCase() + words[n].slice(1) + ' ' + best + 's') +
        ' on the table. I’d claim ' + words[claim] + '. Call it?');
    }
    return {
      name: 'rattlecup', dice: dice,
      step: function (dt) {
        var still = true;
        for (var i = 0; i < dice.length; i++) {
          var d = dice[i], moving = d.b.speed > .9 || Math.abs(d.b.angularVelocity) > .06;
          if (moving) { still = false; d.flip -= dt; if (d.flip <= 0) { d.v = 1 + Math.floor(Math.random() * 6); d.flip = .085; } }
          if (d.b.speed > .25) still = false;
        }
        settled = still ? settled + dt : 0;
        if (settled > .5 && !said) { said = true; call(); }
      },
      tap: function (x, y) {
        var hit = M.Query.point(dice.map(function (d) { return d.b; }), { x: x, y: y }).length;
        if (!hit) return false;
        dice.forEach(function (d) {
          M.Body.setVelocity(d.b, { x: rnd(-4, 4), y: rnd(-15, -10) });
          M.Body.setAngularVelocity(d.b, rnd(-.4, .4));
        });
        said = false; settled = 0; K.sfx('clack', .9);
        return true;
      },
      draw: function (g) {
        // the candle: darkness over this game, a pool of light where you are
        var c = S.pointer && S.pointer.x > clip.x && S.pointer.x < clip.x + clip.w && S.pointer.y > clip.y && S.pointer.y < clip.y + clip.h
          ? S.pointer : { x: clip.x + clip.w * .5, y: clip.y + clip.h * .55 };
        var fl = 1 + Math.sin(S.t * 13) * .03 + Math.sin(S.t * 7.3) * .025;
        g.save(); g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip();
        var grd = g.createRadialGradient(c.x, c.y, 30 * fl, c.x, c.y, 300 * fl);
        grd.addColorStop(0, 'rgba(14,10,6,0)'); grd.addColorStop(.35, 'rgba(14,10,6,.35)'); grd.addColorStop(1, 'rgba(14,10,6,.86)');
        g.fillStyle = grd; g.fillRect(clip.x, clip.y, clip.w, clip.h);
        var fy = c.y - 18, fg = g.createRadialGradient(c.x, fy, 0, c.x, fy, 26 * fl);
        fg.addColorStop(0, 'rgba(255,240,190,.95)'); fg.addColorStop(.35, 'rgba(255,170,70,.55)'); fg.addColorStop(1, 'rgba(255,140,40,0)');
        g.fillStyle = fg; g.beginPath(); g.arc(c.x, fy, 26 * fl, 0, TAU); g.fill();
        g.fillStyle = '#FFF2C4'; g.beginPath(); g.ellipse(c.x, fy, 4.2, 9 * fl, 0, 0, TAU); g.fill();
        g.restore();
        for (var i = 0; i < dice.length; i++) {
          var d = dice[i], p = d.b.position;
          g.save(); g.translate(p.x, p.y); g.rotate(d.b.angle);
          var h = D / 2, rr = D * .2;
          g.fillStyle = '#EFE5CF'; g.strokeStyle = '#C9A24F'; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(-h + rr, -h); g.arcTo(h, -h, h, h, rr); g.arcTo(h, h, -h, h, rr); g.arcTo(-h, h, -h, -h, rr); g.arcTo(-h, -h, h, -h, rr); g.closePath();
          g.fill(); g.stroke();
          g.fillStyle = '#2A1F14';
          PIPS[d.v].forEach(function (q) { g.beginPath(); g.arc(q[0] * D * .26, q[1] * D * .26, D * .085, 0, TAU); g.fill(); });
          g.restore();
        }
      }
    };
  }

  // =====================================================================
  // Rollaway. No screenshot yet, so: a ball. It is not the game.
  // =====================================================================
  function rollaway(sec, r, clip) {
    var R = clamp(Math.min(S.W, S.H) * .03 + 8, 15, 26);
    var ball = M.Bodies.circle(clamp(clip.x + R * 3, R, S.W - R), Math.max(0, clip.y) + R * 2 + 26, R,
      { restitution: .28, friction: .03, frictionStatic: .2, frictionAir: .004, density: .004 });
    ball.isBall = true;
    M.Composite.add(S.engine.world, ball);
    var grounded = 0, born = S.t;
    function jump() {
      if (S.t - grounded > .15) return;
      M.Body.setVelocity(ball, { x: ball.velocity.x, y: -11.5 });
      grounded = -1; K.sfx('thud', .5);
    }
    K.onFlick = jump;
    K.log('run', touchy ? 'Rollaway: not the game, just a ball. Tilt to roll, tap to jump.' : 'Rollaway: not the game, just a ball. Arrow keys to roll, space to jump.');
    return {
      name: 'rollaway',
      ball: ball,
      touched: function () { grounded = S.t; },
      jump: jump,
      step: function () {
        if (S.keyX) M.Body.setVelocity(ball, { x: clamp(ball.velocity.x + S.keyX * .45, -13, 13), y: ball.velocity.y });
        if (ball.position.y > S.H + 300 || ball.position.x < -300 || ball.position.x > S.W + 300) {
          M.Body.setPosition(ball, { x: clamp(clip.x + R * 3, R, S.W - R), y: Math.max(0, clip.y) + R * 2 + 26 }); M.Body.setVelocity(ball, { x: 0, y: 0 });
        }
      },
      tap: function (x, y) {
        if (x < clip.x || x > clip.x + clip.w || y < clip.y || y > clip.y + clip.h) return false;
        if (M.Query.point([ball], { x: x, y: y }).length) return false; // grab it instead
        jump(); return true;
      },
      draw: function (g) {
        var p = ball.position;
        var grd = g.createRadialGradient(p.x - R * .35, p.y - R * .38, R * .1, p.x, p.y, R);
        grd.addColorStop(0, '#E4EAF6'); grd.addColorStop(.55, '#7F8CA8'); grd.addColorStop(1, '#3B455B');
        g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.clip();
        g.translate(p.x, p.y); g.rotate(ball.angle);
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = R * .2; g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.stroke();
        g.restore();
        var age = S.t - born;
        if (age < 3.2) {
          g.globalAlpha = clamp(3.2 - age, 0, 1);
          g.font = '500 12px Martian, ui-monospace, monospace'; g.fillStyle = '#15141B'; g.textAlign = 'center';
          g.fillText('just a ball', p.x, p.y - R - 10);
          g.globalAlpha = 1; g.textAlign = 'start';
        }
      }
    };
  }

  var GAMES = { squish: squish, ember: ember, rattlecup: rattlecup, rollaway: rollaway };

  // =====================================================================
  // start and stop
  // =====================================================================
  function start() {
    if (S) return;
    var view = K.view, vr = view.getBoundingClientRect();
    var W = view.clientWidth, H = view.clientHeight;
    var cv = document.getElementById('fx');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.left = vr.left + 'px'; cv.style.top = vr.top + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);

    var engine = M.Engine.create();
    S = { view: view, vr: vr, W: W, H: H, cv: cv, g: g, engine: engine, pile: [], plats: [], games: [], raf: 0, acc: 0, t: 0,
          last: performance.now(), frames: 0, fpsT: performance.now(), keyX: 0, gx: 0, off: [] };
    K.setRunning(true);
    document.documentElement.classList.remove('show-tree', 'show-insp');

    var T = 400;
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, { isStatic: true, friction: .8 }),
      M.Bodies.rectangle(-T / 2, H / 2 - H, T, H * 4, { isStatic: true }),
      M.Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 4, { isStatic: true }),
      M.Bodies.rectangle(W / 2, -H * 2.2, W + T * 2, T, { isStatic: true })
    ]);

    // Games on screen: their content becomes solid ground, and each one wakes up.
    [].forEach.call(document.querySelectorAll('[data-game]'), function (sec) {
      var r = rel(sec, vr); if (!onScreen(r, W, H)) return;
      var clip = { x: Math.max(0, r.x), y: Math.max(0, r.y) };
      clip.w = Math.min(W, r.x + r.w) - clip.x; clip.h = Math.min(H, r.y + r.h) - clip.y;
      [].forEach.call(sec.querySelectorAll('.plat'), function (el) {
        // Ground only counts if its top edge is on screen, so things dropping in land where you can see them.
        var p = rel(el, vr); if (!onScreen(p, W, H) || p.y < -2) return;
        S.plats.push(M.Bodies.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, { isStatic: true, friction: .7, restitution: .05 }));
      });
      var make = GAMES[sec.getAttribute('data-game')];
      if (make) S.games.push(make(sec, r, clip));
    });
    M.Composite.add(engine.world, S.plats);

    // Everything else falls.
    [].forEach.call(document.querySelectorAll('#scene .phys'), function (el) {
      if (el.parentElement.closest('.phys') || el.closest('[data-game]')) return;
      var p = rel(el, vr); if (!onScreen(p, W, H)) return;
      var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      var b = M.Bodies.rectangle(cx, cy, p.w, p.h, { restitution: .22, friction: .5, frictionAir: .012, density: .0012, chamfer: { radius: Math.min(8, p.h / 3, p.w / 3) } });
      b.el = el; b.x0 = cx; b.y0 = cy;
      M.Body.setAngularVelocity(b, rnd(-.015, .015));
      S.pile.push(b);
    });
    M.Composite.add(engine.world, S.pile);

    // Drag anything that moves.
    S.mouse = M.Mouse.create(view);
    S.mc = M.MouseConstraint.create(engine, { mouse: S.mouse, constraint: { stiffness: .18, render: { visible: false } } });
    M.Composite.add(engine.world, S.mc);

    // Taps a game wants (popping a bubble, waking a boss) are claimed before a drag starts.
    function at(e) {
      var t = e.changedTouches ? e.changedTouches[0] : e;
      return { x: t.clientX - vr.left, y: t.clientY - vr.top };
    }
    function claim(e) {
      var p = at(e); S.pointer = p;
      for (var i = 0; i < S.games.length; i++) {
        if (S.games[i].tap && S.games[i].tap(p.x, p.y)) { e.stopImmediatePropagation(); if (e.cancelable && e.type === 'touchstart') e.preventDefault(); return; }
      }
    }
    function move(e) { S.pointer = at(e); }
    function eat(e) { e.preventDefault(); e.stopPropagation(); } // no links firing mid-throw
    function key(e) {
      var down = e.type === 'keydown';
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        S.keyX = down ? (e.key === 'ArrowLeft' ? -1 : 1) : 0;
        S.gx = S.keyX * .8;
      }
      if (down && (e.key === ' ' || e.key === 'ArrowUp')) {
        e.preventDefault();
        S.games.forEach(function (gm) { if (gm.jump) gm.jump(); });
      }
    }
    function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); S.off.push(function () { t.removeEventListener(type, fn, opt); }); }
    on(view, 'mousedown', claim, true);
    on(view, 'touchstart', claim, { capture: true, passive: false });
    on(view, 'pointermove', move, { passive: true });
    on(view, 'click', eat, true);
    on(window, 'keydown', key); on(window, 'keyup', key);
    // Phones fire resize when the toolbar slides, so only a real change of shape stops the run.
    on(window, 'resize', function () { if (Math.abs(view.clientWidth - W) > 2 || Math.abs(view.clientHeight - H) > 140) stop(); });

    // Landings make noise, if sound is on.
    var lastThud = 0;
    M.Events.on(engine, 'collisionStart', function (ev) {
      var now = performance.now();
      for (var i = 0; i < ev.pairs.length; i++) {
        var a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
        var rb = S.games.filter(function (gm) { return gm.ball && (gm.ball === a || gm.ball === b); })[0];
        if (rb) rb.touched();
        var v = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        if (v > 3.5 && now - lastThud > 70) { lastThud = now; K.sfx(a.isDie || b.isDie ? 'clack' : 'thud', v / 14); }
      }
    });
    M.Events.on(engine, 'collisionActive', function (ev) {
      for (var i = 0; i < ev.pairs.length; i++) {
        var a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
        S.games.forEach(function (gm) { if (gm.ball && (gm.ball === a || gm.ball === b)) gm.touched(); });
      }
    });

    var names = S.games.map(function (gm) { return gm.name; });
    if (!S.pile.length && !S.games.length) K.log('warn', 'run: nothing on screen to run. Scroll somewhere and try again.');
    else K.log('run', 'run: ' + S.pile.length + ' things falling' + (names.length ? ', ' + names.length + (names.length === 1 ? ' game' : ' games') + ' awake' : '') + '. Stop or Esc puts it all back.');
    S.raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!S) return;
    var dt = Math.min(50, now - S.last); S.last = now;
    var tilt = K.tilt && K.tilt.on;
    S.engine.gravity.x = tilt ? K.tilt.x * 1.1 : S.gx;
    S.engine.gravity.y = tilt ? K.tilt.y * 1.1 : 1;
    if (tilt) S.gx = K.tilt.x;
    S.acc += dt;
    var n = 0;
    while (S.acc >= 16.667 && n < 4) {
      M.Engine.update(S.engine, 16.667);
      S.t += 1 / 60;
      for (var i = 0; i < S.games.length; i++) S.games[i].step(1 / 60);
      S.acc -= 16.667; n++;
    }
    if (n === 4) S.acc = 0;
    for (var j = 0; j < S.pile.length; j++) {
      var b = S.pile[j];
      b.el.style.transform = 'translate(' + (b.position.x - b.x0).toFixed(1) + 'px,' + (b.position.y - b.y0).toFixed(1) + 'px) rotate(' + b.angle.toFixed(3) + 'rad)';
    }
    var g = S.g; g.clearRect(0, 0, S.W, S.H);
    for (var k = 0; k < S.games.length; k++) S.games[k].draw(g);
    S.frames++;
    if (now - S.fpsT > 500) { K.fps(Math.round(S.frames * 1000 / (now - S.fpsT)) + ' fps'); S.frames = 0; S.fpsT = now; }
    S.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!S) return;
    var s = S; S = null;
    cancelAnimationFrame(s.raf);
    s.off.forEach(function (f) { f(); });
    var m = s.mouse, v = s.view;
    v.removeEventListener('mousemove', m.mousemove); v.removeEventListener('mousedown', m.mousedown); v.removeEventListener('mouseup', m.mouseup);
    v.removeEventListener('wheel', m.mousewheel); v.removeEventListener('touchmove', m.mousemove); v.removeEventListener('touchstart', m.mousedown); v.removeEventListener('touchend', m.mouseup);
    M.Events.off(s.engine); M.Composite.clear(s.engine.world, false); M.Engine.clear(s.engine);
    K.onFlick = null;
    s.pile.forEach(function (b) { b.el.style.transition = K.reduce ? 'none' : 'transform .7s cubic-bezier(.2,.9,.25,1.12)'; b.el.style.transform = ''; });
    setTimeout(function () { s.pile.forEach(function (b) { b.el.style.transition = ''; b.el.style.transform = ''; }); }, 760);
    s.g.clearRect(0, 0, s.W, s.H);
    K.setRunning(false);
    K.log('ok', 'stop: scene restored. Nothing was harmed.');
  }

  window.KEERAE_RUN = { start: start, stop: stop, state: function () { return S; } };
})();
