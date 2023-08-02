import { createValueStore } from "../store_engine/store";
import { GridRenderingContext } from "../types";

export const CanvasStore = createValueStore(
  (): GridRenderingContext => ({
    ctx: document.createElement("canvas").getContext("2d", { alpha: false })!,
    dpr: 1,
    thinLineWidth: 1,
  })
);
