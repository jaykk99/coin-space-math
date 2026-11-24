// Repro harness for coin-space-math index.html inline app script.
// Loads the real page script into a stub DOM (no deps) and checks behaviours.
// Usage: node test/verify.cjs  (run from the repo root; reads index.html)
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
// inline app script = the last <script>...</script> block without a src
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (blocks.length !== 1) { console.log('expected exactly 1 inline script, got ' + blocks.length); process.exit(2); }
const src = blocks[0];

const P = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
const N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const Gx = BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798');
const Gy = BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8');
function onCurve(x, y) { return (y * y - (x * x * x + 7n)) % P === 0n; }
function mul(k) { // reference double-and-add (affine, for expected values)
  const add = (A, B) => {
    if (!A) return B; if (!B) return A;
    const [x1, y1] = A, [x2, y2] = B;
    if (x1 === x2 && (y1 + y2) % P === 0n) return null;
    let l;
    if (A[0] === B[0] && A[1] === B[1]) l = (3n * x1 * x1) * modInv(2n * y1) % P;
    else l = ((y2 - y1) % P) * modInv((x2 - x1) % P) % P;
    const x3 = (((l * l - x1 - x2) % P) + P) % P;
    return [x3, (((l * (x1 - x3) - y1) % P) + P) % P];
  };
  let R = null, Q = [Gx, Gy];
  while (k > 0n) { if (k & 1n) R = add(R, Q); Q = add(Q, Q); k >>= 1n; }
  return R;
}
function modInv(a) { return modPow(((a % P) + P) % P, P - 2n); }
function modPow(b, e) { let r = 1n; while (e) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }

function makeCtx() {
  return new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (...a) => undefined : undefined), set: () => true });
}

function buildEnv(withChart) {
  const els = {};
  const gridChildren = [];
  function el(id) {
    if (!els[id]) {
      const e = {
        id, value: '', innerText: '', innerHTML: '', style: {}, title: '',
        classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
        setAttribute(k, v) { this['@' + k] = v; },
        getAttribute(k) { return this['@' + k]; },
        addEventListener() {}, appendChild(c) { gridChildren.push(c); },
        getContext: () => makeCtx(),
      };
      els[id] = e;
    }
    return els[id];
  }
  // defaults matching the page markup
  el('scalarSlider').value = '25';
  el('zScaleSlider').value = '3';
  el('matN').value = '101';
  el('matQx').value = '37';
  el('execScalarInput').value = '0xF1A9C8B7E6D5';
  el('chapterSearch').value = '';
  el('volumeFilter').value = 'ALL';
  const grid = el('chapterGrid');
  const listeners = {};
  const sandbox = {
    console,
    document: {
      getElementById: (id) => el(id),
      createElement: () => el('__created' + Math.random()),
      querySelectorAll: (sel) => (sel === '.chapter-card' ? gridChildren : []),
      body: {},
      addEventListener: (t, fn) => { listeners[t] = fn; },
    },
    window: {},
    location: { hash: '' },
    history: { replaceState: () => {} },
    setTimeout, clearTimeout,
  };
  sandbox.window.addEventListener = (t, fn) => { listeners['win:' + t] = fn; };
  sandbox.window.renderMathInElement = undefined;
  if (withChart) {
    sandbox.Chart = function (ctx, cfg) { this.data = cfg.data; this.update = () => {}; };
  }
  sandbox.window.Chart = sandbox.Chart;
  const vm = require('vm');
  vm.createContext(sandbox);
  return { sandbox, els, gridChildren, listeners, fire: (t) => listeners[t] && listeners[t]() };
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' -- ' + extra : '')); }
}

// ---- Test 1: Chart.js missing must not kill page init (chapters + hash routing) ----
{
  const env = buildEnv(false);
  let threw = null;
  try { require('vm').runInContext(src, env.sandbox); env.fire('win:DOMContentLoaded'); }
  catch (e) { threw = e; }
  check('1a DOMContentLoaded survives Chart.js missing', threw === null, threw && threw.message);
  check('1b chapter grid populated without Chart.js', env.gridChildren.length === 27, 'got ' + env.gridChildren.length);
}

