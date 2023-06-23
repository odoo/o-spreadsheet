import { GridRenderingContext } from "../types";
import { createValueStore } from "./dependency_container";

export const CanvasStore = createValueStore(
  (): GridRenderingContext => ({
    ctx: document.createElement("canvas").getContext("2d", { alpha: false })!,
    dpr: 1,
    thinLineWidth: 1,
  })
);
