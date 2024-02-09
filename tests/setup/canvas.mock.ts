import { Color } from "chart.js";
import { getContextFontSize } from "../../src/helpers/text_helper";
import { Rect, RectBorder } from "../../src/types";

export class MockCanvasRenderingContext2D {
  font: string = "";
  fillStyle: string = "";
  translate() {}
  scale() {}
  clearRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  fillRect() {}
  strokeRect() {}
  fillText(text: string, x: number, y: number) {}
  fill() {}
  save() {}
  rect() {}
  clip() {}
  restore() {}
  setLineDash() {}
  measureText(text: string) {
    const fontSize = getContextFontSize(this.font);
    return { width: fontSize * text.length || 0 };
  }
  drawImage() {}
  resetTransform() {}
  /** Not a real canvas functions, but defining it here makes the testing easier */
  drawRectBorders(rect: Rect, borders: RectBorder[], lineWidth: number, color: Color) {}
}

const patch = {
  getContext: function () {
    return new MockCanvasRenderingContext2D() as any as CanvasRenderingContext2D;
  },
  toDataURL: function () {
    return "";
  },
};

/* js-ignore */
Object.assign(HTMLCanvasElement.prototype, patch);

if (!window.Path2D) {
  window.Path2D = class Path2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
    roundRect() {}
  };
}
