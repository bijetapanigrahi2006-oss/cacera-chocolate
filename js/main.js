/* ==========================================================================
   CACERA — main
   Smooth scroll, theme, navigation, loader, reveals and section motion.
   GSAP, ScrollTrigger and Lenis are loaded as deferred globals in index.html.
   ========================================================================== */

import { initHeroSequence } from './hero-sequence.js';

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const root = document.documentElement;
const reduced = prefersReducedMotion.matches;
const { gsap, ScrollTrigger } = window;

gsap.registerPlugin(ScrollTrigger);
if (!reduced) root.classList.add('motion-ok');

/* ---------- Smooth scroll ---------- */
let lenis = null;

if (!reduced && window.Lenis) {
  lenis = new window.Lenis({
    duration: 1.6,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    smoothWheel: true,
    wheelMultiplier: 0.8,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
}

/* ---------- Theme toggle ---------- */
const themeToggle = document.querySelector('[data-theme-toggle]');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme, persist) {
  root.setAttribute('data-theme', theme);
  const isLight = theme === 'light';
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  if (themeMeta) themeMeta.content = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  if (persist) {
    try { localStorage.setItem('cacera-theme', theme); } catch (e) { /* storage unavailable */ }
  }
}

applyTheme(root.getAttribute('data-theme') || 'dark', false);
themeToggle.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
});

/* ---------- Navigation ---------- */
const header = document.querySelector('[data-header]');
const menu = document.querySelector('[data-menu]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const pager = document.querySelector('.pager');

function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const target = id.length > 1 ? document.querySelector(id) : null;
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    scrollToTarget(target);
  });
});

/* Header + pager: switch to stage colors over dark cinematic sections,
   and mark the current section in nav + pager. */
const sections = [...document.querySelectorAll('main > section')];
const stageSections = sections.filter((s) => s.classList.contains('stage'));

let currentId = '';

function markCurrent(id) {
  if (id === currentId) return;
  currentId = id;
  document.querySelectorAll('[data-pager], .site-nav__links a').forEach((a) => {
    const match = a.getAttribute('href') === `#${id}`;
    if (match) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}

function updateChrome() {
  const headerLine = header.offsetHeight / 2;
  const pagerLine = window.innerHeight / 2;
  const over = (y) => stageSections.some((s) => {
    const r = s.getBoundingClientRect();
    return r.top <= y && r.bottom >= y;
  });
  header.classList.toggle('on-stage', over(headerLine));
  header.classList.toggle('is-scrolled', window.scrollY > window.innerHeight * 0.5);
  pager.classList.toggle('on-stage', over(pagerLine));

  // Current section = the last one whose top has passed mid-screen
  // (checked every update, so instant jumps like the End key are handled too)
  const current = sections.filter((s) => s.getBoundingClientRect().top <= pagerLine).pop() || sections[0];
  markCurrent(current.id);
}

ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => {
    updateChrome();
    gsap.set('[data-scroll-progress]', { scaleX: self.progress });
  },
});
updateChrome();

/* ---------- Loader + hero ---------- */
const loader = document.querySelector('.loader');
const loaderCount = document.querySelector('[data-loader-count]');
const loaderFill = document.querySelector('.loader__fill');
let loaderClosed = false;

function closeLoader() {
  if (loaderClosed) return;
  loaderClosed = true;
  loader.classList.add('is-done');
  playIntro();
}

const hero = initHeroSequence({
  section: document.getElementById('hero'),
  canvas: document.querySelector('[data-hero-canvas]'),
  reduced,
  onProgress: (ratio) => {
    const pct = Math.round(ratio * 100);
    loaderCount.textContent = String(pct);
    loaderFill.style.setProperty('--progress', ratio.toFixed(3));
  },
  onReady: closeLoader,
});

// Never hold visitors on the loader for long
setTimeout(closeLoader, 6000);

/* Wordmark intro: slow, calm letter stagger */
const titleWord = document.querySelector('[data-split]');
const chars = [...titleWord.textContent].map((ch) => {
  const span = document.createElement('span');
  span.className = 'char';
  span.textContent = ch;
  return span;
});
titleWord.replaceChildren(...chars);
chars.forEach((span, i) => {
  span.style.backgroundPosition = `${(i / (chars.length - 1)) * 100}% 0`;
});

