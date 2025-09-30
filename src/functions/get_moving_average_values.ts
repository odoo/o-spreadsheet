import { Point } from "chart.js";
import { DEFAULT_WINDOW_SIZE } from "../constants";

export function getMovingAverageValues(
  dataset: number[],
  labels: number[],
  windowSize = DEFAULT_WINDOW_SIZE
): Point[] {
  const values: Point[] = [];
  // Fill the starting values with null until we have a full window
  for (let i = 0; i < windowSize - 1; i++) {
    values.push({ x: labels[i], y: NaN });
  }
  for (let i = 0; i <= dataset.length - windowSize; i++) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += dataset[j];
    }
    values.push({ x: labels[i + windowSize - 1], y: sum / windowSize });
  }
  return values;
}
