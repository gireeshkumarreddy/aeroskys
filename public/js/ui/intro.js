// Signature opening carried over from the editorial build: the AeroSkys identity is
// drawn, picked up by an aircraft and delivered into the real masthead.
// Plays fully on a first visit, briefly on later visits (once per session), and is skippable.
export function runIntro() {
  const boot = window.aeroskysIntroBoot, root = document.documentElement;
  const overlay = document.getElementById('brand-intro'), site = document.getElementById('site-content');
  if (!boot || !root.classList.contains('intro-pending') || !overlay) { overlay?.remove(); return; }
  const q = s => overlay.querySelector(s);
  const header = document.querySelector('.masthead .brand-crop');
  if (!header) { boot.release(); return; }
  const identity = q('.intro-full-logo'), plane = q('.intro-aircraft'), connection = q('.intro-connection'), line = connection.querySelector('path'), curtain = q('.intro-curtain'), skip = q('.intro-skip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0, startTime = 0, done = false, started = false, revealed = false, landed = false, geometry = null, startTimer = 0, safetyTimer = 0;
  const animations = [];
  const factor = boot.mode === 'returning' ? .55 : 1;
  const times = { pickup: 2380 * factor, lift: 2530 * factor, land: 3810 * factor, end: 4380 * factor };
  const clamp = v => Math.min(1, Math.max(0, v));
  const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const point = (a, b, c, d, t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y }; };
  const tf = (x, y, s = 1) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})`;

  function finish({ remember = true } = {}) {
    if (done) return; done = true;
    cancelAnimationFrame(raf); clearTimeout(startTimer); clearTimeout(safetyTimer); clearTimeout(boot.deadline);
    animations.forEach(a => a.cancel());
    root.classList.remove('intro-pending', 'intro-running', 'intro-revealing', 'intro-landed');
    root.classList.add('intro-complete');
    site.inert = false; overlay.remove();
    removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
    if (remember) try { localStorage.setItem('aeroskys:intro-seen', '1'); sessionStorage.setItem('aeroskys:intro-session', '1'); } catch { /* storage blocked */ }
    document.dispatchEvent(new Event('aeroskys:intro-complete'));
    delete window.aeroskysIntroBoot;
  }
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); finish(); } };
  const onVis = () => { if (document.hidden) finish(); };
  const onResize = () => finish();
  const reveal = () => { if (!revealed) { revealed = true; root.classList.add('intro-revealing'); } };

  function measure() {
    const end = header.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, mobile = vw <= 600;
    const width = Math.min(mobile ? vw - 72 : 410, 410), height = width * 190 / 959;
    const origin = { x: (vw - width) / 2, y: (vh - height) / 2 - (mobile ? 24 : 12) };
    // The logo image sits left-aligned inside .brand-crop; land on its actual drawn width.
    const endW = Math.min(end.width, end.height * 959 / 190);
    const destination = { x: end.left, y: end.top + (end.height - endW * 190 / 959) / 2 };
    const controls = [origin, { x: origin.x - Math.min(vw * .14, 150), y: origin.y - vh * .17 }, { x: Math.max(16, end.left - 22), y: end.top + Math.min(105, vh * .16) }, destination];
    const pickup = { x: origin.x + width * .14, y: origin.y - (mobile ? 33 : 43) };
    geometry = { vw, vh, mobile, width, height, end, endW, origin, controls, pickup, planeSize: mobile ? 27 : 33 };
    identity.style.width = width + 'px'; identity.style.height = height + 'px';
    identity.style.transform = tf(origin.x, origin.y); identity.style.visibility = 'visible';
  }
  function build() {
    const image = identity.querySelector('img');
    if (image?.animate) animations.push(image.animate([{ clipPath: 'inset(0 100% 0 0)', filter: 'blur(2px)', transform: 'translateY(5px)' }, { clipPath: 'inset(0 0 0 0)', filter: 'blur(0)', transform: 'translateY(0)' }], { delay: 180 * factor, duration: 1250 * factor, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }));
    else if (image) image.style.clipPath = 'inset(0)';
  }
  function placePlane(p, angle, s = 1, o = 1) {
    const h = geometry.planeSize / 2;
    plane.style.transform = `${tf(p.x - h, p.y - h, s)} rotate(${angle.toFixed(2)}deg)`;
    plane.style.opacity = String(o);
  }
  function connect(aircraft, brand, progress, o = 1) {
    const g = geometry, anchor = { x: brand.x + g.width * brand.scale * .14, y: brand.y + g.height * brand.scale * .12 };
    const tail = { x: aircraft.x + 6, y: aircraft.y + 9 };
    line.setAttribute('d', `M${tail.x.toFixed(1)} ${tail.y.toFixed(1)} Q${((tail.x + anchor.x) / 2 + 5 * (1 - progress)).toFixed(1)} ${((tail.y + anchor.y) / 2).toFixed(1)} ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}`);
    connection.style.opacity = String(o);
  }
  function flightState(progress) {
    const g = geometry, p = ease(progress), pos = point(...g.controls, p);
    const next = point(...g.controls, Math.min(1, p + .015)), prev = point(...g.controls, Math.max(0, p - .015));
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x) * 180 / Math.PI + 45;
    const scale = lerp(1, g.endW / g.width, p);
    const aircraft = { x: pos.x + g.width * scale * .14, y: Math.max(g.planeSize * .65, pos.y - lerp(g.mobile ? 33 : 43, 24, p)) };
    return { pos, scale, aircraft, angle };
  }
  function frame(now) {
    if (done) return;
    try {
      const t = now - startTime, g = geometry;
      if (!landed) skip.style.opacity = t > 600 * factor ? '1' : '0';
      if (boot.mode === 'reduced' || reduced.matches) {
        const p = clamp((t - 120) / 360);
        const img = identity.querySelector('img'); if (img) img.style.clipPath = `inset(0 ${((1 - ease(t / 180)) * 100).toFixed(1)}% 0 0)`;
        if (t > 120) reveal();
        curtain.style.opacity = String(1 - ease(p)); identity.style.opacity = String(1 - ease(p));
        if (t >= 480) { finish(); return; }
      } else if (t >= 1780 * factor && t < times.pickup) {
        const p = ease((t - 1780 * factor) / (times.pickup - 1780 * factor));
        const a = { x: g.vw + 50, y: g.pickup.y - 35 }, b = { x: g.vw * .8, y: g.pickup.y - 65 }, c = { x: g.pickup.x + 110, y: g.pickup.y + 35 };
        const pos = point(a, b, c, g.pickup, p), before = point(a, b, c, g.pickup, Math.max(0, p - .01));
        placePlane(pos, Math.atan2(pos.y - before.y, pos.x - before.x) * 180 / Math.PI + 45, lerp(.88, 1, p), clamp(p * 6));
      } else if (t >= times.pickup && t < times.lift) {
        const p = clamp((t - times.pickup) / (times.lift - times.pickup));
        placePlane(g.pickup, lerp(-117, flightState(0).angle, ease(p)));
        connect(g.pickup, { ...g.origin, scale: 1 }, 0, ease(p));
      } else if (t >= times.lift) {
        reveal();
        const p = clamp((t - times.lift) / (times.land - times.lift));
        const s = flightState(p);
        identity.style.transform = tf(s.pos.x, s.pos.y, s.scale);
        if (t < times.land) {
          placePlane(s.aircraft, s.angle, lerp(1, .83, p));
          connect(s.aircraft, { ...s.pos, scale: s.scale }, p, 1);
          const cover = Math.max(s.pos.y + g.height * s.scale + lerp(50, 12, p), g.vh * (1 - ease(p)));
          curtain.style.transform = `scaleY(${(cover / g.vh).toFixed(4)})`;
        } else {
          if (!landed) { landed = true; root.classList.add('intro-landed'); identity.style.visibility = 'hidden'; site.inert = false; overlay.style.pointerEvents = 'none'; }
          const exit = clamp((t - times.land) / (times.end - times.land)), e = ease(exit);
          const pos = point(s.aircraft, { x: s.aircraft.x + 18, y: s.aircraft.y - 35 }, { x: s.aircraft.x + Math.min(120, g.vw * .25), y: -70 }, { x: s.aircraft.x + Math.min(190, g.vw * .35), y: -110 }, e);
          placePlane(pos, lerp(s.angle, 13, e), lerp(.83, .55, e), 1 - ease(clamp((exit - .45) / .55)));
          connection.style.opacity = '0';
          curtain.style.transform = `scaleY(${((g.end.bottom + 12) / g.vh * (1 - ease(clamp(exit * 1.7)))).toFixed(4)})`;
          curtain.style.opacity = String(1 - ease(clamp(exit * 1.7)));
          skip.style.opacity = '0';
        }
        if (t >= times.end) { finish(); return; }
      }
      raf = requestAnimationFrame(frame);
    } catch { finish({ remember: false }); }
  }
  function begin() {
    if (started || done) return; started = true; clearTimeout(startTimer);
    if (!root.classList.contains('intro-pending') || scrollY > 80 || document.hidden) { finish(); return; }
    measure();
    if (!geometry.end.width) { finish({ remember: false }); return; }
    root.classList.add('intro-running');
    if (boot.mode !== 'reduced' && !reduced.matches) build();
    startTime = performance.now(); raf = requestAnimationFrame(frame);
    clearTimeout(boot.deadline);
    safetyTimer = setTimeout(() => finish({ remember: false }), boot.mode === 'reduced' ? 900 : Math.min(5000, times.end + 500));
  }
  site.inert = true;
  skip.addEventListener('click', () => finish());
  document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis);
  addEventListener('resize', onResize, { passive: true });
  const source = header.querySelector('img');
  startTimer = setTimeout(() => finish({ remember: false }), 1400);
  if (source.complete && source.naturalWidth) begin();
  else if (source.decode) source.decode().then(begin, () => finish({ remember: false }));
  else { source.addEventListener('load', begin, { once: true }); source.addEventListener('error', () => finish({ remember: false }), { once: true }); }
}