function playIntro() {
  if (reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  tl.from('.hero__beat--one .eyebrow', { opacity: 0, y: 16, duration: 1.4 }, 0.2)
    .from(chars, { opacity: 0, y: 32, filter: 'blur(8px)', duration: 1.8, stagger: 0.14 }, 0.4)
    .from('.hero__tagline', { opacity: 0, y: 16, duration: 1.6 }, 1.4)
    .from('.hero__cue', { opacity: 0, duration: 1.6 }, 1.8)
    .from('.hero__concept', { opacity: 0, y: 16, duration: 1.6 }, 2)
    .from('.site-header', { opacity: 0, y: -16, duration: 1.4 }, 1.2);
}

/* Scroll-driven hero beats */
if (!reduced) {
  const heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.6,
      onUpdate: (self) => hero.setProgress(self.progress),
    },
  });

  const veil = document.querySelector('.hero__veil');
  heroTl
    // Veil lifts as the bar is revealed
    .fromTo(veil, { '--dim': 0.55 }, { '--dim': 0.1, duration: 0.2 }, 0)
    .to('.hero__cue', { opacity: 0, duration: 0.05 }, 0.02)
    .to('.hero__beat--one', { autoAlpha: 0, y: -48, duration: 0.1 }, 0.1)
    // Beat 2 — during the unwrap
    .fromTo('.hero__beat--two', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.26)
    .to('.hero__beat--two', { autoAlpha: 0, y: -32, duration: 0.08 }, 0.5)
    // Beat 3 — after the burst, the veil deepens for legibility
    .to(veil, { '--dim': 0.5, duration: 0.14 }, 0.66)
    .fromTo('.hero__beat--three', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.72)
    .to({}, { duration: 0.18 }, 0.82);
}

/* ---------- Generic reveals ---------- */
if (!reduced) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      delay: parseFloat(el.dataset.revealDelay || '0'),
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------- Section motion ---------- */
if (!reduced) {
  // Origin: slow parallax inside the frame
  gsap.utils.toArray('[data-parallax]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
    });
  });

  // Craft: gold line draws down the timeline
  const timeline = document.querySelector('[data-timeline]');
  ScrollTrigger.create({
    trigger: timeline,
    start: 'top 60%',
    end: 'bottom 60%',
    scrub: true,
    onUpdate: (self) => timeline.style.setProperty('--progress', self.progress.toFixed(4)),
  });

  // Features: stats count up gently
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const state = { value: 0 };
    el.textContent = '0';
    gsap.to(state, {
      value: end,
      duration: 2.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = String(Math.round(state.value)); },
    });
  });
} else {
  document.querySelector('[data-timeline]').style.setProperty('--progress', '1');
}

/* ---------- Showcase: the product photo settles slowly as you scroll ---------- */
if (!reduced) {
  gsap.fromTo('[data-showcase-photo]', { scale: 1.12, yPercent: 4 }, {
    scale: 1,
    yPercent: -2,
    ease: 'none',
    scrollTrigger: { trigger: '#showcase', start: 'top bottom', end: 'bottom bottom', scrub: 1.6 },
  });
}

/* ---------- Reserve form ---------- */
const form = document.querySelector('[data-reserve-form]');
const status = document.querySelector('[data-reserve-status]');
const thanks = document.querySelector('[data-reserve-thanks]');
const thanksName = document.querySelector('[data-thanks-name]');
const thanksBox = document.querySelector('[data-thanks-box]');
const againButton = document.querySelector('[data-reserve-again]');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.elements.name;
  const email = form.elements.email;
  let firstInvalid = null;

  [name, email].forEach((field) => {
    const valid = field.checkValidity() && field.value.trim() !== '';
    field.setAttribute('aria-invalid', String(!valid));
    if (!valid && !firstInvalid) firstInvalid = field;
  });

  if (firstInvalid) {
    status.textContent = 'Please share your name and a valid email address.';
    firstInvalid.focus();
    return;
  }

  // Concept site: nothing is sent anywhere, so the thank-you says so plainly
  thanksName.textContent = `, ${name.value.trim().split(/\s+/)[0]}`;
  thanksBox.textContent = form.elements.box.value;
  status.textContent = '';
  form.reset();
  form.hidden = true;
  thanks.hidden = false;
  thanks.focus({ preventScroll: true });
  ScrollTrigger.refresh();
});

againButton.addEventListener('click', () => {
  thanks.hidden = true;
  form.hidden = false;
  [form.elements.name, form.elements.email].forEach((field) => field.removeAttribute('aria-invalid'));
  form.elements.name.focus();
  ScrollTrigger.refresh();
});

/* ---------- Misc ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

window.addEventListener('load', () => ScrollTrigger.refresh());
