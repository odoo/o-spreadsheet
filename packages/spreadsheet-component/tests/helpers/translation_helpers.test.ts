import { _t, setTranslationMethod } from "../../src/translation";

describe("Translations", () => {
  beforeEach(() => {
    setTranslationMethod(
      (str, ...values) => str,
      () => true
    );
  });

  test("placeholders in string translation are replaced with their given value", () => {
    expect(_t("Hello %s", "World")).toBe("Hello World");
  });

  test("placeholder can be a number", () => {
    expect(_t("The answer is %s", 42)).toBe("The answer is 42");
  });

  test("named placeholder can be a number", () => {
    expect(_t("The answer is %(answer)s", { answer: 42 })).toBe("The answer is 42");
  });

  test("placeholder can be string Object instead of primitive", () => {
    expect(_t("Hello %s", new String("World"))).toBe("Hello World");
    expect(_t("Hello %s", _t("World"))).toBe("Hello World");
  });

  test("can have named placeholders", () => {
    expect(_t("%(x1)s %(thing)s", { x1: "Hello", thing: "World" })).toBe("Hello World");
  });

  test("should replace placeholders even if the translation is not loaded", () => {
    setTranslationMethod(
      (str, ...values) => str,
      () => false
    );
    const str = _t("%(x1)s %(thing)s", { x1: "Hello", thing: "World" });
    expect(`${str}`).toBe("Hello World");
  });
});
