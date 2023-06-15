function nomInconnu(values, formats, value_callback, format_callback) {
  const nColumns = values[0].length;
  const nRows = values.length;
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

function nomInconnu2(values, formats, callback) {
  return nomInconnu(
    values,
    formats,
    (i, j) => callback(i, j, values),
    (i, j) => callback(i, j, formats)
  );
}
