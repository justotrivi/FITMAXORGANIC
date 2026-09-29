// Renderiza los carruseles de SOCIAL a PNG 1080×1350 (y portadas de reel 1080×1920).
// Uso: NODE_PATH=$(npm root -g) node tools/disenos/render.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const carousels = require('./contenido-semana-01');

const OUT = path.join(__dirname, '../../contenido/semana-01/disenos');

const gold = (s = '') => s.replace(/\[\[(.+?)\]\]/g, '<span class="g">$1</span>');

const css = `
:root { --black:#0B0B0B; --white:#F6F4EF; --gold:#C8A24A; --gray:#8C8C8C; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1080px; height:1350px; overflow:hidden; font-family:'Montserrat',sans-serif; }
.slide { position:relative; width:1080px; height:1350px; padding:90px; display:flex; flex-direction:column; }
.dark { background:var(--black); color:var(--white); --fg:var(--white); --line:rgba(246,244,239,.22); --soft:rgba(246,244,239,.78); }
.light { background:var(--white); color:var(--black); --fg:var(--black); --line:rgba(11,11,11,.2); --soft:rgba(11,11,11,.72); }
.g { color:var(--gold); }
.top { display:flex; justify-content:space-between; font-size:22px; letter-spacing:.18em; color:var(--gray); font-weight:600; }
.content { flex:1; display:flex; flex-direction:column; justify-content:center; gap:40px; padding:40px 0; }
.hook .content { justify-content:flex-end; padding-bottom:80px; }
.kicker { font-size:26px; letter-spacing:.2em; text-transform:uppercase; color:var(--gray); font-weight:600; }
.num { font-size:170px; font-weight:800; line-height:.8; color:var(--gold); letter-spacing:-6px; }
h1 { font-weight:800; line-height:1.04; letter-spacing:-2px; }
.sub { font-size:38px; line-height:1.35; color:var(--soft); font-weight:400; max-width:860px; }
.note { font-size:28px; color:var(--gray); font-weight:500; }
.rule { width:120px; height:3px; background:var(--line); }
.bottom { display:flex; justify-content:space-between; align-items:center; font-size:22px; color:var(--gray); letter-spacing:.04em; }
.swipe { font-size:24px; letter-spacing:.2em; color:var(--fg); opacity:.85; font-weight:600; }
.code { flex:1; display:flex; align-items:center; justify-content:center; text-align:center; }
.code p { font-family:'Playfair Display',serif; font-style:italic; font-size:76px; line-height:1.2; max-width:820px; }
.strike { list-style:none; display:flex; flex-direction:column; gap:18px; }
.strike li { font-size:40px; color:var(--gray); text-decoration:line-through; text-decoration-thickness:2px; }
.box { border:2px solid var(--line); padding:30px 36px; font-size:38px; line-height:1.3; font-weight:600; }
.compare { display:grid; grid-template-columns:1fr 1fr; gap:28px; }
.profile { border:2px solid var(--line); border-radius:28px; padding:34px 30px; min-height:560px; }
.profile.dim { opacity:.55; }
.plabel { font-size:26px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; margin-bottom:30px; }
.phead { display:flex; align-items:center; gap:18px; margin-bottom:28px; }
.avatar { width:84px; height:84px; border-radius:50%; background:var(--line); }
.pname { font-size:24px; font-weight:700; }
.pbio { font-size:30px; line-height:1.45; }
.wave { display:flex; align-items:center; gap:8px; height:120px; }
.wave i { display:block; width:10px; background:var(--gray); border-radius:5px; }
.wave .arrow { font-size:48px; color:var(--gray); margin:0 28px; }
.doc { display:flex; flex-direction:column; gap:14px; }
.doc b { display:block; height:10px; width:220px; background:var(--line); border-radius:5px; }
.doc b:nth-child(2) { width:180px; } .doc b:nth-child(3) { width:200px; }
.cal { display:grid; grid-template-columns:repeat(7,56px); gap:10px; }
.cal i { display:block; height:56px; border:2px solid var(--line); }
.cal i.on { background:var(--line); }
.bubble { align-self:flex-start; background:rgba(246,244,239,.1); border-radius:24px 24px 24px 6px; padding:24px 30px; max-width:760px; }
.bubble p { font-size:30px; line-height:1.35; }
.bubble span { display:block; text-align:right; font-size:20px; color:var(--gray); margin-top:8px; }
.xlist { list-style:none; display:flex; flex-direction:column; gap:30px; }
.xlist li { font-size:46px; font-weight:600; display:flex; gap:28px; align-items:baseline; }
.xlist .x { color:var(--gray); font-size:34px; }
.lines { display:flex; flex-direction:column; gap:48px; margin-top:10px; }
.lines div { height:2px; background:var(--line); }
.bullets { list-style:none; display:flex; flex-direction:column; gap:18px; }
.bullets li { font-size:42px; font-weight:700; padding-left:40px; position:relative; }
.bullets li::before { content:''; position:absolute; left:0; top:24px; width:18px; height:3px; background:var(--fg); }
.stars { font-size:60px; letter-spacing:10px; color:var(--gray); }
.sticky { align-self:flex-start; background:var(--white); color:var(--black); padding:34px 40px; font-size:32px; font-weight:700; line-height:1.5; transform:rotate(-2deg); }
.sticky span { color:var(--gray); font-weight:400; }
/* Portada de reel 9:16 */
body.cover { height:1920px; }
.cover .slide { height:1920px; padding:250px 90px 400px; }
`;

