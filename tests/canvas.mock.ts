let size = 1000;
export function setMockSize(s) {
  size = s;
}

export class MockCanvasRenderingContext2D {
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
  measureText() {
    return { width: size };
  }
}

const patch = {
  getContext: function () {
    return (new MockCanvasRenderingContext2D() as any) as CanvasRenderingContext2D;
  },
};
/* js-ignore */
Object.assign(HTMLCanvasElement.prototype, patch);
