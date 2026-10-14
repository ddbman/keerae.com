/* KEERAE: the shared parts of the page.
   Load in <head>, before the body paints: it sets data-mode and data-time on <html>.
   No network, no trackers. Everything it needs sits next to it. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var K = window.KIT = {};

  // ------------------------------------------------------------ basics
  K.$ = function (s, el) { return (el || doc).querySelector(s); };
  K.$$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  K.rnd = function (a, b) { return a + Math.random() * (b - a); };
  K.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  K.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  K.lerp = function (a, b, t) { return a + (b - a) * t; };
  K.ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  K.on = function (el, type, fn, opt) { el.addEventListener(type, fn, opt); return function () { el.removeEventListener(type, fn, opt); }; };
  K.emit = function (name, detail) { doc.dispatchEvent(new CustomEvent(name, { detail: detail })); };
  K.ready = function (fn) { if (doc.readyState !== 'loading') fn(); else doc.addEventListener('DOMContentLoaded', fn); };
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  K.reduce = !!(mq && mq.matches);
  K.touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  K.small = function () { return window.innerWidth < 640; };
  function store(kind, key, val) {
    try { var s = kind === 'local' ? localStorage : sessionStorage; if (val === undefined) return s.getItem(key); if (val === null) s.removeItem(key); else s.setItem(key, val); } catch (e) {}
    return null;
  }

  // ------------------------------------------------------------ content
  K.HEADLINE = 'I make games, or at least I try :D';
  K.EMAIL = 'eric@keerae.com';
  K.GAMES = [
    { id: 'squish', name: 'Squish n Pops', kind: 'Bubble-splitting arcade, right in your phone browser',
      status: '<b>The free demo’s out.</b> Ten levels on itch.io, and the rest of the 400 are on the way.', statusText: 'The free demo’s out. Ten levels on itch.io, and the rest of the 400 are on the way.',
      short: 'Free demo', hint: 'Tap a bubble. It splits in two.', color: '#A6E9C6', deep: '#171A2E',
      link: 'https://misterdinguz.itch.io/squish-n-pops', linkText: 'Play the real demo on itch.io' },
    { id: 'ember', name: 'Into Ember Depths', kind: 'Online bullet-hell action RPG',
      status: '<b>In development.</b> Desktop and browser.', statusText: 'In development. Desktop and browser.',
      short: 'In development', hint: 'The bosses wake up. Click one.', color: '#FFB37A', deep: '#0A0812' },
    { id: 'rattlecup', name: 'Rattlecup', kind: 'Liar’s dice roguelike for phones',
      status: '<b>Vertical slice,</b> building for iOS and Android. Working title.', statusText: 'Vertical slice, building for iOS and Android. Working title.',
      short: 'Vertical slice', hint: 'A candle and five dice. Tap them to throw again.', color: '#E9C46A', deep: '#0E0A06' },
    { id: 'rollaway', name: 'Rollaway', kind: '3D tilt platformer for phones',
      status: '<b>Running on real phones.</b> The art just landed. Working title.', statusText: 'Running on real phones. The art just landed. Working title.',
      short: 'Builds running', hint: 'Tilt, or use the arrow keys. Tap Squish to hop.', color: '#9FD98A', deep: '#7D6BC9' }
  ];
  K.game = function (id) { for (var i = 0; i < K.GAMES.length; i++) if (K.GAMES[i].id === id) return K.GAMES[i]; return null; };
  K.SEALED = [
    { id: 'u5', name: 'Untitled 5', why: 'Only just started. Nothing worth showing yet.' },
    { id: 'u6', name: 'Untitled 6', why: 'Same. Ask me in a few months.' },
    { id: 'u7', name: 'Untitled 7', why: 'Barely has a name. Untitled 7 is generous.' }
  ];

  // ------------------------------------------------------- time of day
  // The world follows the visitor's own clock: pastel by day, starry from 7:30 in the evening.
  // ?t=day or ?t=night pins it, which is handy for checking both.
  var pinned = /[?&]t=(day|night)\b/.exec(location.search);
  function clockTime() { var d = new Date(), h = d.getHours() + d.getMinutes() / 60; return (h >= 19.5 || h < 6.5) ? 'night' : 'day'; }
  K.time = pinned ? pinned[1] : clockTime();
  K.night = K.time === 'night';
  root.setAttribute('data-time', K.time);
  K.setTime = function (t) {
    K.time = t; K.night = t === 'night'; root.setAttribute('data-time', t); K.emit('k:time', t);
  };
  // If the page stays open across dusk or dawn, the sky changes with it.
  if (!pinned) setInterval(function () { var t = clockTime(); if (t !== K.time) K.setTime(t); }, 60000);

  // -------------------------------------------------------------- mode
  K.mode = store('local', 'keerae-mode') === 'normal' ? 'normal' : 'weird';
  root.setAttribute('data-mode', K.mode);
  root.className = root.className.replace(/\bno-js\b/, 'js');
  K.setMode = function (m) {
    K.mode = m; root.setAttribute('data-mode', m);
    store('local', 'keerae-mode', m === 'normal' ? 'normal' : null);
    K.stopToy(); window.scrollTo(0, 0); K.emit('k:mode', m);
    var target = m === 'normal' ? K.$('#normal h1') : K.$('.world [data-k-start]') || K.$('.world h1');
    if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  };

  // ------------------------------------------------------------- sound
  // Off until someone switches it on. Tiny synth, no files.
  K.sound = { on: store('session', 'keerae-sound') === 'on' };
  var AC = null, master = null;
  function actx() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = .2; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(type, f0, f1, dur, vol, delay, vib) {
    var c = AC, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    if (vib) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f0 * .04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  var noiseBuf = null;
  function noise(dur, vol, f0, f1, q, delay) {
    var c = AC, t = c.currentTime + (delay || 0);
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
  }
  var SFX = {
    pop: function (a) { tone('sine', 760 + a * 420, 160, .13, .55); noise(.05, .22, 3200, 1400, 1.2); },
    boing: function () { tone('sine', 190, 470, .32, .4, 0, 11); },
    clack: function (a) { noise(.045, .45 + a * .2, 2600 + Math.random() * 900, 900, 5); },
    pew: function () { tone('triangle', 980, 240, .14, .16); },
    yawn: function () { tone('sine', 470, 230, 1.05, .22, 0, 6); tone('sine', 700, 340, 1.0, .06, .02, 6); },
    chime: function () { tone('sine', 1318, 1318, .3, .22); tone('sine', 1760, 1760, .36, .18, .09); },
    whoosh: function () { noise(.7, .35, 300, 2600, .7); },
    blip: function () { tone('sine', 620, 760, .07, .22); },
    sneeze: function () { tone('sine', 300, 620, .45, .18, 0, 4); noise(.38, .7, 3200, 500, .6, .48); tone('sine', 520, 140, .25, .3, .48); },
    hum: function () { tone('sine', 392, 392, .5, .12); tone('sine', 494, 494, .5, .1, .12); }
  };
  K.sfx = function (name, a) {
    if (!K.sound.on || !SFX[name]) return;
    if (!actx()) return;
    try { SFX[name](a || 0); } catch (e) {}
  };

  // -------------------------------------------------------------- tilt
  // iOS only hands over the sensors if asked from inside a real tap.
  K.tilt = { x: 0, y: 0, live: false };
  var tiltBound = false;
  function onOrient(e) {
    if (e.gamma == null) return;
    var ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    var gx = e.gamma, gy = e.beta;
    if (ang === 90) { gx = e.beta; gy = -e.gamma; } else if (ang === -90 || ang === 270) { gx = -e.beta; gy = e.gamma; }
    K.tilt.x = K.clamp(gx / 28, -1, 1); K.tilt.y = K.clamp(gy / 28, -1, 1); K.tilt.live = true;
  }
  K.askTilt = function () {
    if (tiltBound) return;
    var D = window.DeviceOrientationEvent;
    if (!D) return;
    if (typeof D.requestPermission === 'function') {
      try { D.requestPermission().then(function (r) { if (r === 'granted' && !tiltBound) { tiltBound = true; window.addEventListener('deviceorientation', onOrient); } }).catch(function () {}); } catch (e) {}
    } else if (K.touch) { tiltBound = true; window.addEventListener('deviceorientation', onOrient); }
  };

  // ------------------------------------------------------------ images
  var imgs = {};
  K.img = function (name) {
    if (!imgs[name]) { var im = new Image(); im.decoding = 'async'; im.src = (window.KIT_ASSETS && window.KIT_ASSETS[name]) || ('img/' + name); imgs[name] = im; }
    return imgs[name];
  };

  // ---------------------------------------------------------- Squish
  // The marshmallow from Squish n Pops and Rollaway, drawn to match the game art.
  // Moods: awake, drowsy, asleep, happy, yawn, surprised, dizzy.
  var SQ = '' +
    '<ellipse class="sq-shadow" cx="60" cy="126" rx="38" ry="4.5" fill="rgba(51,38,63,.2)"/>' +
    '<g class="sq-body-g">' +
      '<path d="M16 58C16 27 35 9 60 9S104 27 104 58V106C104 116 97 122 87 122H33C23 122 16 116 16 106Z" fill="#FFF6E5"/>' +
      '<path d="M86 16C97 26 104 41 104 58V106C104 116 97 122 87 122H79C88 117 93 109 93 99V58C93 41 91 27 86 16Z" fill="#E7DDF4"/>' +
      '<path d="M29 43C30 30 40 20 53 17" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="33" cy="80" rx="7" ry="4" fill="#F6A6BE" opacity=".9"/><ellipse cx="87" cy="80" rx="7" ry="4" fill="#F6A6BE" opacity=".9"/>' +
      '<g class="sq-face" stroke-linecap="round" stroke-linejoin="round">' +
        '<g class="sq-awake"><g class="sq-blink"><g class="sq-pupils">' +
          '<ellipse cx="45" cy="66" rx="7" ry="9.5" fill="#4B3A5A"/><ellipse cx="75" cy="66" rx="7" ry="9.5" fill="#4B3A5A"/>' +
          '<circle cx="42.4" cy="62" r="2.9" fill="#fff"/><circle cx="72.4" cy="62" r="2.9" fill="#fff"/>' +
          '<circle cx="47.6" cy="70.3" r="1.2" fill="#fff"/><circle cx="77.6" cy="70.3" r="1.2" fill="#fff"/>' +
        '</g></g><path d="M55 80Q60 85.5 65 80" stroke="#4B3A5A" stroke-width="3" fill="none"/></g>' +
        '<g class="sq-drowsy"><g class="sq-blink">' +
          '<ellipse cx="45" cy="68" rx="7" ry="8" fill="#4B3A5A"/><ellipse cx="75" cy="68" rx="7" ry="8" fill="#4B3A5A"/>' +
          '<circle cx="42.8" cy="72.6" r="1.6" fill="#fff"/><circle cx="72.8" cy="72.6" r="1.6" fill="#fff"/>' +
          '<path d="M36 58H54V69.5Q45 72.5 36 69.5Z" fill="#FFF6E5"/><path d="M66 58H84V69.5Q75 72.5 66 69.5Z" fill="#FFF6E5"/>' +
          '<path d="M37 69.6Q45 72.6 53 69.6M67 69.6Q75 72.6 83 69.6" stroke="#4B3A5A" stroke-width="3" fill="none"/>' +
        '</g><ellipse cx="60" cy="83.2" rx="2.5" ry="2.9" fill="#7A4A5E"/></g>' +
        '<g class="sq-asleep">' +
          '<path d="M38 67Q45 72.5 52 67M68 67Q75 72.5 82 67" stroke="#4B3A5A" stroke-width="3.2" fill="none"/>' +
          '<ellipse cx="59" cy="82.5" rx="2.4" ry="2.8" fill="#7A4A5E"/>' +
          '<g class="sq-nose"><circle cx="71" cy="85" r="8.5" fill="rgba(206,236,255,.62)" stroke="#4B3A5A" stroke-width="1.6"/><circle cx="68" cy="82" r="1.9" fill="#fff"/></g>' +
        '</g>' +
        '<g class="sq-happy"><path d="M38 69Q45 61 52 69M68 69Q75 61 82 69" stroke="#4B3A5A" stroke-width="3.2" fill="none"/>' +
          '<path d="M53.5 79Q60 90 66.5 79Z" fill="#7A4A5E" stroke="#4B3A5A" stroke-width="2.4"/></g>' +
        '<g class="sq-yawn"><path d="M39 62.5L49.5 67L39 71.5M81 62.5L70.5 67L81 71.5" stroke="#4B3A5A" stroke-width="3" fill="none"/>' +
          '<ellipse cx="60" cy="86" rx="6.2" ry="8" fill="#7A4A5E" stroke="#4B3A5A" stroke-width="2.4"/><ellipse cx="60" cy="90.5" rx="3.6" ry="2.4" fill="#F6A6BE"/></g>' +
        '<g class="sq-surprised"><g class="sq-pupils">' +
          '<ellipse cx="45" cy="65" rx="8" ry="10.5" fill="#4B3A5A"/><ellipse cx="75" cy="65" rx="8" ry="10.5" fill="#4B3A5A"/>' +
          '<circle cx="42" cy="60.5" r="3.4" fill="#fff"/><circle cx="72" cy="60.5" r="3.4" fill="#fff"/>' +
          '<circle cx="48.2" cy="70.6" r="1.4" fill="#fff"/><circle cx="78.2" cy="70.6" r="1.4" fill="#fff"/>' +
        '</g><ellipse cx="60" cy="84.5" rx="3.4" ry="4" fill="#7A4A5E" stroke="#4B3A5A" stroke-width="2"/></g>' +
        '<g class="sq-dizzy"><path d="M40 61L50 71M50 61L40 71M70 61L80 71M80 61L70 71" stroke="#4B3A5A" stroke-width="3" fill="none"/>' +
          '<path d="M51 84Q55.5 79.5 60 84T69 84" stroke="#4B3A5A" stroke-width="2.8" fill="none"/></g>' +
      '</g>' +
      '<path d="M16 58C16 27 35 9 60 9S104 27 104 58V106C104 116 97 122 87 122H33C23 122 16 116 16 106Z" fill="none" stroke="#4B3A5A" stroke-width="5" stroke-linejoin="round"/>' +
    '</g>' +
    '<g class="sq-zs" fill="currentColor" font-family="DynaPuff, Fredoka, sans-serif" font-weight="700">' +
      '<text class="sq-z sq-z1" x="98" y="34" font-size="17">z</text><text class="sq-z sq-z2" x="98" y="34" font-size="13">z</text><text class="sq-z sq-z3" x="98" y="34" font-size="10">z</text>' +
    '</g>';
  var POKE_DAY = ['Mm? I was resting my eyes.', 'Oh! Hi. I was totally awake.', 'Five more minutes…', 'I was dreaming about bubbles.', 'Is it lunch? It feels like lunch.', 'Boop. Okay. Back to sleep.'];
  var POKE_NIGHT = ['It’s the middle of the night…', 'Shh. The stars are sleeping too.', 'Zzz… huh? Oh. Hi.', 'Come back in the morning.', 'I was having the nicest dream.'];
  K.squish = function (opts) {
    opts = opts || {};
    var ns = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 132');
    svg.setAttribute('class', 'k-squish breathe' + (opts.cls ? ' ' + opts.cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = SQ;
    var cur = '', timers = [], alive = true, busy = false;
    var me = { el: svg };
    function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); if (alive) fn(); }, ms); timers.push(t); return t; }
    function clear() { timers.forEach(clearTimeout); timers = []; }
    me.mood = function (m) {
      if (cur) svg.classList.remove('m-' + cur);
      cur = m; svg.classList.add('m-' + m); svg.classList.toggle('asleep', m === 'asleep');
      return me;
    };
    me.base = function () { return opts.base ? opts.base() : (K.night ? 'asleep' : 'drowsy'); };
    // Idle life: by day it dozes off and nods; at night it is properly asleep.
    function idle() {
      if (!alive || busy) return;
      var b = me.base();
      me.mood(b);
      if (b === 'asleep') { later(idle, K.rnd(6000, 9000)); return; }
      var roll = Math.random();
      if (roll < .3) { me.mood('asleep'); later(function () { me.mood('yawn'); later(idle, 1200); }, K.rnd(5000, 9000)); }
      else if (roll < .55) { svg.classList.remove('nod'); void svg.getBBox; svg.classList.add('nod'); later(function () { svg.classList.remove('nod'); idle(); }, 2300); }
      else if (roll < .7) { me.mood('yawn'); K.sfx('yawn'); later(idle, 1300); }
      else later(idle, K.rnd(3000, 6000));
    }
    me.poke = function (sayAt) {
      clear(); busy = true;
      svg.classList.remove('poked'); void svg.getBoundingClientRect(); svg.classList.add('poked');
      me.mood('surprised'); K.sfx('boing');
      var line = opts.lines ? opts.lines() : K.pick(K.night ? POKE_NIGHT : POKE_DAY);
      if (sayAt !== false && line) K.say(sayAt || svg, line);
      later(function () { svg.classList.remove('poked'); me.mood(K.night ? 'drowsy' : 'awake'); }, 700);
      later(function () { me.mood('yawn'); K.sfx('yawn'); }, 2900);
      later(function () { busy = false; idle(); }, 4200);
      if (opts.onPoke) opts.onPoke(line);
      return me;
    };
    me.hold = function (m) { clear(); busy = true; me.mood(m); return me; };
    me.release = function () { busy = false; clear(); idle(); return me; };
    me.look = function (cx, cy) {
      var r = svg.getBoundingClientRect(); if (!r.width) return;
      var dx = K.clamp((cx - (r.left + r.width / 2)) / 260, -1, 1), dy = K.clamp((cy - (r.top + r.height * .5)) / 260, -1, 1);
      K.$$('.sq-pupils', svg).forEach(function (p) { p.setAttribute('transform', 'translate(' + (dx * 2.6).toFixed(2) + ' ' + (dy * 2).toFixed(2) + ')'); });
    };
    me.destroy = function () { alive = false; clear(); };
    if (opts.pokeable) {
      svg.setAttribute('role', 'button'); svg.setAttribute('tabindex', '0'); svg.removeAttribute('aria-hidden');
      svg.setAttribute('aria-label', opts.label || 'Squish the marshmallow. Poke it.');
      svg.style.cursor = 'pointer';
      svg.addEventListener('click', function (e) { e.stopPropagation(); me.poke(); });
      svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); me.poke(); } });
    }
    if (opts.follow) doc.addEventListener('pointermove', function (e) { if (cur === 'awake' || cur === 'surprised') me.look(e.clientX, e.clientY); }, { passive: true });
    me.mood(opts.mood || me.base());
    if (opts.idle !== false) later(idle, K.rnd(2500, 5000));
    doc.addEventListener('k:time', function () { if (!busy) { clear(); idle(); } });
    return me;
  };

  // ---------------------------------------------------- speech bubbles
  // K.say(target, text, {small, ms, parent}) floats a bubble above an element.
  K.say = function (target, text, o) {
    o = o || {};
    if (target._kSay) { target._kSay.remove(); clearTimeout(target._kSayT); }
    var b = doc.createElement('div'); b.className = 'k-say'; b.setAttribute('role', 'status');
    b.textContent = text;
    if (o.small) { var s = doc.createElement('small'); s.textContent = o.small; b.appendChild(s); }
    var parent = o.parent || doc.body; parent.appendChild(b);
    var r = target.getBoundingClientRect(), pr = parent === doc.body ? { left: -window.scrollX, top: -window.scrollY } : parent.getBoundingClientRect();
    var w = b.offsetWidth, h = b.offsetHeight;
    var pw = parent === doc.body ? doc.documentElement.clientWidth : parent.clientWidth;
    var x = r.left + r.width / 2 - pr.left - w / 2, y = r.top - pr.top - h - 14 + (o.dy || 0);
    var cx = K.clamp(x, 8, Math.max(8, pw - w - 8));
    b.style.left = cx + 'px'; b.style.top = Math.max(4, y) + 'px';
    b.style.setProperty('--tail', K.clamp(r.left + r.width / 2 - pr.left - cx, 18, w - 18) + 'px');
    target._kSay = b;
    target._kSayT = setTimeout(function () { b.classList.add('k-out'); setTimeout(function () { b.remove(); if (target._kSay === b) target._kSay = null; }, 260); }, o.ms || 2800);
    return b;
  };

  // ------------------------------------------------------ not yet games
  K.notYet = function (el, sealed, o) {
    el.classList.remove('k-wiggle'); void el.offsetWidth; el.classList.add('k-wiggle');
    K.sfx('blip');
    K.say(el, 'Not yet.', Object.assign({ small: sealed.name + '. ' + sealed.why }, o || {}));
  };
  K.bindSealed = function (el, i, o) {
    var s = K.SEALED[i];
    el.classList.add('k-sealed-btn');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', s.name + ', not ready yet');
    el.addEventListener('click', function (e) { e.stopPropagation(); K.notYet(el, s, o); });
  };

  // ------------------------------------------------------- controls
  K.controls = function (o) {
    o = o || {};
    var box = doc.createElement('div'); box.className = 'k-controls';
    box.innerHTML =
      '<button class="k-normal" type="button" data-k-normal><span class="k-track" aria-hidden="true"><span class="k-knob"></span></span>Make it normal</button>' +
      '<button class="k-sound" type="button" aria-pressed="' + K.sound.on + '"><svg viewBox="0 0 34 34" aria-hidden="true">' +
        '<path d="M5 22C5 12 10 6 17 6S29 12 29 22C29 27 25 30 17 30S5 27 5 22Z" fill="#FFF6E5" stroke="#4B3A5A" stroke-width="2.4"/>' +
        '<ellipse cx="9.5" cy="22" rx="2.6" ry="1.6" fill="#F6A6BE"/><ellipse cx="24.5" cy="22" rx="2.6" ry="1.6" fill="#F6A6BE"/>' +
        '<g class="k-s-off" stroke="#4B3A5A" stroke-width="2" stroke-linecap="round" fill="none"><path d="M10.5 18.5Q13 20.5 15.5 18.5M18.5 18.5Q21 20.5 23.5 18.5"/><path d="M15.5 24.5H18.5"/>' +
          '<text class="k-zz" x="25" y="9" font-size="9" font-family="DynaPuff, sans-serif" font-weight="700" fill="#4B3A5A" stroke="none">z</text></g>' +
        '<g class="k-s-on"><ellipse cx="13" cy="18.5" rx="1.9" ry="2.5" fill="#4B3A5A"/><ellipse cx="21" cy="18.5" rx="1.9" ry="2.5" fill="#4B3A5A"/>' +
          '<ellipse cx="17" cy="24.5" rx="2.4" ry="2.8" fill="#7A4A5E" stroke="#4B3A5A" stroke-width="1.4"/>' +
          '<g class="k-note" fill="#4B3A5A"><circle cx="28" cy="10" r="2.2"/><path d="M29.6 10V2.5" stroke="#4B3A5A" stroke-width="1.6"/></g>' +
          '<g class="k-note" fill="#4B3A5A"><circle cx="3.5" cy="11" r="1.8"/><path d="M4.9 11V4.5" stroke="#4B3A5A" stroke-width="1.4"/></g></g>' +
      '</svg><span class="k-label">' + (K.sound.on ? 'Sound on' : 'Sound off') + '</span></button>';
    (o.parent || doc.body).appendChild(box);
    var nb = box.querySelector('.k-normal'), sb = box.querySelector('.k-sound'), lab = sb.querySelector('.k-label');
    sb.setAttribute('aria-label', 'Sound');
    nb.addEventListener('click', function () { K.setMode('normal'); });
    sb.addEventListener('click', function () {
      K.sound.on = !K.sound.on; store('session', 'keerae-sound', K.sound.on ? 'on' : null);
      sb.setAttribute('aria-pressed', String(K.sound.on)); lab.textContent = K.sound.on ? 'Sound on' : 'Sound off';
      if (K.sound.on) { actx(); K.sfx('chime'); }
    });
    return box;
  };

  // ------------------------------------------------------ Play buttons
  var PLAY_SVG = '<svg class="k-play-ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.6C6 2.8 6.9 2.3 7.6 2.8L16.4 9.2C17 9.6 17 10.4 16.4 10.8L7.6 17.2C6.9 17.7 6 17.2 6 16.4Z" fill="currentColor"/></svg>' +
                 '<svg class="k-stop-ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="4.5" width="11" height="11" rx="3" fill="currentColor"/></svg>';
  K.makePlay = function (id, cls) {
    var g = K.game(id), b = doc.createElement('button');
    b.type = 'button'; b.className = 'k-play' + (cls ? ' ' + cls : '');
    b.style.setProperty('--c', g.color);
    b.setAttribute('aria-pressed', 'false'); b.setAttribute('data-game', id);
    b.setAttribute('aria-label', 'Play the ' + g.name + ' toy');
    b.innerHTML = PLAY_SVG + '<span class="k-play-label">Play</span>';
    return b;
  };
  var running = null; // { btn, host, toy, id, opts }
  K.stopToy = function () {
    if (!running) return;
    var r = running; running = null;
    try { r.toy.stop(); } catch (e) {}
    if (r.btn) {
      r.btn.setAttribute('aria-pressed', 'false');
      r.btn.querySelector('.k-play-label').textContent = 'Play';
      r.btn.setAttribute('aria-label', 'Play the ' + K.game(r.id).name + ' toy');
    }
    r.host.classList.remove('k-toy-on');
    if (r.opts.onStop) r.opts.onStop();
    K.emit('k:toy', { id: r.id, on: false, host: r.host });
  };
  K.startToy = function (id, host, btn, opts) {
    opts = opts || {};
    if (id === 'rollaway') K.askTilt();
    K.stopToy();
    if (!K.toys || !K.toys[id]) return;
    host.classList.add('k-toy', 'k-toy-on');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var toy = K.toys[id](host, opts);
    running = { btn: btn, host: host, toy: toy, id: id, opts: opts };
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('.k-play-label').textContent = 'Stop';
      btn.setAttribute('aria-label', 'Stop the ' + K.game(id).name + ' toy');
      btn.classList.remove('k-squashed'); void btn.offsetWidth; btn.classList.add('k-squashed');
      setTimeout(function () { btn.classList.remove('k-squashed'); }, 120);
    }
    K.sfx('boing');
    if (opts.onStart) opts.onStart(toy);
    K.emit('k:toy', { id: id, on: true, host: host });
    return toy;
  };
  // Binds a Play button to a host element the toy will fill. host can be a function returning one.
  K.bindPlay = function (btn, id, host, opts) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (running && running.btn === btn) { K.stopToy(); return; }
      K.startToy(id, typeof host === 'function' ? host() : host, btn, opts);
    });
  };
  K.running = function () { return running; };
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && running) K.stopToy(); });


  // --------------------------------------------------- normal mode
  K.ready(function () {
    var n = K.$('#normal'); if (!n) return;
    var back = K.$('.n-weird', n);
    if (back) back.addEventListener('click', function () { K.setMode('weird'); });
    K.$$('.n-sealed button', n).forEach(function (b, i) { K.bindSealed(b, i); });
    var host = K.$('.n-squish', n);
    if (host) { var s = K.squish({ pokeable: true, follow: true }); host.appendChild(s.el); }
    var y = K.$('#n-year', n); if (y) y.textContent = new Date().getFullYear();
    // One track at a time, and nothing starts on its own.
    var audio = null, cur = null;
    K.$$('.n-track button', n).forEach(function (b) {
      b.addEventListener('click', function () {
        if (cur === b) { audio.pause(); return; }
        if (audio) audio.pause();
        audio = new Audio(b.getAttribute('data-src')); cur = b;
        K.$$('.n-track button', n).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        audio.addEventListener('pause', function () { if (cur === b) { b.setAttribute('aria-pressed', 'false'); cur = null; } });
        audio.addEventListener('ended', function () { b.setAttribute('aria-pressed', 'false'); cur = null; });
        audio.play().catch(function () { b.setAttribute('aria-pressed', 'false'); cur = null; });
      });
    });
    doc.addEventListener('k:mode', function (e) { if (e.detail !== 'normal' && audio) audio.pause(); });
  });

  // Pause everything when the tab is hidden.
  doc.addEventListener('visibilitychange', function () { K.hidden = doc.hidden; });
})();
