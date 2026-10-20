# Coin Space Math (CSM)

An interactive treatise on secp256k1 elliptic-curve math: continuous coordinate projections, Jacobian arithmetic, lattice reduction (LLL/BKZ, Babai), and an in-browser scalar multiplication engine.

Live: https://jaykk99.github.io/coin-space-math/

## Pages

- `index.html` — the master application: architecture overview, torsional geometry and lattice visualizers, the executable Python engine test bench, and a searchable representative chapter directory. Chapter cards link to their volume.
- `volume-1.html` — Volume I: Theoretical Foundations and Field Axioms (Ch. 1-250)
- `volume-2.html` — Volume II: Computational Architecture and Acceleration (Ch. 251-500)
- `volume-3.html` — Volume III: Cryptanalytic Reduction and Scalar Unification (Ch. 501-750)

Volume IV (Ch. 751-1000) is planned and not published yet.

## Run locally

```bash
python3 -m http.server
# open http://localhost:8000
```

Static HTML only. Math rendering uses KaTeX from the jsDelivr CDN, so the volume pages need internet for typeset formulas.
