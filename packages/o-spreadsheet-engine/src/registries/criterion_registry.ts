import { DVTerms } from "../components/translations_terms";
import { tryToNumber } from "../functions/helpers";
import {
  getDateCriterionFormattedValues,
  getDateNumberCriterionValues,
} from "../helpers/criterion_helpers";
import {
  areDatesSameDay,
  DateTime,
  isDateAfter,
  isDateBefore,
  isDateBetween,
  isDateStrictlyAfter,
  isDateStrictlyBefore,
  jsDateToRoundNumber,
  valueToDateNumber,
} from "../helpers/dates";
import { formatValue } from "../helpers/format/format";
import { detectLink } from "../helpers/links";
import { localizeContent } from "../helpers/locale";
import { clip, isNumberBetween } from "../helpers/misc";
import { rangeReference } from "../helpers/references";
import { _t } from "../translation";
import { CellValue } from "../types/cells";
import {
  DateIsAfterCriterion,
  DateIsBeforeCriterion,
  DateIsBetweenCriterion,
  DateIsCriterion,
  DateIsNotBetweenCriterion,
  DateIsOnOrAfterCriterion,
  DateIsOnOrBeforeCriterion,
  Top10Criterion,
} from "../types/data_validation";
import { CellErrorType } from "../types/errors";
import {
  EvaluatedCriterion,
  EvaluatedDateCriterion,
  GenericCriterion,
  GenericCriterionType,
} from "../types/generic_criterion";
import { Getters } from "../types/getters";
import { DEFAULT_LOCALE, Locale } from "../types/locale";
import { UID } from "../types/misc";
import { Range } from "../types/range";
import { Registry } from "./registry";

export type CriterionEvaluator<T = unknown> = {
  type: GenericCriterionType;
  /**
   * Checks if a value is valid for the given criterion.
   *
   * The value and the criterion values should be in canonical form (non-localized), and formulas should
   * be evaluated.
   *
   * For more complex criteria (like "top10"), a computation cache may be returned to avoid recomputing the entire criterion
   * on every value it applies to.
   */
  isValueValid: (
    value: CellValue,
    criterion: EvaluatedCriterion,
    preComputedCriterion?: T
  ) => boolean;
  /**
   * For more complex criteria (like "top10"), we might want to pre-compute some data before evaluating the criterion for
   * each cell, to avoid recomputing everything each time.
   */
  preComputeCriterion?: (
    criterion: GenericCriterion,
    criterionRanges: Range[],
    getters: Getters
  ) => T;
  /**
   * Returns the error string to display when the value is not valid.
   *
   * The criterion values should be in canonical form (non-localized), and formulas should be evaluated.
   */
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters, sheetId: UID) => string;
  /**
   * Checks if a criterion value is valid.
   *
   * The value should be in canonical form (non-localized).
   */
  isCriterionValueValid: (value: string) => boolean;
  /** Return the number of values that the criterion must contains. Return undefined if the criterion can have any number of values */
  numberOfValues: (criterion: GenericCriterion) => number | undefined;
  name: string;
  getPreview: (criterion: GenericCriterion, getters: Getters) => string;

  /** Error string when a criterion value is invalid */
  criterionValueErrorString: string;
  allowedValues?: "onlyLiterals" | "onlyFormulas";
};

