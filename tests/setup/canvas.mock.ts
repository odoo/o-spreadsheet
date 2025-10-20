import { getContextFontSize } from "@odoo/o-spreadsheet-engine/helpers/text_helper";

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
  rotate() {}
  measureText(text: string) {
    const fontSize = getContextFontSize(this.font);
    return {
      width: fontSize * text.length || 0,
      fontBoundingBoxAscent: fontSize / 2,
      fontBoundingBoxDescent: fontSize / 2,
    };
  }
  drawImage() {}
  resetTransform() {}
}

const patch = {
  getContext: function () {
    return new MockCanvasRenderingContext2D() as any as CanvasRenderingContext2D;
  },
  toDataURL: function () {
    return "data:image/png;base64,randomDataThatIsActuallyABase64Image";
  },
};

/* js-ignore */
Object.assign(globalThis.HTMLCanvasElement.prototype, patch);
// @ts-ignore
globalThis.OffscreenCanvas = class OffscreenCanvas {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext = patch.getContext;
  convertToBlob = async () => {
    return new Blob([], { type: "image/png" });
  };
  toDataURL = patch.toDataURL;
};

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
