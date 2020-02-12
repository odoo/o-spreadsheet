import { formatNumber } from "../src/formatters";

describe("numbers", () => {
  test("formatNumber", () => {
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-1)).toBe("-1");
    expect(formatNumber(0.1)).toBe("0.1");
    expect(formatNumber(0.01)).toBe("0.01");
    expect(formatNumber(0.001)).toBe("0.001");
    expect(formatNumber(0.0001)).toBe("0.0001");
    expect(formatNumber(0.00001)).toBe("0.00001");
    expect(formatNumber(0.000001)).toBe("0.000001");
    expect(formatNumber(0.0000001)).toBe("0.0000001");
    expect(formatNumber(0.00000001)).toBe("0.00000001");
    expect(formatNumber(0.000000001)).toBe("0.000000001");
    expect(formatNumber(0.0000000001)).toBe("0.0000000001");
    expect(formatNumber(0.00000000001)).toBe("0");
    expect(formatNumber(0.000000000001)).toBe("0");

    // @compatibility note: in Google Sheets, the next three tests result in 1234512345
    expect(formatNumber(1234512345.1)).toBe("1234512345.1");
    expect(formatNumber(1234512345.12)).toBe("1234512345.12");
    expect(formatNumber(1234512345.123)).toBe("1234512345.123");

    expect(formatNumber(123.10000000001)).toBe("123.1");
    expect(formatNumber(123.10000000000000001)).toBe("123.1");
  });
});