export const criterionEvaluatorRegistry = new Registry<CriterionEvaluator>();
criterionEvaluatorRegistry.add("containsText", {
  type: "containsText",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase().includes(String(criterion.values[0]).toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) => {
    return _t('The value must be a text that contains "%s"', String(criterion.values[0]));
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text contains"),
  getPreview: (criterion) => _t('Text contains "%s"', criterion.values[0]),
});

criterionEvaluatorRegistry.add("notContainsText", {
  type: "notContainsText",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const strValue = String(value);
    return !strValue.toLowerCase().includes(String(criterion.values[0]).toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) => {
    return _t('The value must be a text that does not contain "%s"', String(criterion.values[0]));
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text does not contain"),
  getPreview: (criterion) => _t('Text does not contain "%s"', criterion.values[0]),
});

criterionEvaluatorRegistry.add("isEqualText", {
  type: "isEqualText",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase() === String(criterion.values[0]).toLowerCase();
  },
  getErrorString: (criterion: EvaluatedCriterion) => {
    return _t('The value must be exactly "%s"', String(criterion.values[0]));
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text is exactly"),
  getPreview: (criterion) => _t('Text is exactly "%s"', criterion.values[0]),
});

/** Note: this regex doesn't allow for all the RFC-compliant mail addresses but should be enough for our purpose. */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
criterionEvaluatorRegistry.add("isEmail", {
  type: "isEmail",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) =>
    typeof value === "string" && emailRegex.test(value),
  getErrorString: () => _t("The value must be a valid email address"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Text is valid email"),
  getPreview: () => _t("Text is valid email"),
});

criterionEvaluatorRegistry.add("isLink", {
  type: "isLink",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) =>
    detectLink(value) !== undefined,
  getErrorString: () => _t("The value must be a valid link"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Text is valid link"),
  getPreview: () => _t("Text is valid link"),
});

criterionEvaluatorRegistry.add("dateIs", {
  type: "dateIs",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
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
  getErrorString: (criterion: EvaluatedCriterion<DateIsCriterion>, getters: Getters) => {
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
      ? _t("Date is %s", getDateCriterionFormattedValues(criterion.values, getters.getLocale())[0])
      : _t("Date is %s", DVTerms.DateIs[criterion.dateValue]);
  },
});

criterionEvaluatorRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateStrictlyBefore(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: EvaluatedCriterion<DateIsBeforeCriterion>, getters: Getters) => {
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
      ? _t(
          "Date is before %s",
          getDateCriterionFormattedValues(criterion.values, getters.getLocale())[0]
        )
      : _t("Date is before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

criterionEvaluatorRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateBefore(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: EvaluatedCriterion<DateIsOnOrBeforeCriterion>, getters: Getters) => {
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
  getPreview: (criterion: DateIsBeforeCriterion, getters: Getters) => {
    return criterion.dateValue === "exactDate"
      ? _t(
          "Date is on or before %s",
          getDateCriterionFormattedValues(criterion.values, getters.getLocale())[0]
        )
      : _t("Date is on or before %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

criterionEvaluatorRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateStrictlyAfter(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: EvaluatedCriterion<DateIsAfterCriterion>, getters: Getters) => {
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
      ? _t(
          "Date is after %s",
          getDateCriterionFormattedValues(criterion.values, getters.getLocale())[0]
        )
      : _t("Date is after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

criterionEvaluatorRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
    const criterionValue = getDateNumberCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return (
      dateValue !== undefined &&
      criterionValue !== undefined &&
      isDateAfter(dateValue, criterionValue)
    );
  },
  getErrorString: (criterion: EvaluatedCriterion<DateIsOnOrAfterCriterion>, getters: Getters) => {
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
      ? _t(
          "Date is on or after %s",
          getDateCriterionFormattedValues(criterion.values, getters.getLocale())[0]
        )
      : _t("Date is on or after %s", DVTerms.DateIsBefore[criterion.dateValue]);
  },
});

criterionEvaluatorRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
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
  getErrorString: (criterion: EvaluatedDateCriterion, getters: Getters) => {
    const locale = getters.getLocale();
    const criterionValues = getDateCriterionLocalizedValues(criterion, locale);
    return _t("The value must be a date between %s and %s", criterionValues[0], criterionValues[1]);
  },
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: DVTerms.CriterionError.dateValue,
  numberOfValues: () => 2,
  name: _t("Date is between"),
  getPreview: (criterion: DateIsBetweenCriterion, getters: Getters) => {
    const values = getDateCriterionFormattedValues(criterion.values, getters.getLocale());
    return _t("Date is between %s and %s", values[0], values[1]);
  },
});

criterionEvaluatorRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  isValueValid: (value: CellValue, criterion: EvaluatedDateCriterion) => {
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
  getErrorString: (criterion: EvaluatedDateCriterion, getters: Getters) => {
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
    const values = getDateCriterionFormattedValues(criterion.values, getters.getLocale());
    return _t("Date is not between %s and %s", values[0], values[1]);
  },
});

criterionEvaluatorRegistry.add("dateIsValid", {
  type: "dateIsValid",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    return valueToDateNumber(value, DEFAULT_LOCALE) !== undefined;
  },
  getErrorString: () => _t("The value must be a valid date"),
  isCriterionValueValid: (value) => checkValueIsDate(value),
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Is valid date"),
  getPreview: () => _t("Date is valid"),
});

criterionEvaluatorRegistry.add("isEqual", {
  type: "isEqual",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    return value === criterion.values[0];
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isNotEqual", {
  type: "isNotEqual",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    return value !== criterion.values[0];
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isGreaterThan", {
  type: "isGreaterThan",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = criterion.values[0];

    if (typeof criterionValue !== "number") {
      return false;
    }
    return value > criterionValue;
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isGreaterOrEqualTo", {
  type: "isGreaterOrEqualTo",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = criterion.values[0];

    if (typeof criterionValue !== "number") {
      return false;
    }
    return value >= criterionValue;
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isLessThan", {
  type: "isLessThan",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = criterion.values[0];

    if (typeof criterionValue !== "number") {
      return false;
    }
    return value < criterionValue;
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isLessOrEqualTo", {
  type: "isLessOrEqualTo",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = criterion.values[0];

    if (typeof criterionValue !== "number") {
      return false;
    }
    return value <= criterionValue;
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }

    if (typeof criterion.values[0] !== "number" || typeof criterion.values[1] !== "number") {
      return false;
    }
    return isNumberBetween(value, criterion.values[0], criterion.values[1]);
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isNotBetween", {
  type: "isNotBetween",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (typeof value !== "number") {
      return false;
    }

    if (typeof criterion.values[0] !== "number" || typeof criterion.values[1] !== "number") {
      return false;
    }
    return !isNumberBetween(value, criterion.values[0], criterion.values[1]);
  },
  getErrorString: (criterion: EvaluatedCriterion, getters: Getters) => {
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

criterionEvaluatorRegistry.add("isBoolean", {
  type: "isBoolean",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) =>
    value === "" || typeof value === "boolean",
  getErrorString: () => _t("The value must be a boolean"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Checkbox"),
  getPreview: () => _t("Checkbox"),
});

criterionEvaluatorRegistry.add("isValueInList", {
  type: "isValueInList",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    if (value === null) {
      return false;
    }
    return criterion.values
      .map((str) => String(str).toLowerCase())
      .includes(value.toString().toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) =>
    _t("The value must be one of: %s", criterion.values.join(", ")),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => undefined,
  allowedValues: "onlyLiterals",
  name: _t("Value in list"),
  getPreview: (criterion) => _t("Value one of: %s", criterion.values.join(", ")),
});

criterionEvaluatorRegistry.add("isValueInRange", {
  type: "isValueInRange",
  preComputeCriterion: (criterion, criterionRanges: Range[], getters: Getters): Set<String> => {
    if (criterionRanges.length === 0) {
      return new Set();
    }
    const sheetId = criterionRanges[0].sheetId;
    const criterionValues = getters.getDataValidationRangeValues(sheetId, criterion);
    return new Set(criterionValues.map((value) => value.value.toString().toLowerCase()));
  },
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion, valuesSet: Set<String>) => {
    if (!value) {
      return false;
    }
    return valuesSet.has(value.toString().toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) =>
    _t("The value must be a value in the range %s", String(criterion.values[0])),
  isCriterionValueValid: (value) => rangeReference.test(value),
  criterionValueErrorString: DVTerms.CriterionError.validRange,
  numberOfValues: () => 1,
  allowedValues: "onlyLiterals",
  name: _t("Value in range"),
  getPreview: (criterion) => _t("Value in range %s", criterion.values[0]),
} satisfies CriterionEvaluator<Set<String>>);

criterionEvaluatorRegistry.add("customFormula", {
  type: "customFormula",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const parsedValue = criterion.values[0];
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

criterionEvaluatorRegistry.add("beginsWithText", {
  type: "beginsWithText",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase().startsWith(String(criterion.values[0]).toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) => {
    return _t('The value must be a text that begins with "%s"', String(criterion.values[0]));
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text begins with"),
  getPreview: (criterion) => _t('Text begins with "%s"', criterion.values[0]),
});

criterionEvaluatorRegistry.add("endsWithText", {
  type: "endsWithText",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) => {
    const strValue = String(value);
    return strValue.toLowerCase().endsWith(String(criterion.values[0]).toLowerCase());
  },
  getErrorString: (criterion: EvaluatedCriterion) => {
    return _t('The value must be a text that ends with "%s"', String(criterion.values[0]));
  },
  isCriterionValueValid: (value: string) => !!value,
  criterionValueErrorString: DVTerms.CriterionError.notEmptyValue,
  numberOfValues: () => 1,
  name: _t("Text ends with"),
  getPreview: (criterion) => _t('Text ends with "%s"', criterion.values[0]),
});

criterionEvaluatorRegistry.add("isEmpty", {
  type: "isEmpty",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) =>
    (value ?? "").toString().trim() === "",
  getErrorString: () => _t("The value must be empty"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Is empty"),
  getPreview: () => _t("Is empty"),
});

criterionEvaluatorRegistry.add("isNotEmpty", {
  type: "isNotEmpty",
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion) =>
    (value ?? "").toString().trim() !== "",
  getErrorString: () => _t("The value must not be empty"),
  isCriterionValueValid: () => true,
  criterionValueErrorString: "",
  numberOfValues: () => 0,
  name: _t("Is not empty"),
  getPreview: () => _t("Is not empty"),
});

criterionEvaluatorRegistry.add("top10", {
  type: "top10",
  preComputeCriterion: (
    criterion: Top10Criterion,
    criterionRanges: Range[],
    getters: Getters
  ): number | undefined => {
    let value = tryToNumber(criterion.values[0], DEFAULT_LOCALE);
    if (value === undefined || value <= 0) {
      return undefined;
    }

    const numberValues: number[] = [];
    for (const range of criterionRanges) {
      for (const value of getters.getRangeValues(range)) {
        if (typeof value === "number") {
          numberValues.push(value);
        }
      }
    }

    const sortedValues = numberValues.sort((a, b) => a - b);
    if (criterion.isPercent) {
      value = clip(value, 1, 100);
    }

    let index = 0;
    if (criterion.isBottom && !criterion.isPercent) {
      index = value - 1;
    } else if (criterion.isBottom && criterion.isPercent) {
      index = Math.floor((sortedValues.length * value) / 100) - 1;
    } else if (!criterion.isBottom && criterion.isPercent) {
      index = sortedValues.length - Math.floor((sortedValues.length * value) / 100);
    } else {
      index = sortedValues.length - value;
    }

    index = clip(index, 0, sortedValues.length - 1);
    return sortedValues[index];
  },
  isValueValid: (value: CellValue, criterion: EvaluatedCriterion<Top10Criterion>, threshold) => {
    if (typeof value !== "number" || threshold === undefined) {
      return false;
    }
    return criterion.isBottom ? value <= threshold : value >= threshold;
  },
  getErrorString: (criterion: EvaluatedCriterion<Top10Criterion>) => {
    const args = {
      value: String(criterion.values[0]),
      percentSymbol: criterion.isPercent ? "%" : "",
    };
    return criterion.isBottom
      ? _t("The value must be in bottom %(value)s%(percentSymbol)s", args)
      : _t("The value must be in top %(value)s%(percentSymbol)s", args);
  },
  isCriterionValueValid: (value) => checkValueIsPositiveNumber(value),
  criterionValueErrorString: DVTerms.CriterionError.positiveNumber,
  numberOfValues: () => 1,
  name: _t("Is in Top/Bottom ranking"),
  getPreview: (criterion: Top10Criterion) => {
    const args = { value: criterion.values[0], percentSymbol: criterion.isPercent ? "%" : "" };
    return criterion.isBottom
      ? _t("Value is in bottom %(value)s%(percentSymbol)s", args)
      : _t("Value is in top %(value)s%(percentSymbol)s", args);
  },
} satisfies CriterionEvaluator<number | undefined>);

function getNumberCriterionlocalizedValues(
  criterion: EvaluatedCriterion,
  locale: Locale
): string[] {
  return criterion.values.map((value) => {
    return value !== undefined
      ? localizeContent(String(value), locale)
      : CellErrorType.InvalidReference;
  });
}

function getDateCriterionLocalizedValues(
  criterion: EvaluatedDateCriterion,
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

function checkValueIsPositiveNumber(value: string): boolean {
  const valueAsNumber = tryToNumber(value, DEFAULT_LOCALE);
  return valueAsNumber !== undefined && valueAsNumber > 0;
}
