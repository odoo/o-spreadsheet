import {
  DEFAULT_FONT,
  SCORECARD_GAUGE_CHART_FONT_SIZE,
  SCORECARD_GAUGE_CHART_PADDING,
} from "../../../constants";
import { Color, PixelPosition, Rect } from "../../../types";
import { GaugeChartRuntime } from "../../../types/chart";
import { relativeLuminance } from "../../color";
import { clip } from "../../misc";
import {
  computeTextDimension,
  computeTextWidth,
  getDefaultContextFont,
  getFontSizeMatchingWidth,
} from "../../text_helper";

export const GAUGE_PADDING_SIDE = 30;
export const GAUGE_PADDING_TOP = 10;
export const GAUGE_PADDING_BOTTOM = 20;
export const GAUGE_LABELS_FONT_SIZE = 12;
export const GAUGE_DEFAULT_VALUE_FONT_SIZE = 80;

const GAUGE_BACKGROUND_COLOR = "#F3F2F1";
export const GAUGE_TEXT_COLOR = "#666666";
export const GAUGE_TEXT_COLOR_HIGH_CONTRAST = "#C8C8C8";
const GAUGE_INFLECTION_MARKER_COLOR = "#666666aa";
const GAUGE_INFLECTION_LABEL_BOTTOM_MARGIN = 6;

export const GAUGE_TITLE_SECTION_HEIGHT = 25;
export const GAUGE_TITLE_FONT_SIZE = SCORECARD_GAUGE_CHART_FONT_SIZE;
export const GAUGE_TITLE_PADDING_LEFT = SCORECARD_GAUGE_CHART_PADDING;
export const GAUGE_TITLE_PADDING_TOP = SCORECARD_GAUGE_CHART_PADDING;

interface RenderingParams {
  width: number;
  height: number;
  title: TextProperties & { bold?: boolean; italic?: boolean };
  backgroundColor: Color;
  gauge: {
    rect: Rect;
    arcWidth: number;
    percentage: number;
    color: Color;
  };
  inflectionValues: InflectionValue[];
  gaugeValue: TextProperties;
  minLabel: TextProperties;
  maxLabel: TextProperties;
}

interface TextProperties {
  label: string;
  textPosition: PixelPosition;
  fontSize: number;
  color: Color;
}

interface InflectionValue {
  rotation: number;
  label: string;
  fontSize: number;
  color: Color;
  offset: number;
}

interface UnalignedRectangle {
  topLeft: PixelPosition;
  topRight: PixelPosition;
  bottomRight: PixelPosition;
  bottomLeft: PixelPosition;
}

interface Segment {
  start: PixelPosition;
  end: PixelPosition;
}

export function drawGaugeChart(canvas: HTMLCanvasElement, runtime: GaugeChartRuntime) {
  const canvasBoundingRect = canvas.getBoundingClientRect();
  canvas.width = canvasBoundingRect.width;
  canvas.height = canvasBoundingRect.height;
  const ctx = canvas.getContext("2d")!;

  const config = getGaugeRenderingConfig(canvasBoundingRect, runtime, ctx);
  drawBackground(ctx, config);
  drawGauge(ctx, config);
  drawInflectionValues(ctx, config);
  drawLabels(ctx, config);
  drawTitle(ctx, config);
}

function drawGauge(ctx: CanvasRenderingContext2D, config: RenderingParams) {
  ctx.save();
  const gauge = config.gauge;

  const arcCenterX = gauge.rect.x + gauge.rect.width / 2;
  const arcCenterY = gauge.rect.y + gauge.rect.height;
  const arcRadius = gauge.rect.height - gauge.arcWidth / 2;
  if (arcRadius < 0) {
    return;
  }

  const gaugeAngle = gauge.percentage === 1 ? 0 : Math.PI * (1 + gauge.percentage);

  // Gauge background
  ctx.strokeStyle = GAUGE_BACKGROUND_COLOR;
  ctx.beginPath();
  ctx.lineWidth = gauge.arcWidth;
  ctx.arc(arcCenterX, arcCenterY, arcRadius, gaugeAngle, 0);
  ctx.stroke();

  // Gauge value
  ctx.strokeStyle = gauge.color;
  ctx.beginPath();
  ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, gaugeAngle);
  ctx.stroke();

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, config: RenderingParams) {
  ctx.save();
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, config.width, config.height);
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, config: RenderingParams) {
  for (const label of [config.minLabel, config.maxLabel, config.gaugeValue]) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = label.color;
    ctx.font = `${label.fontSize}px ${DEFAULT_FONT}`;
    ctx.fillText(label.label, label.textPosition.x, label.textPosition.y);
    ctx.restore();
  }
}

