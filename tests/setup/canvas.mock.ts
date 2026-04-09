import {
  Image,
  CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
  createCanvas,
} from "canvas";
import { DEFAULT_FONT_SIZE } from "../../src/constants";
import { fontSizeInPixels, getContextFontSize } from "../../src/helpers";

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
  roundRect() {}
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

const patchNodeCanvasCtx = {
  measureText: function (this: NodeCanvasRenderingContext2D, text: string) {
    return mockMeasureText.call(this, text);
  },
  fillText: function (this: NodeCanvasRenderingContext2D, text: string, x: number, y: number) {
    return mockFillText.call(this, text, x, y);
  },
  strokeText: function (this: NodeCanvasRenderingContext2D, text: string, x: number, y: number) {
    return mockStrokeText.call(this, text, x, y);
  },
};
Object.assign(NodeCanvasRenderingContext2D.prototype, patchNodeCanvasCtx);

/**
 * A sprite with all of the ascii letters. To draw text, we will cut the corresponding letter in the sprite and draw
 * it on the canvas.
 *
 * This avoids problems of OS-dependant font rendering.
 */
const characters = new Image();
characters.src =
  "data:image/png;base64,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";

// the data url image size
const imgWidth = 256;
const imgHeight = 256;
// individual characted bounding box
const cellWidth = 17;
const cellHeight = 17;
// char code for [0, 0]
const startIndex = 32;
// number of columns in image
const columns = Math.floor(imgWidth / cellWidth);
// number of rows in image
const rows = Math.floor(imgHeight / cellHeight);
// font height (in pixels)
const fontHeight = 16;
// the font widths by char code, starting at startIndex
const fontWidth = [
  4, 4, 6, 7, 7, 10, 9, 3, 4, 4, 5, 8, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 4, 4, 8, 8, 8, 8,
  13, 9, 9, 9, 9, 8, 8, 10, 9, 4, 7, 9, 8, 11, 9, 10, 9, 10, 9, 9, 8, 9, 9, 13, 9, 8, 7, 4, 4, 4, 8,
  7, 4, 8, 8, 7, 8, 8, 4, 8, 8, 4, 4, 7, 4, 12, 8, 8, 8, 8, 5, 6, 4, 8, 7, 11, 8, 7, 7, 5, 3, 5, 8,
  10, 7, 10, 4, 7, 7, 13, 7, 7, 4, 12, 9, 4, 14, 10, 7, 10, 10, 4, 4, 7, 7, 5, 7, 13, 4, 13, 6, 4,
  12, 10, 7, 8, 4, 4, 7, 7, 7, 7, 3, 7, 4, 10, 5, 7, 8, 4, 10, 7, 5, 7, 4, 4, 4, 7, 7, 4, 4, 4, 5,
  7, 11, 11, 11, 8, 9, 9, 9, 9, 9, 9, 13, 9, 8, 8, 8, 8, 4, 4, 4, 4, 9, 9, 10, 10, 10, 10, 10, 8,
  10, 9, 9, 9, 9, 8, 9, 8, 8, 8, 8, 8, 8, 8, 12, 7, 8, 8, 8, 8, 4, 4, 4, 4, 8, 8, 8, 8, 8, 8, 8, 7,
  8, 8, 8, 8, 8, 7, 8, 7,
];

// get coordinates and size for one character
function getChar(asciiCode) {
  const index = asciiCode - startIndex;
  const x = Math.min(index % columns, columns - 1);
  const y = Math.min(Math.floor(index / columns), rows - 1);
  return { sx: x * cellWidth, sy: y * cellHeight, w: fontWidth[index], h: fontHeight };
}

function mockMeasureText(this: NodeCanvasRenderingContext2D, text: string) {
  let width = 0;
  if (text && text.charCodeAt) {
    for (let i = 0; i < text.length; ++i) {
      width += fontWidth[Math.min(223, text.charCodeAt(i) - startIndex)];
    }
  }
  const fontSize = parseInt(this.font.match(/([0-9]+)px/)![1], 10);
  const scale = fontSize / fontSizeInPixels(DEFAULT_FONT_SIZE);

  return { width: width * scale } as TextMetrics;
}

// Single reusable off-screen canvas for character colorization (avoids per-draw allocations)
let _tmpCanvas: ReturnType<typeof createCanvas> | null = null;

/**
 * Draw a single character sprite tinted with the given color.
 */
function drawColoredChar(
  targetContext: NodeCanvasRenderingContext2D,
  color: string,
  charCode: number,
  destX: number,
  destY: number,
  scale: number
) {
  const { sx: sourceX, sy: sourceY, w: sourceWidth, h: sourceHeight } = getChar(charCode);
  const scaledWidth = Math.ceil(sourceWidth * scale);
  const scaledHeight = Math.ceil(sourceHeight * scale);
  if (!_tmpCanvas) {
    _tmpCanvas = createCanvas(scaledWidth, scaledHeight);
  } else {
    _tmpCanvas.width = scaledWidth;
    _tmpCanvas.height = scaledHeight;
  }
  const tmpCtx = _tmpCanvas.getContext("2d");
  tmpCtx!.drawImage(
    characters,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    scaledWidth,
    scaledHeight
  );
  // Re-colorize: keep the sprite's alpha mask but replace the black pixels with the desired color
  tmpCtx!.globalCompositeOperation = "source-in";
  tmpCtx!.fillStyle = color;
  tmpCtx!.fillRect(0, 0, scaledWidth, scaledHeight);
  tmpCtx!.globalCompositeOperation = "source-over";
  targetContext.drawImage(
    _tmpCanvas!,
    0,
    0,
    scaledWidth,
    scaledHeight,
    destX,
    destY,
    scaledWidth,
    scaledHeight
  );
}

function mockFillText(this: NodeCanvasRenderingContext2D, text: string, x: number, y: number) {
  if (text && text.charCodeAt) {
    const align = this.textAlign;
    if (align === "center" || align === "right") {
      const w = this.measureText(text).width;
      x -= align === "center" ? w / 2 : w;
    }
    if (this.textBaseline === "middle") {
      y -= fontHeight / 2;
    }

    const fontSize = parseInt(this.font.match(/([0-9]+)px/)![1], 10);
    const scale = fontSize / fontSizeInPixels(DEFAULT_FONT_SIZE);

    for (let i = 0; i < text.length; ++i) {
      const charCode = text.charCodeAt(i);
      drawColoredChar(this, this.fillStyle as string, charCode, x, y, scale);
      x += getChar(charCode).w * scale;
    }
  }
}

function mockStrokeText(this: NodeCanvasRenderingContext2D, text: string, x: number, y: number) {
  if (text && text.charCodeAt) {
    const align = this.textAlign;
    if (align === "center" || align === "right") {
      const w = this.measureText(text).width;
      x -= align === "center" ? w / 2 : w;
    }
    if (this.textBaseline === "middle") {
      y -= fontHeight / 2;
    }

    const fontSize = parseInt(this.font.match(/([0-9]+)px/)![1], 10);
    const scale = fontSize / fontSizeInPixels(DEFAULT_FONT_SIZE);

    // Draw the outline by rendering each character at 8 surrounding offsets
    const offsets = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];
    let cx = x;
    for (let i = 0; i < text.length; ++i) {
      const charCode = text.charCodeAt(i);
      for (const [dx, dy] of offsets) {
        drawColoredChar(this, this.strokeStyle as string, charCode, cx + dx, y + dy, scale);
      }
      cx += getChar(charCode).w * scale;
    }
  }
}
