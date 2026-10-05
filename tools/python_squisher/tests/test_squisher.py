import json
import os
import unittest
from pathlib import Path

from o_spreadsheet_squisher import _cell_formats, squish_sheet_cells, squish_workbook_data
from o_spreadsheet_squisher._js import js_number_to_string
from o_spreadsheet_squisher.formula import compilation_cache_key
from o_spreadsheet_squisher.squisher import parse_squishable_integer
from o_spreadsheet_squisher.tokenizer import range_tokenize

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures.json"


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
            squish_sheet_cells({"A1": "=B1", "A2": "=B2", "A3": "=B3", "A4": "=B4+1", "A5": "=B5+2"}),
            {"A1": "=B1", "A2:A3": {"R": "+R1"}, "A4": "=B4+1", "A5": {"N": "+1", "R": "+R1"}},
        )

    def test_numbers(self):
        self.assertEqual(
            squish_sheet_cells({"A1": "1", "A2": "2", "A3": "3", "A4": "5", "A5": "hello", "A6": "6"}),
            {"A1": "1", "A2:A3": {"N": "+1"}, "A4": "5", "A5": "hello", "A6": "6"},
        )

    def test_formulas_are_written_as_in_the_input(self):
        self.assertEqual(
            squish_sheet_cells({"A1": "=SUM( B1 ,  1.50 )", "A2": "=SUM( B1 ,  1.50 )"}),
            {"A1:A2": "=SUM( B1 ,  1.50 )"},
        )

    def test_references(self):
        self.assertEqual(
            squish_sheet_cells(
                {
                    "A1": "=Sheet2!B1+$C$1+D1:D2",
                    "A2": "=Sheet2!B2+$C$1+D2:D3",  # ranges are written in full
                    "A3": "=Sheet3!B3+$C2+D2:D3",  # other sheet, other $: written in full
                    "A4": "=Sheet3!C3+$C3+D5:D6",
                }
            ),
            {
                "A1": "=Sheet2!B1+$C$1+D1:D2",
                "A2": {"R": "+R1|=|D2:D3"},
                "A3": {"R": "Sheet3!B3|$C2|="},
                "A4": {"R": "+C1|+R1|D5:D6"},
            },
        )

    def test_non_squishable_function(self):
        self.assertEqual(
            squish_sheet_cells(
                {
                    "A1": "=SUM(B1)",
                    "A2": "=SUM(B2)",
                    "A3": '=NOSQUISH("hello")',
                    "A4": '=NOSQUISH("hello")',
                    "A5": '=NOSQUISH("world")',
                },
                non_squishable_functions=["NOSQUISH"],
            ),
            {
                "A1": "=SUM(B1)",
                "A2": {"R": "+R1"},
                "A3:A4": '=NOSQUISH("hello")',
                "A5": '=NOSQUISH("world")',
            },
        )

    def test_number_chain_is_broken_by_non_squishable_formula(self):
        self.assertEqual(
            squish_sheet_cells(
                {"A1": "1", "A2": "=NOSQUISH()", "A3": "2", "A4": "3", "A5": "4"},
                non_squishable_functions=["NOSQUISH"],
            ),
            {"A1": "1", "A2": "=NOSQUISH()", "A3": "2", "A4:A5": {"N": "+1"}},
        )

    def test_string_changed_to_no_change_marker(self):
        self.assertEqual(
            squish_sheet_cells({"A1": '=B1&"a"', "A2": '=B2&"="'}),
            {"A1": '=B1&"a"', "A2": '=B2&"="'},
        )

    def test_float_offsets_are_read_back_exactly(self):
        values = [0.1 + 0.2 * i for i in range(23)]
        cells = {f"A{i + 1}": f"=B1+{js_number_to_string(round(v, 10))}" for i, v in enumerate(values)}
        squished = squish_sheet_cells(cells)
        self.assertEqual(squished["A23"], "=B1+4.5")

    def test_special_whitespace_formulas_are_not_squished(self):
        self.assertEqual(
            squish_sheet_cells({"A1": "=B1+ 1", "A2": "=B2+ 2"}),
            {"A1": "=B1+ 1", "A2": "=B2+ 2"},
        )

    def test_already_squished(self):
        with self.assertRaises(ValueError):
            squish_sheet_cells({"A1:A2": "=B1"})

    def test_workbook(self):
        data = {"sheets": [{"id": "s1", "name": "Sheet1", "cells": {"A1": "=B1", "A2": "=B2"}}]}
        result = squish_workbook_data(data)
        self.assertEqual(result["sheets"][0]["cells"], {"A1": "=B1", "A2": {"R": "+R1"}})
        self.assertEqual(data["sheets"][0]["cells"], {"A1": "=B1", "A2": "=B2"})  # not mutated


@unittest.skipUnless(FIXTURES.exists(), "run js/generate.test.ts first")
class TestAgainstTypescript(unittest.TestCase):
    """Compare with the output of the TS squisher on the generated workbooks. Run js/generate.test.ts
    again afterwards to check that o-spreadsheet loads the python output back."""

    def test_fixtures(self):
        cases = json.loads(FIXTURES.read_text("utf-8"))
        outputs = []
        mismatches = []
        compared = skipped = 0
        for case_index, case in enumerate(cases):
            data = case["input"]
            for sheet, expected, ts_integers in zip(
                data["sheets"], case["expected"], case["tsIntegers"]
            ):
                cells = sheet["cells"]
                result = squish_sheet_cells(cells, _cell_formats(sheet, cells))
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
            outputs.append({"input": data, "output": squish_workbook_data(data)})
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
