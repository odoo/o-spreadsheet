let size = 1000;
export function setMockSize(s) {
  size = s;
}

/* js-ignore */
Object.assign(HTMLCanvasElement.prototype, {
  getContext: jest.fn(function() {
    return {
      translate() {},
      scale() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillRect() {},
      strokeRect() {},
      fillText() {},
      fill() {},
      save() {},
      rect() {},
      clip() {},
      restore() {},
      setLineDash() {},
      measureText() {
        return { width: size };
      }
    };
  })
});
