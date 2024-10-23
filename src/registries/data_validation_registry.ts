import { DVTerms } from "../components/translations_terms";
import { tryToNumber } from "../functions/helpers";
import {
  DateTime,
  areDatesSameDay,
  formatValue,
  getCriterionValuesAsNumber,
  getDateNumberCriterionValues,
  isDateAfter,
  isDateBefore,
  isDateBetween,
  isDateStrictlyAfter,
  isDateStrictlyBefore,
  isNotNull,
  isNumberBetween,
  jsDateToRoundNumber,
  valueToDateNumber,
} from "../helpers";
import { parseLiteral } from "../helpers/cells";
import { detectLink } from "../helpers/links";
import { localizeContent } from "../helpers/locale";
import { _t } from "../translation";
import {
  CellValue,
  DEFAULT_LOCALE,
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsAfterCriterion,
  DateIsBeforeCriterion,
  DateIsBetweenCriterion,
  DateIsCriterion,
  DateIsNotBetweenCriterion,
  DateIsOnOrAfterCriterion,
  DateIsOnOrBeforeCriterion,
  Getters,
  IsBetweenCriterion,
  IsEqualCriterion,
  IsGreaterOrEqualToCriterion,
  IsGreaterThanCriterion,
  IsLessOrEqualToCriterion,
  IsLessThanCriterion,
  IsNotBetweenCriterion,
  IsNotEqualCriterion,
  IsValueInListCriterion,
  IsValueInRangeCriterion,
  Locale,
  TextContainsCriterion,
  TextNotContainsCriterion,
  UID,
} from "../types";
import { CellErrorType } from "../types/errors";
import { rangeReference } from "./../helpers/references";
import { Registry } from "./registry";

export type DataValidationCriterionEvaluator = {
  type: DataValidationCriterionType;
  /**
   * Checks if a value is valid for the given criterion.
   *
   * The value and the criterion values should be in canonical form (non-localized), and formulas should
   * be evaluated.
   */
  isValueValid: (
    value: CellValue,
    criterion: DataValidationCriterion,
    getters: Getters,
    sheetId: UID
  ) => boolean;
  /**
   * Returns the error string to display when the value is not valid.
   *
   * The criterion values should be in canonical form (non-localized), and formulas should be evaluated.
   */
  getErrorString: (criterion: DataValidationCriterion, getters: Getters, sheetId: UID) => string;
  /**
   * Checks if a criterion value is valid.
   *
   * The value should be in canonical form (non-localized).
   */
  isCriterionValueValid: (value: string) => boolean;
  /** Return the number of values that the criterion must contains. Return undefined if the criterion can have any number of values */
  numberOfValues: (criterion: DataValidationCriterion) => number | undefined;
  name: string;
  getPreview: (criterion: DataValidationCriterion, getters: Getters) => string;

  /** Error string when a criterion value is invalid */
  criterionValueErrorString: string;
  allowedValues?: "onlyLiterals" | "onlyFormulas";
};

