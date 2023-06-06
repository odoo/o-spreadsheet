import { _t } from "../translation";
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
