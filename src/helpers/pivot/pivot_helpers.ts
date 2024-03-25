/**
 * Build a pivot formula expression
 */
export function makePivotFormula(
  formula: "PIVOT.VALUE" | "PIVOT.HEADER",
  args: (string | boolean | number)[]
) {
  return `=${formula}(${args
    .map((arg) => {
      const stringIsNumber =
        typeof arg == "string" && !isNaN(Number(arg)) && Number(arg).toString() === arg;
      const convertToNumber = typeof arg == "number" || stringIsNumber;
      return convertToNumber ? `${arg}` : `"${arg.toString().replace(/"/g, '\\"')}"`;
    })
    .join(",")})`;
}

/**
 * Given an object of form {"1": {...}, "2": {...}, ...} get the maximum ID used
 * in this object
 * If the object has no keys, return 0
 *
 */
export function getMaxObjectId(o: object) {
  const keys = Object.keys(o);
  if (!keys.length) {
    return 0;
  }
  const nums = keys.map((id) => parseInt(id, 10));
  const max = Math.max(...nums);
  return max;
}
