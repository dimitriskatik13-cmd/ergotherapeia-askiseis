// Generator registry. Όλοι οι 12 generators συγκεντρωμένοι εδώ.

import * as zigzagPath    from "./zigzagPath.js";
import * as wavyPath      from "./wavyPath.js";
import * as pathTracing   from "./pathTracing.js";
import * as dotting       from "./dotting.js";
import * as colouring     from "./colouring.js";
import * as dotToDot      from "./dotToDot.js";
import * as circleFill    from "./circleFill.js";
import * as nestedShapes  from "./nestedShapes.js";
import * as patternCopy   from "./patternCopy.js";
import * as maze          from "./maze.js";
import * as mirrorDrawing from "./mirrorDrawing.js";
import * as spatialGrid   from "./spatialGrid.js";

const modules = [
  zigzagPath, wavyPath, pathTracing,
  dotting, colouring, dotToDot, circleFill,
  nestedShapes, patternCopy, maze,
  mirrorDrawing, spatialGrid,
];

export const registry = new Map(modules.map(m => [m.id, m]));

export function get(id) {
  return registry.get(id);
}

export function listIds() {
  return [...registry.keys()];
}

export function listAll() {
  return [...registry.values()];
}
