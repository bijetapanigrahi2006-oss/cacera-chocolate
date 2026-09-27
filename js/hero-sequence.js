/* ==========================================================================
   CACERA — Hero frame sequence
   Draws assets/ezgif-frame-###.jpg onto a canvas, scrubbed by scroll.
   Calm by design: the drawn frame eases toward the scroll target.
   ========================================================================== */

const FRAME_COUNT = 240;
const EASE = 0.075;          // lower = calmer glide between frames
const PUSH_IN = 0.05;        // gentle zoom across the whole sequence
const FEATHER = 0.22;        // share of image width blended into the stage on each side
const READY_AT = 40;         // frames needed before the loader lifts
const CONCURRENCY = 6;
const KEY_FADE = 10;         // frames over which the HD opening still dissolves into the video

const pad = (i) => String(i + 1).padStart(3, '0');

/* Two frame sets:
   - HD: enhanced 1080×1608 WebP (letterbox already removed) for large / high-DPI screens
   - SD: original 720×1280 JPGs, cropped at draw time (letterbox + watermark) for phones */
const FRAME_SETS = {
  hd: { path: (i) => `assets/hero-hd/frame-${pad(i)}.webp`, crop: { sx: 0, sy: 0, sw: 1080, sh: 1608 } },
  sd: { path: (i) => `assets/ezgif-frame-${pad(i)}.jpg`, crop: { sx: 0, sy: 104, sw: 720, sh: 1072 } },
};
// The owner's HD still is pixel-aligned with frame 1 (already cropped to the same area)
const KEYFRAME = 'assets/hero-hd/keyframe-first.webp';
const HD_MIN_DEVICE_PX = 1100; // canvas height in device pixels above which HD frames are used

/** Coarse-to-fine load order, so any scroll position has a nearby frame early. */
function loadOrder() {
  const order = [];
  const seen = new Set();
  for (const stride of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < FRAME_COUNT; i += stride) {
      if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
  }
  if (!seen.has(FRAME_COUNT - 1)) order.push(FRAME_COUNT - 1);
  return order;
}

export function initHeroSequence({ section, canvas, reduced, onProgress, onReady }) {
  if (reduced) {
    // Static poster only (see reduced-motion CSS)
    section.classList.add('is-ready');
    onProgress?.(1);
    onReady?.();
    return { setProgress() {} };
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  const frames = new Array(FRAME_COUNT);
  const styles = getComputedStyle(document.documentElement);
  const stageBg = styles.getPropertyValue('--stage-bg').trim();
  const clear = styles.getPropertyValue('--transparent').trim();

  let loadedCount = 0;
  let isReady = false;
  let target = 0;
  let current = 0;
  let drawnSource = -1;
  let needsRedraw = true;
  let width = 0;
  let height = 0;
  let rafId = 0;
  let running = false;
  let keyframe = null;

  const dprNow = Math.min(window.devicePixelRatio || 1, 2);
  const set = canvas.clientHeight * dprNow > HD_MIN_DEVICE_PX ? FRAME_SETS.hd : FRAME_SETS.sd;
  const CROP = set.crop;

  /* ---------- Sizing ---------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.round(canvas.clientWidth * dpr);
    height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      needsRedraw = true;
    }
  }

  /* ---------- Drawing ---------- */
  function nearestLoaded(index) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (frames[index - d]) return index - d;
      if (frames[index + d]) return index + d;
    }
    return -1;
  }

  function draw(index) {
    const source = nearestLoaded(index);
    if (source < 0 || !width) return;

    const img = frames[source];
    const aspect = CROP.sw / CROP.sh;
    const viewAspect = width / height;
    const zoom = 1 + PUSH_IN * (current / (FRAME_COUNT - 1));
    const cover = viewAspect < 0.9; // portrait screens: fill edge to edge

    let dw;
    let dh;
    if (cover) {
      if (viewAspect > aspect) { dw = width; dh = width / aspect; } else { dh = height; dw = height * aspect; }
    } else {
      dh = height;
      dw = dh * aspect;
    }
    dw *= zoom;
    dh *= zoom;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;

    ctx.fillStyle = stageBg;
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, CROP.sx, CROP.sy, CROP.sw, CROP.sh, dx, dy, dw, dh);

    // Open on the true-HD still, dissolving into the video over the first frames
    if (keyframe && current < KEY_FADE) {
      const t = current / KEY_FADE;
      ctx.globalAlpha = 1 - t * t * (3 - 2 * t);
      ctx.drawImage(keyframe, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }

    if (!cover) {
      // Feather the frame's left/right edges into the stage so it reads as one scene
      const f = dw * FEATHER;
      const left = ctx.createLinearGradient(dx, 0, dx + f, 0);
      left.addColorStop(0, stageBg);
      left.addColorStop(1, clear);
      ctx.fillStyle = left;
      ctx.fillRect(dx - 1, 0, f + 1, height);

      const right = ctx.createLinearGradient(dx + dw, 0, dx + dw - f, 0);
      right.addColorStop(0, stageBg);
      right.addColorStop(1, clear);
      ctx.fillStyle = right;
      ctx.fillRect(dx + dw - f, 0, f + 1, height);
    }

    drawnSource = source;
    needsRedraw = false;
  }

  /* ---------- Loop (only while the hero is on screen) ---------- */
  function tick() {
    const diff = target - current;
    if (Math.abs(diff) > 0.01) {
      current += diff * EASE;
      needsRedraw = true;
    }
    const index = Math.round(current);
    if (needsRedraw || nearestLoaded(index) !== drawnSource) draw(index);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? start() : stop()));
  }).observe(section);

  new ResizeObserver(() => { resize(); draw(Math.round(current)); }).observe(canvas);
  resize();

  /* ---------- Loading ---------- */
  function markLoaded(i, img) {
    frames[i] = img;
    loadedCount++;
    if (!isReady) {
      onProgress?.(Math.min(loadedCount / READY_AT, 1));
      if (frames[0] && loadedCount >= READY_AT) {
        isReady = true;
        draw(Math.round(current));
        section.classList.add('is-ready');
        onReady?.();
      }
    }
    // A newly loaded frame may be closer to where we are than the one on screen
    const here = Math.round(current);
    if (Math.abs(i - here) < Math.abs(drawnSource - here)) needsRedraw = true;
  }

  async function loadFrame(i) {
    const img = new Image();
    img.decoding = 'async';
    img.src = set.path(i);
    try {
      await img.decode();
      markLoaded(i, img);
    } catch (e) {
      // Skip a broken frame; neighbours will cover for it
    }
  }

  const key = new Image();
  key.src = KEYFRAME;
  key.decode().then(() => {
    keyframe = key;
    needsRedraw = true;
  }).catch(() => { /* fall back to frame 1 */ });

  const queue = loadOrder();
  async function worker() {
    while (queue.length) await loadFrame(queue.shift());
  }
  for (let w = 0; w < CONCURRENCY; w++) worker();

  return {
    /** @param {number} progress 0–1 scroll progress through the hero */
    setProgress(progress) {
      target = Math.max(0, Math.min(1, progress)) * (FRAME_COUNT - 1);
    },
  };
}
