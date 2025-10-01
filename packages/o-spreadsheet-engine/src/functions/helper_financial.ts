import { _t } from "../../../../src/translation";
import { Locale } from "../../../../src/types";
import { toJsDate } from "./helpers";

export const expectCashFlowsAndDatesHaveSameDimension = _t(
  "The cashflow_amounts and cashflow_dates ranges must have the same dimensions."
);
export const expectCashFlowsHavePositiveAndNegativesValues = _t(
  "There must be both positive and negative values in cashflow_amounts."
);
export const expectCostPositiveOrZero = (cost: number) =>
  _t("The cost (%s) must be positive or null.", cost);

export const expectCostStrictlyPositive = (cost: number) =>
  _t("The cost (%s) must be strictly positive.", cost);

export const expectCouponFrequencyIsValid = (frequency: number) =>
  _t("The frequency (%s) must be one of %s", frequency, [1, 2, 4].toString());

export const expectDayCountConventionIsValid = (dayCountConvention: number) =>
  _t("The day_count_convention (%s) must be between 0 and 4 inclusive.", dayCountConvention);

export const expectDeprecationFactorStrictlyPositive = (factor: number) =>
  _t("The depreciation factor (%s) must be strictly positive.", factor);

export const expectDiscountDifferentFromMinusOne = (discount: number) =>
  _t("The discount (%s) must be different from -1.", discount);

export const expectDiscountStrictlyPositive = (discount: number) =>
  _t("The discount (%s) must be strictly positive.", discount);

export const expectDiscountStrictlySmallerThanOne = (discount: number) =>
  _t("The discount (%s) must be smaller than 1.", discount);

export const expectEffectiveRateStrictlyPositive = (effectiveRate: number) =>
  _t("The effective_rate (%s) must be strictly positive.", effectiveRate);

export const expectEndPeriodPositiveOrZero = (endPeriod: number) =>
  _t("The end_period (%s) must be positive or null.", endPeriod);

export const expectEndPeriodSmallerOrEqualToLife = (end: number, life: number) =>
  _t("The end_period (%(end)s) must be smaller or equal to the life (%(life)s).", { end, life });

export const expectEveryDateGreaterThanFirstDateOfCashFlowDates = (firstDate: number) =>
  _t(
    "All the dates should be greater or equal to the first date in cashflow_dates (%s).",
    firstDate
  );

export const expectFirstPeriodSmallerOrEqualLastPeriod = (first: number, last: number) =>
  _t("The first_period (%(first)s) must be smaller or equal to the last_period (%(last)s).", {
    first,
    last,
  });

export const expectFirstPeriodStrictlyPositive = (period: number) =>
  _t("The first_period (%s) must be strictly positive.", period);

export const expectFutureValueStrictlyPositive = (pv: number) =>
  _t("The future_value (%s) must be strictly positive.", pv);

export const expectInvestmentStrictlyPositive = (investment: number) =>
  _t("The investment (%s) must be strictly positive.", investment);

export const expectIssuePositiveOrZero = (issue: number) =>
  _t("The issue (%s) must be positive or null.", issue);

export const expectLastPeriodSmallerOrEqualNumberOfPeriods = (last: number, nPeriods: number) =>
  _t(
    "The last_period (%(last)s) must be smaller or equal to the number_of_periods (%(nPeriods)s).",
    { last, nPeriods }
  );

export const expectLastPeriodStrictlyPositive = (period: number) =>
  _t("The last_period (%s) must be strictly positive.", period);

export const expectLifeStrictlyPositive = (life: number) =>
  _t("The life (%s) must be strictly positive.", life);

export const expectMaturityStrictlyGreaterThanSettlement = (settlement: number, maturity: number) =>
  _t("The maturity (%(maturity)s) must be strictly greater than the settlement (%(settlement)s).", {
    maturity,
    settlement,
  });

export const expectMonthBetweenOneAndTwelve = (month: number) =>
  _t("The month (%s) must be between 1 and 12 inclusive.", month);

export const expectNominalRateStrictlyPositive = (nominalRate: number) =>
  _t("The nominal_rate (%s) must be strictly positive.", nominalRate);

export const expectNumberOfPeriodDifferentFromZero = (nPeriods: number) =>
  _t("The number_of_periods (%s) must be different from zero.", nPeriods);

export const expectNumberOfPeriodsStrictlyPositive = (nPeriods: number) =>
  _t("The number_of_periods (%s) must be strictly positive.", nPeriods);

export const expectPeriodBetweenOneAndNumberOfPeriods = (nPeriods: number) =>
  _t("The period must be between 1 and number_of_periods (%s)", nPeriods);

export const expectPeriodLessOrEqualToLifeLimit = (period: number, lifeLimit: number) =>
  _t("The period (%(period)s) must be less than or equal to %(lifeLimit)s.", { period, lifeLimit });