export const dataValidationEvaluatorRegistry = new Registry<DataValidationCriterionEvaluator>();
dataValidationEvaluatorRegistry.add("textContains", {
  type: "textContains",
  isValueValid: (value: CellValue, criterion: TextContainsCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase().includes(criterion.values[0].toLowerCase());
  },
  getErrorString: (criterion: TextContainsCriterion) => {
    return _t('The value must be a text that contains "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text contains"),
  getPreview: (criterion) => _t('Text contains "%s"', criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (value: CellValue, criterion: TextNotContainsCriterion) => {
    const strValue = String(value);
    return !strValue.toLowerCase().includes(criterion.values[0].toLowerCase());
  },
  getErrorString: (criterion: TextNotContainsCriterion) => {
    return _t('The value must be a text that does not contain "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text does not contains"),
  getPreview: (criterion) => _t('Text does not contain "%s"', criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("textIs", {
  type: "textIs",
  isValueValid: (value: CellValue, criterion: TextContainsCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase() === criterion.values[0].toLowerCase();
  },
  getErrorString: (criterion: TextContainsCriterion) => {
    return _t('The value must be exactly "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text is exactly"),
  getPreview: (criterion) => _t('Text is exactly "%s"', criterion.values[0]),
});

/** Note: this regex doesn't allow for all the RFC-compliant mail addresses but should be enough for our purpose. */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
dataValidationEvaluatorRegistry.add("textIsEmail", {
  type: "textIsEmail",
  isValueValid: (value: CellValue) => typeof value === "string" && emailRegex.test(value),
  getErrorString: () => _t("The value must be a valid email address"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Text is valid email"),
  getPreview: () => _t("Text is valid email"),
});

dataValidationEvaluatorRegistry.add("textIsLink", {
  type: "textIsLink",
  isValueValid: (value: CellValue) => detectLink(value) !== undefined,
  getErrorString: () => _t("The value must be a valid link"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Text is valid link"),
  getPreview: () => _t("Text is valid link"),
});

dataValidationEvaluatorRegistry.add("dateIs", {
  type: "dateIs",
  isValueValid: (value: CellValue, criterion: DateIsCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);

    if (dateValue === undefined || criterionValue === undefined) {
      return false;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(DateTime.now());
      return isDateBetween(dateValue, today, criterionValue);
    }

    return areDatesSameDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    return criterion.dateValue === "exactDate"
      ? _t("The value must be the date %s", getDateCriterionLocalizedValues(criterion, locale)[0])
      : _t("The value must be %s", DVTerms.DateIs[criterion.dateValue]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
  name: _t("Date is"),
  getPreview: (criterion: DateIsCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is %s", getDateCriterionFormattedValues(criterion, getters)[0])
      : _t("Date is %s", DVTerms.DateIs[criterion.dateValue]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  isValueValid: (value: CellValue, criterion: DateIsBeforeCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateStrictlyBefore(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: DateIsBeforeCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date before %s",
          getDateCriterionLocalizedValues(criterion, locale)[0]
        )
      : _t("The value must be a date before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
  name: _t("Date is before"),
  getPreview: (criterion: DateIsBeforeCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is before %s", getDateCriterionFormattedValues(criterion, getters)[0])
      : _t("Date is before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  isValueValid: (value: CellValue, criterion: DateIsOnOrBeforeCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateBefore(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: DateIsOnOrBeforeCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or before %s",
          getDateCriterionLocalizedValues(criterion, locale)[0]
        )
      : _t("The value must be a date on or before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
  name: _t("Date is on or before"),
  getPreview: (criterion: DateIsOnOrBeforeCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is on or before %s", getDateCriterionFormattedValues(criterion, getters)[0])
      : _t("Date is on or before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  isValueValid: (value: CellValue, criterion: DateIsAfterCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateStrictlyAfter(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: DateIsAfterCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date after %s",
          getDateCriterionLocalizedValues(criterion, locale)[0]
        )
      : _t("The value must be a date after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
  name: _t("Date is after"),
  getPreview: (criterion: DateIsAfterCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is after %s", getDateCriterionFormattedValues(criterion, getters)[0])
      : _t("Date is after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  isValueValid: (value: CellValue, criterion: DateIsOnOrAfterCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateAfter(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: DateIsOnOrAfterCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or after %s",
          getDateCriterionLocalizedValues(criterion, locale)[0]
        )
      : _t("The value must be a date on or after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
  name: _t("Date is on or after"),
  getPreview: (criterion: DateIsOnOrAfterCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is on or after %s", getDateCriterionFormattedValues(criterion, getters)[0])
      : _t("Date is on or after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  isValueValid: (value: CellValue, criterion: DateIsBetweenCriterion) => {
    const criterionValues = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE);
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    if (
      dateValue === undefined ||
      criterionValues[0] === undefined ||
      criterionValues[1] === undefined
    ) {
      return false;
    }
    return isDateBetween(dateValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: DateIsBetweenCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const criterionValues = getDateCriterionLocalizedValues(criterion, locale);
    return _t("The value must be a date between %s and %s", criterionValues[0], criterionValues[1]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: () => 2,
  name: _t("Date is between"),
  getPreview: (criterion: DateIsBetweenCriterion, getters: Getters) => {
    const values = getDateCriterionFormattedValues(criterion, getters);
    return _t("Date is between %s and %s", values[0], values[1]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  isValueValid: (value: CellValue, criterion: DateIsNotBetweenCriterion) => {
    const criterionValues = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE);
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);

    if (
      dateValue === undefined ||
      criterionValues[0] === undefined ||
      criterionValues[1] === undefined
    ) {
      return false;
    }
    return !isDateBetween(dateValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: DateIsNotBetweenCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const criterionValues = getDateCriterionLocalizedValues(criterion, locale);
    return _t(
      "The value must be a date not between %s and %s",
      criterionValues[0],
      criterionValues[1]
    );
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: () => 2,
  name: _t("Date is not between"),
  getPreview: (criterion: DateIsNotBetweenCriterion, getters: Getters) => {
    const values = getDateCriterionFormattedValues(criterion, getters);
    return _t("Date is not between %s and %s", values[0], values[1]);
  },
});

dataValidationEvaluatorRegistry.add("dateIsValid", {
  type: "dateIsValid",
  isValueValid: (value: CellValue) => {
    return valueToDateNumber(value, DEFAULT_LOCALE) !== undefined;
  },
  getErrorString: () => _t("The value must be a valid date"),
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Is valid date"),
  getPreview: () => _t("Date is valid"),
});

dataValidationEvaluatorRegistry.add("isEqual", {
  type: "isEqual",
  isValueValid: (value: CellValue, criterion: IsEqualCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value === criterionValue;
  },
  getErrorString: (criterion: IsEqualCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be equal to %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is equal to"),
  getPreview: (criterion) => _t("Value is equal to %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isNotEqual", {
  type: "isNotEqual",
  isValueValid: (value: CellValue, criterion: IsNotEqualCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value !== criterionValue;
  },
  getErrorString: (criterion: IsNotEqualCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must not be equal to %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is not equal to"),
  getPreview: (criterion) => _t("Value is not equal to %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isGreaterThan", {
  type: "isGreaterThan",
  isValueValid: (value: CellValue, criterion: IsGreaterThanCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value > criterionValue;
  },
  getErrorString: (criterion: IsGreaterThanCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be greater than %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is greater than"),
  getPreview: (criterion) => _t("Value is greater than %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isGreaterOrEqualTo", {
  type: "isGreaterOrEqualTo",
  isValueValid: (value: CellValue, criterion: IsGreaterOrEqualToCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value >= criterionValue;
  },
  getErrorString: (criterion: IsGreaterOrEqualToCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be greater or equal to %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is greater or equal to"),
  getPreview: (criterion) => _t("Value is greater or equal to %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isLessThan", {
  type: "isLessThan",
  isValueValid: (value: CellValue, criterion: IsLessThanCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value < criterionValue;
  },
  getErrorString: (criterion: IsLessThanCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be less than %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is less than"),
  getPreview: (criterion) => _t("Value is less than %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isLessOrEqualTo", {
  type: "isLessOrEqualTo",
  isValueValid: (value: CellValue, criterion: IsLessOrEqualToCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (criterionValue === undefined) {
      return false;
    }
    return value <= criterionValue;
  },
  getErrorString: (criterion: IsLessOrEqualToCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be less or equal to %s", values[0]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 1,
  name: _t("Is less or equal to"),
  getPreview: (criterion) => _t("Value is less or equal to %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterion: IsBetweenCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValues = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE);

    if (criterionValues[0] === undefined || criterionValues[1] === undefined) {
      return false;
    }
    return isNumberBetween(value, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: IsBetweenCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must be between %s and %s", values[0], values[1]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 2,
  name: _t("Is between"),
  getPreview: (criterion) =>
    _t("Value is between %s and %s", criterion.values[0], criterion.values[1]),
});

dataValidationEvaluatorRegistry.add("isNotBetween", {
  type: "isNotBetween",
  isValueValid: (value: CellValue, criterion: IsNotBetweenCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValues = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE);

    if (criterionValues[0] === undefined || criterionValues[1] === undefined) {
      return false;
    }
    return !isNumberBetween(value, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: IsNotBetweenCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const values = getNumberCriterionlocalizedValues(criterion, locale);
    return _t("The value must not be between %s and %s", values[0], values[1]);
  },
  isCriterionValueValid: (value) => checkValueIsNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.numberValue,
  numberOfValues: () => 2,
  name: _t("Is not between"),
  getPreview: (criterion) =>
    _t("Value is not between %s and %s", criterion.values[0], criterion.values[1]),
});

dataValidationEvaluatorRegistry.add("isBoolean", {
  type: "isBoolean",
  isValueValid: (value: CellValue) => value === "" || typeof value === "boolean",
  getErrorString: () => _t("The value must be a boolean"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Checkbox"),
  getPreview: () => _t("Checkbox"),
});

dataValidationEvaluatorRegistry.add("isValueInList", {
  type: "isValueInList",
  isValueValid: (value: CellValue, criterion: IsValueInListCriterion) => {
    if (value === null) {
      return false;
    }
    return criterion.values
      .map((str) => str.toLowerCase())
      .includes(value.toString().toLowerCase());
  },
  getErrorString: (criterion: IsValueInListCriterion) =>
    _t("The value must be one of: %s", criterion.values.join(", ")),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => undefined,
  allowedValues: "onlyLiterals",
  name: _t("Value in list"),
  getPreview: (criterion) => _t("Value one of: %s", criterion.values.join(", ")),
});

dataValidationEvaluatorRegistry.add("isValueInRange", {
  type: "isValueInList",
  isValueValid: (
    value: CellValue,
    criterion: IsValueInListCriterion,
    getters: Getters,
    sheetId: UID
  ) => {
    if (!value) {
      return false;
    }
    const range = getters.getRangeFromSheetXC(sheetId, criterion.values[0]);
    const criterionValues = getters.getRangeValues(range);
    return criterionValues
      .filter(isNotNull)
      .map((value) => value.toString().toLowerCase())
      .includes(value.toString().toLowerCase());
  },
  getErrorString: (criterion: IsValueInRangeCriterion) =>
    _t("The value must be a value in the range %s", criterion.values[0]),
  isCriterionValueValid: (value) => rangeReference.test(value),
  criterionValueErrorString: DVTerms.CriterionError.validRange,
  numberOfValues: () => 1,
  allowedValues: "onlyLiterals",
  name: _t("Value in range"),
  getPreview: (criterion) => _t("Value in range %s", criterion.values[0]),
});

dataValidationEvaluatorRegistry.add("customFormula", {
  type: "customFormula",
  isValueValid: (value: CellValue, criterion: IsValueInListCriterion) => {
    const parsedValue = parseLiteral(criterion.values[0], DEFAULT_LOCALE);
    if (typeof parsedValue === "number" || typeof parsedValue === "boolean") {
      return !!parsedValue;
    }
    return false;
  },
  getErrorString: () => _t("The value does not match the custom formula data validation rule"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 1,
  allowedValues: "onlyFormulas",
  name: _t("Custom formula"),
  getPreview: (criterion) => _t("Custom formula %s", criterion.values[0]),
});

function getNumberCriterionlocalizedValues(
  criterion: DataValidationCriterion,
  locale: Locale
): string[] {
  return criterion.values.map((value) =>
    value !== undefined ? localizeContent(value, locale) : CellErrorType.InvalidReference
  );
}

function getDateCriterionLocalizedValues(
  criterion: DataValidationCriterion,
  locale: Locale
): string[] {
  const values = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE);
  return values.map((value) =>
    value !== undefined
      ? formatValue(value, { locale, format: locale.dateFormat })
      : CellErrorType.InvalidReference
  );
}

function checkValueIsDate(value: string): boolean {
  const valueAsNumber = valueToDateNumber(value, DEFAULT_LOCALE);
  return valueAsNumber !== undefined;
}

function checkValueIsNumber(value: string): boolean {
  const valueAsNumber = tryToNumber(value, DEFAULT_LOCALE);
  return valueAsNumber !== undefined;
}

function getDateCriterionFormattedValues(criterion: DataValidationCriterion, getters: Getters) {
  const locale = getters.getLocale();
  return criterion.values.map((valueStr) => {
    if (valueStr.startsWith("=")) {
      return valueStr;
    }
    const value = parseLiteral(valueStr, locale);
    if (typeof value === "number") {
      return formatValue(value, { format: locale.dateFormat, locale });
    }
    return "";
  });
}
