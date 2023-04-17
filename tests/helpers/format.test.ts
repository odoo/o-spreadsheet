import { parseDateTime } from "../../src/helpers";
import { formatValue, isDateTimeFormat } from "../../src/helpers/format";

describe("formatValue on number", () => {
  test("apply default format ", () => {
    expect(formatValue(1)).toBe("1");
    expect(formatValue(0)).toBe("0");
    expect(formatValue(-1)).toBe("-1");
    expect(formatValue(0.1)).toBe("0.1");
    expect(formatValue(0.01)).toBe("0.01");
    expect(formatValue(0.001)).toBe("0.001");
    expect(formatValue(0.0001)).toBe("0.0001");
    expect(formatValue(0.00001)).toBe("0.00001");
    expect(formatValue(0.000001)).toBe("0.000001");
    expect(formatValue(0.0000001)).toBe("0.0000001");
    expect(formatValue(0.00000001)).toBe("0.00000001");
    expect(formatValue(0.000000001)).toBe("0.000000001");
    expect(formatValue(0.0000000001)).toBe("0.0000000001");
    expect(formatValue(0.00000000001)).toBe("0");
    expect(formatValue(0.000000000001)).toBe("0");

    expect(formatValue(0.9999999)).toBe("0.9999999");
    expect(formatValue(0.99999999)).toBe("0.99999999");
    expect(formatValue(0.999999999)).toBe("0.999999999");
    expect(formatValue(0.9999999999)).toBe("0.9999999999");
    expect(formatValue(0.99999999999)).toBe("1");

    // @compatibility note: in Google Sheets, the next three tests result in 1234512345
    expect(formatValue(1234512345.1)).toBe("1234512345.1");
    expect(formatValue(1234512345.12)).toBe("1234512345.12");
    expect(formatValue(1234512345.123)).toBe("1234512345.123");

    expect(formatValue(123.10000000001)).toBe("123.1");
    expect(formatValue(123.10000000000000001)).toBe("123.1");
  });

  test.each([
    [0, "0.00"],
    [1, "1.00"],
    [1.1, "1.10"],
    [5.1, "5.10"],
    [-1, "-1.00"],
    [10, "10.00"],
    [100, "100.00"],
    [-100, "-100.00"],
    [1000, "1,000.00"],
    [10000, "10,000.00"],
    [100000, "100,000.00"],
    [1000000, "1,000,000.00"],
    [-1000000, "-1,000,000.00"],
    [0.1, "0.10"],
    [0.01, "0.01"],
    [0.001, "0.00"],
    [0.0001, "0.00"],
    [0.00001, "0.00"],
    [0.000001, "0.00"],
    [0.0000001, "0.00"],
    [0.00000001, "0.00"],
    [0.000000001, "0.00"],
    [0.0000000001, "0.00"],
  ])("apply a normal number format: #,##0.00", (value, result) => {
    expect(formatValue(value, "#,##0.00")).toBe(result);
  });

  test("apply various integer format", () => {
    expect(formatValue(0, "0")).toBe("0");
    expect(formatValue(0, "#")).toBe("");
    expect(formatValue(0, "000")).toBe("000");
    expect(formatValue(0, "0000")).toBe("0000");
    expect(formatValue(0, "0###")).toBe("0");
    expect(formatValue(0, "#0###")).toBe("0");
    expect(formatValue(0, "0#0###")).toBe("00");
    expect(formatValue(0, "0#0#0#")).toBe("000");

    expect(formatValue(123, "0")).toBe("123");
    expect(formatValue(123, "#")).toBe("123");
    expect(formatValue(123, "000")).toBe("123");
    expect(formatValue(123, "0000")).toBe("0123");
    expect(formatValue(123, "0###")).toBe("0123");
    expect(formatValue(123, "#0###")).toBe("0123");
    expect(formatValue(123, "0#0###")).toBe("00123");
    expect(formatValue(123, "0#0#0#")).toBe("00123");

    expect(formatValue(123.456, "0")).toBe("123");
    expect(formatValue(123.456, "#")).toBe("123");
    expect(formatValue(123.456, "000")).toBe("123");
    expect(formatValue(123.456, "0000")).toBe("0123");
    expect(formatValue(123.456, "0###")).toBe("0123");
    expect(formatValue(123.456, "#0###")).toBe("0123");
    expect(formatValue(123.456, "0#0###")).toBe("00123");
    expect(formatValue(123.456, "0#0#0#")).toBe("00123");

    expect(formatValue(0.456, "0")).toBe("0");
    expect(formatValue(0.456, "#")).toBe("");
    expect(formatValue(0.456, "000")).toBe("000");
    expect(formatValue(0.456, "0000")).toBe("0000");
    expect(formatValue(0.456, "0###")).toBe("0");
    expect(formatValue(0.456, "0###")).toBe("0");
    expect(formatValue(0.456, "#0###")).toBe("0");
    expect(formatValue(0.456, "0#0###")).toBe("00");
    expect(formatValue(0.456, "0#0#0#")).toBe("000");
  });

  test("apply empty format --> apply default format", () => {
    expect(formatValue(0, "")).toBe("0");
    expect(formatValue(123, "")).toBe("123");
    expect(formatValue(123.456, "")).toBe("123.456");
    expect(formatValue(0.456, "")).toBe("0.456");
  });

  test("apply various decimal format", () => {
    expect(formatValue(0, ".0")).toBe(".0");
    expect(formatValue(0, "0.0")).toBe("0.0");
    expect(formatValue(0, ".#")).toBe(".");
    expect(formatValue(0, "0.#")).toBe("0.");
    expect(formatValue(0, "0.000")).toBe("0.000");
    expect(formatValue(0, "0.0000")).toBe("0.0000");
    expect(formatValue(0, "0.0###")).toBe("0.0");
    expect(formatValue(0, "0.###0#")).toBe("0.0");
    expect(formatValue(0, "0.0#0#0#")).toBe("0.000");
    expect(formatValue(0, "0.###0#0")).toBe("0.00");
    expect(formatValue(0, "0.#0#0#0")).toBe("0.000");

    expect(formatValue(123, ".0")).toBe("123.0");
    expect(formatValue(123, "0.0")).toBe("123.0");
    expect(formatValue(123, ".#")).toBe("123.");
    expect(formatValue(123, "0.#")).toBe("123.");
    expect(formatValue(123, "0.000")).toBe("123.000");
    expect(formatValue(123, "0.0000")).toBe("123.0000");
    expect(formatValue(123, "0.0###")).toBe("123.0");
    expect(formatValue(123, "0.###0#")).toBe("123.0");
    expect(formatValue(123, "0.0#0#0#")).toBe("123.000");
    expect(formatValue(123, "0.###0#0")).toBe("123.00");
    expect(formatValue(123, "0.#0#0#0")).toBe("123.000");

    expect(formatValue(123.123, ".0")).toBe("123.1");
    expect(formatValue(123.123, "0.0")).toBe("123.1");
    expect(formatValue(123.123, ".#")).toBe("123.1");
    expect(formatValue(123.123, "0.#")).toBe("123.1");
    expect(formatValue(123.123, "0.000")).toBe("123.123");
    expect(formatValue(123.123, "0.0000")).toBe("123.1230");
    expect(formatValue(123.123, "0.0###")).toBe("123.123");
    expect(formatValue(123.123, "0.###0#")).toBe("123.1230");
    expect(formatValue(123.123, "0.0#0#0#")).toBe("123.1230");
    expect(formatValue(123.123, "0.###0#0")).toBe("123.12300");
    expect(formatValue(123.123, "0.#0#0#0")).toBe("123.12300");

    expect(formatValue(0.123, ".0")).toBe(".1");
    expect(formatValue(0.123, "0.0")).toBe("0.1");
    expect(formatValue(0.123, ".#")).toBe(".1");
    expect(formatValue(0.123, "0.#")).toBe("0.1");
    expect(formatValue(0.123, "0.000")).toBe("0.123");
    expect(formatValue(0.123, "0.0000")).toBe("0.1230");
    expect(formatValue(0.123, "0.0###")).toBe("0.123");
    expect(formatValue(0.123, "0.###0#")).toBe("0.1230");
    expect(formatValue(0.123, "0.0#0#0#")).toBe("0.1230");
    expect(formatValue(0.123, "0.###0#0")).toBe("0.12300");
    expect(formatValue(0.123, "0.#0#0#0")).toBe("0.12300");
  });

  test("apply decimal format round the last displayed digits", () => {
    expect(formatValue(0.456789, "0.0")).toBe("0.5");
    expect(formatValue(0.456789, "0.00")).toBe("0.46");
    expect(formatValue(0.456789, "0.000")).toBe("0.457");
    expect(formatValue(0.456789, "0.0000")).toBe("0.4568");
    expect(formatValue(0.456789, "0.00000")).toBe("0.45679");
  });

  test("apply format with thousand separator", () => {
    expect(formatValue(100, "000")).toBe("100");
    expect(formatValue(100, ",000")).toBe("100");
    expect(formatValue(100, "0,00")).toBe("100");

    expect(formatValue(1000, "000")).toBe("1000");
    expect(formatValue(1000, ",000")).toBe("1,000");
    expect(formatValue(1000, "0,00")).toBe("1,000");

    expect(formatValue(1000, "#,##0")).toBe("1,000");
    expect(formatValue(10000, "#,##0")).toBe("10,000");
    expect(formatValue(100000, "#,##0")).toBe("100,000");
    expect(formatValue(1000000, "#,##0")).toBe("1,000,000");

    expect(() => formatValue(1000, "###0.0,0")).toThrow(
      "A format can't contain ',' symbol in the decimal part"
    );
    expect(() => formatValue(1000, "#,##,0.0")).toThrow(
      "A format can only contain a single ',' symbol"
    );
  });

  test.each([
    [0, "0.00%"],
    [0.123, "12.30%"],
    [0.1234, "12.34%"],
    [0.12345, "12.35%"],
  ])("apply normal percent format: 0.00%", (value, result) => {
    expect(formatValue(value, "0.00%")).toBe(result);
  });
  test("apply various percent format", () => {
    expect(formatValue(0.1234, "0%")).toBe("12%");
    expect(formatValue(0.1234, "0.0%")).toBe("12.3%");
    expect(formatValue(0.1234, "0.00%")).toBe("12.34%");
    expect(formatValue(0.1234, "0.000%")).toBe("12.340%");
    expect(() => formatValue(0.1234, "0.%0%")).toThrow(
      "A format can only contain a single '%' symbol"
    );
  });

  test("can apply format with custom currencies", () => {
    expect(formatValue(1234, "#,##0[$TEST]")).toBe("1,234TEST");
    expect(formatValue(1234, "#,##0 [$TEST]")).toBe("1,234TEST");
    expect(formatValue(1234, "#,##0[$ TEST]")).toBe("1,234 TEST");
    expect(formatValue(1234, "#,##0[$  TEST ]")).toBe("1,234  TEST ");
    expect(formatValue(1234, "#,##0[$ kikou lol ]")).toBe("1,234 kikou lol ");
    expect(formatValue(1234, "[$ tune ]#,##0.0")).toBe(" tune 1,234.0");
    expect(formatValue(1234, "[$ toulmonde il veut seulement la thune ]#,##0.0")).toBe(
      " toulmonde il veut seulement la thune 1,234.0"
    );
    expect(formatValue(1234, "[$kama]#,##0.0")).toBe("kama1,234.0");
    expect(formatValue(1234, "[$兔]#,##0.0")).toBe("兔1,234.0");
    // test with char used in the format reading
    expect(formatValue(1234, '[$#,##0.0E+00 %"$"]#,##0.0')).toBe('#,##0.0E+00 %"$"1,234.0');
  });

  test("with brackets inside the string", () => {
    expect(() => formatValue(1234, "[$[]#,##0.0")).toThrow();
    expect(() => formatValue(1234, "[$]]#,##0.0")).toThrow();
    expect(() => formatValue(1234, "[$[]]#,##0.0")).toThrow();
    expect(() => formatValue(1234, "[$][]#,##0.0")).toThrow();
  });

  test("multiple strings in one format", () => {
    expect(formatValue(1234, "[$TEST]#,##0[$TEST]")).toBe("TEST1,234TEST");
    expect(formatValue(1234, "#,##0[$TEST][$TEST]")).toBe("1,234TESTTEST");
    expect(formatValue(1234, "[$TEST][$TEST]#,##0")).toBe("TESTTEST1,234");
  });
});