export const expectPeriodPositiveOrZero = (period: number) =>
  _t("The period (%s) must be positive or null.", period);

export const expectPeriodsByYearStrictlyPositive = (periodsByYear: number) =>
  _t("The periods_by_year (%s) must be strictly positive.", periodsByYear);

export const expectPeriodSmallerOrEqualToLife = (period: number, life: number) =>
  _t("The period (%(period)s) must be less than or equal life (%(life)s).", { period, life });

export const expectPeriodStrictlyPositive = (period: number) =>
  _t("The period (%s) must be strictly positive.", period);

export const expectPresentValueStrictlyPositive = (pv: number) =>
  _t("The present_value (%s) must be strictly positive.", pv);

export const expectPriceStrictlyPositive = (price: number) =>
  _t("The price (%s) must be strictly positive.", price);

export const expectPurchaseDateBeforeFirstPeriodEnd = (
  purchaseDate: number,
  firstPeriodEnd: number
) =>
  _t(
    "The purchase_date (%(purchaseDate)s) must be before the first_period_end (%(firstPeriodEnd)s).",
    { purchaseDate, firstPeriodEnd }
  );

export const expectPurchaseDatePositiveOrZero = (purchaseDate: number) =>
  _t("The purchase_date (%s) must be positive or null.", purchaseDate);

export const expectRateGuessStrictlyGreaterThanMinusOne = (guess: number) =>
  _t("The rate_guess (%s) must be strictly greater than -1.", guess);

export const expectRatePositiveOrZero = (rate: number) =>
  _t("The rate (%s) must be positive or null.", rate);

export const expectRateStrictlyPositive = (rate: number) =>
  _t("The rate (%s) must be strictly positive.", rate);

export const expectRedemptionStrictlyPositive = (redemption: number) =>
  _t("The redemption (%s) must be strictly positive.", redemption);

export const expectSalvagePositiveOrZero = (salvage: number) =>
  _t("The salvage (%s) must be positive or null.", salvage);

export const expectSalvageSmallerOrEqualThanCost = (salvage: number, cost: number) =>
  _t("The salvage (%(salvage)s) must be smaller or equal than the cost (%(cost)s).", {
    salvage,
    cost,
  });

export const expectSettlementGreaterOrEqualToIssue = (settlement: number, issue: number) =>
  _t(
    "The settlement date (%(settlement)s) must be greater or equal to the issue date (%(issue)s).",
    { settlement, issue }
  );

export const expectSettlementLessThanOneYearBeforeMaturity = (
  settlement: number,
  maturity: number
) =>
  _t(
    "The settlement date (%(settlement)s) must at most one year after the maturity date (%(maturity)s).",
    { settlement, maturity }
  );

export const expectSettlementStrictlyGreaterThanIssue = (settlement: number, issue: number) =>
  _t(
    "The settlement date (%(settlement)s) must be strictly greater than the issue date (%(issue)s).",
    { settlement, issue }
  );

export const expectStartPeriodPositiveOrZero = (startPeriod: number) =>
  _t("The start_period (%s) must be positive or null.", startPeriod);

export const expectStartPeriodSmallerOrEqualEndPeriod = (start: number, end: number) =>
  _t("The start_period (%(start)s) must be smaller or equal to the end_period (%(end)s).", {
    start,
    end,
  });

export const expectUnitStrictlyPositive = (unit: number) =>
  _t("The unit (%s) must be strictly positive.", unit);

export const expectYieldPositiveOrZero = (yeld: number) =>
  _t("The yield (%s) must be positive or null.", yeld);

export function havePositiveAndNegativeValues(arrayNumbers: number[]) {
  return arrayNumbers.some((val) => val > 0) && arrayNumbers.some((val) => val < 0);
}

export function isInvalidDayCountConvention(dayCountConvention: number) {
  return ![0, 1, 2, 3, 4].includes(dayCountConvention);
}

export function isInvalidFrequency(frequency: number) {
  return ![1, 2, 4].includes(frequency);
}

export function isSettlementLessThanOneYearBeforeMaturity(
  settlement: number,
  maturity: number,
  locale: Locale
) {
  const startDate = toJsDate(settlement, locale);
  const endDate = toJsDate(maturity, locale);
  const startDatePlusOneYear = toJsDate(settlement, locale);
  startDatePlusOneYear.setFullYear(startDate.getFullYear() + 1);
  return endDate.getTime() <= startDatePlusOneYear.getTime();
}

export const DAY_COUNT_CONVENTION_OPTIONS = [
  { value: 0, label: _t("US (NASD) 30/360") },
  { value: 1, label: _t("Actual/Actual") },
  { value: 2, label: _t("Actual/360") },
  { value: 3, label: _t("Actual/365") },
  { value: 4, label: _t("European 30/360") },
];
