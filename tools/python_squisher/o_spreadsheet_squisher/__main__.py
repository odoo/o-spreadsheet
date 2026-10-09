"""Squish a workbook JSON file and print the result.

    python3 -m o_spreadsheet_squisher data.json --non-squishable ODOO.PIVOT ODOO.LIST
"""

import argparse
import json
import sys

from . import squish_workbook_data


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="python3 -m o_spreadsheet_squisher",
        description="Squish the cells of an (unsquished) o-spreadsheet workbook JSON file "
        "and print the result on the standard output.",
    )
    parser.add_argument("file", help="workbook JSON file, '-' for the standard input")
    parser.add_argument(
        "--non-squishable",
        nargs="*",
        default=[],
        metavar="FUNCTION",
        help="functions whose formulas are never squished (NonSquishableFunctionRegistry)",
    )
    parser.add_argument("--indent", type=int, default=None, help="indent the JSON output")
    args = parser.parse_args(argv)

    try:
        if args.file == "-":
            data = json.load(sys.stdin)
        else:
            with open(args.file, encoding="utf-8") as f:
                data = json.load(f)
        result = squish_workbook_data(data, args.non_squishable)
    except (OSError, ValueError, TypeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    json.dump(result, sys.stdout, ensure_ascii=False, indent=args.indent)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
