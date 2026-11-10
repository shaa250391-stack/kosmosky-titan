/* Логика и движение сайта: перенесены из concepts/d.html при фиксации. */
(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);
  const params = new URLSearchParams(location.search);
  const isStatic = params.has('static');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motionOn = !isStatic && !reduce && hasGsap;
  if (motionOn) document.documentElement.classList.add('has-motion');
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);
  const mob = () => innerWidth <= 768;

  /* Звук: дорожка того же ролика */
  const video = $('.c-video video'), track = $('.track'), btn = $('.c-sound'), label = $('.cursor-label');
  let actx = null, analyser = null, fdata = null;
  const ensureAudio = () => { if (actx) { actx.resume && actx.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); const src = actx.createMediaElementSource(track);
      analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .82; src.connect(analyser); analyser.connect(actx.destination);
      fdata = new Uint8Array(analyser.frequencyBinCount); } catch (e) { actx = null; } };
  const setSound = on => {
    if (on) ensureAudio();
    const lb = document.querySelector('.listen'); if (lb) { lb.setAttribute('aria-pressed', on); lb.setAttribute('aria-label', on ? 'Pause the sound' : 'Play the sound of the titanium tongue drum'); }
    const ws = document.querySelector('.wave-state'); if (ws) ws.textContent = on ? 'Playing' : 'Muted';
    btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    label.textContent = on ? 'Sound off' : 'Sound on';
    if (on) { track.currentTime = (video.currentTime || 0) % (track.duration || 20); track.volume = 0; track.play().catch(() => {});
      hasGsap ? gsap.to(track, { volume: .85, duration: 1.4 }) : (track.volume = .85); }
    else if (hasGsap) gsap.to(track, { volume: 0, duration: .6, onComplete: () => track.pause() }); else track.pause();
  };
  const toggle = () => setSound(btn.getAttribute('aria-pressed') !== 'true');
  btn.addEventListener('click', toggle);
  document.querySelector('.listen').addEventListener('click', toggle);
  $('.c-video').addEventListener('click', toggle);

  /* Бегущая строка: две копии ленты, скорость растёт от скорости скролла */
  const mq = $('.c-marquee'), row = $('.track-row');
  const row2 = row.cloneNode(true); row2.setAttribute('aria-hidden', 'true'); mq.append(row2);
  let mx = 0, boost = 0, rowW = 0;
  const sizeRow = () => rowW = row.getBoundingClientRect().width;
  sizeRow(); addEventListener('resize', sizeRow);
  const stepMarquee = dt => { mx -= (40 + boost) * dt; if (-mx >= rowW) mx += rowW; row.style.transform = row2.style.transform = `translateX(${mx}px)`; boost *= .92; };

  /* Решётка титана: гексагональная плотноупакованная ячейка, c/a = 4.68/2.95 */
  const cv = $('.c-lattice canvas'), ctx = cv.getContext('2d');
  const C = 4.68 / 2.95, pts = [], edges = [], dashed = [];
  const hex = y => Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3), y, Math.sin(k * Math.PI / 3)]);
  const top = hex(C / 2), bot = hex(-C / 2);
  top.forEach(p => pts.push({ p, kind: 'c' })); bot.forEach(p => pts.push({ p, kind: 'c' }));
  pts.push({ p: [0, C / 2, 0], kind: 'f' }, { p: [0, -C / 2, 0], kind: 'f' });
  const mid = [30, 150, 270].map(a => [Math.cos(a * Math.PI / 180) / Math.sqrt(3), 0, Math.sin(a * Math.PI / 180) / Math.sqrt(3)]);
  mid.forEach(p => pts.push({ p, kind: 'm' }));
  for (let k = 0; k < 6; k++) { edges.push([k, (k + 1) % 6], [6 + k, 6 + (k + 1) % 6], [k, 6 + k]); dashed.push([12, k], [13, 6 + k]); }
  dashed.push([14, 15], [15, 16], [16, 14]);
  [14, 15, 16].forEach(m => { dashed.push([m, 12], [m, 13]); });
  let W = 0, H = 0, DPR = 1, yaw = .6, pitch = -.38, tYaw = 0, tPitch = 0, drawIn = motionOn ? 0 : 1;
  const sizeLat = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; DPR = Math.min(devicePixelRatio || 1, 2); cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  const proj = ([x, y, z]) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let X = x * cy - z * sy, Z = x * sy + z * cy;
    let Y = y * cp - Z * sp; Z = y * sp + Z * cp;
    const f = 4.2, s = Math.min(W * .9, H - 70) * .4 * f / (f + Z);
    return [W / 2 + X * s, (H - 44) * .5 - Y * s, Z];
  };
  const drawLat = () => {
    ctx.clearRect(0, 0, W, H);
    const P = pts.map(o => proj(o.p));
    const line = (a, b, dash, alpha, col) => { const A = P[a], B = P[b];
      const depth = (A[2] + B[2]) / 2, al = alpha * (.55 + .45 * (1 - (depth + 1.2) / 2.4));
      ctx.setLineDash(dash); ctx.strokeStyle = col.replace('A', al.toFixed(3)); ctx.beginPath();
      ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0] + (B[0] - A[0]) * drawIn, A[1] + (B[1] - A[1]) * drawIn); ctx.stroke(); };
    ctx.lineWidth = 1;
    dashed.forEach(([a, b]) => line(a, b, [3, 4], .5, 'rgba(236,234,229,A)'));
    edges.forEach(([a, b]) => line(a, b, [], .9, 'rgba(236,234,229,A)'));
    ctx.setLineDash([]);
    pts.map((o, i) => ({ o, q: P[i] })).sort((a, b) => b.q[2] - a.q[2]).forEach(({ o, q }) => {
      const r = (o.kind === 'm' ? 4.2 : 3.2) * (4.2 / (4.2 + q[2])) * drawIn;
      if (r <= 0) return;
      ctx.fillStyle = o.kind === 'm' ? '#6F8BFF' : '#ECEAE5';
      ctx.globalAlpha = .35 + .65 * (1 - (q[2] + 1.2) / 2.4);
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.283); ctx.fill();
      if (o.kind === 'm') { ctx.globalAlpha *= .25; ctx.beginPath(); ctx.arc(q[0], q[1], r + 7, 0, 6.283); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  };
  sizeLat(); drawLat(); addEventListener('resize', () => { sizeLat(); drawLat(); sizeRow(); });
  const latCell = $('.c-lattice');
  addEventListener('pointermove', e => { tYaw = (e.clientX / innerWidth - .5) * 1.2; tPitch = (e.clientY / innerHeight - .5) * .6; });

  /* Сообщество: 45 клеток (участники) и 10 полос (страны) */
  const sqEl = $('.sq'), brEl = $('.br');
  for (let i = 0; i < 45; i++) sqEl.append(document.createElement('i'));
  for (let i = 0; i < 10; i++) brEl.append(document.createElement('i'));
  /* Видео блоков подгружаются, когда секция близко */
  const lazy = $$('video[data-src]');
  const load = v => { if (!v.src) { v.src = v.dataset.src; v.play().catch(() => {}); } };
  if ('IntersectionObserver' in window && !isStatic) { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: '600px 0px' }); lazy.forEach(v => io.observe(v)); }
  else lazy.forEach(load);

  if (mob()) { const h = $('.p-hint'); if (h) h.lastChild.textContent = 'Swipe';
    if ('IntersectionObserver' in window) { const io3 = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-on', e.intersectionRatio > .6)), { threshold: [0, .6, 1] }); $$('.p-stage').forEach(c => io3.observe(c)); } }
  /* Живая звуковая волна: реагирует на звук, без звука тихо дышит */
  const wv = $('.c-wave canvas'), wctx = wv.getContext('2d'); let wW = 0, wH = 0, wOn = false;
  const sizeWave = () => { const r = wv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); wW = r.width; wH = r.height; wv.width = wW * d; wv.height = wH * d; wctx.setTransform(d, 0, 0, d, 0, 0); };
  const drawWave = t => { wctx.clearRect(0, 0, wW, wH); const n = 48, gap = 3, bw = (wW - 40 - gap * (n - 1)) / n, mid = wH * .58;
    if (analyser && !track.paused) analyser.getByteFrequencyData(fdata);
    for (let i = 0; i < n; i++) { let v;
      if (analyser && !track.paused) { const k = Math.floor(Math.pow(i / n, 1.6) * fdata.length * .8); v = fdata[k] / 255; }
      else v = .06 + .05 * Math.sin(t * 1.4 + i * .35) + .03 * Math.sin(t * 2.3 + i * .9);
      const h = Math.max(2, v * wH * .62); wctx.fillStyle = i % 8 === 0 ? '#6F8BFF' : '#ECEAE5'; wctx.globalAlpha = .35 + .65 * Math.min(1, v * 1.6);
      wctx.fillRect(20 + i * (bw + gap), mid - h / 2, bw, h); }
    wctx.globalAlpha = 1; };
  sizeWave(); drawWave(0); addEventListener('resize', () => { sizeWave(); drawWave(0); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { wOn = es[0].isIntersecting; }).observe(wv);
  (function loopW(ts) { if (wOn) drawWave(ts / 1000); requestAnimationFrame(loopW); })(0);

  /* 06: волны звука (сталь затухает быстро, титан звучит дольше и богаче) */
  const wave = (decay, harm, base) => { let d = ''; for (let x = 52; x <= 300; x += 2) { const t = (x - 52) / 248, env = Math.exp(-t * decay);
      const y = base - 28 * env * (Math.sin(t * 42) + harm * .5 * Math.sin(t * 84 + .6) + harm * .3 * Math.sin(t * 126 + 1.3)) / (1 + harm * .8);
      d += (x > 52 ? 'L' : 'M') + x + ' ' + y.toFixed(1); } return d; };
  $('.w-steel').setAttribute('d', wave(6.5, 0, 32)); $('.w-ti').setAttribute('d', wave(1.6, 1, 98));
  /* 08: обзор YouTube – плеер грузится только по клику, поверх крупного плана */
  const yt = $('.cu-stage'), ytBtn = $('.cu-yt');
  const playYt = () => { if (yt.classList.contains('is-playing')) return; yt.classList.add('is-playing');
    if (btn.getAttribute('aria-pressed') === 'true') setSound(false);
    const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/8kx-ayJBvc8?autoplay=1&rel=0';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.title = 'Titanium tongue drum: full video review'; yt.append(f); };
  ytBtn.addEventListener('click', playYt);

  /* 08: пролёт – видео, где каждый кадр ключевой (163 кадра, 25 к/с), скролл перематывает его. Перемотка такого видео занимает
     доли миллисекунды, картинки на canvas тратили 25–50 мс на первый показ кадра. Скролл задаёт цель, показанный кадр догоняет её в тикере */
  const CU_FPS = 25, cuV = $('.cu-frame video');
  let cuT = 0, cuF = 0, cuLoading = false, cuDur = 0;
  const cuLoad = () => { if (cuLoading) return; cuLoading = true; cuV.src = mob() ? cuV.dataset.flyM : cuV.dataset.flyD; cuV.preload = 'auto'; cuV.load();
    cuV.addEventListener('loadedmetadata', () => { cuDur = cuV.duration; cuV.currentTime = .5 / CU_FPS; }, { once: true });
    cuV.addEventListener('seeked', () => cuV.classList.add('is-ready'), { once: true }); };
  const cuSeek = p => { cuT = Math.max(0, Math.min(1, p)); };
  if (motionOn) { new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { cuLoad(); ob.disconnect(); } }, { rootMargin: '150% 0px' }).observe(yt);
    let shown = -1;
    gsap.ticker.add(() => { if (!cuDur) return; const d = cuT - cuF; cuF = Math.abs(d) < .0005 ? cuT : cuF + d * .16;
      const n = Math.round(cuDur * CU_FPS) - 1, fr = Math.round(cuF * n); if (fr === shown || cuV.seeking) return; shown = fr; cuV.currentTime = (fr + .5) / CU_FPS; }); }

  /* 06: каркас инструмента. Верхняя и нижняя полусферы, шов, порт снизу, язычки-«ладони» с прорезями.
     Своя 3D-проекция на canvas, без библиотек. rp – прогресс секции (0–1) */
  const rcv = $('.rare-stage canvas'), rc = rcv.getContext('2d');
  const R = 1, HT = .40, HB = .34, PORT = .24;
  const yTop = r => HT * Math.pow(Math.max(0, 1 - (r / R) ** 2), .72);
  const yBot = r => -HB * Math.pow(Math.max(0, 1 - (r / R) ** 2), .72);
  const grid = [], tongues = [], tips = [];
  const MER = mob() ? 28 : 44;
  for (let k = 0; k < MER; k++) { const a = k / MER * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), top = [], bot = [];
    for (let t = 0; t <= 22; t++) { const r = .16 + (R - .16) * t / 22; top.push([c * r, yTop(r), sn * r]); }
    for (let t = 0; t <= 18; t++) { const r = PORT + (R - PORT) * t / 18; bot.push([c * r, yBot(r), sn * r]); }
    grid.push({ pts: top, o: k / MER * .3, w: .16 }, { pts: bot, o: .25 + k / MER * .3, w: .11, bot: 1 }); }
  const ring = (r, f, w, o) => { const pts = []; for (let t = 0; t <= 96; t++) { const a = t / 96 * Math.PI * 2; pts.push([Math.cos(a) * r, f(r), Math.sin(a) * r]); } grid.push({ pts, o, w, bot: f === yBot ? 1 : 0 }); };
  [.16, .3, .44, .58, .7, .81, .9].forEach((r, i) => ring(r, yTop, .16, .1 + i * .05));
  [.36, .52, .68, .84].forEach((r, i) => ring(r, yBot, .1, .4 + i * .05));
  ring(PORT, yBot, .28, .55); ring(R * .999, () => .012, .75, .6); ring(R * .999, () => -.012, .75, .62);
  /* язычок: контур U и две прорези от кончика к основанию (три «пальца») */
  const onTop = (x, z, lift = .006) => [x, yTop(Math.hypot(x, z)) + lift, z];
  const addTongue = (cx, cz, ang, L, W, o) => {
    const ux = -Math.cos(ang), uz = -Math.sin(ang), vx = -uz, vz = ux;
    const P = (u, v) => onTop(cx + ux * u + vx * v, cz + uz * u + vz * v);
    const out = [], h = W / 2;
    for (let t = 0; t <= 14; t++) out.push(P(t / 14 * (L - h), -h));
    for (let t = 0; t <= 18; t++) { const a = -Math.PI / 2 + t / 18 * Math.PI; out.push(P(L - h + Math.cos(a) * h, Math.sin(a) * h)); }
    for (let t = 0; t <= 14; t++) out.push(P((1 - t / 14) * (L - h), h));
    tongues.push({ pts: out, o, w: .95 });
    [-1, 1].forEach(sg => { const sl = []; for (let t = 0; t <= 10; t++) sl.push(P(L - h * .55 - t / 10 * L * .5, sg * W / 6)); tongues.push({ pts: sl, o: o + .04, w: .7 }); });
    [-1, 0, 1].forEach(f => tips.push({ p: P(L - h * .75, f * W / 3), ph: Math.random() * 6.28 }));
  };
  addTongue(.17, 0, 0, .34, .22, .55);
  const NT = 9; for (let k = 0; k < NT; k++) { const a = k / NT * Math.PI * 2 + .35; addTongue(Math.cos(a) * .88, Math.sin(a) * .88, a, .3, .17, .6 + k * .025); }
  const anchors = { shell: [Math.cos(2.4) * .45, yTop(.45), Math.sin(2.4) * .45], tongue: tips[4].p, seam: [Math.cos(-.5), 0, Math.sin(-.5)] };
  const calls = $$('.call');
  let rp = isStatic || !motionOn ? .82 : 0, rW = 0, rH = 0, rOn = false, rYaw = .3, rPitch = .12, rMx = 0, rMy = 0, rDraw = rp > .5 ? 1 : 0, rTime = 0;
  const ripples = [];
  const sizeR = () => { const b = rcv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); rW = b.width; rH = b.height; rcv.width = rW * d; rcv.height = rH * d; rc.setTransform(d, 0, 0, d, 0, 0); };
  const ez3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const projR = ([x, y, z]) => {
    const cy = Math.cos(rYaw), sy = Math.sin(rYaw), cp = Math.cos(rPitch), sp = Math.sin(rPitch);
    const X = x * cy - z * sy, Z1 = x * sy + z * cy, Y = y * cp - Z1 * sp, Z = y * sp + Z1 * cp;
    const sc = Math.min(rW * (mob() ? .42 : .32), rH * .4), f = 4.2, k = sc * f / (f + Z);
    return [rW / 2 + X * k, rH * (mob() ? .4 : .41) - Y * k, Z];
  };
  let botA = 1;
  const strokeSet = (set, rgb, baseA, prog, lw = 1) => {
    rc.lineWidth = lw;
    set.forEach(l => { const loc = cl((prog - l.o) / .35); if (loc <= 0) return;
      const n = Math.max(2, Math.round(l.pts.length * ez3(loc))), P = l.pts.slice(0, n).map(projR);
      for (let i = 0; i < P.length - 1; i += 4) { const e = Math.min(P.length - 1, i + 4), z = (P[i][2] + P[e][2]) / 2, front = cl(.5 - z * .55, .12, 1);
        rc.strokeStyle = `rgba(${rgb},${(baseA * l.w * front * (l.bot ? botA : 1)).toFixed(3)})`; rc.beginPath(); rc.moveTo(P[i][0], P[i][1]);
        for (let j = i + 1; j <= e; j++) rc.lineTo(P[j][0], P[j][1]); rc.stroke(); } });
  };
  const drawR = () => {
    rc.clearRect(0, 0, rW, rH);
    const c0 = projR([0, 0, 0]);
    const g = rc.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], Math.min(rW, rH) * .55);
    g.addColorStop(0, 'rgba(58,91,217,.20)'); g.addColorStop(.55, 'rgba(58,91,217,.05)'); g.addColorStop(1, 'rgba(58,91,217,0)');
    rc.fillStyle = g; rc.fillRect(0, 0, rW, rH);
    strokeSet(grid, '236,234,229', 1, rDraw * 1.25);
    rc.globalCompositeOperation = 'lighter';
    strokeSet(tongues, '120,146,255', 1, rDraw * 1.25, 1.4);
    const tipA = cl((rDraw - .7) / .3);
    tips.forEach(t => { const q = projR(t.p), front = cl(.55 - q[2] * .6, .15, 1), pulse = .6 + .4 * Math.sin(rTime * 2 + t.ph);
      rc.fillStyle = `rgba(111,139,255,${(tipA * front * pulse).toFixed(3)})`; rc.beginPath(); rc.arc(q[0], q[1], 2.2, 0, 6.283); rc.fill(); });
    ripples.forEach(rp2 => { const age = (rTime - rp2.t) / 1.6; if (age > 1) return; const pts = [];
      for (let a = 0; a <= 40; a++) { const an = a / 40 * 6.283, rr = .03 + age * .2; pts.push(projR(onTop(rp2.p[0] + Math.cos(an) * rr, rp2.p[2] + Math.sin(an) * rr, .01))); }
      rc.strokeStyle = `rgba(150,170,255,${(.7 * (1 - age) * tipA).toFixed(3)})`; rc.beginPath(); pts.forEach((q, i) => i ? rc.lineTo(q[0], q[1]) : rc.moveTo(q[0], q[1])); rc.stroke(); });
    rc.globalCompositeOperation = 'source-over';
    const cA = mob() ? 0 : cl((rp - .38) / .12) * cl((.95 - rp) / .08);
    calls.forEach(cEl => { const q = projR(anchors[cEl.dataset.a]), right = cEl.classList.contains('r'), dx = right ? 70 : -70, lx = q[0] + dx, ly = q[1] - 40;
      rc.strokeStyle = `rgba(236,234,229,${(.55 * cA).toFixed(3)})`; rc.beginPath(); rc.moveTo(q[0], q[1]); rc.lineTo(q[0] + dx * .5, ly); rc.lineTo(lx, ly); rc.stroke();
      rc.fillStyle = `rgba(236,234,229,${cA.toFixed(3)})`; rc.beginPath(); rc.arc(q[0], q[1], 3, 0, 6.283); rc.fill();
      cEl.style.left = lx + 'px'; cEl.style.top = ly + 'px'; cEl.style.opacity = cA; });
  };
  const stepR = dt => {
    rTime += dt;
    const e = ez3(cl((rp - .12) / .6));
    const tPitch = .06 + e * .7 + rMy * .16, tYaw = .3 + rTime * .1 + rp * 1.6 + rMx * .35;
    rPitch += (tPitch - rPitch) * .06; rYaw += (tYaw - rYaw) * .06; botA = 1 - .85 * cl((rPitch - .15) / .5);
    rDraw += (cl(rp / .32) - rDraw) * .07;
    if (rDraw > .9 && Math.random() < dt * (track && !track.paused ? 2.2 : .8)) ripples.push({ p: tips[Math.floor(Math.random() * tips.length)].p, t: rTime });
    while (ripples.length && rTime - ripples[0].t > 1.7) ripples.shift();
    drawR();
  };
  sizeR(); rYaw = .3 + rp * 1.6; rPitch = .06 + ez3(cl((rp - .12) / .6)) * .7; botA = 1 - .85 * cl((rPitch - .15) / .5); drawR();
  addEventListener('resize', () => { sizeR(); drawR(); });
  $('.rare').addEventListener('pointermove', e => { rMx = e.clientX / innerWidth - .5; rMy = e.clientY / innerHeight - .5; });
  if ('IntersectionObserver' in window && motionOn) new IntersectionObserver(es => { rOn = es[0].isIntersecting; }).observe($('.rare-stage'));
  if (motionOn) { let last = performance.now(); (function loopR(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (rOn) stepR(dt); requestAnimationFrame(loopR); })(last); }
  else document.fonts.ready.then(() => { sizeR(); drawR(); });

  /* 08: модели. Инструмент у всех один – титановый прототип (по решению владельца), у Mini чуть меньше */
  const MODELS = [
    { name: 'New Wave 15', img: 'assets/img/d-model-nw15.webp', price: '$1,090', tg: '15 tongues', bg: '#1A1B21', sc: 1, line: 'Fifteen tongues, each tuned to&nbsp;a&nbsp;note with overtones.' },
    { name: 'Mini Shelton 10', img: 'assets/img/d-model-mini.webp', price: '$1,190', tg: '10 tongues', bg: '#3A5BD9', sc: .8, line: 'The&nbsp;compact one: ten tongues in&nbsp;a&nbsp;smaller body.' },
    { name: 'Shelton 10', img: 'assets/img/d-model-sh10.webp', price: '$1,330', tg: '10 tongues', bg: '#1A1B21', sc: 1, line: 'Ten tongues on&nbsp;the&nbsp;full-size Shelton body.' },
    { name: 'Shelton 15', img: 'assets/img/d-model-sh15.webp', price: '$1,480', tg: '15 tongues', bg: '#3A5BD9', sc: 1, line: 'Fifteen tongues on&nbsp;the&nbsp;full-size Shelton body.' }];
  const SHOP = 'https://kosmosky.example/titan';
  const textHTML = m => `<div class="mtext"><h3 class="mname"><span>${m.name}</span></h3><p class="mline t-body">${m.line}</p>
    <div class="mchips"><span class="mchip">${m.price}</span><span class="mchip">${m.tg}</span><a class="mchip" href="${SHOP}" target="_blank" rel="noopener">Order <span aria-hidden="true">↗</span></a></div></div>`;
  const marqHTML = k => { const one = MODELS.map((m, i) => `<span data-i="${i}" class="${i === k ? 'on' : ''}">${m.name}</span>`).join(''); return `<div class="mmarq t-ui" aria-hidden="true"><div class="mmarq-row">${one}${one}${one}${one}</div></div>`; };
  const cardHTML = (k, all) => `<article class="mcard" style="background:${MODELS[k].bg}">
      <div><div class="mprog" aria-hidden="true">${MODELS.map((m, i) => `<i><b style="${!all && i <= k ? 'transform:scaleX(1)' : ''}"></b></i>`).join('')}</div>
        <div class="mcount t-small"><span class="mnum">0${k + 1} / 04</span><span class="mnote">Titanium</span></div></div>
      ${marqHTML(k)}
      <div class="mtexts">${(all ? MODELS : [MODELS[k]]).map(textHTML).join('')}</div></article>`;
  const mSec = $('.models'), mStage = $('.mstage');
  const useMorph = motionOn && !mob();
  if (useMorph) {
    mSec.classList.add('is-pin');
    mStage.insertAdjacentHTML('beforeend', `<div class="mfloat" aria-hidden="true"><div class="mfloat-in"><span class="mshadow"></span>${MODELS.map(m => `<img src="${m.img}" alt="" loading="lazy">`).join('')}</div></div>` + cardHTML(0, true));
  } else {
    mSec.classList.add('is-list');
    mStage.insertAdjacentHTML('beforeend', `<div class="mlist">${MODELS.map((m, k) => `<div class="mitem"><img class="mfig" src="${m.img}" alt="${m.name}: the titanium tongue drum" loading="lazy" style="scale:${m.sc}">${cardHTML(k, false)}</div>`).join('')}</div>`);
  }

  /* 08: решётка титана на фоне – гексагональная плотноупакованная (c/a ≈ 1.587), тонко и полупрозрачно */
  const lcv = $('.mlat'), lc = lcv.getContext('2d');
  const LP = [], LE = [];
  { const C = 1.587, rows = [];
    for (let n = -2; n <= 2; n++) { const y = n * C / 2, B = Math.abs(n) % 2 === 1;
      for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
        let x = i + j * .5, z = j * Math.sqrt(3) / 2; if (B) { x += .5; z += Math.sqrt(3) / 6; }
        if (Math.hypot(x, z) <= 3.6) LP.push([x, y, z]); } }
    for (let a = 0; a < LP.length; a++) for (let b = a + 1; b < LP.length; b++) {
      const d = Math.hypot(LP[a][0] - LP[b][0], LP[a][1] - LP[b][1], LP[a][2] - LP[b][2]); if (d > .9 && d < 1.06) LE.push([a, b]); } }
  let lW = 0, lH = 0, lp = 0, lYaw = .4, lPitch = .55, lMx = 0, lMy = 0, lOn = false, lT = 0;
  const sizeL = () => { const b = lcv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); lW = b.width; lH = b.height; lcv.width = lW * d; lcv.height = lH * d; lc.setTransform(d, 0, 0, d, 0, 0); };
  const drawL = () => {
    lc.clearRect(0, 0, lW, lH);
    const cy = Math.cos(lYaw), sy = Math.sin(lYaw), cp = Math.cos(lPitch), sp = Math.sin(lPitch), sc = Math.max(lW, lH) * .17, f = 7;
    const P = LP.map(([x, y, z]) => { const X = x * cy - z * sy, Z1 = x * sy + z * cy, Y = y * cp - Z1 * sp, Z = y * sp + Z1 * cp, k = sc * f / (f + Z);
      return [lW * .5 + X * k, lH * .5 - Y * k, Z]; });
    lc.lineWidth = .8;
    for (let bkt = 0; bkt < 5; bkt++) { const lo = -4 + bkt * 1.6, hi = lo + 1.6; lc.beginPath();
      LE.forEach(([a, b]) => { const z = (P[a][2] + P[b][2]) / 2; if (z < lo || z >= hi) return; lc.moveTo(P[a][0], P[a][1]); lc.lineTo(P[b][0], P[b][1]); });
      lc.strokeStyle = `rgba(10,11,16,${(.11 - bkt * .019).toFixed(3)})`; lc.stroke(); }
    P.forEach(q => { const a = Math.max(.05, .3 - (q[2] + 4) * .03); lc.fillStyle = `rgba(10,11,16,${a.toFixed(3)})`; lc.beginPath(); lc.arc(q[0], q[1], 1.6 * 7 / (7 + q[2]), 0, 6.283); lc.fill(); });
  };
  sizeL(); drawL(); addEventListener('resize', () => { sizeL(); drawL(); });
  if (useMorph) {
    mStage.addEventListener('pointermove', e => { lMx = e.clientX / innerWidth - .5; lMy = e.clientY / innerHeight - .5; });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { lOn = es[0].isIntersecting; }).observe(mStage);
    let lLast = performance.now();
    (function loopL(now) { const dt = Math.min(.05, (now - lLast) / 1000); lLast = now;
      if (lOn) { lT += dt; const tY = .4 + lp * 2.2 + lT * .03 + lMx * .25, tP = .55 - lp * .35 + lMy * .12; lYaw += (tY - lYaw) * .05; lPitch += (tP - lPitch) * .05; drawL(); }
      requestAnimationFrame(loopL); })(lLast);
  }

  /* Сумма: окошки-барабаны */
  const sumEl = $('.sum'), rolls = [];
  const addTxt = (t, c) => { const e = document.createElement('span'); e.className = c; e.textContent = t; e.setAttribute('aria-hidden', 'true'); sumEl.append(e); };
  addTxt('$', 'sym');
  [...'1,900'].forEach((ch, i) => { if (ch === ',') return addTxt(',', 'comma');
    const d = +ch, slot = document.createElement('span'); slot.className = 'slot'; slot.setAttribute('aria-hidden', 'true');
    const col = document.createElement('span'); for (let k = 0; k < 30; k++) { const c = document.createElement('span'); c.textContent = k % 10; col.append(c); }
    slot.append(col); sumEl.append(slot); rolls.push({ col, end: 20 + d, start: (d + 3 + i * 3) % 10 }); });
  const setRoll = (r, k) => r.col.style.transform = `translateY(${-k * 1.18}em)`;
  rolls.forEach(r => setRoll(r, r.end));

  if (!hasGsap) return;
  if (!motionOn) { stepMarquee(0); const to = params.get('to'); if (to) document.fonts.ready.then(() => { const el = document.getElementById(to); if (el) document.body.style.marginTop = -(el.getBoundingClientRect().top + scrollY) + 'px'; }); return; }

  /* ---------- Движение ---------- */
  const lenis = new Lenis({ duration: 1.3, smoothWheel: true });
  lenis.on('scroll', e => { ScrollTrigger.update(); boost = Math.min(600, boost + Math.abs(e.velocity) * 4); });
  let autoYaw = .6;
  gsap.ticker.add((t, dt) => {
    lenis.raf(t * 1000); const s = dt / 1000;
    stepMarquee(s);
    autoYaw += s * .22;
    yaw += (autoYaw + tYaw - yaw) * .06; pitch += (-.38 + tPitch - pitch) * .06;
    drawLat();
  });
  gsap.ticker.lagSmoothing(0);

  /* Курсор над видео */
  const cur = $('.cursor'), vcell = $('.c-video');
  const qx = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); });
  vcell.addEventListener('pointerenter', () => gsap.to(cur, { opacity: 1, duration: .3 }));
  vcell.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: .3 }));

  /* Заголовок: строки проявляются из-под светлой плашки */
  const split = new SplitText('.hero-title', { type: 'lines', linesClass: 'ln' });
  const plates = split.lines.map(l => { const p = document.createElement('span'); p.className = 'plate'; l.append(p); return p; });
  gsap.set(split.lines, { color: 'transparent' });

  const intro = gsap.timeline({ paused: true })
    .from('.grid', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
    .to('.c-logo .in, .c-tag .in, .c-lang .in, .c-sound .in, .c-order .in', { opacity: 1, duration: .6, stagger: .05 }, '-=.4')
    .fromTo('.c-video video', { scale: 1.25, filter: 'brightness(.2)' }, { scale: 1.06, filter: 'brightness(1)', duration: 2.2, ease: 'expo.out', clearProps: 'filter' }, '<')
    .to(plates, { scaleX: 1, duration: .55, stagger: .12, ease: 'power3.inOut' }, '<.1')
    .set(split.lines, { color: '' }, '>')
    .to(plates, { scaleX: 0, transformOrigin: '100% 50%', duration: .6, stagger: .12, ease: 'power3.inOut' }, '<')
    .to(drawState = { v: 0 }, { v: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: () => drawIn = drawState.v }, '<-.2')
    .to('.c-title-top .in, .c-lattice .in, .c-video .in', { opacity: 1, duration: .8, stagger: .06 }, '<.3')
    .fromTo('.specs .lead', { scaleX: 0 }, { scaleX: 1, duration: .9, stagger: .06, ease: 'power2.out' }, '<')
    .to('.c-specs .in', { opacity: 1, duration: .6, stagger: .04 }, '<.15')
    .add(() => { lenis.start(); }, '<');
  var drawState;

  /* ---------- 2. Сообщество ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.c-band', start: 'top bottom', end: 'bottom top', scrub: .8 } })
    .fromTo('.band-frame', { clipPath: 'inset(14% 26% 14% 26%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: .55 }, 0)
    .fromTo('.band-frame img', { scale: 1.45, xPercent: -6, yPercent: -4 }, { scale: 1.02, xPercent: 0, yPercent: 0, ease: 'none', duration: 1 }, 0);
  /* ---------- 3. Деньги ---------- */
  rolls.forEach(r => setRoll(r, r.start));
  const sumTl = gsap.timeline({ scrollTrigger: { trigger: '.c-sum', start: 'top 70%' } });
  rolls.forEach((r, i) => { const o = { k: r.start }; sumTl.to(o, { k: r.end, duration: 1.8 + i * .25, ease: 'power4.out', onUpdate: () => setRoll(r, o.k) }, i * .08); });
  sumTl.from('.c-sum .sum-cap', { opacity: 0, y: 24, duration: 1.2, ease: 'expo.out' }, .5);
  gsap.fromTo('.c-tune img', { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.c-tune', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.c-photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.c-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.c-photo', { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.c-photo', start: 'top 80%' } });
  gsap.from(['.c-knew .t-mid', '.c-trust .t-mid'], { opacity: 0, y: 28, duration: 1.2, stagger: .15, ease: 'expo.out', scrollTrigger: { trigger: '.c-knew', start: 'top 85%' } });
  const bandSplit = new SplitText('.band-title', { type: 'lines', mask: 'lines' });
  gsap.from(bandSplit.lines, { yPercent: 105, duration: 1.3, stagger: .1, ease: 'expo.out', onComplete: () => bandSplit.revert(), scrollTrigger: { trigger: '.c-band', start: 'top 55%' } });
  const mWords = new SplitText('.manifest', { type: 'words' }).words;
  gsap.fromTo(mWords, { color: '#3A3C46' }, { color: '#ECEAE5', stagger: .1, ease: 'none', scrollTrigger: { trigger: '.manifest', start: 'top 82%', end: 'bottom 45%', scrub: .6 } });
  const numSplit = new SplitText('.c-num .t-num', { type: 'lines', mask: 'lines' });
  gsap.set('.sq i', { backgroundColor: 'transparent' }); gsap.set('.br i', { backgroundColor: 'transparent', scaleY: .35, transformOrigin: '50% 100%' });
  gsap.timeline({ scrollTrigger: { trigger: '.c-45', start: 'top 78%' } })
    .from(numSplit.lines, { yPercent: 105, duration: 1.3, stagger: .12, ease: 'expo.out', onComplete: () => numSplit.revert() })
    .to('.sq i', { backgroundColor: '#ECEAE5', duration: .25, stagger: { each: .028, from: 'start' }, ease: 'none' }, .2)
    .to('.br i', { backgroundColor: '#6F8BFF', scaleY: 1, duration: .6, stagger: .09, ease: 'expo.out' }, .35);
  gsap.from(['.c-joined h2', '.c-joined p'], { opacity: 0, y: 20, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.c-joined', start: 'top 85%' } });
  gsap.from(['.c-state .cell-top', '.c-num .cell-top', '.tune-cap', '.band-cap .cell-top'], { opacity: 0, duration: 1, stagger: .05, scrollTrigger: { trigger: '.c-state', start: 'top 85%' } });
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ---------- 4. Путь: вертикальный скролл двигает ленту вбок ---------- */
  if (!mob()) {
    const pathSec = $('.path'), ppin = $('.path-pin'), trk = $('.path-track');
    const topOff = $('.topbar').offsetHeight;
    const dist = () => Math.max(0, trk.scrollWidth - ppin.clientWidth);
    const setH = () => { pathSec.style.height = (ppin.offsetHeight + dist()) + 'px'; };
    setH(); addEventListener('resize', setH);
    const hTween = gsap.to(trk, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pathSec, start: 'top top+=' + topOff, end: () => '+=' + dist(),
      scrub: .6, invalidateOnRefresh: true, onRefreshInit: setH, onUpdate: st => gsap.set('.p-bar i', { scaleX: st.progress }) } });
    $$('.p-photo img').forEach(im => gsap.fromTo(im, { xPercent: 6 }, { xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: im.closest('.p-cell'), containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } }));
    $$('.p-stage, .p-draw, .p-end').forEach(c => gsap.from(c.querySelectorAll('.p-num, .t-body, .t-mid'), { y: 40, opacity: 0, duration: 1, stagger: .08, ease: 'expo.out',
      scrollTrigger: { trigger: c, containerAnimation: hTween, start: 'left 85%' } }));
    ScrollTrigger.create({ trigger: '.p-explode', containerAnimation: hTween, start: 'left 55%', once: true, onEnter: () => {
      gsap.fromTo('.p-explode .boom', { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'back.out(3)', transformOrigin: '0 50%' }); } });
  }

  /* ---------- 5. У нас получилось ---------- */
  const doneSplit = new SplitText('.t-done', { type: 'lines', linesClass: 'ln' });
  const dPlates = doneSplit.lines.map(l => { const pl = document.createElement('span'); pl.className = 'plate'; l.append(pl); return pl; });
  gsap.set(doneSplit.lines, { color: 'transparent' });
  gsap.timeline({ scrollTrigger: { trigger: '.c-done', start: 'top 70%' } })
    .to(dPlates, { scaleX: 1, duration: .55, stagger: .12, ease: 'power3.inOut' })
    .set(doneSplit.lines, { color: '' })
    .to(dPlates, { scaleX: 0, transformOrigin: '100% 50%', duration: .6, stagger: .12, ease: 'power3.inOut' })
    .from('.c-done .t-mid', { opacity: 0, y: 24, duration: 1.1, ease: 'expo.out' }, '<.2');
  gsap.from('.c-portrait', { clipPath: 'inset(0 0 100% 0)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: '.c-portrait', start: 'top 80%' } });
  gsap.fromTo('.c-portrait img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.c-portrait', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from(['.c-listen > *', '.c-cta > *'], { opacity: 0, y: 20, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.c-listen', start: 'top 88%' } });

  /* ---------- 6. Дорого? ---------- */
  const qSplit = new SplitText('#price .t-done', { type: 'lines', linesClass: 'ln' });
  const qPlates = qSplit.lines.map(l => { const pl = document.createElement('span'); pl.className = 'plate'; l.append(pl); return pl; });
  gsap.set(qSplit.lines, { color: 'transparent' });
  gsap.timeline({ scrollTrigger: { trigger: '.c-q', start: 'top 70%' } })
    .to(qPlates, { scaleX: 1, duration: .55, ease: 'power3.inOut' })
    .set(qSplit.lines, { color: '' })
    .to(qPlates, { scaleX: 0, transformOrigin: '100% 50%', duration: .6, ease: 'power3.inOut' })
    .from('.c-q .answer .t-mid', { opacity: 0, y: 24, duration: 1.1, stagger: .25, ease: 'expo.out' }, '<.2');
  ['.w-steel', '.w-ti'].forEach((sel, i) => { const el = $(sel), L = el.getTotalLength(); gsap.set(el, { strokeDasharray: L, strokeDashoffset: L });
    gsap.to(el, { strokeDashoffset: 0, duration: 2.2, delay: i * .35, ease: 'power2.inOut', scrollTrigger: { trigger: '.sound-svg', start: 'top 85%' } }); });
  gsap.timeline({ scrollTrigger: { trigger: '.wt', start: 'top 85%' } })
    .from('.wt-row:not(.ti) .bar i', { scaleX: 0, duration: 1, ease: 'expo.out' })
    .fromTo('.wt-row.ti .bar i', { scaleX: 1 }, { scaleX: .575, duration: 1.6, ease: 'expo.inOut' }, .5)
    .from('.wt-delta', { opacity: 0, y: 20, duration: .9, ease: 'expo.out' }, 1.2);
  gsap.from('.c-arg .arg-k, .c-arg .t-body', { opacity: 0, y: 20, duration: 1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.c-arg', start: 'top 85%' } });

  /* ---------- 06. Пауза: прогресс секции крутит каркас; текст появляется во второй половине ---------- */
  ScrollTrigger.create({ trigger: '.rare', start: 'top bottom', end: 'bottom bottom', onUpdate: st => { rp = st.progress; $('.rare').classList.toggle('is-on', rp > .6); } });
  const rSplit = new SplitText('.rare-text .t-big', { type: 'lines', mask: 'lines' });
  gsap.set(rSplit.lines, { yPercent: 105 }); gsap.set('.rare-text .t-body', { opacity: 0, y: 16 });
  const rTl = gsap.timeline({ paused: true }).to(rSplit.lines, { yPercent: 0, duration: 1.4, stagger: .12, ease: 'expo.out' })
    .to('.rare-text .t-body', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, '<.4');
  ScrollTrigger.create({ trigger: '.rare', start: '58% bottom', onEnter: () => rTl.play(), onLeaveBack: () => rTl.reverse() });
  ScrollTrigger.create({ trigger: '#price', start: () => 'top top+=' + ($('.topbar').offsetHeight + 4),
    onEnter: () => document.body.classList.add('is-light'), onLeaveBack: () => document.body.classList.remove('is-light') });

  /* ---------- 08. Крупный план: кадр раскрывается из центра, как лента 02, затем пин и пролёт по скроллу ---------- */
  const cuTop = () => parseFloat(getComputedStyle(yt).top) || 0;
  if (!mob()) {
    gsap.timeline({ scrollTrigger: { trigger: '.closeup', start: 'top bottom', end: () => 'top top+=' + cuTop(), scrub: .8, invalidateOnRefresh: true } })
      .fromTo('.cu-frame', { clipPath: 'inset(14% 26% 14% 26%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: .7 }, 0)
      .fromTo('.cu-frame > *', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0);
    ScrollTrigger.create({ trigger: '.closeup', start: () => 'top top+=' + cuTop(), end: 'bottom bottom', invalidateOnRefresh: true,
      onUpdate: st => { cuSeek(st.progress); gsap.set('.cu-bar i', { scaleX: st.progress }); } });
  } else {
    gsap.fromTo('.cu-frame', { clipPath: 'inset(10% 14% 10% 14%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: yt, start: 'top bottom', end: 'top 30%', scrub: .8 } });
    ScrollTrigger.create({ trigger: yt, start: 'top bottom', end: 'bottom top', onUpdate: st => { cuSeek(st.progress); gsap.set('.cu-bar i', { scaleX: st.progress }); } });
  }
  const cuSplit = new SplitText('.cu-title', { type: 'lines', mask: 'lines' });
  gsap.from(cuSplit.lines, { yPercent: 105, duration: 1.3, stagger: .1, ease: 'expo.out', onComplete: () => cuSplit.revert(), scrollTrigger: { trigger: yt, start: 'top 45%' } });
  gsap.from(['.cu-cap .cell-top', '.cu-yt'], { opacity: 0, y: 12, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: yt, start: 'top 45%' } });

  /* ---------- 8. Модели: инструменты выплывают снизу и уплывают вверх синхронно со сменой текста в карточке ---------- */
  if (useMorph) {
    const card = $('.mcard'), drums = $$('.mfloat img'), shadow = $('.mshadow'), texts = $$('.mtext'), num = $('.mnum'), bars = $$('.mprog b'), mq = $$('.mmarq-row span');
    const HOLD = .7, MOVE = 1, STEP = MOVE + HOLD, total = HOLD + 3 * STEP;
    mSec.style.height = `calc(${mStage.getBoundingClientRect().height}px + ${3 * 90}vh)`;
    texts.forEach((t, i) => { if (i) gsap.set(t, { autoAlpha: 0 }); });
    drums.forEach((d, i) => gsap.set(d, i ? { yPercent: 120, rotate: -18, scale: MODELS[i].sc * .9, autoAlpha: 0 } : { yPercent: 0, rotate: 0, scale: MODELS[0].sc, autoAlpha: 1 }));
    const mTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    for (let k = 1; k < 4; k++) {
      const at = HOLD + (k - 1) * STEP, prevT = texts[k - 1], nextT = texts[k];
      mTl.to(drums[k - 1], { yPercent: -125, rotate: 18, scale: MODELS[k - 1].sc * .92, duration: MOVE * .65, ease: 'power2.in' }, at)
         .to(drums[k - 1], { autoAlpha: 0, duration: MOVE * .22, ease: 'power1.in' }, at + MOVE * .22)
         .to(shadow, { scale: .55, autoAlpha: .25, duration: MOVE * .4, ease: 'power2.in' }, at)
         .fromTo(drums[k], { yPercent: 120, rotate: -18, scale: MODELS[k].sc * .9, autoAlpha: 0 }, { yPercent: 0, rotate: 0, scale: MODELS[k].sc, autoAlpha: 1, duration: MOVE * .7, ease: 'power3.out', immediateRender: false }, at + MOVE * .32)
         .to(shadow, { scale: MODELS[k].sc, autoAlpha: 1, duration: MOVE * .45, ease: 'power2.out' }, at + MOVE * .55)
         .to(card, { backgroundColor: MODELS[k].bg, duration: MOVE * .8, ease: 'power1.inOut' }, at + MOVE * .1)
         .to(prevT.querySelector('.mname span'), { yPercent: -105, duration: MOVE * .4, ease: 'power2.in' }, at)
         .to(prevT.querySelectorAll('.mline, .mchips'), { autoAlpha: 0, y: -12, duration: MOVE * .3, ease: 'power2.in' }, at)
         .set(prevT, { autoAlpha: 0 }, at + MOVE * .42)
         .set(nextT, { autoAlpha: 1 }, at + MOVE * .42)
         .fromTo(nextT.querySelector('.mname span'), { yPercent: 105 }, { yPercent: 0, duration: MOVE * .48, ease: 'power3.out', immediateRender: false }, at + MOVE * .42)
         .fromTo(nextT.querySelectorAll('.mline, .mchips'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: MOVE * .4, stagger: .05, ease: 'power2.out', immediateRender: false }, at + MOVE * .55);
    }
    mTl.to({}, { duration: HOLD }, HOLD + 3 * STEP - HOLD);
    let curK = -1;
    const setK = k => { if (k === curK) return; curK = k; mq.forEach(sp => sp.classList.toggle('on', +sp.dataset.i === k)); num.textContent = `0${k + 1} / 04`; };
    setK(0);
    ScrollTrigger.create({ trigger: mSec, start: () => 'top top+=' + $('.topbar').offsetHeight, end: 'bottom bottom', scrub: .8, animation: mTl, invalidateOnRefresh: true,
      onUpdate: st => { lp = st.progress; const tt = st.progress * total;
        setK(Math.max(0, Math.min(3, Math.floor((tt - HOLD - MOVE * .42) / STEP) + 1)));
        bars.forEach((b, i) => { const a = i === 0 ? 0 : HOLD + (i - 1) * STEP + MOVE * .42, e = i === 3 ? total : HOLD + i * STEP + MOVE * .42;
          b.style.transform = `scaleX(${Math.max(0, Math.min(1, (tt - a) / (e - a))).toFixed(3)})`; }); } });
    /* въезд в блок */
    gsap.from(card, { y: 60, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: mSec, start: 'top 72%' } });
    gsap.from('.mfloat-in', { yPercent: 30, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: mSec, start: 'top 70%' } });
    gsap.from('.mhead > *', { y: 24, autoAlpha: 0, duration: 1.1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: mSec, start: 'top 78%' } });
    gsap.from('.mlat', { autoAlpha: 0, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: mSec, start: 'top 80%' } });
  } else if (motionOn) {
    $$('.mlist .mitem').forEach(c => gsap.from(c, { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }));
  }

  /* ---------- 9. Финал ---------- */
  const fSplit = new SplitText('#follow .t-done', { type: 'lines', linesClass: 'ln' });
  const fPlates = fSplit.lines.map(l => { const pl = document.createElement('span'); pl.className = 'plate'; l.append(pl); return pl; });
  gsap.set(fSplit.lines, { color: 'transparent' });
  gsap.timeline({ scrollTrigger: { trigger: '.c-follow', start: 'top 70%' } })
    .to(fPlates, { scaleX: 1, duration: .55, ease: 'power3.inOut' })
    .set(fSplit.lines, { color: '' })
    .to(fPlates, { scaleX: 0, transformOrigin: '100% 50%', duration: .6, ease: 'power3.inOut' })
    .from('.c-follow .t-mid, .c-follow .acts', { autoAlpha: 0, y: 20, duration: 1.1, stagger: .1, ease: 'expo.out' }, '<.2');
  ['.c-bts1', '.c-bts2'].forEach(sel => {
    gsap.from(sel, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: sel, start: 'top 82%' } });
    gsap.fromTo(sel + ' img', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: sel, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.c-teaser img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.c-teaser', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.c-teaser .q', { yPercent: 40, autoAlpha: 0, rotate: -12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.c-teaser', start: 'top 85%' } });
  /* подвал: буквы логотипа поднимаются по очереди, шапка снова тёмная */
  gsap.fromTo('.f-logo svg', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.footer', start: 'top 85%', end: 'bottom bottom', scrub: .8 } });
  gsap.from('.f-contacts > *', { autoAlpha: 0, y: 24, duration: 1.1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 55%' } });
  gsap.from('.f-row', { autoAlpha: 0, y: 16, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 40%' } });
  ScrollTrigger.create({ trigger: '.footer', start: 'top 35%',
    onEnter: () => document.body.classList.remove('is-light'), onLeaveBack: () => document.body.classList.add('is-light') });

  /* Вход */
  lenis.stop();
  const cnt = $('.intro-count'); const prog = { v: 0 };
  let parts = 0; const need = 3;
  const bump = () => { parts++; gsap.to(prog, { v: parts / need, duration: .7, ease: 'power2.out',
    onUpdate: () => { cnt.textContent = String(Math.round(prog.v * 100)).padStart(3, '0'); gsap.set('.intro-bar i', { scaleX: prog.v }); } }); };
  (video.readyState >= 3) ? bump() : video.addEventListener('canplay', bump, { once: true });
  document.fonts.ready.then(bump);
  (track.readyState >= 2) ? bump() : track.addEventListener('loadeddata', bump, { once: true });
  setTimeout(() => { while (parts < need) bump(); }, 6000);
  $$('[data-enter]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.enter === 'sound') setSound(true);
    video.play().catch(() => {});
    gsap.timeline()
      .to('.intro-box', { opacity: 0, y: -12, duration: .45, ease: 'power2.in' })
      .to('.intro', { opacity: 0, duration: .5 }, '-=.1')
      .set('.intro', { display: 'none' })
      .add(() => intro.play(), '-=.35');
  }));
})();