function drawInflectionValues(ctx: CanvasRenderingContext2D, config: RenderingParams) {
  const { x: rectX, y: rectY, width, height } = config.gauge.rect;
  for (const inflectionValue of config.inflectionValues) {
    ctx.save();
    ctx.translate(rectX + width / 2 - 0.5, rectY + height - 0.5); // -0.5 for sharper lines. see RendererPlugin.drawBorders comment
    ctx.rotate(Math.PI / 2 - inflectionValue.rotation);

    ctx.lineWidth = 2;
    ctx.strokeStyle = GAUGE_INFLECTION_MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, -(height - config.gauge.arcWidth));
    ctx.lineTo(0, -height - 3);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = `${inflectionValue.fontSize}px ${DEFAULT_FONT}`;
    ctx.fillStyle = inflectionValue.color;
    const textY = -height - GAUGE_INFLECTION_LABEL_BOTTOM_MARGIN - inflectionValue.offset;
    ctx.fillText(inflectionValue.label, 0, textY);
    ctx.restore();
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, config: RenderingParams) {
  ctx.save();
  const title = config.title;
  ctx.font = getDefaultContextFont(title.fontSize, title.bold, title.italic);
  ctx.textBaseline = "middle";
  ctx.fillStyle = title.color;
  ctx.fillText(title.label, title.textPosition.x, title.textPosition.y);
  ctx.restore();
}

export function getGaugeRenderingConfig(
  boundingRect: Rect,
  runtime: GaugeChartRuntime,
  ctx: CanvasRenderingContext2D
): RenderingParams {
  const maxValue = runtime.maxValue;
  const minValue = runtime.minValue;
  const gaugeValue = runtime.gaugeValue;

  const gaugeRect = getGaugeRect(boundingRect, runtime.title.text);
  const gaugeArcWidth = gaugeRect.width / 6;

  const gaugePercentage = gaugeValue
    ? (gaugeValue.value - minValue.value) / (maxValue.value - minValue.value)
    : 0;

  const gaugeValuePosition = {
    x: boundingRect.width / 2,
    y: gaugeRect.y + gaugeRect.height - gaugeRect.height / 12,
  };

  let gaugeValueFontSize = GAUGE_DEFAULT_VALUE_FONT_SIZE;
  // Scale down the font size if the gaugeRect is too small
  if (gaugeRect.height < 300) {
    gaugeValueFontSize = gaugeValueFontSize * (gaugeRect.height / 300);
  }

  // Scale down the font size if the text is too long
  const maxTextWidth = gaugeRect.width / 2;
  const gaugeLabel = gaugeValue?.label || "-";
  if (computeTextWidth(ctx, gaugeLabel, { fontSize: gaugeValueFontSize }, "px") > maxTextWidth) {
    gaugeValueFontSize = getFontSizeMatchingWidth(
      maxTextWidth,
      gaugeValueFontSize,
      (fontSize: number) => computeTextWidth(ctx, gaugeLabel, { fontSize }, "px")
    );
  }

  const minLabelPosition = {
    x: gaugeRect.x + gaugeArcWidth / 2,
    y: gaugeRect.y + gaugeRect.height + GAUGE_LABELS_FONT_SIZE,
  };

  const maxLabelPosition = {
    x: gaugeRect.x + gaugeRect.width - gaugeArcWidth / 2,
    y: gaugeRect.y + gaugeRect.height + GAUGE_LABELS_FONT_SIZE,
  };

  const textColor = getContrastedTextColor(runtime.background);

  const inflectionValues = getInflectionValues(runtime, gaugeRect, textColor, ctx);

  let x: number = 0,
    titleWidth = 0,
    titleHeight = 0;
  if (runtime.title.text) {
    ({ width: titleWidth, height: titleHeight } = computeTextDimension(
      ctx,
      runtime.title.text,
      { ...runtime.title, fontSize: GAUGE_TITLE_FONT_SIZE },
      "px"
    ));
  }
  switch (runtime.title.align) {
    case "right":
      x = boundingRect.width - titleWidth - GAUGE_TITLE_PADDING_LEFT;
      break;
    case "center":
      x = (boundingRect.width - titleWidth) / 2;
      break;
    case "left":
    default:
      x = GAUGE_TITLE_PADDING_LEFT;
      break;
  }

  return {
    width: boundingRect.width,
    height: boundingRect.height,
    title: {
      label: runtime.title.text ?? "",
      fontSize: GAUGE_TITLE_FONT_SIZE,
      textPosition: {
        x,
        y: GAUGE_TITLE_PADDING_TOP + titleHeight / 2,
      },
      color: runtime.title.color ?? textColor,
      bold: runtime.title.bold,
      italic: runtime.title.italic,
    },
    backgroundColor: runtime.background,
    gauge: {
      rect: gaugeRect,
      arcWidth: gaugeArcWidth,
      percentage: clip(gaugePercentage, 0, 1),
      color: getGaugeColor(runtime),
    },
    inflectionValues,
    gaugeValue: {
      label: gaugeLabel,
      textPosition: gaugeValuePosition,
      fontSize: gaugeValueFontSize,
      color: textColor,
    },
    minLabel: {
      label: runtime.minValue.label,
      textPosition: minLabelPosition,
      fontSize: GAUGE_LABELS_FONT_SIZE,
      color: textColor,
    },
    maxLabel: {
      label: runtime.maxValue.label,
      textPosition: maxLabelPosition,
      fontSize: GAUGE_LABELS_FONT_SIZE,
      color: textColor,
    },
  };
}

