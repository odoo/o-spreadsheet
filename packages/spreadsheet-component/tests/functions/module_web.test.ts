import { evaluateCell, evaluateCellText } from "../test_helpers/helpers";

describe("HYPERLINK formula", () => {
  test("The evaluated result is the link", () => {
    expect(evaluateCell("A1", { A1: '=HYPERLINK("https://www.odoo.com", "Odoo")' })).toBe("Odoo");
    expect(evaluateCell("A1", { A1: '=HYPERLINK("https://www.odoo.com")' })).toBe(
      "https://www.odoo.com"
    );
    expect(evaluateCell("A1", { A1: '=HYPERLINK("invalidUrl")' })).toBe("invalidUrl");
  });

  test("The reference will be taken into account", () => {
    expect(evaluateCell("A1", { A1: "=HYPERLINK(A2)", A2: "https://www.odoo.com" })).toBe(
      "https://www.odoo.com"
    );
    expect(evaluateCell("A1", { A1: '=HYPERLINK(A2, "Odoo")', A2: "https://www.odoo.com" })).toBe(
      "Odoo"
    );
    expect(
      evaluateCell("A1", { A1: "=HYPERLINK(A2, A3)", A2: "https://www.odoo.com", A3: "Odoo" })
    ).toBe("Odoo");
  });

  test("URL is not a string", () => {
    expect(evaluateCell("A1", { A1: "=HYPERLINK(2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=HYPERLINK(2, "number")' })).toBe("number");

    expect(evaluateCell("A1", { A1: "=HYPERLINK(true)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=HYPERLINK(true, "boolean")' })).toBe("boolean");

    expect(evaluateCell("A1", { A1: '=HYPERLINK("1/31/2022")' })).toBe(44592);
    expect(evaluateCellText("A1", { A1: '=HYPERLINK("1/31/2022")' })).toBe("1/31/2022");
    expect(evaluateCell("A1", { A1: '=HYPERLINK("1/31/2022", "date")' })).toBe("date");

    expect(evaluateCell("A1", { A1: "=HYPERLINK()" })).toBe("#BAD_EXPR");
  });

  test("Label is not a string", () => {
    expect(evaluateCell("A1", { A1: '=HYPERLINK("www.odoo.com", 2)' })).toBe(2);

    expect(evaluateCell("A1", { A1: '=HYPERLINK("www.odoo.com", true)' })).toBe(true);
    expect(evaluateCellText("A1", { A1: '=HYPERLINK("www.odoo.com", true)' })).toBe("TRUE");

    expect(evaluateCell("A1", { A1: '=HYPERLINK("www.odoo.com", "1/31/2022")' })).toBe(44592);
    expect(evaluateCellText("A1", { A1: '=HYPERLINK("www.odoo.com", "1/31/2022")' })).toBe(
      "1/31/2022"
    );
  });

  test("Url which is empty or only contains whitespaces will not be converted into link, but label still shows", () => {
    expect(evaluateCell("A1", { A1: '=HYPERLINK("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=HYPERLINK("", "   ")' })).toBe("   ");
    expect(evaluateCell("A1", { A1: '=HYPERLINK("", "label")' })).toBe("label");
    expect(evaluateCell("A1", { A1: '=HYPERLINK(" ")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=HYPERLINK(" ", "   ")' })).toBe("   ");
    expect(evaluateCell("A1", { A1: '=HYPERLINK(" ", "link label")' })).toBe("link label");
  });

  test("Label which is empty or only contains whitespace will not influence the conversion to link", () => {
    expect(evaluateCell("A1", { A1: '=HYPERLINK("www.odoo.com", "")' })).toBe("www.odoo.com");
    expect(evaluateCell("A1", { A1: '=HYPERLINK("www.odoo.com", "   ")' })).toBe("   ");
  });
});
