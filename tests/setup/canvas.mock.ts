export class MockCanvasRenderingContext2D {
  font: string = "";
  translate() {}
  scale() {}
  clearRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  fillRect() {}
  strokeRect() {}
  fillText() {}
  fill() {}
  save() {}
  rect() {}
  clip() {}
  restore() {}
  setLineDash() {}
  measureText(text: string) {
    const fontSize = Number(this.font.match(/([0-9\.]*)px/)?.[1]);
    return { width: fontSize * text.length || 0 };
  }
  drawImage() {}
}

const patch = {
  getContext: function () {
    return new MockCanvasRenderingContext2D() as any as CanvasRenderingContext2D;
  },
};

/* js-ignore */
Object.assign(HTMLCanvasElement.prototype, patch);