/**
 * Get the rectangle in which the gauge will be drawn, based on the bounding rectangle of the canvas and leaving
 * space for the title and labels.
 */
function getGaugeRect(boundingRect: Rect, title?: string) {
  const titleHeight = title ? GAUGE_TITLE_SECTION_HEIGHT : 0;
  const drawHeight = boundingRect.height - GAUGE_PADDING_BOTTOM - titleHeight - GAUGE_PADDING_TOP;
  const drawWidth = boundingRect.width - GAUGE_PADDING_SIDE * 2;
  let gaugeWidth: number;
  let gaugeHeight: number;
  if (drawWidth > 2 * drawHeight) {
    gaugeWidth = 2 * drawHeight;
    gaugeHeight = drawHeight;
  } else {
    gaugeWidth = drawWidth;
    gaugeHeight = drawWidth / 2;
  }
  const gaugeX = GAUGE_PADDING_SIDE + (drawWidth - gaugeWidth) / 2;
  const gaugeY = titleHeight + GAUGE_PADDING_TOP + (drawHeight - gaugeHeight) / 2;
  return {
    x: gaugeX,
    y: gaugeY,
    width: gaugeWidth,
    height: gaugeHeight,
  };
}

/**
 * Get the infliction values of the gauge, and where to draw them (the angle from the center of the gauge at which they are drawn).
 *
 * Also compute an offset for the text so that it doesn't overlap with other text.
 */
function getInflectionValues(
  runtime: GaugeChartRuntime,
  gaugeRect: Rect,
  textColor: Color,
  ctx: CanvasRenderingContext2D
): InflectionValue[] {
  const maxValue = runtime.maxValue;
  const minValue = runtime.minValue;

  const gaugeCircleCenter = {
    x: gaugeRect.x + gaugeRect.width / 2,
    y: gaugeRect.y + gaugeRect.height,
  };
  const textStyle = { fontSize: GAUGE_LABELS_FONT_SIZE };

  const inflectionValues: InflectionValue[] = [];
  const inflectionValuesTextRects: UnalignedRectangle[] = [];
  for (const inflectionValue of runtime.inflectionValues) {
    const percentage = (inflectionValue.value - minValue.value) / (maxValue.value - minValue.value);

    const labelWidth = computeTextWidth(ctx, inflectionValue.label, textStyle, "px");
    const angle = Math.PI - Math.PI * percentage;

    const textRect = getRectangleTangentToCircle(
      angle, // angle between X axis and the point where the rectangle is tangent to the circle
      gaugeRect.height + GAUGE_INFLECTION_LABEL_BOTTOM_MARGIN, // radius of the gauge circle + margin below text
      gaugeCircleCenter.x, // center of the gauge circle
      gaugeCircleCenter.y, // center of the gauge circle
      labelWidth + 2, // width of the text + some margin
      GAUGE_LABELS_FONT_SIZE // height of the text
    );
    let offset = inflectionValuesTextRects.some((rect) => doRectanglesIntersect(rect, textRect))
      ? GAUGE_LABELS_FONT_SIZE
      : 0;
    inflectionValuesTextRects.push(textRect);

    inflectionValues.push({
      rotation: angle,
      label: inflectionValue.label,
      fontSize: GAUGE_LABELS_FONT_SIZE,
      color: textColor,
      offset,
    });
  }

  return inflectionValues;
}