describe("formatValue on large numbers", () => {
  test.each([
    [1, "0k"],
    [10, "0k"],
    [100, "0k"],
    [499, "0k"],
    [501, "1k"],
    [1000, "1k"],
    [1499, "1k"],
    [1501, "2k"],
    [10000, "10k"],
    [100000, "100k"],
    [1000000, "1,000k"],
    [10000000, "10,000k"],
  ])("Format thousands with separator", (value, result) => {
    expect(formatValue(value, "#,##0,[$k]")).toBe(result);
  });

  test.each([
    [1, "0M"],
    [100, "0M"],
    [499_999, "0M"],
    [500_001, "1M"],
    [1_000_000, "1M"],
    [1_499_999, "1M"],
    [1_500_001, "2M"],
    [10_000_000, "10M"],
    [100_000_000, "100M"],
    [1_000_000_000, "1,000M"],
    [10_000_000_000, "10,000M"],
  ])("Format millions with separator", (value, result) => {
    expect(formatValue(value, "#,##0,,[$M]")).toBe(result);
  });

  test.each([
    [1, "0B"],
    [1_000_000, "0B"],
    [1_000_000_000, "1B"],
    [10_000_000_000, "10B"],
  ])("Format billions with separator", (value, result) => {
    expect(formatValue(value, "#,##0,,,[$B]")).toBe(result);
  });

  test.each([
    [1, "0k"],
    [1000, "1k"],
    [1000000, "1000k"],
    [10000000, "10000k"],
  ])("Format thousands without separator", (value, result) => {
    expect(formatValue(value, "###0,[$k]")).toBe(result);
    expect(formatValue(value, "0,[$k]")).toBe(result);
  });

  test.each([
    [1, "0M"],
    [1_000_000, "1M"],
    [1_000_000_000, "1000M"],
    [10_000_000_000, "10000M"],
  ])("Format millions without separator", (value, result) => {
    expect(formatValue(value, "###0,,[$M]")).toBe(result);
    expect(formatValue(value, "0,,[$M]")).toBe(result);
  });

  test("large numbers with currencies", () => {
    expect(formatValue(1, "#,##0,[$k][$$]")).toBe("0k$");
    expect(formatValue(1000, "#,##0,[$k][$$]")).toBe("1k$");
    expect(formatValue(1000, "[$$]#,##0,[$k]")).toBe("$1k");
    expect(formatValue(1000, "[$$]0,[$k]")).toBe("$1k");
    expect(formatValue(1000000, "[$$]0,[$k]")).toBe("$1000k");
    expect(formatValue(1000000, "[$$]0,,[$M]")).toBe("$1M");
  });
});

