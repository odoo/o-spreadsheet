import { Font } from "../types/misc";

// Copied from `https://gist.github.com/alloyking/4154494`
export function doesFontExist(fontName: Font) {
  // creating our in-memory Canvas element where the magic happens
  let canvas, context;
  try {
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d")!;
  } catch {
    return true;
  }

  // the text whose final pixel size I want to measure
  const text = "abcdefghijklmnopqrstuvwxyz0123456789";

  // specifying the baseline font
  context.font = "72px monospace";

  // checking the size of the baseline text
  const baselineSize = context.measureText(text).width;

  // specifying the font whose existence we want to check
  context.font = "72px '" + fontName + "', monospace";

  // checking the size of the font we want to check
  const newSize = context.measureText(text).width;

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
