import { MatrixArgFormat, MatrixArgValue, PrimitiveArgValue } from "../types";

export function mapValueAndFormat(
  nRows: number,
  nColumns: number,
  computeFormat: boolean,
  value_callback,
  format_callback
) {
  const returned = {
    value: Array(nColumns),
    format: computeFormat ? Array(nColumns) : undefined,
  };
  for (let i = 0; i < nColumns; i++) {
    returned.value[i] = Array(nRows);
    if (returned.format !== undefined) {
      returned.format[i] = Array(nRows);
    }
    for (let j = 0; j < nRows; j++) {
      returned.value[i][j] = value_callback(i, j) || 0;
      if (returned.format !== undefined) {
        returned.format[i][j] = format_callback(i, j);
      }
    }
  }
  return returned;
}

export function mapBothValueAndFormat(
  nRows: number,
  nColumns: number,
  values: MatrixArgValue | PrimitiveArgValue[][],
  formats: MatrixArgFormat | undefined,
  callback
) {
  return mapValueAndFormat(
    nRows,
    nColumns,
    formats !== undefined,
    (i, j) => callback(i, j, values),
    (i, j) => callback(i, j, formats)
  );
}
