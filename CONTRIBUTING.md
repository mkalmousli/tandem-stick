# Contributing

- `npm test` runs the design checks (model, BOM, Gerbers, STL). Keep it green.
- Part sizes, case rules, BOM and costs live in `web/explorer/src/data.js`; everything else derives from them.
- After changing the board: `python3 hardware/build_board.py && python3 hardware/drc.py report.txt`, then `npm run stl` if case geometry changed.
- `npm run serve` builds `dist/` and serves it on http://localhost:8765.
- Do not claim hardware results that were not measured; mark planned work as planned.
