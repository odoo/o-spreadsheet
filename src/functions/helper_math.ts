export function nomInconnu(
  nRows: number,
  nColumns: number,
  values,
  formats,
  value_callback,
  format_callback
) {
  const returned = {
    value: Array(nColumns),
    format: formats ? Array(nColumns) : undefined,
  };
  for (let i = 0; i < nColumns; i++) {
    returned.value[i] = Array(nRows);
    if (returned.format !== undefined) {
      returned.format[i] = Array(nRows);
    }
    for (let j = 0; j < nRows; j++) {
      returned.value[i][j] = value_callback(i, j);
      if (returned.format !== undefined) {
        returned.format[i][j] = format_callback(i, j);
      }
    }
  }
  return returned;
}

export function nomInconnu2(nRows: number, nColumns: number, values, formats, callback) {
  return nomInconnu(
    nRows,
    nColumns,
    values,
    formats,
    (i, j) => callback(i, j, values),
    (i, j) => callback(i, j, formats)
  );
}