// ---- Test 2: engine computes the real k*G and the claim is true ----
{
  const env = buildEnv(true);
  require('vm').runInContext(src, env.sandbox);
  env.fire('win:DOMContentLoaded');
  const run = env.sandbox.runPythonEngine;
  run();
  const out = env.els['engineConsole'].innerHTML;
  const mx = out.match(/Computed Affine X\s*:.*?0x([0-9A-F]+)/);
  const my = out.match(/Computed Affine Y\s*:.*?0x([0-9A-F]+)/);
  check('2a engine prints X and Y', !!(mx && my));
  if (mx && my) {
    const x = BigInt('0x' + mx[1]), y = BigInt('0x' + my[1]);
    const exp = mul(0xF1A9C8B7E6D5n);
    check('2b engine X/Y equal real k*G', x === exp[0] && y === exp[1],
      'got X=' + mx[1].slice(0, 16) + '... expected ' + exp[0].toString(16).slice(0, 16) + '...');
    check('2c printed point is on the curve', onCurve(x, y));
    check('2d page claims verified only when actually verified', !out.includes('verified on curve') || onCurve(x, y));
  }
  // scalar = 1 must give the generator itself
  env.els['execScalarInput'].value = '1';
  run();
  const out1 = env.els['engineConsole'].innerHTML;
  const m1 = out1.match(/Computed Affine X\s*:.*?0x([0-9A-F]+)/);
  check('2e scalar 1 gives generator G', !!m1 && BigInt('0x' + m1[1]) === Gx, m1 && m1[1].slice(0, 20));
  // scalar = 2 must give the known 2G
  env.els['execScalarInput'].value = '2';
  run();
  const out2 = env.els['engineConsole'].innerHTML;
  const m2 = out2.match(/Computed Affine X\s*:.*?0x([0-9A-F]+)/);
  const exp2 = mul(2n);
  check('2f scalar 2 gives known 2G', !!m2 && BigInt('0x' + m2[1]) === exp2[0], m2 && m2[1].slice(0, 20));
}

// ---- Test 3: scalar >= curve order n is rejected, not silently "verified" ----
{
  const env = buildEnv(true);
  require('vm').runInContext(src, env.sandbox);
  env.fire('win:DOMContentLoaded');
  env.els['execScalarInput'].value = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'; // n
  env.sandbox.runPythonEngine();
  const out = env.els['engineConsole'].innerHTML;
  check('3a scalar == n rejected', /out of range|must be between 1 and n/i.test(out), out.replace(/<[^>]+>/g, ' ').slice(0, 120));
  check('3b scalar == n prints no fake verified point', !/Computed Affine X/.test(out));
  env.els['execScalarInput'].value = '0';
  env.sandbox.runPythonEngine();
  check('3c scalar 0 rejected', /out of range/i.test(env.els['engineConsole'].innerHTML));
  env.els['execScalarInput'].value = '12x34';
  env.sandbox.runPythonEngine();
  check('3d malformed scalar rejected', /Invalid scalar/.test(env.els['engineConsole'].innerHTML));
}

// ---- Test 4: lattice run works without Chart.js and with odd inputs ----
{
  const env = buildEnv(false);
  require('vm').runInContext(src, env.sandbox);
  let threw = null;
  try { env.fire('win:DOMContentLoaded'); } catch (e) { threw = e; }
  check('4a DOMContentLoaded survives Chart.js missing (lattice page)', threw === null, threw && threw.message);
  threw = null;
  try { env.sandbox.runLatticeReduction(); } catch (e) { threw = e; }
  check('4a2 lattice reduction works without Chart.js', threw === null, threw && threw.message);
  const latHtml = (env.els['latticeResults'] && env.els['latticeResults'].innerHTML) || '';
  check('4b lattice output shows determinant 101', latHtml.includes('101'));
  env.els['matN'].value = '-5';
  try { env.sandbox.runLatticeReduction(); } catch (e) { /* recorded by 4a2-style check below */ }
  const latHtml2 = (env.els['latticeResults'] && env.els['latticeResults'].innerHTML) || '';
  check('4c negative n handled (no Infinity/NaN in output)', !/Infinity|NaN/.test(latHtml2));
}

// ---- Test 5: chapter filter + tabs still work ----
{
  const env = buildEnv(true);
  require('vm').runInContext(src, env.sandbox);
  env.fire('win:DOMContentLoaded');
  env.els['chapterSearch'].value = 'babai';
  env.sandbox.filterChapters();
  const visible = env.gridChildren.filter(c => !c.classList.contains('hidden'));
  check('5a search "babai" narrows to matching chapters', visible.length >= 1 && visible.length < 27, 'visible=' + visible.length);
  env.els['chapterSearch'].value = '';
  env.els['volumeFilter'].value = 'VOL2';
  env.sandbox.filterChapters();
  const vis2 = env.gridChildren.filter(c => !c.classList.contains('hidden'));
  check('5b VOL2 filter shows only VOL2 cards', vis2.length === 9 && vis2.every(c => c.getAttribute('data-vol') === 'VOL2'), 'visible=' + vis2.length);
  env.sandbox.switchTab('lattice');
  check('5c switchTab shows lattice, hides overview',
    !env.els['tab-lattice'].classList.contains('hidden') && env.els['tab-overview'].classList.contains('hidden'));
  check('5d switchTab with bad id falls back to overview', (() => { env.sandbox.switchTab('nope'); return !env.els['tab-overview'].classList.contains('hidden'); })());
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