describe("formatValue on date and time", () => {
  test.each([
    "hh:mm",
    "hh:mm:ss",
    "hh:mm a",
    "hh:mm:ss a",
    "hhhh:mm:ss",
    "m/d/yyyy hh:mm:ss",
    "m/d/yyyy hh:mm:ss a",
    "yyyy mm dd",
    "yyyy-mm-dd",
    "yyyy/mm/dd",
    "yyyy m d",
    "yyyy-m-d",
    "yyyy/m/d",
    "m d yyyy",
    "m-d-yyyy",
    "m/d/yyyy",
    "mm dd yyyy",
    "mm-dd-yyyy",
    "mm/dd/yyyy",
    "mm dd",
    "mm-dd",
    "mm/dd",
    "m d",
    "m-d",
    "m/d",
  ])("detect date time format %s", (format) => {
    expect(isDateTimeFormat(format)).toBe(true);
  });

  test.each(["", "a", "[$€]#,##0.0", "[$m-d-yyyy]#,##0.0", "#,##0.0"])(
    "dont detect wrong date time format %s",
    (format) => {
      expect(isDateTimeFormat(format)).toBe(false);
    }
  );
  describe("apply default format", () => {
    test.each([
      ["0:0", "00:00"],
      ["6:0", "06:00"],
      ["12:9", "12:09"],
      ["00012:09", "12:09"],
      ["12:00000009", "12:09"],
      ["11:69", "12:09"],
    ])("hours minutes 'hh:mm'", (value, result) => {
      const parsedDateTime = parseDateTime(value)!;
      expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
    });

    test.each([
      ["12:0:0", "12:00:00"],
      ["12:8:6", "12:08:06"],
      ["0012:008:006", "12:08:06"],
      ["11:59:546", "12:08:06"],
    ])("hours minutes seconds 'hh:mm:ss'", (value, result) => {
      const parsedDateTime = parseDateTime(value)!;
      expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
    });

    test.each([
      ["0 AM", "12:00 AM"],
      ["0 PM", "12:00 PM"],
      ["6AM", "06:00 AM"],
      ["6    AM", "06:00 AM"],
      ["7PM", "07:00 PM"],
      ["7    PM", "07:00 PM"],
      ["12 AM", "12:00 AM"],
      ["12 PM", "12:00 PM"],
      ["13 AM", "01:00 AM"], // @compatibility: on google sheets, parsing impposible
      ["13 PM", "01:00 PM"], // @compatibility: on google sheets, parsing impposible
      ["24 AM", "12:00 PM"], // @compatibility: on google sheets, parsing impposible
      ["0:09 AM", "12:09 AM"],
      ["12:9 AM", "12:09 AM"],
      ["00012:0009 AM", "12:09 AM"],
      ["11:69 AM", "12:09 PM"],
      ["18:00 AM", "06:00 AM"],
    ])("hours minutes meridian 'hh:mm a'", (value, result) => {
      const parsedDateTime = parseDateTime(value)!;
      expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
    });

    test.each([
      ["00:00:00 AM", "12:00:00 AM"],
      ["00:00:00 PM", "12:00:00 PM"],
      ["12:00:00 AM", "12:00:00 AM"],
      ["012:008:006 AM", "12:08:06 AM"],
      ["11:59:546   AM", "12:08:06 PM"],
    ])("hours minutes seconds meridian 'hh:mm:ss a'", (value, result) => {
      const parsedDateTime = parseDateTime(value)!;
      expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
    });

    test.each([
      ["30:00", "30:00:00"],
      ["24:08:06", "24:08:06"],
      ["36:09 AM", "24:09:00"], // @compatibility: on google sheets, parsing impposible
      ["24 PM", "24:00:00"], // @compatibility: on google sheets, parsing impposible
      ["11:59:546   PM", "24:08:06"],
    ])("duration 'hhhh:mm:ss'", (value, result) => {
      const parsedDateTime = parseDateTime(value)!;
      expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
    });

    describe("increment time test", () => {
      test.each([
        ["12/5/2020 11:69", "12/5/2020 12:09"],
        ["12/5/2020 23:69", "12/6/2020 00:09:00"],
        ["12/5/2020 25 AM", "12/5/2020 01:00 PM"],
        ["12/5/2020 25:70 PM", "12/6/2020 02:10:00"],
      ])("increment time test with 'm/d/yyyy'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["2020/12/5 11:69", "2020/12/5 12:09"],
        ["2020/12/5 23:69", "2020/12/6 00:09:00"],
        ["2020/12/5 25 AM", "2020/12/5 01:00 PM"],
        ["2020/12/5 25:70 PM", "2020/12/6 02:10:00"],
      ])("increment time test with 'yyyy/m/d'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12/05/2020 11:69", "12/05/2020 12:09"],
        ["12/05/2020 23:69", "12/06/2020 00:09:00"],
        ["12/05/2020 25 AM", "12/05/2020 01:00 PM"],
        ["12/05/2020 25:70 PM", "12/06/2020 02:10:00"],
      ])("increment time test with 'mm/dd/yyyy'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["2020/12/05 11:69", "2020/12/05 12:09"],
        ["2020/12/05 23:69", "2020/12/06 00:09:00"],
        ["2020/12/05 25 AM", "2020/12/05 01:00 PM"],
        ["2020/12/05 25:70 PM", "2020/12/06 02:10:00"],
      ])("increment time test with 'yyyy/mm/dd'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12/5 11:69", "12/5 12:09"],
        ["12/5 23:69", "12/6 00:09:00"],
        ["12/5 25 AM", "12/5 01:00 PM"],
        ["12/5 25:70 PM", "12/6 02:10:00"],
      ])("increment time test with 'm/d'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12/05 11:69", "12/05 12:09"],
        ["12/05 23:69", "12/06 00:09:00"],
        ["12/05 25 AM", "12/05 01:00 PM"],
        ["12/05 25:70 PM", "12/06 02:10:00"],
      ])("increment time test with 'mm/dd'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12 5 2020 11:69", "12 5 2020 12:09"],
        ["12 5 2020 23:69", "12 6 2020 00:09:00"],
        ["12 5 2020 25 AM", "12 5 2020 01:00 PM"],
        ["12 5 2020 25:70 PM", "12 6 2020 02:10:00"],
      ])("increment time test with 'm d yyyy'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["2020 12 5 11:69", "2020 12 5 12:09"],
        ["2020 12 5 23:69", "2020 12 6 00:09:00"],
        ["2020 12 5 25 AM", "2020 12 5 01:00 PM"],
        ["2020 12 5 25:70 PM", "2020 12 6 02:10:00"],
      ])("increment time test with 'yyyy m d'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12 05 2020 11:69", "12 05 2020 12:09"],
        ["12 05 2020 23:69", "12 06 2020 00:09:00"],
        ["12 05 2020 25 AM", "12 05 2020 01:00 PM"],
        ["12 05 2020 25:70 PM", "12 06 2020 02:10:00"],
      ])("increment time test with 'mm dd yyyy'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["2020 12 05 11:69", "2020 12 05 12:09"],
        ["2020 12 05 23:69", "2020 12 06 00:09:00"],
        ["2020 12 05 25 AM", "2020 12 05 01:00 PM"],
        ["2020 12 05 25:70 PM", "2020 12 06 02:10:00"],
      ])("increment time test with 'yyyy mm dd'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12 5 11:69", "12 5 12:09"],
        ["12 5 23:69", "12 6 00:09:00"],
        ["12 5 25 AM", "12 5 01:00 PM"],
        ["12 5 25:70 PM", "12 6 02:10:00"],
      ])("increment time test with 'm d'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });

      test.each([
        ["12 05 11:69", "12 05 12:09"],
        ["12 05 23:69", "12 06 00:09:00"],
        ["12 05 25 AM", "12 05 01:00 PM"],
        ["12 05 25:70 PM", "12 06 02:10:00"],
      ])("increment time test with 'mm dd'", (value, result) => {
        const parsedDateTime = parseDateTime(value)!;
        expect(formatValue(parsedDateTime.value, parsedDateTime.format)).toBe(result);
      });
    });
  });

  describe("formatValue on date", () => {
    const internalDate = parseDateTime("01/02/1954")!;
    const value = internalDate.value;

    test.each([
      [internalDate.format, "01/02/1954"],
      ["m/d/yyyy", "1/2/1954"],
      ["mm/dd/yyyy", "01/02/1954"],
      ["mm/dd", "01/02"],
      ["m/d", "1/2"],
    ])("month day year, with / as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });

    test.each([
      ["m-d-yyyy", "1-2-1954"],
      ["mm-dd-yyyy", "01-02-1954"],
      ["mm-dd", "01-02"],
      ["m-d", "1-2"],
    ])("month day year, with - as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });

    test.each([
      ["m d yyyy", "1 2 1954"],
      ["mm dd yyyy", "01 02 1954"],
      ["mm dd", "01 02"],
      ["m d", "1 2"],
    ])("month day year, with '  as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });

    test.each([
      ["yyyy/m/d", "1954/1/2"],
      ["yyyy/mm/dd", "1954/01/02"],
    ])("year month day, with / as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });

    test.each([
      ["yyyy-m-d", "1954-1-2"],
      ["yyyy-mm-dd", "1954-01-02"],
    ])("year month day, with - as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });

    test.each([
      ["yyyy m d", "1954 1 2"],
      ["yyyy mm dd", "1954 01 02"],
    ])("year month day, with ' ' as separator", (format, result) => {
      expect(formatValue(value, format)).toBe(result);
    });
  });

  describe("format value on time", () => {
    test.each([
      ["12:08:06", "12:08"],
      ["05:09 PM", "17:09"],
      ["012:008:006 AM", "00:08"],
      ["30:00:00", "06:00"],
    ])("hours minutes 'hh:mm', with format", (date, result) => {
      const value = parseDateTime(date)!.value;
      expect(formatValue(value, "hh:mm")).toBe(result);
    });

    test.each([
      ["12:08", "12:08:00"],
      ["05:09 PM", "17:09:00"],
      ["012:008:006 AM", "00:08:06"],
      ["30:00:00", "06:00:00"],
    ])("hours minutes seconds 'hh:mm:ss', with format", (date, result) => {
      const value = parseDateTime(date)!.value;
      expect(formatValue(value, "hh:mm:ss")).toBe(result);
    });

    test.each([
      ["12:08", "12:08 PM"],
      ["12:08:06", "12:08 PM"],
      ["012:008:006 AM", "12:08 AM"],
      ["30:00:00", "06:00 AM"],
    ])("hours minutes meridian 'hh:mm a', with format", (date, result) => {
      const value = parseDateTime(date)!.value;
      expect(formatValue(value, "hh:mm a")).toBe(result);
    });

    test.each([
      ["12:08", "12:08:00 PM"],
      ["12:08:06", "12:08:06 PM"],
      ["05:09 PM", "05:09:00 PM"],
      ["30:00:00", "06:00:00 AM"],
    ])("hours minutes meridian 'hh:mm:ss a', with format", (date, result) => {
      const value = parseDateTime(date)!.value;
      expect(formatValue(value, "hh:mm:ss a")).toBe(result);
    });

    test.each([
      ["12:08", "12:08:00"],
      ["12:08:06", "12:08:06"],
      ["05:09 PM", "17:09:00"],
      ["012:008:006 AM", "0:08:06"],
    ])("hours minutes meridian 'hh:mm:ss a', with format", (date, result) => {
      const value = parseDateTime(date)!.value;
      expect(formatValue(value, "hhhh:mm:ss")).toBe(result);
    });
  });
});
