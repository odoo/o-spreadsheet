import { Font, FontDescriptor } from "../types/misc";

// Copied from `https://gist.github.com/alloyking/4154494`
function doesFontExist(ctx: OffscreenCanvasRenderingContext2D, fontName: Font): boolean {
  // the text whose final pixel size I want to measure
  ctx.save();
  const text = "abcdefghijklmnopqrstuvwxyz0123456789";

  // specifying the baseline font
  ctx.font = "72px monospace";

  // checking the size of the baseline text
  const baselineSize = ctx.measureText(text).width;

  // specifying the font whose existence we want to check
  ctx.font = "72px '" + fontName + "', monospace";

  // checking the size of the font we want to check
  const newSize = ctx.measureText(text).width;
  ctx.restore();
  //
  // If the size of the two text instances is the same, the font does not exist because it is being rendered
  // using the default sans-serif font
  //
  if (newSize === baselineSize) {
    return false;
  } else {
    return true;
  }
}

export function filterUnusableFonts(fonts: Readonly<FontDescriptor[]>): FontDescriptor[] {
  if (!globalThis.OffscreenCanvas) {
    return [];
  }
  const context = new OffscreenCanvas(20, 20).getContext("2d");
  if (!context) {
    return [];
  }
  return fonts.filter((f) => f && doesFontExist(context, f.name), fonts);
}
