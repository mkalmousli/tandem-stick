// Writes the design numbers the Blender scene needs (case, chips, passives) as JSON on stdout.
import { loadData } from "../../tests/lib/webapp.mjs";

const { DIM, CHIPS, PASSIVES } = loadData();
const chips = CHIPS.map(({ id, look, pos, size, legs }) => ({ id, look, pos, size, legs }));
console.log(JSON.stringify({ DIM, chips, passives: PASSIVES }));