// Fuentes locales (variables, subset latin de Google Fonts), embebidas para no depender de la red.
const font = (file) =>
  fs.readFileSync(path.join(__dirname, 'fuentes', file)).toString('base64');
const fontLink = `<style>
@font-face { font-family:'Montserrat'; font-style:normal; font-weight:100 900; src:url(data:font/woff2;base64,${font('Montserrat-normal.woff2')}) format('woff2'); }
@font-face { font-family:'Playfair Display'; font-style:italic; font-weight:400 900; src:url(data:font/woff2;base64,${font('PlayfairDisplay-italic.woff2')}) format('woff2'); }
</style>`;

function titleSize(t) {
  const n = t.replace(/\[\[|\]\]/g, '').length;
  if (n <= 32) return 96;
  if (n <= 48) return 84;
  if (n <= 64) return 76;
  return 68;
}

function slideHTML(c, s, i) {
  const total = String(c.slides.length).padStart(2, '0');
  const idx = String(i + 1).padStart(2, '0');
  const top = `<div class="top"><span>${c.series}</span><span>${idx}/${total}</span></div>`;
  const bottom = `<div class="bottom"><span>${carousels.sig}</span>${s.hook ? '<span class="swipe">DESLIZA →</span>' : ''}</div>`;
  let body;
  if (s.code) {
    body = `<div class="code"><p>${gold(s.code)}</p></div>`;
  } else {
    body = `<div class="content">
      ${s.kicker ? `<div class="kicker">${gold(s.kicker)}</div>` : ''}
      ${s.num ? `<div class="num">${s.num}</div>` : ''}
      ${s.title ? `<h1 style="font-size:${titleSize(s.title)}px">${gold(s.title)}</h1>` : ''}
      ${s.rule ? '<div class="rule"></div>' : ''}
      ${s.sub && !s.visual ? `<p class="sub">${gold(s.sub)}</p>` : ''}
      ${s.visual ? `${s.sub ? `<p class="sub">${gold(s.sub)}</p>` : ''}${gold(s.visual)}` : ''}
      ${s.note ? `<p class="note">${gold(s.note)}</p>` : ''}
    </div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>${css}</style></head>
  <body><div class="slide ${c.theme}${s.hook ? ' hook' : ''}">${top}${body}${bottom}</div></body></html>`;
}

function coverHTML(c) {
  return `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>${css}</style></head>
  <body class="cover"><div class="slide ${c.theme}">
    <div class="top"><span>${c.series}</span><span></span></div>
    <div class="content"><h1 style="font-size:104px">${gold(c.title)}</h1></div>
    <div class="bottom"><span>${carousels.sig}</span></div>
  </div></body></html>`;
}

async function shot(page, html, file, height) {
  await page.setViewportSize({ width: 1080, height });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => {
    const el = document.querySelector('.content') || document.querySelector('.code');
    return el.scrollHeight > el.clientHeight + 1;
  });
  await page.screenshot({ path: file });
  return overflow;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  for (const c of carousels) {
    const dir = path.join(OUT, `carrusel-${c.id}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const [i, s] of c.slides.entries()) {
      const file = path.join(dir, `${c.id}-${String(i + 1).padStart(2, '0')}.png`);
      if (await shot(page, slideHTML(c, s, i), file, 1350)) problems.push(file);
    }
  }
  const coverDir = path.join(OUT, 'portadas-reels');
  fs.mkdirSync(coverDir, { recursive: true });
  for (const c of carousels.covers) {
    const file = path.join(coverDir, `${c.id}.png`);
    if (await shot(page, coverHTML(c), file, 1920)) problems.push(file);
  }
  await browser.close();
  console.log(problems.length ? `Desbordes:\n${problems.join('\n')}` : 'OK: sin desbordes');
})();
