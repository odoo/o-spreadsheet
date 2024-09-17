import { Model } from "../../src";
import { parseLiteral } from "../../src/helpers/cells";
import {
  DataValidationCriterionEvaluator,
  dataValidationEvaluatorRegistry,
} from "../../src/registries/data_validation_registry";
import {
  DEFAULT_LOCALE,
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  Getters,
  UID,
} from "../../src/types";
import { updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";

describe("Data validation registry", () => {
  let model: Model;
  let getters: Getters;
  let sheetId: UID;
  beforeEach(() => {
    model = new Model();
    getters = model.getters;
    sheetId = model.getters.getActiveSheetId();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("01/01/2021 12:00:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function testValidTextCriterionValues(evaluator: DataValidationCriterionEvaluator) {
    expect(evaluator.isCriterionValueValid("test")).toEqual(true);
    expect(evaluator.isCriterionValueValid("")).toEqual(false);
    expect(evaluator.criterionValueErrorString.toString()).toEqual("The value must not be empty");
  }

  function testValidDateCriterionValues(evaluator: DataValidationCriterionEvaluator) {
    expect(evaluator.isCriterionValueValid("01/01/2021")).toEqual(true);
    expect(evaluator.isCriterionValueValid("5")).toEqual(true);
    expect(evaluator.isCriterionValueValid("")).toEqual(false);
    expect(evaluator.isCriterionValueValid("hello")).toEqual(false);

    expect(evaluator.criterionValueErrorString.toString()).toEqual("The value must be a date");
  }

  function testValidNumberCriterionValues(evaluator: DataValidationCriterionEvaluator) {
    expect(evaluator.isCriterionValueValid("59")).toEqual(true);
    expect(evaluator.isCriterionValueValid("hello")).toEqual(false);
    expect(evaluator.isCriterionValueValid("TRUE")).toEqual(false);

    expect(evaluator.criterionValueErrorString.toString()).toEqual("The value must be a number");
  }

  function testErrorStringEqual(criterion: DataValidationCriterion, errorStr: string) {
    const evaluator = dataValidationEvaluatorRegistry.get(criterion.type);
    expect(evaluator.getErrorString(criterion, getters, sheetId).toString()).toEqual(errorStr);
  }

  describe("Text contains", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textContains");
    const criterion: DataValidationCriterion = { type: "textContains", values: ["test"] };

    test.each([
      ["abc", "test", false],
      ["abc test", "test", true],
      ["TEST", "test", true],
      ["test1", "test", true],
      [1125, "12", true],
      [true, "true", true],
    ])("Valid values %s", (testValue, criterionValue, expectedResult) => {
      const testCriterion = { ...criterion, values: [criterionValue] };
      expect(evaluator.isValueValid(testValue, testCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });
    test("Error string", () =>
      testErrorStringEqual(criterion, 'The value must be a text that contains "test"'));

    test("Valid criterion values", () => testValidTextCriterionValues(evaluator));
  });

  describe("Text not contains", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textNotContains");
    const criterion: DataValidationCriterion = { type: "textNotContains", values: ["test"] };

    test.each([
      ["abc", "test", true],
      ["abc test", "test", false],
      ["TEST", "test", false],
      ["test1", "test", false],
      [1125, "9", true],
      [true, "false", true],
    ])("Valid values %s", (testValue, criterionValue, expectedResult) => {
      const testCriterion = { ...criterion, values: [criterionValue] };
      expect(evaluator.isValueValid(testValue, testCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, 'The value must be a text that does not contain "test"'));

    test("Valid criterion values", () => testValidTextCriterionValues(evaluator));
  });

  describe("Text is", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIs");
    const criterion: DataValidationCriterion = { type: "textIs", values: ["hello"] };

    test.each([
      ["hello there", "hello", false],
      ["hell", "hello", false],
      ["hello", "hello", true],
      ["HeLlO", "hello", true],
      [1125, "1125", true],
      [true, "true", true],
    ])("Valid values %s", (testValue, criterionValue, expectedResult) => {
      const testCriterion = { ...criterion, values: [criterionValue] };
      expect(evaluator.isValueValid(testValue, testCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, 'The value must be exactly "hello"'));

    test("Valid criterion values", () => testValidTextCriterionValues(evaluator));
  });

  describe("Text is email", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIsEmail");
    const criterion: DataValidationCriterion = { type: "textIsEmail", values: [] };

    test.each([
      ["hello", false],
      ["hello@gmail", false],
      ["hello@gmail.com", true],
      ["hello.there@gmail.com", true],
      ["hello there@gmail.com", false],
      ["hello@there@gmail.com", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must be a valid email address"));
  });

  describe("Text is link", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIsLink");
    const criterion: DataValidationCriterion = { type: "textIsLink", values: [] };

    test.each([
      ["hello", false],
      ["hello.com", false],
      ["http://hello.com", true],
      ["http://www.hello.com", true],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be a valid link"));
  });

  describe("Date is", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIs");
    const criterion: DataValidationCriterion = {
      type: "dateIs",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", true],
      ["exactDate", "01/01/2021 18:00:00", true],
      ["exactDate", "01/01/2022", false],
      ["exactDate", "01/02/2021", false],
      ["exactDate", "02/01/2021", false],
      ["today", "01/01/2021", true],
      ["today", "01/01/2021 18:00:00", true],
      ["today", "01/02/2021", false],
      ["tomorrow", "01/01/2022", false],
      ["tomorrow", "01/02/2021", true],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", true],
      ["lastWeek", "12/20/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/31/2020", true],
      ["lastMonth", "11/30/2020", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "12/31/2020", true],
      ["lastYear", "12/31/2019", false],
    ])("Valid values %s %", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be the date 1/1/2012"],
      ["exactDate", ["2"], "The value must be the date 1/1/1900"],
      ["today", [], "The value must be today"],
      ["lastYear", [], "The value must be in the past year"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, getters, sheetId).toString()).toEqual(
        errorStr
      );
    });

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is before", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsBefore");
    const criterion: DataValidationCriterion = {
      type: "dateIsBefore",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", false],
      ["exactDate", "12/31/2020", true],
      ["exactDate", "12/31/2020 18:00:00", true],
      ["exactDate", "01/01/2022", false],
      ["today", "01/01/2021", false],
      ["today", "12/31/2020", true],
      ["tomorrow", "01/01/2021", true],
      ["tomorrow", "01/02/2021", false],
      ["yesterday", "12/30/2020", true],
      ["yesterday", "12/31/2020", false],
      ["lastWeek", "12/25/2020", false],
      ["lastWeek", "12/26/2020", false],
      ["lastWeek", "12/20/2020", true],
      ["lastMonth", "12/01/2020", false],
      ["lastMonth", "12/31/2020", false],
      ["lastMonth", "11/30/2020", true],
      ["lastYear", "01/01/2020", false],
      ["lastYear", "12/31/2020", false],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date before 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date before 1/1/1900"],
      ["today", [], "The value must be a date before today"],
      ["lastYear", [], "The value must be a date before one year ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, getters, sheetId).toString()).toEqual(
        errorStr
      );
    });

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is on or before", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsOnOrBefore");
    const criterion: DataValidationCriterion = {
      type: "dateIsOnOrBefore",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", true],
      ["exactDate", "12/31/2020", true],
      ["exactDate", "01/02/2021", false],
      ["today", "01/01/2021", true],
      ["today", "12/31/2020", true],
      ["today", "01/02/2021", false],
      ["tomorrow", "01/01/2021", true],
      ["tomorrow", "01/02/2021", true],
      ["tomorrow", "01/03/2021", false],
      ["yesterday", "12/30/2020", true],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/31/2020", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "12/31/2020", false],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date on or before 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date on or before 1/1/1900"],
      ["today", [], "The value must be a date on or before today"],
      ["lastMonth", [], "The value must be a date on or before one month ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, getters, sheetId).toString()).toEqual(
        errorStr
      );
    });

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is after", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsAfter");
    const criterion: DataValidationCriterion = {
      type: "dateIsAfter",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", false],
      ["exactDate", "01/02/2021", true],
      ["exactDate", "01/02/2021 18:00:00", true],
      ["today", "01/01/2021", false],
      ["today", "01/02/2021", true],
      ["tomorrow", "01/02/2021", false],
      ["tomorrow", "01/03/2021", true],
      ["yesterday", "12/31/2020", false],
      ["yesterday", "01/01/2021", true],
      ["lastWeek", "12/25/2020", false],
      ["lastWeek", "12/26/2020", true],
      ["lastMonth", "12/01/2020", false],
      ["lastMonth", "12/02/2020", true],
      ["lastYear", "01/01/2020", false],
      ["lastYear", "01/02/2020", true],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date after 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date after 1/1/1900"],
      ["today", [], "The value must be a date after today"],
      ["lastWeek", [], "The value must be a date after one week ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, getters, sheetId).toString()).toEqual(
        errorStr
      );
    });

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is on or after", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsOnOrAfter");
    const criterion: DataValidationCriterion = {
      type: "dateIsOnOrAfter",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "12/31/2020", false],
      ["exactDate", "01/01/2021", true],
      ["exactDate", "01/02/2021", true],
      ["exactDate", "01/02/2021 18:00:00", true],
      ["today", "12/31/2020", false],
      ["today", "01/01/2021", true],
      ["today", "01/02/2021", true],
      ["tomorrow", "01/01/2021", false],
      ["tomorrow", "01/02/2021", true],
      ["tomorrow", "01/03/2021", true],
      ["yesterday", "12/30/2020", false],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", true],
      ["lastWeek", "12/24/2020", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", true],
      ["lastMonth", "11/30/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/02/2020", true],
      ["lastYear", "12/31/2019", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "01/02/2020", true],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date on or after 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date on or after 1/1/1900"],
      ["today", [], "The value must be a date on or after today"],
      ["lastWeek", [], "The value must be a date on or after one week ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, getters, sheetId).toString()).toEqual(
        errorStr
      );
    });

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsBetween");
    const criterion: DataValidationCriterion = {
      type: "dateIsBetween",
      values: ["01/01/2021", "01/10/2021"],
    };

    test.each([
      ["12/31/2020", false],
      ["01/01/2021", true],
      ["01/10/2021", true],
      ["01/11/2021", false],
    ])("Valid values %s", (dateValue, expectedResult) => {
      const dateNumber = parseLiteral(dateValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must be a date between 1/1/2021 and 1/10/2021"));

    test("Valid criterion values", () => testValidDateCriterionValues(evaluator));
  });

  describe("Date is valid", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsValid");
    const criterion: DataValidationCriterion = {
      type: "dateIsValid",
      values: [],
    };

    test.each([
      ["12/31/2020", true],
      ["31/31/01/2021", false],
      [15, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be a valid date"));
  });

  describe("Value is equal", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isEqual");
    const criterion: DataValidationCriterion = {
      type: "isEqual",
      values: ["5"],
    };

    test.each([
      [5, true],
      ["5", false],
      [12, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be equal to 5"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is not equal", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isNotEqual");
    const criterion: DataValidationCriterion = {
      type: "isNotEqual",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["5", false],
      [12, true],
      ["12", false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must not be equal to 5"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is greater than", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isGreaterThan");
    const criterion: DataValidationCriterion = {
      type: "isGreaterThan",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["6", false],
      [6, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be greater than 5"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is greater or equal to", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isGreaterOrEqualTo");
    const criterion: DataValidationCriterion = {
      type: "isGreaterOrEqualTo",
      values: ["5"],
    };

    test.each([
      [5, true],
      ["6", false],
      [4, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must be greater or equal to 5"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is less than", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isLessThan");
    const criterion: DataValidationCriterion = {
      type: "isLessThan",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["6", false],
      [4, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be less than 5"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isBetween");
    const criterion: DataValidationCriterion = {
      type: "isBetween",
      values: ["5", "8"],
    };

    test.each([
      [4, false],
      [5, true],
      ["8", false],
      [9, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must be between 5 and 8"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is not between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isNotBetween");
    const criterion: DataValidationCriterion = {
      type: "isNotBetween",
      values: ["5", "8"],
    };

    test.each([
      [4, true],
      [5, false],
      ["6", false],
      [9, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must not be between 5 and 8"));

    test("Valid criterion values", () => testValidNumberCriterionValues(evaluator));
  });

  describe("Value is checkbox", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isBoolean");
    const criterion: DataValidationCriterion = { type: "isBoolean", values: [] };

    test.each([
      [false, true],
      [true, true],
      ["", true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => testErrorStringEqual(criterion, "The value must be a boolean"));
  });

  describe("Value in list", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isValueInList");
    const criterion: DataValidationCriterion = {
      type: "isValueInList",
      values: ["a", "B", "c"],
      displayStyle: "arrow",
    };

    test.each([
      ["a", true],
      ["b", true],
      ["C", true],
      ["ab", false],
      ["8", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, getters, sheetId)).toEqual(
        expectedResult
      );
    });

    test("Error string", () =>
      testErrorStringEqual(criterion, "The value must be one of: a, B, c"));
  });

  describe("Custom formula", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("customFormula");
    const criterionGeneric: DataValidationCriterion = {
      type: "customFormula",
      values: [],
    };

    // Same behaviour as Excel/Gsheet: numbers result are valid except 0, string/empty values are not valid
    test.each([
      ["true", true],
      ["false", false],
      ["5", true],
      ["0", false],
      ["12/12/1988", true],
      ["text", false],
      ["", false],
    ])("Valid values %s", (criterionValue, expectedResult) => {
      // Criterion value will be a formula, but will be evaluated by the EvaluationDataValidationPlugin before
      // being passed to the evaluator. The cell value is ignored, only the criterion formula result is of interest.
      const criterion = { ...criterionGeneric, values: [criterionValue] };
      expect(evaluator.isValueValid("", criterion, getters, sheetId)).toEqual(expectedResult);
    });

    test("Error string", () =>
      testErrorStringEqual(
        criterionGeneric,
        "The value does not match the custom formula data validation rule"
      ));
  });

  describe("Locale", () => {
    const isEqual: DataValidationCriterion = { type: "isEqual", values: ["5"] };
    const dateIs: DataValidationCriterion = {
      type: "dateIs",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };
    const textIs: DataValidationCriterion = { type: "textIs", values: ["hello"] };

    test("Number criterion isValueValid expect canonical value", () => {
      updateLocale(model, FR_LOCALE);
      const evaluator = dataValidationEvaluatorRegistry.get(isEqual.type);
      expect(
        evaluator.isValueValid(5.5, { ...isEqual, values: ["5.5"] }, getters, sheetId)
      ).toEqual(true);
      expect(
        evaluator.isValueValid(5.5, { ...isEqual, values: ["5,5"] }, getters, sheetId)
      ).toEqual(false);
    });

    test("Date criterion isValueValid expect canonical value", () => {
      updateLocale(model, FR_LOCALE);
      const evaluator = dataValidationEvaluatorRegistry.get(dateIs.type);
      const criterion = { ...dateIs, values: ["12/31/2021"] };
      expect(evaluator.isValueValid("12/31/2021", criterion, getters, sheetId)).toEqual(true);
      expect(evaluator.isValueValid("31/12/2021", criterion, getters, sheetId)).toEqual(false);
    });

    test("Number criterion error message displays localized value", () => {
      updateLocale(model, FR_LOCALE);
      const evaluator = dataValidationEvaluatorRegistry.get(isEqual.type);
      const criterion = { ...isEqual, values: ["5.5"] };
      expect(evaluator.getErrorString(criterion, getters, sheetId)).toContain("5,5");
    });

    test("Date criterion error message displays localized value", () => {
      updateLocale(model, FR_LOCALE);
      const evaluator = dataValidationEvaluatorRegistry.get(dateIs.type);
      const criterion = { ...dateIs, values: ["12/31/2021"] };
      expect(evaluator.getErrorString(criterion, getters, sheetId)).toContain("31/12/2021");
    });

    test("Text criterion error message displays is not localized", () => {
      updateLocale(model, FR_LOCALE);
      const evaluator = dataValidationEvaluatorRegistry.get(textIs.type);
      const criterion = { ...textIs, values: ["12/31/2021"] };
      expect(evaluator.getErrorString(criterion, getters, sheetId)).toContain("12/31/2021");
    });
  });
});
