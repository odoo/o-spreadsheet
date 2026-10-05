import json
import os
import unittest
from pathlib import Path

from o_spreadsheet_squisher import (
    Compiler,
    FunctionRegistry,
    Sheets,
    squish_sheet_cells,
    squish_workbook_data,
)
from o_spreadsheet_squisher._js import js_number_to_string
from o_spreadsheet_squisher.formula import compilation_cache_key
from o_spreadsheet_squisher.tokenizer import range_tokenize
from o_spreadsheet_squisher import _cell_formats
from o_spreadsheet_squisher.squisher import parse_squishable_integer

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures.json"


def squish(cells, functions=None, non_squishable=()):
    data = {"sheets": [{"id": "s1", "name": "Sheet1", "cells": cells}]}
    sheets = Sheets.from_workbook_data(data)
    compiler = Compiler(sheets, functions or FunctionRegistry.builtin())
    return squish_sheet_cells(cells, "s1", sheets, compiler, {}, non_squishable)


class TestJs(unittest.TestCase):
    def test_number_to_string(self):
        cases = {
            1: "1",
            -1.5: "-1.5",
            0.1 + 0.2: "0.30000000000000004",
            1e21: "1e+21",
            1e20: "100000000000000000000",
            1e-7: "1e-7",
            0.000001: "0.000001",
            1.25e-10: "1.25e-10",
            123e30: "1.23e+32",
            float("inf"): "Infinity",
            -0.0: "0",
        }
        for value, expected in cases.items():
            self.assertEqual(js_number_to_string(value), expected)


class TestTokenizer(unittest.TestCase):
    def test_normalized_formula(self):
        self.assertEqual(
            compilation_cache_key(range_tokenize('=A1+A2+SUM(2, 2, "2")')), "=|C|+|C|+SUM(|N|,|N|,|S|)"
        )
        self.assertEqual(
            compilation_cache_key(range_tokenize("=SUM('my sheet'!A1:B2, A:A, 1:3, A1 : B2)")),
            "=SUM(|R|,|R|,|R|,|R|)",
        )


class TestSquisher(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(
            squish({"A1": "=B1", "A2": "=B2", "A3": "=B3", "A4": "=B4+1", "A5": "=B5+2"}),
            {"A1": "=B1", "A2:A3": {"R": "+R1"}, "A4": "=B4+1", "A5": {"N": "+1", "R": "+R1"}},
        )

    def test_numbers(self):
        self.assertEqual(
            squish({"A1": "1", "A2": "2", "A3": "3", "A4": "5", "A5": "hello", "A6": "6"}),
            {"A1": "1", "A2:A3": {"N": "+1"}, "A4": "5", "A5": "hello", "A6": "6"},
        )

    def test_unknown_function_is_not_squished(self):
        self.assertEqual(
            squish({"A1": "=NOPE(B1)", "A2": "=NOPE(B2)"}),
            {"A1": "=NOPE(B1)", "A2": "=NOPE(B2)"},
        )
        functions = FunctionRegistry.builtin().add("NOPE", [(False, False)])
        self.assertEqual(
            squish({"A1": "=NOPE(B1)", "A2": "=NOPE(B2)"}, functions),
            {"A1": "=NOPE(B1)", "A2": {"R": "+R1"}},
        )

    def test_non_squishable_function(self):
        functions = FunctionRegistry.builtin().add("NOSQUISH", [(False, False)])
        self.assertEqual(
            squish(
                {
                    "A1": "=SUM(B1)",
                    "A2": "=SUM(B2)",
                    "A3": '=NOSQUISH("hello")',
                    "A4": '=NOSQUISH("hello")',
                    "A5": '=NOSQUISH("world")',
                },
                functions,
                ["NOSQUISH"],
            ),
            {
                "A1": "=SUM(B1)",
                "A2": {"R": "+R1"},
                "A3:A4": '=NOSQUISH("hello")',
                "A5": '=NOSQUISH("world")',
            },
        )

    def test_number_chain_is_broken_by_non_squishable_formula(self):
        functions = FunctionRegistry.builtin().add("NOSQUISH", [])
        self.assertEqual(
            squish(
                {"A1": "1", "A2": "=NOSQUISH()", "A3": "2", "A4": "3", "A5": "4"},
                functions,
                ["NOSQUISH"],
            ),
            {"A1": "1", "A2": "=NOSQUISH()", "A3": "2", "A4:A5": {"N": "+1"}},
        )

    def test_already_squished(self):
        with self.assertRaises(ValueError):
            squish({"A1:A2": "=B1"})

    def test_workbook_verification(self):
        data = {"sheets": [{"id": "s1", "name": "Sheet1", "cells": {"A1": "=B1", "A2": "=B2"}}]}
        result = squish_workbook_data(data)
        self.assertEqual(result["sheets"][0]["cells"], {"A1": "=B1", "A2": {"R": "+R1"}})
        self.assertNotIn("isNotSquishable", result)
        self.assertEqual(data["sheets"][0]["cells"], {"A1": "=B1", "A2": "=B2"})  # not mutated


@unittest.skipUnless(FIXTURES.exists(), "run js/generate.test.ts first")
class TestAgainstTypescript(unittest.TestCase):
    """Compare with the output of the TS squisher on the generated workbooks."""

    def test_fixtures(self):
        cases = json.loads(FIXTURES.read_text("utf-8"))
        functions = FunctionRegistry.builtin()
        outputs = []
        mismatches = []
        compared = skipped = 0
        for case_index, case in enumerate(cases):
            data = case["input"]
            sheets = Sheets.from_workbook_data(data)
            compiler = Compiler(sheets, functions)
            for sheet, expected, ts_integers in zip(
                data["sheets"], case["expected"], case["tsIntegers"]
            ):
                cells = sheet["cells"]
                result = squish_sheet_cells(
                    cells, sheet["id"], sheets, compiler, _cell_formats(sheet, cells)
                )
                compared += 1
                if case["isNotSquishable"]:
                    # the TS squisher produced a wrong result (see Squisher._can_squish_literals),
                    # its export fell back to unsquished data
                    skipped += 1
                    continue
                if any(parse_squishable_integer(cells[xc]) is None for xc in ts_integers):
                    # TS squishes integers written as "007", "1e+21", "2024-01-01" (text format)...
                    # python does not (safe, only less compact): only checked by the TS reload test
                    skipped += 1
                    continue
                if result != expected:
                    diff = {
                        k: (result.get(k), expected.get(k))
                        for k in set(result) | set(expected)
                        if result.get(k) != expected.get(k)
                    }
                    mismatches.append((case_index, sheet["name"], diff))
            output = squish_workbook_data(data, functions)
            self.assertNotIn("isNotSquishable", output)
            outputs.append({"input": data, "output": output})
        if os.environ.get("WRITE_PYTHON_OUTPUT"):
            (HERE / "python_output.json").write_text(json.dumps(outputs), "utf-8")
        for case_index, sheet_name, diff in mismatches[:5]:
            print(f"case {case_index} sheet {sheet_name}:")
            for key, (got, expected) in sorted(diff.items())[:10]:
                print(f"  {key}: python={got!r} ts={expected!r}")
        print(f"{compared} sheets compared, {skipped} skipped, {len(mismatches)} mismatches")
        self.assertEqual(len(mismatches), 0)
        self.assertGreater(compared - skipped, 50)


if __name__ == "__main__":
    unittest.main()
