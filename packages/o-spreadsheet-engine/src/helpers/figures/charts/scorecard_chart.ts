import { CHART_PADDING } from "../../../constants";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { ScorecardChartConfig } from "./scorecard_chart_config_builder";

const Path2DConstructor = globalThis.Path2D;
const arrowDownPath =
  Path2DConstructor &&
  new Path2DConstructor(
    "M8.6 4.8a.5.5 0 0 1 0 .75l-3.9 3.9a.5 .5 0 0 1 -.75 0l-3.8 -3.9a.5 .5 0 0 1 0 -.75l.4-.4a.5.5 0 0 1 .75 0l2.3 2.4v-5.7c0-.25.25-.5.5-.5h.6c.25 0 .5.25.5.5v5.8l2.3 -2.4a.5.5 0 0 1 .75 0z"
  );
const arrowUpPath =
  Path2DConstructor &&
  new Path2DConstructor(
    "M8.7 5.5a.5.5 0 0 0 0-.75l-3.8-4a.5.5 0 0 0-.75 0l-3.8 4a.5.5 0 0 0 0 .75l.4.4a.5.5 0 0 0 .75 0l2.3-2.4v5.8c0 .25.25.5.5.5h.6c.25 0 .5-.25.5-.5v-5.8l2.2 2.4a.5.5 0 0 0 .75 0z"
  );

type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawScoreChart(
  structure: ScorecardChartConfig,
  canvas: HTMLCanvasElement | OffscreenCanvas
) {
  const ctx = canvas.getContext("2d") as Canvas2DContext;
  if (!ctx) {
    throw new Error("Unable to retrieve 2D context from canvas");
  }
  const dpr = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;

  canvas.width = dpr * structure.canvas.width;
  canvas.height = dpr * structure.canvas.height;
  ctx.scale(dpr, dpr);
  const availableWidth = structure.canvas.width - CHART_PADDING;

  ctx.fillStyle = structure.canvas.backgroundColor;
  ctx.fillRect(0, 0, structure.canvas.width, structure.canvas.height);

  if (structure.title) {
    ctx.font = structure.title.style.font;
    ctx.fillStyle = structure.title.style.color;
    const baseline = ctx.textBaseline;
    ctx.textBaseline = "middle";
    ctx.fillText(
      clipTextWithEllipsis(ctx, structure.title.text, availableWidth - structure.title.position.x),
      structure.title.position.x,
      structure.title.position.y
    );
    ctx.textBaseline = baseline;
  }

  if (structure.baseline) {
    ctx.font = structure.baseline.style.font;
    ctx.fillStyle = structure.baseline.style.color;
    drawDecoratedText(
      ctx,
      structure.baseline.text,
      structure.baseline.position,
      structure.baseline.style.underline,
      structure.baseline.style.strikethrough
    );
  }

  if (structure.baselineArrow && structure.baselineArrow.style.size > 0 && Path2DConstructor) {
    ctx.save();
    ctx.fillStyle = structure.baselineArrow.style.color;
    ctx.translate(structure.baselineArrow.position.x, structure.baselineArrow.position.y);
    // This ratio is computed according to the original svg size and the final size we want
    const ratio = structure.baselineArrow.style.size / 10;
    ctx.scale(ratio, ratio);
    switch (structure.baselineArrow.direction) {
      case "down": {
        ctx.fill(arrowDownPath!);
        break;
      }
      case "up": {
        ctx.fill(arrowUpPath!);
        break;
      }
    }
    ctx.restore();
  }

  if (structure.baselineDescr) {
    const descr = structure.baselineDescr;
    ctx.font = descr.style.font;
    ctx.fillStyle = descr.style.color;
    ctx.fillText(
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position.x,
      descr.position.y
    );
  }

  if (structure.key) {
    ctx.font = structure.key.style.font;
    ctx.fillStyle = structure.key.style.color;
    drawDecoratedText(
      ctx,
      clipTextWithEllipsis(ctx, structure.key.text, availableWidth - structure.key.position.x),
      structure.key.position,
      structure.key.style.underline,
      structure.key.style.strikethrough
    );
  }

  if (structure.keyDescr) {
    const descr = structure.keyDescr;
    ctx.font = structure.keyDescr?.style.font ?? descr.style.font;
    ctx.fillStyle = descr.style.color;
    ctx.fillText(
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position.x,
      descr.position.y
    );
  }

  if (structure.progressBar) {
    ctx.fillStyle = structure.progressBar.style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      structure.progressBar.position.x,
      structure.progressBar.position.y,
      structure.progressBar.dimension.width,
      structure.progressBar.dimension.height,
      structure.progressBar.dimension.height / 2
    );
    ctx.fill();
    ctx.fillStyle = structure.progressBar.style.color;
    ctx.beginPath();
    if (structure.progressBar.value > 0) {
      ctx.roundRect(
        structure.progressBar.position.x,
        structure.progressBar.position.y,
        structure.progressBar.dimension.width *
          Math.max(0, Math.min(1.0, structure.progressBar.value)),
        structure.progressBar.dimension.height,
        structure.progressBar.dimension.height / 2
      );
    } else {
      const width =
        structure.progressBar.dimension.width *
        Math.max(0, Math.min(1.0, -structure.progressBar.value));
      ctx.roundRect(
        structure.progressBar.position.x + structure.progressBar.dimension.width - width,
        structure.progressBar.position.y,
        width,
        structure.progressBar.dimension.height,
        structure.progressBar.dimension.height / 2
      );
    }
    ctx.fill();
  }
}
