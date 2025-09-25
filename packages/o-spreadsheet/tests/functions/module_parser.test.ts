import { UNITS_ALIASES, UNIT_PREFIXES } from "../../src/functions/helper_parser";
import { evaluateCell } from "../test_helpers/helpers";

describe("CONVERT formula", () => {
  test("Arguments validation", () => {
    expect(evaluateCell("A1", { A1: "=CONVERT()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=CONVERT(1)" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=CONVERT(1,"m")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=CONVERT(1,,"m")' })).toBe("#ERROR"); // invalid unit
    expect(evaluateCell("A1", { A1: '=CONVERT(1,"unknown","m")' })).toBe("#ERROR"); // invalid unit
  });

  test.each([
    ["in", "ft", "12", 1],
    ["in", "m", "1", 0.0254],
    ["ft", "m", "1", 0.3048],
    ["ft", "in", "1", 12],
    ["km", "m", "1", 1000],
    ["mi", "km", "1", 1.609344],
    ["mi", "yd", "1", 1760],
    ["mi", "ft", "1", 5279.9868766],
    ["mi", "in", "1", 63359.8425],
    ["yd", "m", "1", 0.9144],
    ["yd", "ft", "1", 3],
    ["ang", "m", "1", 1e-10],
    ["Picapt", "m", "1", 0.000353],
    ["pica", "in", "6", 1],
    ["Picapt", "in", "72", 1],
    ["ell", "m", "1", 1.143],
    ["survey_mi", "m", "1", 1609.34],
    ["Nmi", "m", "1", 1852],
    ["ly", "m", "1", 9.46073047258e15],
    ["parsec", "m", "1", 3.0856775814914e16],
    ["cm", "nm", "1", 1e7],
  ])("correctly convert distance unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["in^2", "m^2", "1", 6.4516 / 10000],
    ["ft^2", "m^2", "1", 9.2903 / 100],
    ["mi^2", "m^2", "1", 2589975.2356],
    ["ar", "m^2", "1", 100],
    ["m2", "mm^2", "1", 1000000],
    ["ha", "m^2", "1", 10000],
    ["us_acre", "m^2", "1", 4.0468726099 * 1000],
    ["us_acre", "uk_acre", "12.5", 12.50005],
    ["ang^2", "m^2", "1", 1e-20],
    ["Picapt^2", "m^2", "1", 1.2445216049382715e-7],
    ["yd^2", "m^2", "1", 0.83612736],
    ["Morgen", "m^2", "1", 2500],
    ["Nmi^2", "m^2", "1", 3429904],
    ["ly^2", "m^2", "1", Math.pow(9.46073047258e15, 2)],
  ])("correctly convert area unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["lbm", "kg", "1", 0.453592],
    ["g", "kg", "1", 0.001],
    ["ozm", "g", "1", 28.3495],
    ["stone", "g", "1", 6350.29],
    ["lbm", "g", "1", 453.592],
    ["lbm", "ozm", "1", 16],
    ["ton", "kg", "1", 907.18474],
    ["ton", "lbm", "1", 2000],
    ["grain", "g", "1", 0.0647989],
    ["sg", "g", "1", 14593.90294],
    ["cwt", "g", "1", 45359.237],
    ["uk_cwt", "g", "1", 50802.3],
  ])("correctly convert mass unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["F", "C", "68", 20],
    ["K", "C", "0", -273.15],
    ["C", "K", "20", 293.15],
    ["C", "F", "0", 32],
    ["Rank", "K", "1", 5 / 9],
    ["Reau", "K", "1", 274.4],
    ["K", "Reau", "1", -217.72],
  ])("correctly convert temperature unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["min", "sec", "1", 60],
    ["hr", "sec", "1", 3600],
    ["day", "sec", "1", 86400],
    ["yr", "day", "1", 365.2425],
  ])("correctly convert time unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["mmHg", "Pa", "1", 133.322],
    ["Torr", "mmHg", "1", 1],
    ["psi", "Pa", "1", 6894.76],
    ["atm", "Pa", "1", 101325],
  ])("correctly convert pressure unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["dyn", "N", "1", 1e-5],
    ["pond", "N", "1", 0.00980665],
    ["lbf", "N", "1", 4.44822],
  ])("correctly convert force unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["eV", "J", "1", 1.60218e-19],
    ["e", "J", "1", 1e-7],
    ["flb", "J", "1", 1.3558179483],
    ["c", "J", "1", 4.184],
    ["cal", "J", "1", 4.1868],
    ["BTU", "J", "1", 1055.06],
    ["Wh", "J", "1", 3600],
    ["HPh", "J", "1", 3600 * 745.7],
  ])("correctly convert energy unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([
    ["PS", "W", "1", 735.499],
    ["HP", "W", "1", 745.7],
  ])("correctly convert power unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([["T", "ga", "1", 10000]])(
    "correctly convert magnetism unit (%s to %s)",
    (from, to, value, result) => {
      expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
        result
      );
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
      expect(
        evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
      ).toBeCloseTo(1);
    }
  );

  test.each([
    ["ang^3", "m3", "1", 1e-30],
    ["Picapt3", "m^3", "1", 4.3904e-11],
    ["tsp", "m^3", "1", 4.92892e-6],
    ["tspm", "m^3", "1", 5e-6],
    ["tbs", "m^3", "1", 1.4787e-5],
    ["in^3", "m^3", "1", 0.000016387],
    ["oz", "m^3", "1", 2.95735295625e-5],
    ["cup", "m^3", "1", 0.000237],
    ["pt", "m3", "1", 0.0004731765],
    ["uk_pt", "m3", "1", 0.000568261],
    ["qt", "m^3", "1", 0.0009463529],
    ["uk_qt", "m^3", "1", 0.0011365225],
    ["l", "m^3", "1", 1e-3],
    ["l", "dm^3", "1", 1],
    ["cl", "m^3", "1", 1e-5],
    ["ml", "m^3", "1", 1e-6],
    ["gal", "m^3", "1", 0.0037854118],
    ["uk_gal", "m^3", "1", 0.00454609],
    ["ft3", "m^3", "1", 0.028316846592],
    ["bushel", "m^3", "1", 0.0352390704],
    ["barrel", "m^3", "1", 0.158987295],
    ["yd^3", "m^3", "1", 0.764554857984],
    ["MTON", "m^3", "1", 1.13267386368],
    ["GRT", "m^3", "1", 2.83168],
    ["mi3", "m^3", "1", 4168150745.6605034],
    ["Nmi^3", "m3", "1", 6352182208],
    ["ly^3", "m^3", "1", 8.467866646235003e47],
  ])("correctly convert volum unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each([["byte", "bit", "1", 8]])(
    "correctly convert information unit (%s to %s)",
    (from, to, value, result) => {
      expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
        result
      );
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
      expect(
        evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
      ).toBeCloseTo(1);
    }
  );

  test.each([
    ["m/hr", "m/s", "3600", 1],
    ["km/hr", "m/s", "3.6", 1],
    ["mph", "m/s", "1", 0.44704],
    ["kn", "m/s", "1", 0.5144444444],
    ["admkn", "m/s", "1", 0.5147733333],
  ])("correctly convert information unit (%s to %s)", (from, to, value, result) => {
    expect(evaluateCell("A1", { A1: `=CONVERT(A2, "${from}", "${to}")`, A2: value })).toBeCloseTo(
      result
    );
    expect(evaluateCell("A1", { A1: `=CONVERT(1, "${from}", "${from}")` })).toBeCloseTo(1);
    expect(
      evaluateCell("A1", { A1: `=CONVERT(CONVERT(1, "${from}", "${to}"), "${to}", "${from}")` })
    ).toBeCloseTo(1);
  });

  test.each(Array.from(Object.entries(UNITS_ALIASES)))(
    "correctly convert between aliases unit (%s to %s)",
    (unit1, unit2) => {
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${unit1}", "${unit2}")` })).toBeCloseTo(1);
    }
  );

  test.each(Array.from(Object.entries(UNIT_PREFIXES)))(
    "correctly convert between prefixed unit (%sm)",
    (prefix, value) => {
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${prefix}m", "m")` })).toBeCloseTo(value);
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "m", "${prefix}m")` })).toBeCloseTo(1 / value);
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${prefix}m", "${prefix}m")` })).toBeCloseTo(1);
      expect(evaluateCell("A1", { A1: `=CONVERT(1, "${prefix}m3", "m3")` })).toBeCloseTo(
        Math.pow(value, 3)
      );
    }
  );
});
