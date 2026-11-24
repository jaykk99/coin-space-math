Live: https://jaykk99.github.io/coin-space-math/

# Coin Space Math (CSM)

An interactive treatise on secp256k1 elliptic-curve math: continuous coordinate projections, Jacobian arithmetic, lattice reduction (LLL/BKZ, Babai), and an in-browser scalar multiplication engine.

Live: https://jaykk99.github.io/coin-space-math/

## Pages

- `index.html` — the master application: architecture overview, torsional geometry and lattice visualizers, the executable Python engine test bench, a searchable representative chapter directory, and a glossary of terms. Chapter cards link to their volume. Tabs are deep-linkable via URL hash (e.g. `#geometry`).
- `volume-1.html` — Volume I: Theoretical Foundations and Field Axioms (Ch. 1-250)
- `volume-2.html` — Volume II: Computational Architecture and Acceleration (Ch. 251-500)
- `volume-3.html` — Volume III: Cryptanalytic Reduction and Scalar Unification (Ch. 501-750)

Volume IV (Ch. 751-1000) is planned and not published yet.

## Tests

```bash
node test/verify.cjs   # 20 checks, no dependencies
```

Loads the real page script into a stub DOM and checks the engine computes
the true k·G (verified against known secp256k1 vectors), scalar range
rejection, Chart.js-missing resilience, lattice output, chapter search /
volume filter, and tab switching.

## Run locally

```bash
python3 -m http.server
# open http://localhost:8000
```

Static HTML only. Math rendering uses KaTeX from the jsDelivr CDN, so the volume pages need internet for typeset formulas.