function getGaugeColor(runtime: GaugeChartRuntime): Color {
  const gaugeValue = runtime.gaugeValue?.value;
  if (gaugeValue === undefined) {
    return GAUGE_BACKGROUND_COLOR;
  }
  let colorIndex = 0;
  while (runtime.inflectionValues[colorIndex]?.value <= gaugeValue) {
    colorIndex++;
  }
  return runtime.colors[colorIndex];
}

function getContrastedTextColor(backgroundColor: Color) {
  return relativeLuminance(backgroundColor) > 0.3
    ? GAUGE_TEXT_COLOR
    : GAUGE_TEXT_COLOR_HIGH_CONTRAST;
}

function getSegmentsOfRectangle(rectangle: UnalignedRectangle): Segment[] {
  return [
    { start: rectangle.topLeft, end: rectangle.topRight },
    { start: rectangle.topRight, end: rectangle.bottomRight },
    { start: rectangle.bottomRight, end: rectangle.bottomLeft },
    { start: rectangle.bottomLeft, end: rectangle.topLeft },
  ];
}

/**
 * Check if two segment intersect. The case where the segments are colinear (both segments on the same line)
 * is not handled.
 */
function doSegmentIntersect(segment1: Segment, segment2: Segment): boolean {
  const A = segment1.start;
  const B = segment1.end;
  const C = segment2.start;
  const D = segment2.end;

  /**
   * Line segment intersection algorithm
   * https://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
   */
  function ccw(a: PixelPosition, b: PixelPosition, c: PixelPosition) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }

  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function doRectanglesIntersect(rect1: UnalignedRectangle, rect2: UnalignedRectangle): boolean {
  const segments1 = getSegmentsOfRectangle(rect1);
  const segments2 = getSegmentsOfRectangle(rect2);
  for (const segment1 of segments1) {
    for (const segment2 of segments2) {
      if (doSegmentIntersect(segment1, segment2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 *  Get the rectangle that is tangent to a circle at a given angle.
 *
 * @param angle angle between X axis and the point where the rectangle is tangent to the circle
 */
function getRectangleTangentToCircle(
  angle: number,
  radius: number,
  circleCenterX: number,
  circleCenterY: number,
  rectWidth: number,
  rectHeight: number
): UnalignedRectangle {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // x, y are the distance from the center of the circle to the point where the rectangle is tangent to the circle
  const x = cos * radius;
  const y = sin * radius;
  // x2, y2 are the distance from the point the rectangle is tangent to the circle to the bottom left corner of the rectangle
  const x2 = sin * (rectWidth / 2); // cos(angle + 90°) = sin(angle)
  const y2 = cos * (rectWidth / 2);

  const bottomRight = {
    x: x + x2 + circleCenterX,
    y: circleCenterY - (y - y2),
  };

  const bottomLeft = {
    x: x - x2 + circleCenterX,
    y: circleCenterY - (y + y2),
  };

  // Same as above but for the top corners of the rectangle (radius + rectangle height instead of radius)
  const xp = cos * (radius + rectHeight);
  const yp = sin * (radius + rectHeight);

  const topLeft = {
    x: xp - x2 + circleCenterX,
    y: circleCenterY - (yp + y2),
  };

  const topRight = {
    x: xp + x2 + circleCenterX,
    y: circleCenterY - (yp - y2),
  };

  return { bottomLeft, bottomRight, topRight, topLeft };
}
