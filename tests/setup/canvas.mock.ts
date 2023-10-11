import { getContextFontSize } from "../../src/helpers/text_helper";

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
