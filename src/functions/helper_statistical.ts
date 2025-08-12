import { _t } from "../translation";
import { NotAvailableError } from "../types/errors";
import { assert } from "./helpers";

export function assertSameNumberOfElements(...args: any[][]) {
  const dims = args[0].length;
  args.forEach((arg, i) =>
    assert(
      () => arg.length === dims,
      _t(
        "[[FUNCTION_NAME]] has mismatched dimensions for argument %s (%s vs %s).",
        i.toString(),
        dims.toString(),
        arg.length.toString()
      )
    )
  );
}

export function assertNonEmptyMatrix(matrix: any[][], argName: string) {
  assert(
    () => matrix.length > 0 && matrix[0].length > 0,
    _t("[[FUNCTION_NAME]] expects the provided values of %(argName)s to be a non-empty matrix.", {
      argName,
    })
  );
}

export function assertNonEmpty(...data: any[][]) {
  if (data.length === 0 || data.some((arg) => arg.length === 0)) {
    throw new NotAvailableError(_t("[[FUNCTION_NAME]] has no valid input data."));
  }
}
