import {
  addMonthsToDate,
  getYearFrac,
  isLastDayOfMonth,
  jsDateToRoundNumber,
  range,
} from "../helpers";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  FunctionResultNumber,
  FunctionResultObject,
  Locale,
  Matrix,
  Maybe,
  isMatrix,
} from "../types";
import { arg } from "./arguments";
import {
  assertCashFlowsAndDatesHaveSameDimension,
  assertCashFlowsHavePositiveAndNegativesValues,
  assertCostPositiveOrZero,
  assertCostStrictlyPositive,
  assertCouponFrequencyIsValid,
  assertDayCountConventionIsValid,
  assertDeprecationFactorStrictlyPositive,
  assertDiscountStrictlyPositive,
  assertDiscountStrictlySmallerThanOne,
  assertEveryDateGreaterThanFirstDateOfCashFlowDates,
  assertFirstAndLastPeriodsAreValid,
  assertInvestmentStrictlyPositive,
  assertIssuePositiveOrZero,
  assertLifeStrictlyPositive,
  assertMaturityAndSettlementDatesAreValid,
  assertNumberOfPeriodsStrictlyPositive,
  assertPeriodPositiveOrZero,
  assertPeriodSmallerOrEqualToLife,
  assertPeriodStrictlyPositive,
  assertPresentValueStrictlyPositive,
  assertPriceStrictlyPositive,
  assertPurchaseDatePositiveOrZero,
  assertRateGuessStrictlyGreaterThanMinusOne,
  assertRateStrictlyPositive,
  assertRedemptionStrictlyPositive,
  assertSalvagePositiveOrZero,
  assertSalvageSmallerOrEqualThanCost,
  assertSettlementAndIssueDatesAreValid,
  assertSettlementLessThanOneYearBeforeMaturity,
  assertStartAndEndPeriodAreValid,
} from "./helper_financial";
import {
  assert,
  reduceAny,
  reduceNumbers,
  strictToNumber,
  toBoolean,
  toJsDate,
  toNumber,
  transposeMatrix,
  visitNumbers,
} from "./helpers";
import { DAYS } from "./module_date";

const DEFAULT_DAY_COUNT_CONVENTION = 0;
const DEFAULT_END_OR_BEGINNING = 0;
const DEFAULT_FUTURE_VALUE = 0;

const COUPON_FUNCTION_ARGS = [
  arg(
    "settlement (date)",
    _t(
      "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
    )
  ),
  arg(
    "maturity (date)",
    _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
  ),
  arg("frequency (number)", _t("The number of interest or coupon payments per year (1, 2, or 4).")),
  arg(
    `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
    _t("An indicator of what day count method to use.")
  ),
];

/**
 * Use the Newton–Raphson method to find a root of the given function in an iterative manner.
 *
 * @param func the function to find a root of
 * @param derivFunc the derivative of the function
 * @param startValue the initial value for the first iteration of the algorithm
 * @param maxIterations the maximum number of iterations
 * @param epsMax the epsilon for the root
 * @param nanFallback a function giving a fallback value to use if func(x) returns NaN. Useful if the
 *                       function is not defined for some range, but we know approximately where the root is when the Newton
 *                       algorithm ends up in this range.
 */
function newtonMethod(
  func: (x: number) => number,
  derivFunc: (x: number) => number,
  startValue: number,
  maxIterations: number,
  epsMax: number = 1e-10,
  nanFallback?: (previousFallback: number | undefined) => number
) {
  let x = startValue;
  let newX: number;
  let xDelta: number;
  let y: number;
  let yEqual0 = false;
  let count = 0;
  let previousFallback: number | undefined = undefined;
  do {
    y = func(x);
    if (isNaN(y)) {
      assert(
        () => count < maxIterations && nanFallback !== undefined,
        _t("Function [[FUNCTION_NAME]] didn't find any result.")
      );
      count++;
      x = nanFallback!(previousFallback);
      previousFallback = x;
      continue;
    }
    newX = x - y / derivFunc(x);
    xDelta = Math.abs(newX - x);
    x = newX;
    yEqual0 = xDelta < epsMax || Math.abs(y) < epsMax;
    assert(() => count < maxIterations, _t("Function [[FUNCTION_NAME]] didn't find any result."));
    count++;
  } while (!yEqual0);
  return x;
}

// -----------------------------------------------------------------------------
// ACCRINTM
// -----------------------------------------------------------------------------
export const ACCRINTM = {
  description: _t("Accrued interest of security paying at maturity."),
  args: [
    arg("issue (date)", _t("The date the security was initially issued.")),
    arg("maturity (date)", _t("The maturity date of the security.")),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    issue: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    const start = Math.trunc(toNumber(issue, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _redemption = toNumber(redemption, this.locale);
    const _rate = toNumber(rate, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertIssuePositiveOrZero(start);
    assertSettlementAndIssueDatesAreValid(end, start);
    assertDayCountConventionIsValid(_dayCountConvention);
    assertRedemptionStrictlyPositive(_redemption);
    assertRateStrictlyPositive(_rate);

    const yearFrac = getYearFrac(start, end, _dayCountConvention);
    return _redemption * _rate * yearFrac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AMORLINC
// -----------------------------------------------------------------------------
export const AMORLINC = {
  description: _t("Depreciation for an accounting period."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("purchase_date (date)", _t("The date the asset was purchased.")),
    arg("first_period_end (date)", _t("The date the first period ended.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg(
      "period (number)",
      _t("The single period within life for which to calculate depreciation.")
    ),
    arg("rate (number)", _t("The deprecation rate.")),
    arg(
      "day_count_convention (number, optional)",
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    cost: Maybe<FunctionResultObject>,
    purchaseDate: Maybe<FunctionResultObject>,
    firstPeriodEnd: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    period: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _cost = toNumber(cost, this.locale);
    const _purchaseDate = Math.trunc(toNumber(purchaseDate, this.locale));
    const _firstPeriodEnd = Math.trunc(toNumber(firstPeriodEnd, this.locale));
    const _salvage = toNumber(salvage, this.locale);
    const _period = toNumber(period, this.locale);
    const _rate = toNumber(rate, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertCostStrictlyPositive(_cost);
    assertPurchaseDatePositiveOrZero(_purchaseDate);
    assertSalvagePositiveOrZero(_salvage);
    assertSalvageSmallerOrEqualThanCost(_salvage, _cost);
    assertPeriodPositiveOrZero(_period);
    assertRateStrictlyPositive(_rate);
    assertDayCountConventionIsValid(_dayCountConvention);
    assert(
      () => _purchaseDate <= _firstPeriodEnd,
      _t(
        "The purchase_date (%s) must be before the first_period_end (%s).",
        _purchaseDate.toString(),
        _firstPeriodEnd.toString()
      )
    );

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/AMORLINC
     *
     * AMORLINC period 0 = cost * rate * YEARFRAC(purchase date, first period end)
     * AMORLINC period n = cost * rate
     * AMORLINC at the last period is such that the remaining deprecated cost is equal to the salvage value.
     *
     * The period is and rounded to 1 if < 1 truncated if > 1,
     *
     * Compatibility note :
     * If (purchase date) === (first period end), on GSheet the deprecation at the first period is 0, and on Excel
     * it is a full period deprecation. We choose to use the Excel behaviour.
     */

    const roundedPeriod = _period < 1 && _period > 0 ? 1 : Math.trunc(_period);

    const deprec = _cost * _rate;
    const yearFrac = getYearFrac(_purchaseDate, _firstPeriodEnd, _dayCountConvention);
    const firstDeprec = _purchaseDate === _firstPeriodEnd ? deprec : deprec * yearFrac;

    const valueAtPeriod = _cost - firstDeprec - deprec * roundedPeriod;

    if (valueAtPeriod >= _salvage) {
      return roundedPeriod === 0 ? firstDeprec : deprec;
    }
    return _salvage - valueAtPeriod < deprec ? deprec - (_salvage - valueAtPeriod) : 0;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPDAYS
// -----------------------------------------------------------------------------
export const COUPDAYS = {
  description: _t("Days in coupon period containing settlement date."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/COUPDAYS
    if (_dayCountConvention === 1) {
      const before = COUPPCD.compute.bind(this)(
        settlement,
        maturity,
        frequency,
        dayCountConvention
      ).value;
      const after = COUPNCD.compute.bind(this)(
        settlement,
        maturity,
        frequency,
        dayCountConvention
      ).value;
      return after - before;
    }

    const daysInYear = _dayCountConvention === 3 ? 365 : 360;
    return daysInYear / _frequency;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPDAYBS
// -----------------------------------------------------------------------------
export const COUPDAYBS = {
  description: _t("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const couponBeforeStart = COUPPCD.compute.bind(this)(
      settlement,
      maturity,
      frequency,
      dayCountConvention
    ).value;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return start - couponBeforeStart;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(couponBeforeStart, start, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const startDate = toJsDate(start, this.locale);
    const dateCouponBeforeStart = toJsDate(couponBeforeStart, this.locale);

    const y1 = dateCouponBeforeStart.getFullYear();
    const y2 = startDate.getFullYear();
    const m1 = dateCouponBeforeStart.getMonth() + 1; // +1 because months in js start at 0 and it's confusing
    const m2 = startDate.getMonth() + 1;
    let d1 = dateCouponBeforeStart.getDate();
    let d2 = startDate.getDate();

    /**
     * Rules based on https://en.wikipedia.org/wiki/Day_count_convention#30/360_US
     *
     * These are slightly modified (no mention of if investment is EOM and rules order is modified),
     * but from my testing this seems the rules used by Excel/GSheet.
     */
    if (
      m1 === 2 &&
      m2 === 2 &&
      isLastDayOfMonth(dateCouponBeforeStart) &&
      isLastDayOfMonth(startDate)
    ) {
      d2 = 30;
    }
    if (d2 === 31 && (d1 === 30 || d1 === 31)) {
      d2 = 30;
    }
    if (m1 === 2 && isLastDayOfMonth(dateCouponBeforeStart)) {
      d1 = 30;
    }
    if (d1 === 31) {
      d1 = 30;
    }

    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPDAYSNC
// -----------------------------------------------------------------------------
export const COUPDAYSNC = {
  description: _t("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const couponAfterStart = COUPNCD.compute.bind(this)(
      settlement,
      maturity,
      frequency,
      dayCountConvention
    ).value;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return couponAfterStart - start;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(start, couponAfterStart, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const coupDayBs = COUPDAYBS.compute.bind(this)(
      settlement,
      maturity,
      frequency,
      dayCountConvention
    );
    const coupDays = COUPDAYS.compute.bind(this)(
      settlement,
      maturity,
      frequency,
      dayCountConvention
    );
    return coupDays - coupDayBs;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPNCD
// -----------------------------------------------------------------------------
export const COUPNCD = {
  description: _t("Next coupon date after the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): FunctionResultNumber {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute.bind(this)(settlement, maturity, frequency, dayCountConvention);
    const date = addMonthsToDate(
      toJsDate(end, this.locale),
      -(coupNum - 1) * monthsPerPeriod,
      true
    );
    return {
      value: jsDateToRoundNumber(date),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPNUM
// -----------------------------------------------------------------------------
export const COUPNUM = {
  description: _t("Number of coupons between settlement and maturity."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    let num = 1;
    let currentDate = end;
    const monthsPerPeriod = 12 / _frequency;

    while (currentDate > start) {
      currentDate = jsDateToRoundNumber(
        addMonthsToDate(toJsDate(currentDate, this.locale), -monthsPerPeriod, false)
      );
      num++;
    }
    return num - 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUPPCD
// -----------------------------------------------------------------------------
export const COUPPCD = {
  description: _t("Last coupon date prior to or on the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): FunctionResultNumber {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute.bind(this)(settlement, maturity, frequency, dayCountConvention);
    const date = addMonthsToDate(toJsDate(end, this.locale), -coupNum * monthsPerPeriod, true);
    return {
      value: jsDateToRoundNumber(date),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CUMIPMT
// -----------------------------------------------------------------------------
export const CUMIPMT = {
  description: _t("Cumulative interest paid over a set of periods."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      "first_period (number)",
      _t("The number of the payment period to begin the cumulative calculation.")
    ),
    arg(
      "last_period (number)",
      _t("The number of the payment period to end the cumulative calculation.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    firstPeriod: Maybe<FunctionResultObject>,
    lastPeriod: Maybe<FunctionResultObject>,
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): number {
    const first = toNumber(firstPeriod, this.locale);
    const last = toNumber(lastPeriod, this.locale);
    const r = toNumber(rate, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const n = toNumber(numberOfPeriods, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;

    assertFirstAndLastPeriodsAreValid(first, last, n);
    assertRateStrictlyPositive(r);
    assertPresentValueStrictlyPositive(pv);

    let cumSum = 0;
    for (let i = first; i <= last; i++) {
      cumSum += impt(r, i, n, pv, 0, type);
    }

    return cumSum;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CUMPRINC
// -----------------------------------------------------------------------------
export const CUMPRINC = {
  description: _t("Cumulative principal paid over a set of periods."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      "first_period (number)",
      _t("The number of the payment period to begin the cumulative calculation.")
    ),
    arg(
      "last_period (number)",
      _t("The number of the payment period to end the cumulative calculation.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    firstPeriod: Maybe<FunctionResultObject>,
    lastPeriod: Maybe<FunctionResultObject>,
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): number {
    const first = toNumber(firstPeriod, this.locale);
    const last = toNumber(lastPeriod, this.locale);
    const r = toNumber(rate, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const n = toNumber(numberOfPeriods, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;

    assertFirstAndLastPeriodsAreValid(first, last, n);
    assertRateStrictlyPositive(r);
    assertPresentValueStrictlyPositive(pv);

    let cumSum = 0;
    for (let i = first; i <= last; i++) {
      cumSum += ppmt(r, i, n, pv, 0, type);
    }

    return cumSum;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DB
// -----------------------------------------------------------------------------
export const DB = {
  description: _t("Depreciation via declining balance method."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg("life (number)", _t("The number of periods over which the asset is depreciated.")),
    arg(
      "period (number)",
      _t("The single period within life for which to calculate depreciation.")
    ),
    arg("month (number, optional)", _t("The number of months in the first year of depreciation.")),
  ],
  // to do: replace by dollar format
  compute: function (
    cost: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    life: Maybe<FunctionResultObject>,
    period: Maybe<FunctionResultObject>,
    ...args: Maybe<FunctionResultObject>[]
  ): FunctionResultNumber {
    const _cost = toNumber(cost, this.locale);
    const _salvage = toNumber(salvage, this.locale);
    const _life = toNumber(life, this.locale);
    const _period = Math.trunc(toNumber(period, this.locale));
    const _month = args.length ? Math.trunc(toNumber(args[0], this.locale)) : 12;
    const lifeLimit = _life + (_month === 12 ? 0 : 1);

    assertCostPositiveOrZero(_cost);
    assertSalvagePositiveOrZero(_salvage);
    assertPeriodStrictlyPositive(_period);
    assertLifeStrictlyPositive(_life);
    assert(
      () => 1 <= _month && _month <= 12,
      _t("The month (%s) must be between 1 and 12 inclusive.", _month.toString())
    );
    assert(
      () => _period <= lifeLimit,
      _t(
        "The period (%s) must be less than or equal to %s.",
        _period.toString(),
        lifeLimit.toString()
      )
    );

    const monthPart = _month / 12;

    let rate = 1 - Math.pow(_salvage / _cost, 1 / _life);
    // round to 3 decimal places
    rate = Math.round(rate * 1000) / 1000;

    let before = _cost;
    let after = _cost * (1 - rate * monthPart);

    for (let i = 1; i < _period; i++) {
      before = after;
      after = before * (1 - rate);
      if (i === _life) {
        after = before * (1 - rate * (1 - monthPart));
      }
    }

    return {
      value: before - after,
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DDB
// -----------------------------------------------------------------------------
const DEFAULT_DDB_DEPRECIATION_FACTOR = 2;
function ddb(cost: number, salvage: number, life: number, period: number, factor: number): number {
  assertCostPositiveOrZero(cost);
  assertSalvagePositiveOrZero(salvage);
  assertPeriodStrictlyPositive(period);
  assertLifeStrictlyPositive(life);
  assertPeriodSmallerOrEqualToLife(period, life);
  assertDeprecationFactorStrictlyPositive(factor);

  if (cost === 0 || salvage >= cost) return 0;

  const deprecFactor = factor / life;
  if (deprecFactor > 1) {
    return period === 1 ? cost - salvage : 0;
  }

  if (period <= 1) {
    return cost * deprecFactor;
  }

  const previousCost = cost * Math.pow(1 - deprecFactor, period - 1);
  const nextCost = cost * Math.pow(1 - deprecFactor, period);

  const deprec = nextCost < salvage ? previousCost - salvage : previousCost - nextCost;
  return Math.max(deprec, 0);
}
export const DDB = {
  description: _t("Depreciation via double-declining balance method."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg("life (number)", _t("The number of periods over which the asset is depreciated.")),
    arg(
      "period (number)",
      _t("The single period within life for which to calculate depreciation.")
    ),
    arg(
      `factor (number, default=${DEFAULT_DDB_DEPRECIATION_FACTOR})`,
      _t("The factor by which depreciation decreases.")
    ),
  ],
  compute: function (
    cost: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    life: Maybe<FunctionResultObject>,
    period: Maybe<FunctionResultObject>,
    factor: Maybe<FunctionResultObject> = { value: DEFAULT_DDB_DEPRECIATION_FACTOR }
  ): FunctionResultNumber {
    const _cost = toNumber(cost, this.locale);
    const _salvage = toNumber(salvage, this.locale);
    const _life = toNumber(life, this.locale);
    const _period = toNumber(period, this.locale);
    const _factor = toNumber(factor, this.locale);
    return {
      value: ddb(_cost, _salvage, _life, _period, _factor),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DISC
// -----------------------------------------------------------------------------
export const DISC = {
  description: _t("Discount rate of a security based on price."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("price (number)", _t("The price at which the security is bought per 100 face value.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    price: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _price = toNumber(price, this.locale);
    const _redemption = toNumber(redemption, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);
    assertPriceStrictlyPositive(_price);
    assertRedemptionStrictlyPositive(_redemption);

    /**
     * https://support.microsoft.com/en-us/office/disc-function-71fce9f3-3f05-4acf-a5a3-eac6ef4daa53
     *
     * B = number of days in year, depending on year basis
     * DSM = number of days from settlement to maturity
     *
     *        redemption - price          B
     * DISC = ____________________  *    ____
     *            redemption             DSM
     */
    const yearsFrac = getYearFrac(_settlement, _maturity, _dayCountConvention);
    return (_redemption - _price) / _redemption / yearsFrac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DOLLARDE
// -----------------------------------------------------------------------------
export const DOLLARDE = {
  description: _t("Convert a decimal fraction to decimal value."),
  args: [
    arg(
      "fractional_price (number)",
      _t("The price quotation given using fractional decimal conventions.")
    ),
    arg("unit (number)", _t("The units of the fraction, e.g. 8 for 1/8ths or 32 for 1/32nds.")),
  ],
  compute: function (
    fractionalPrice: Maybe<FunctionResultObject>,
    unit: Maybe<FunctionResultObject>
  ): number {
    const price = toNumber(fractionalPrice, this.locale);
    const _unit = Math.trunc(toNumber(unit, this.locale));

    assert(() => _unit > 0, _t("The unit (%s) must be strictly positive.", _unit.toString()));

    const truncatedPrice = Math.trunc(price);
    const priceFractionalPart = price - truncatedPrice;

    const frac = 10 ** Math.ceil(Math.log10(_unit)) / _unit;

    return truncatedPrice + priceFractionalPart * frac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DOLLARFR
// -----------------------------------------------------------------------------
export const DOLLARFR = {
  description: _t("Convert a decimal value to decimal fraction."),
  args: [
    arg("decimal_price (number)", _t("The price quotation given as a decimal value.")),
    arg(
      "unit (number)",
      _t("The units of the desired fraction, e.g. 8 for 1/8ths or 32 for 1/32nds.")
    ),
  ],
  compute: function (
    decimalPrice: Maybe<FunctionResultObject>,
    unit: Maybe<FunctionResultObject>
  ): number {
    const price = toNumber(decimalPrice, this.locale);
    const _unit = Math.trunc(toNumber(unit, this.locale));

    assert(() => _unit > 0, _t("The unit (%s) must be strictly positive.", _unit.toString()));

    const truncatedPrice = Math.trunc(price);
    const priceFractionalPart = price - truncatedPrice;

    const frac = _unit / 10 ** Math.ceil(Math.log10(_unit));

    return truncatedPrice + priceFractionalPart * frac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DURATION
// -----------------------------------------------------------------------------
export const DURATION = {
  description: _t("Number of periods for an investment to reach a value."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("yield (number)", _t("The expected annual yield of the security.")),
    arg(
      "frequency (number)",
      _t("The number of interest or coupon payments per year (1, 2, or 4).")
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    securityYield: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const _rate = toNumber(rate, this.locale);
    const _yield = toNumber(securityYield, this.locale);
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _t("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _t("The yield (%s) must be positive or null.", _yield.toString()));

    const years = getYearFrac(start, end, _dayCountConvention);
    const timeFirstYear = years - Math.trunc(years) || 1 / _frequency;
    const nbrCoupons = Math.ceil(years * _frequency);

    // The DURATION function return the Macaulay duration
    // See example: https://en.wikipedia.org/wiki/Bond_duration#Formulas

    const cashFlowFromCoupon = _rate / _frequency;
    const yieldPerPeriod = _yield / _frequency;

    let count = 0;
    let sum = 0;

    for (let i = 1; i <= nbrCoupons; i++) {
      const cashFlowPerPeriod = cashFlowFromCoupon + (i === nbrCoupons ? 1 : 0);
      const presentValuePerPeriod = cashFlowPerPeriod / (1 + yieldPerPeriod) ** i;
      sum += (timeFirstYear + (i - 1) / _frequency) * presentValuePerPeriod;
      count += presentValuePerPeriod;
    }

    return count === 0 ? 0 : sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EFFECT
// -----------------------------------------------------------------------------
export const EFFECT = {
  description: _t("Annual effective interest rate."),
  args: [
    arg("nominal_rate (number)", _t("The nominal interest rate per year.")),
    arg("periods_per_year (number)", _t("The number of compounding periods per year.")),
  ],
  compute: function (
    nominal_rate: Maybe<FunctionResultObject>,
    periods_per_year: Maybe<FunctionResultObject>
  ): number {
    const nominal = toNumber(nominal_rate, this.locale);
    const periods = Math.trunc(toNumber(periods_per_year, this.locale));

    assert(
      () => nominal > 0,
      _t("The nominal rate (%s) must be strictly greater than 0.", nominal.toString())
    );
    assert(
      () => periods > 0,
      _t("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return Math.pow(1 + nominal / periods, periods) - 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FV
// -----------------------------------------------------------------------------
const DEFAULT_PRESENT_VALUE = 0;

function fv(r: number, n: number, p: number, pv: number, t: number): number {
  if (r === 0) {
    return -(pv + p * n);
  }
  return -pv * (1 + r) ** n - (p * (1 + r * t) * ((1 + r) ** n - 1)) / r;
}

export const FV = {
  description: _t("Future value of an annuity investment."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("payment_amount (number)", _t("The amount per period to be paid.")),
    arg(
      `present_value (number, default=${DEFAULT_PRESENT_VALUE})`,
      _t("The current value of the annuity.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  // to do: replace by dollar format
  compute: function (
    rate: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    paymentAmount: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject> = { value: DEFAULT_PRESENT_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): FunctionResultNumber {
    presentValue = presentValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate, this.locale);
    const n = toNumber(numberOfPeriods, this.locale);
    const p = toNumber(paymentAmount, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    return {
      value: fv(r, n, p, pv, type),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FVSCHEDULE
// -----------------------------------------------------------------------------
export const FVSCHEDULE = {
  description: _t("Future value of principal from series of rates."),
  args: [
    arg("principal (number)", _t("The amount of initial capital or value to compound against.")),
    arg(
      "rate_schedule (number, range<number>)",
      _t("A series of interest rates to compound against the principal.")
    ),
  ],
  compute: function (principalAmount: Maybe<FunctionResultObject>, rateSchedule: Arg): number {
    const principal = toNumber(principalAmount, this.locale);
    return reduceAny(
      [rateSchedule],
      (acc, rate) => acc * (1 + toNumber(rate, this.locale)),
      principal
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// INTRATE
// -----------------------------------------------------------------------------
export const INTRATE = {
  description: _t("Calculates effective interest rate."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("investment (number)", _t("The amount invested in the security.")),
    arg("redemption (number)", _t("The amount to be received at maturity.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    investment: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _redemption = toNumber(redemption, this.locale);
    const _investment = toNumber(investment, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertInvestmentStrictlyPositive(_investment);
    assertRedemptionStrictlyPositive(_redemption);
    assertDayCountConventionIsValid(_dayCountConvention);

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/INTRATE
     *
     *             (Redemption  - Investment) / Investment
     * INTRATE =  _________________________________________
     *              YEARFRAC(settlement, maturity, basis)
     */
    const yearFrac = getYearFrac(_settlement, _maturity, _dayCountConvention);
    return (_redemption - _investment) / _investment / yearFrac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// IPMT
// -----------------------------------------------------------------------------
function impt(r: number, per: number, n: number, pv: number, fv: number, type: number): number {
  return pmt(r, n, pv, fv, type) - ppmt(r, per, n, pv, fv, type);
}

export const IPMT = {
  description: _t("Payment on the principal of an investment."),
  args: [
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("period (number)", _t("The amortization period, in terms of number of periods.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    currentPeriod: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): FunctionResultNumber {
    const r = toNumber(rate, this.locale);
    const period = toNumber(currentPeriod, this.locale);
    const n = toNumber(numberOfPeriods, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const fv = toNumber(futureValue, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    return {
      value: impt(r, period, n, pv, fv, type),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// IRR
// -----------------------------------------------------------------------------
const DEFAULT_RATE_GUESS = 0.1;
export const IRR = {
  description: _t("Internal rate of return given periodic cashflows."),
  args: [
    arg(
      "cashflow_amounts (number, range<number>)",
      _t("An array or range containing the income or payments associated with the investment.")
    ),
    arg(
      `rate_guess (number, default=${DEFAULT_RATE_GUESS})`,
      _t("An estimate for what the internal rate of return will be.")
    ),
  ],
  compute: function (
    cashFlowAmounts: Matrix<FunctionResultObject>,
    rateGuess: Maybe<FunctionResultObject> = { value: DEFAULT_RATE_GUESS }
  ): FunctionResultNumber {
    const _rateGuess = toNumber(rateGuess, this.locale);

    assertRateGuessStrictlyGreaterThanMinusOne(_rateGuess);

    // check that values contains at least one positive value and one negative value
    // and extract number present in the cashFlowAmount argument

    let positive = false;
    let negative = false;
    let amounts: number[] = [];

    visitNumbers(
      [cashFlowAmounts],
      (amount) => {
        if (amount > 0) positive = true;
        if (amount < 0) negative = true;
        amounts.push(amount);
      },
      this.locale
    );

    assert(
      () => positive && negative,
      _t("The cashflow_amounts must include negative and positive values.")
    );

    const firstAmount = amounts.shift();

    // The result of IRR is the rate at which the NPV() function will return zero with the given values.
    // This algorithm uses the Newton's method on the NPV function to determine the result
    // Newton's method: https://en.wikipedia.org/wiki/Newton%27s_method

    // As the NPV function isn't continuous, we apply the Newton's method on the numerator of the NPV formula.

    function npvNumerator(rate: number, startValue: number, values: number[]): number {
      const nbrValue = values.length;
      let i = 0;
      return values.reduce((acc, v) => {
        i++;
        return acc + v * rate ** (nbrValue - i);
      }, startValue * rate ** nbrValue);
    }

    function npvNumeratorDeriv(rate: number, startValue: number, values: number[]): number {
      const nbrValue = values.length;
      let i = 0;
      return values.reduce((acc, v) => {
        i++;
        return acc + v * (nbrValue - i) * rate ** (nbrValue - i - 1);
      }, startValue * nbrValue * rate ** (nbrValue - 1));
    }

    function func(x: number) {
      return npvNumerator(x, firstAmount!, amounts);
    }
    function derivFunc(x: number) {
      return npvNumeratorDeriv(x, firstAmount!, amounts);
    }

    return {
      value: newtonMethod(func, derivFunc, _rateGuess + 1, 20, 1e-5) - 1,
      format: "0%",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISPMT
// -----------------------------------------------------------------------------
export const ISPMT = {
  description: _t("Returns the interest paid at a particular period of an investment."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("period (number)", _t("The period for which you want to view the interest payment.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    currentPeriod: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>
  ): number {
    const interestRate = toNumber(rate, this.locale);
    const period = toNumber(currentPeriod, this.locale);
    const nOfPeriods = toNumber(numberOfPeriods, this.locale);
    const investment = toNumber(presentValue, this.locale);

    assert(
      () => nOfPeriods !== 0,
      _t("The number of periods must be different than 0.", nOfPeriods.toString())
    );

    const currentInvestment = investment - investment * (period / nOfPeriods);
    return -1 * currentInvestment * interestRate;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MDURATION
// -----------------------------------------------------------------------------
export const MDURATION = {
  description: _t("Modified Macaulay duration."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("yield (number)", _t("The expected annual yield of the security.")),
    arg(
      "frequency (number)",
      _t("The number of interest or coupon payments per year (1, 2, or 4).")
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    securityYield: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    const duration = DURATION.compute.bind(this)(
      settlement,
      maturity,
      rate,
      securityYield,
      frequency,
      dayCountConvention
    );
    const y = toNumber(securityYield, this.locale);
    const k = Math.trunc(toNumber(frequency, this.locale));
    return duration / (1 + y / k);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MIRR
// -----------------------------------------------------------------------------
export const MIRR = {
  description: _t("Modified internal rate of return."),
  args: [
    arg(
      "cashflow_amounts (range<number>)",
      _t(
        "A range containing the income or payments associated with the investment. The array should contain bot payments and incomes."
      )
    ),
    arg("financing_rate (number)", _t("The interest rate paid on funds invested.")),
    arg(
      "reinvestment_return_rate (number)",
      _t(
        "The return (as a percentage) earned on reinvestment of income received from the investment."
      )
    ),
  ],
  compute: function (
    cashflowAmount: Matrix<FunctionResultObject>,
    financingRate: Maybe<FunctionResultObject>,
    reinvestmentRate: Maybe<FunctionResultObject>
  ): number {
    const fRate = toNumber(financingRate, this.locale);
    const rRate = toNumber(reinvestmentRate, this.locale);
    const cashFlow = transposeMatrix(cashflowAmount)
      .flat()
      .filter((t) => t.value !== null)
      .map((val) => toNumber(val, this.locale));
    const n = cashFlow.length;

    /**
     * https://en.wikipedia.org/wiki/Modified_internal_rate_of_return
     *
     *         /  FV(positive cash flows, reinvestment rate) \  ^ (1 / (n - 1))
     * MIRR = |  ___________________________________________  |                 - 1
     *         \   - PV(negative cash flows, finance rate)   /
     *
     * with n the number of cash flows.
     *
     * You can compute FV and PV as :
     *
     * FV =    SUM      [ (cashFlow[i]>0 ? cashFlow[i] : 0) * (1 + rRate)**(n - i-1) ]
     *       i= 0 => n
     *
     * PV =    SUM      [ (cashFlow[i]<0 ? cashFlow[i] : 0) / (1 + fRate)**i ]
     *       i= 0 => n
     */

    let fv = 0;
    let pv = 0;
    for (const i of range(0, n)) {
      const amount = cashFlow[i];
      if (amount >= 0) {
        fv += amount * (rRate + 1) ** (n - i - 1);
      } else {
        pv += amount / (fRate + 1) ** i;
      }
    }

    assert(
      () => pv !== 0 && fv !== 0,
      _t("There must be both positive and negative values in cashflow_amounts.")
    );

    const exponent = 1 / (n - 1);

    return (-fv / pv) ** exponent - 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NOMINAL
// -----------------------------------------------------------------------------
export const NOMINAL = {
  description: _t("Annual nominal interest rate."),
  args: [
    arg("effective_rate (number)", _t("The effective interest rate per year.")),
    arg("periods_per_year (number)", _t("The number of compounding periods per year.")),
  ],
  compute: function (
    effective_rate: Maybe<FunctionResultObject>,
    periods_per_year: Maybe<FunctionResultObject>
  ): number {
    const effective = toNumber(effective_rate, this.locale);
    const periods = Math.trunc(toNumber(periods_per_year, this.locale));

    assert(
      () => effective > 0,
      _t("The effective rate (%s) must must strictly greater than 0.", effective.toString())
    );
    assert(
      () => periods > 0,
      _t("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return (Math.pow(effective + 1, 1 / periods) - 1) * periods;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NPER
// -----------------------------------------------------------------------------
export const NPER = {
  description: _t("Number of payment periods for an investment."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("payment_amount (number)", _t("The amount of each payment made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    paymentAmount: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate, this.locale);
    const p = toNumber(paymentAmount, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const fv = toNumber(futureValue, this.locale);
    const t = toBoolean(endOrBeginning) ? 1 : 0;

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/NPER
     *
     * 0 = pv * (1 + r)^N + fv + [ p * (1 + r * t) * ((1 + r)^N - 1) ] / r
     *
     * We solve the equation for N:
     *
     * with C = [ p * (1 + r * t)] / r and
     *      R = 1 + r
     *
     * => 0 = pv * R^N + C * R^N - C + fv
     * <=> (C - fv) = R^N * (pv + C)
     * <=> log[(C - fv) / (pv + C)] = N * log(R)
     */
    if (r === 0) {
      return -(fv + pv) / p;
    }
    const c = (p * (1 + r * t)) / r;
    return Math.log((c - fv) / (pv + c)) / Math.log(1 + r);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NPV
// -----------------------------------------------------------------------------

function npvResult(r: number, startValue: number, values: Arg[], locale: Locale): number {
  let i = 0;
  return reduceNumbers(
    values,
    (acc, v) => {
      i++;
      return acc + v / (1 + r) ** i;
    },
    startValue,
    locale
  );
}

export const NPV = {
  description: _t(
    "The net present value of an investment based on a series of periodic cash flows and a discount rate."
  ),
  args: [
    arg("discount (number)", _t("The discount rate of the investment over one period.")),
    arg("cashflow1 (number, range<number>)", _t("The first future cash flow.")),
    arg("cashflow2 (number, range<number>, repeating)", _t("Additional future cash flows.")),
  ],
  // to do: replace by dollar format
  compute: function (
    discount: Maybe<FunctionResultObject>,
    ...values: Arg[]
  ): FunctionResultNumber {
    const _discount = toNumber(discount, this.locale);

    assert(
      () => _discount !== -1,
      _t("The discount (%s) must be different from -1.", _discount.toString())
    );

    return {
      value: npvResult(_discount, 0, values, this.locale),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PDURATION
// -----------------------------------------------------------------------------
export const PDURATION = {
  description: _t("Computes the number of periods needed for an investment to reach a value."),
  args: [
    arg("rate (number)", _t("The rate at which the investment grows each period.")),
    arg("present_value (number)", _t("The investment's current value.")),
    arg("future_value (number)", _t("The investment's desired future value.")),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject>
  ): number {
    const _rate = toNumber(rate, this.locale);
    const _presentValue = toNumber(presentValue, this.locale);
    const _futureValue = toNumber(futureValue, this.locale);

    assertRateStrictlyPositive(_rate);
    assert(
      () => _presentValue > 0,
      _t("The present_value (%s) must be strictly positive.", _presentValue.toString())
    );
    assert(
      () => _futureValue > 0,
      _t("The future_value (%s) must be strictly positive.", _futureValue.toString())
    );

    return (Math.log(_futureValue) - Math.log(_presentValue)) / Math.log(1 + _rate);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PMT
// -----------------------------------------------------------------------------
function pmt(r: number, n: number, pv: number, fv: number, t: number): number {
  assertNumberOfPeriodsStrictlyPositive(n);
  /**
   * https://wiki.documentfoundation.org/Documentation/Calc_Functions/PMT
   *
   * 0 = pv * (1 + r)^N + fv + [ p * (1 + r * t) * ((1 + r)^N - 1) ] / r
   *
   * We simply the equation for p
   */
  if (r === 0) {
    return -(fv + pv) / n;
  }
  let payment = -(pv * (1 + r) ** n + fv);
  payment = (payment * r) / ((1 + r * t) * ((1 + r) ** n - 1));

  return payment;
}

export const PMT = {
  description: _t("Periodic payment for an annuity investment."),
  args: [
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): FunctionResultNumber {
    const n = toNumber(numberOfPeriods, this.locale);
    const r = toNumber(rate, this.locale);
    const t = toBoolean(endOrBeginning) ? 1 : 0;
    const fv = toNumber(futureValue, this.locale);
    const pv = toNumber(presentValue, this.locale);

    return { value: pmt(r, n, pv, fv, t), format: "#,##0.00" };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PPMT
// -----------------------------------------------------------------------------
function ppmt(
  r: number,
  per: number,
  n: number,
  pValue: number,
  fValue: number,
  t: number
): number {
  assertNumberOfPeriodsStrictlyPositive(n);
  assert(
    () => per > 0 && per <= n,
    _t("The period must be between 1 and number_of_periods (%s)", n)
  );
  const payment = pmt(r, n, pValue, fValue, t);
  if (t === 1 && per === 1) return payment;
  const eqPeriod = t === 0 ? per - 1 : per - 2;
  const eqPv = pValue + payment * t;
  const capitalAtPeriod = -fv(r, eqPeriod, payment, eqPv, 0);
  const currentInterest = capitalAtPeriod * r;
  return payment + currentInterest;
}

export const PPMT = {
  description: _t("Payment on the principal of an investment."),
  args: [
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("period (number)", _t("The amortization period, in terms of number of periods.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  compute: function (
    rate: Maybe<FunctionResultObject>,
    currentPeriod: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): FunctionResultNumber {
    const n = toNumber(numberOfPeriods, this.locale);
    const r = toNumber(rate, this.locale);
    const period = toNumber(currentPeriod, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const fv = toNumber(futureValue, this.locale);
    const pv = toNumber(presentValue, this.locale);
    return {
      value: ppmt(r, period, n, pv, fv, type),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PV
// -----------------------------------------------------------------------------
export const PV = {
  description: _t("Present value of an annuity investment."),
  args: [
    arg("rate (number)", _t("The interest rate.")),
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("payment_amount (number)", _t("The amount per period to be paid.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
  ],
  // to do: replace by dollar format
  compute: function (
    rate: Maybe<FunctionResultObject>,
    numberOfPeriods: Maybe<FunctionResultObject>,
    paymentAmount: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING }
  ): FunctionResultNumber {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate, this.locale);
    const n = toNumber(numberOfPeriods, this.locale);
    const p = toNumber(paymentAmount, this.locale);
    const fv = toNumber(futureValue, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/PV
    return {
      value: r
        ? -((p * (1 + r * type) * ((1 + r) ** n - 1)) / r + fv) / (1 + r) ** n
        : -(fv + p * n),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PRICE
// -----------------------------------------------------------------------------
export const PRICE = {
  description: _t("Price of a security paying periodic interest."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("yield (number)", _t("The expected annual yield of the security.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      "frequency (number)",
      _t("The number of interest or coupon payments per year (1, 2, or 4).")
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    securityYield: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _rate = toNumber(rate, this.locale);
    const _yield = toNumber(securityYield, this.locale);
    const _redemption = toNumber(redemption, this.locale);
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _t("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _t("The yield (%s) must be positive or null.", _yield.toString()));
    assertRedemptionStrictlyPositive(_redemption);

    const years = getYearFrac(_settlement, _maturity, _dayCountConvention);
    const nbrRealCoupons = years * _frequency;
    const nbrFullCoupons = Math.ceil(nbrRealCoupons);
    const timeFirstCoupon = nbrRealCoupons - Math.floor(nbrRealCoupons) || 1;

    const yieldFactorPerPeriod = 1 + _yield / _frequency;
    const cashFlowFromCoupon = (100 * _rate) / _frequency;

    if (nbrFullCoupons === 1) {
      return (
        (cashFlowFromCoupon + _redemption) / ((timeFirstCoupon * _yield) / _frequency + 1) -
        cashFlowFromCoupon * (1 - timeFirstCoupon)
      );
    }

    let cashFlowsPresentValue = 0;
    for (let i = 1; i <= nbrFullCoupons; i++) {
      cashFlowsPresentValue +=
        cashFlowFromCoupon / yieldFactorPerPeriod ** (i - 1 + timeFirstCoupon);
    }

    const redemptionPresentValue =
      _redemption / yieldFactorPerPeriod ** (nbrFullCoupons - 1 + timeFirstCoupon);

    return (
      redemptionPresentValue + cashFlowsPresentValue - cashFlowFromCoupon * (1 - timeFirstCoupon)
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PRICEDISC
// -----------------------------------------------------------------------------
export const PRICEDISC = {
  description: _t("Price of a discount security."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("discount (number)", _t("The discount rate of the security at time of purchase.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    discount: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _discount = toNumber(discount, this.locale);
    const _redemption = toNumber(redemption, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);

    assertDiscountStrictlyPositive(_discount);
    assertRedemptionStrictlyPositive(_redemption);

    /**
     * https://support.microsoft.com/en-us/office/pricedisc-function-d06ad7c1-380e-4be7-9fd9-75e3079acfd3
     *
     * B = number of days in year, depending on year basis
     * DSM = number of days from settlement to maturity
     *
     * PRICEDISC = redemption - discount * redemption * (DSM/B)
     */
    const yearsFrac = getYearFrac(_settlement, _maturity, _dayCountConvention);
    return _redemption - _discount * _redemption * yearsFrac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PRICEMAT
// -----------------------------------------------------------------------------
export const PRICEMAT = {
  description: _t(
    "Calculates the price of a security paying interest at maturity, based on expected yield."
  ),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("issue (date)", _t("The date the security was initially issued.")),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("yield (number)", _t("The expected annual yield of the security.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    issue: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    securityYield: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _issue = Math.trunc(toNumber(issue, this.locale));
    const _rate = toNumber(rate, this.locale);
    const _yield = toNumber(securityYield, this.locale);
    const _dayCount = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertSettlementAndIssueDatesAreValid(_settlement, _issue);
    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCount);

    assert(() => _rate >= 0, _t("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _t("The yield (%s) must be positive or null.", _yield.toString()));

    /**
     * https://support.microsoft.com/en-us/office/pricemat-function-52c3b4da-bc7e-476a-989f-a95f675cae77
     *
     * B = number of days in year, depending on year basis
     * DSM = number of days from settlement to maturity
     * DIM = number of days from issue to maturity
     * DIS = number of days from issue to settlement
     *
     *             100 + (DIM/B * rate * 100)
     *  PRICEMAT =  __________________________   - (DIS/B * rate * 100)
     *              1 + (DSM/B * yield)
     *
     * The ratios number_of_days / days_in_year are computed using the YEARFRAC function, that handle
     * differences due to day count conventions.
     *
     * Compatibility note :
     *
     * Contrary to GSheet and OpenOffice, Excel doesn't seems to always use its own YEARFRAC function
     * to compute PRICEMAT, and give different values for some combinations of dates and day count
     * conventions ( notably for leap years and dayCountConvention = 1 (Actual/Actual)).
     *
     * Our function PRICEMAT give us the same results as LibreOffice Calc.
     * Google Sheet use the formula with YEARFRAC, but its YEARFRAC function results are different
     * from the results of Excel/LibreOffice, thus we get different values with PRICEMAT.
     *
     */
    const settlementToMaturity = getYearFrac(_settlement, _maturity, _dayCount);
    const issueToSettlement = getYearFrac(_settlement, _issue, _dayCount);
    const issueToMaturity = getYearFrac(_issue, _maturity, _dayCount);

    const numerator = 100 + issueToMaturity * _rate * 100;
    const denominator = 1 + settlementToMaturity * _yield;
    const term2 = issueToSettlement * _rate * 100;
    return numerator / denominator - term2;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RATE
// -----------------------------------------------------------------------------
const RATE_GUESS_DEFAULT = 0.1;
export const RATE = {
  description: _t("Interest rate of an annuity investment."),
  args: [
    arg("number_of_periods (number)", _t("The number of payments to be made.")),
    arg("payment_per_period (number)", _t("The amount per period to be paid.")),
    arg("present_value (number)", _t("The current value of the annuity.")),
    arg(
      `future_value (number, default=${DEFAULT_FUTURE_VALUE})`,
      _t("The future value remaining after the final payment has been made.")
    ),
    arg(
      `end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING})`,
      _t("Whether payments are due at the end (0) or beginning (1) of each period.")
    ),
    arg(
      `rate_guess (number, default=${RATE_GUESS_DEFAULT})`,
      _t("An estimate for what the interest rate will be.")
    ),
  ],
  compute: function (
    numberOfPeriods: Maybe<FunctionResultObject>,
    paymentPerPeriod: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject> = { value: DEFAULT_FUTURE_VALUE },
    endOrBeginning: Maybe<FunctionResultObject> = { value: DEFAULT_END_OR_BEGINNING },
    rateGuess: Maybe<FunctionResultObject> = { value: RATE_GUESS_DEFAULT }
  ): FunctionResultNumber {
    const n = toNumber(numberOfPeriods, this.locale);
    const payment = toNumber(paymentPerPeriod, this.locale);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const guess = toNumber(rateGuess, this.locale) || RATE_GUESS_DEFAULT;
    let fv = toNumber(futureValue, this.locale);
    let pv = toNumber(presentValue, this.locale);

    assertNumberOfPeriodsStrictlyPositive(n);
    assert(
      () => [payment, pv, fv].some((val) => val > 0) && [payment, pv, fv].some((val) => val < 0),
      _t(
        "There must be both positive and negative values in [payment_amount, present_value, future_value].",
        n.toString()
      )
    );
    assertRateGuessStrictlyGreaterThanMinusOne(guess);

    fv -= payment * type;
    pv += payment * type;

    // https://github.com/apache/openoffice/blob/trunk/main/sc/source/core/tool/interpr2.cxx
    const func = (rate: number) => {
      const powN = Math.pow(1 + rate, n);
      const intResult = (powN - 1) / rate;
      return fv + pv * powN + payment * intResult;
    };
    const derivFunc = (rate: number) => {
      const powNMinus1 = Math.pow(1 + rate, n - 1);
      const powN = Math.pow(1 + rate, n);
      const intResult = (powN - 1) / rate;
      const intResultDeriv = (n * powNMinus1) / rate - intResult / rate;
      const fTermDerivation = pv * n * powNMinus1 + payment * intResultDeriv;
      return fTermDerivation;
    };

    return {
      value: newtonMethod(func, derivFunc, guess, 40, 1e-5),
      format: "0%",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RECEIVED
// -----------------------------------------------------------------------------
export const RECEIVED = {
  description: _t("Amount received at maturity for a security."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg(
      "investment (number)",
      _t("The amount invested (irrespective of face value of each security).")
    ),
    arg("discount (number)", _t("The discount rate of the security invested in.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    investment: Maybe<FunctionResultObject>,
    discount: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _investment = toNumber(investment, this.locale);
    const _discount = toNumber(discount, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);
    assertInvestmentStrictlyPositive(_investment);
    assertDiscountStrictlyPositive(_discount);

    /**
     * https://support.microsoft.com/en-us/office/received-function-7a3f8b93-6611-4f81-8576-828312c9b5e5
     *
     *                    investment
     * RECEIVED = _________________________
     *              1 - discount * DSM / B
     *
     * with DSM = number of days from settlement to maturity and B = number of days in a year
     *
     * The ratio DSM/B can be computed with the YEARFRAC function to take the dayCountConvention into account.
     */
    const yearsFrac = getYearFrac(_settlement, _maturity, _dayCountConvention);
    return _investment / (1 - _discount * yearsFrac);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RRI
// -----------------------------------------------------------------------------
export const RRI = {
  description: _t(
    "Computes the rate needed for an investment to reach a specific value within a specific number of periods."
  ),
  args: [
    arg("number_of_periods (number)", _t("The number of periods.")),
    arg("present_value (number)", _t("The present value of the investment.")),
    arg("future_value (number)", _t("The future value of the investment.")),
  ],
  compute: function (
    numberOfPeriods: Maybe<FunctionResultObject>,
    presentValue: Maybe<FunctionResultObject>,
    futureValue: Maybe<FunctionResultObject>
  ): number {
    const n = toNumber(numberOfPeriods, this.locale);
    const pv = toNumber(presentValue, this.locale);
    const fv = toNumber(futureValue, this.locale);

    assertNumberOfPeriodsStrictlyPositive(n);

    /**
     * https://support.microsoft.com/en-us/office/rri-function-6f5822d8-7ef1-4233-944c-79e8172930f4
     *
     * RRI = (future value / present value) ^ (1 / number of periods) - 1
     */
    return (fv / pv) ** (1 / n) - 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SLN
// -----------------------------------------------------------------------------
export const SLN = {
  description: _t("Depreciation of an asset using the straight-line method."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg("life (number)", _t("The number of periods over which the asset is depreciated.")),
  ],
  compute: function (
    cost: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    life: Maybe<FunctionResultObject>
  ): FunctionResultNumber {
    const _cost = toNumber(cost, this.locale);
    const _salvage = toNumber(salvage, this.locale);
    const _life = toNumber(life, this.locale);

    // No assertion is done on the values of the arguments to be compatible with Excel/Gsheet that don't check the values.
    // It's up to the user to make sure the arguments make sense, which is good design because the user is smart.

    return {
      value: (_cost - _salvage) / _life,
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SYD
// -----------------------------------------------------------------------------
export const SYD = {
  description: _t("Depreciation via sum of years digit method."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg("life (number)", _t("The number of periods over which the asset is depreciated.")),
    arg(
      "period (number)",
      _t("The single period within life for which to calculate depreciation.")
    ),
  ],
  compute: function (
    cost: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    life: Maybe<FunctionResultObject>,
    period: Maybe<FunctionResultObject>
  ): FunctionResultNumber {
    const _cost = toNumber(cost, this.locale);
    const _salvage = toNumber(salvage, this.locale);
    const _life = toNumber(life, this.locale);
    const _period = toNumber(period, this.locale);

    assertPeriodStrictlyPositive(_period);
    assertLifeStrictlyPositive(_life);
    assertPeriodSmallerOrEqualToLife(_period, _life);

    /**
     * This deprecation method use the sum of digits of the periods of the life as the deprecation factor.
     * For example for a life = 5, we have a deprecation factor or 1 + 2 + 3 + 4 + 5 = 15 = life * (life + 1) / 2 = F.
     *
     * The deprecation for a period p is then computed based on F and the remaining lifetime at the period P.
     *
     * deprecation = (cost - salvage) * (number of remaining periods / F)
     */

    const deprecFactor = (_life * (_life + 1)) / 2;
    const remainingPeriods = _life - _period + 1;

    return {
      value: (_cost - _salvage) * (remainingPeriods / deprecFactor),
      format: "#,##0.00",
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TBILLPRICE
// -----------------------------------------------------------------------------

function tBillPrice(start: number, end: number, disc: number): number {
  /**
   * https://support.microsoft.com/en-us/office/tbillprice-function-eacca992-c29d-425a-9eb8-0513fe6035a2
   *
   * TBILLPRICE = 100 * (1 - discount * DSM / 360)
   *
   * with DSM = number of days from settlement to maturity
   *
   * The ratio DSM/360 can be computed with the YEARFRAC function with dayCountConvention = 2 (actual/360).
   */
  const yearFrac = getYearFrac(start, end, 2);
  return 100 * (1 - disc * yearFrac);
}

export const TBILLPRICE = {
  description: _t("Price of a US Treasury bill."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("discount (number)", _t("The discount rate of the bill at time of purchase.")),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    discount: Maybe<FunctionResultObject>
  ): number {
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const disc = toNumber(discount, this.locale);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end, this.locale);
    assertDiscountStrictlyPositive(disc);
    assertDiscountStrictlySmallerThanOne(disc);

    return tBillPrice(start, end, disc);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TBILLEQ
// -----------------------------------------------------------------------------
export const TBILLEQ = {
  description: _t("Equivalent rate of return for a US Treasury bill."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("discount (number)", _t("The discount rate of the bill at time of purchase.")),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    discount: Maybe<FunctionResultObject>
  ): number {
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const disc = toNumber(discount, this.locale);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end, this.locale);
    assertDiscountStrictlyPositive(disc);
    assertDiscountStrictlySmallerThanOne(disc);

    /**
     * https://support.microsoft.com/en-us/office/tbilleq-function-2ab72d90-9b4d-4efe-9fc2-0f81f2c19c8c
     *
     *               365 * discount
     * TBILLEQ = ________________________
     *            360 - discount * DSM
     *
     * with DSM = number of days from settlement to maturity
     *
     * What is not indicated in the Excel documentation is that this formula only works for duration between settlement
     * and maturity that are less than 6 months (182 days). This is because US Treasury bills use semi-annual interest,
     * and thus we have to take into account the compound interest for the calculation.
     *
     * For this case, the formula becomes (Treasury Securities and Derivatives, by Frank J. Fabozzi, page 49)
     *
     *            -2X + 2* SQRT[ X² - (2X - 1) * (1 - 100/p) ]
     * TBILLEQ = ________________________________________________
     *                            2X - 1
     *
     * with X = DSM / (number of days in a year),
     *  and p is the price, computed with TBILLPRICE
     *
     * Note that from my tests in Excel, we take (number of days in a year) = 366 ONLY if DSM is 366, not if
     * the settlement year is a leap year.
     *
     */

    const nDays = DAYS.compute.bind(this)({ value: end }, { value: start });
    if (nDays <= 182) {
      return (365 * disc) / (360 - disc * nDays);
    }

    const p = tBillPrice(start, end, disc) / 100;

    const daysInYear = nDays === 366 ? 366 : 365;
    const x = nDays / daysInYear;
    const num = -2 * x + 2 * Math.sqrt(x ** 2 - (2 * x - 1) * (1 - 1 / p));
    const denom = 2 * x - 1;

    return num / denom;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TBILLYIELD
// -----------------------------------------------------------------------------
export const TBILLYIELD = {
  description: _t("The yield of a US Treasury bill based on price."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("price (number)", _t("The price at which the security is bought per 100 face value.")),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    price: Maybe<FunctionResultObject>
  ): number {
    const start = Math.trunc(toNumber(settlement, this.locale));
    const end = Math.trunc(toNumber(maturity, this.locale));
    const p = toNumber(price, this.locale);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end, this.locale);
    assertPriceStrictlyPositive(p);

    /**
     * https://support.microsoft.com/en-us/office/tbillyield-function-6d381232-f4b0-4cd5-8e97-45b9c03468ba
     *
     *              100 - price     360
     * TBILLYIELD = ____________ * _____
     *                 price        DSM
     *
     * with DSM = number of days from settlement to maturity
     *
     * The ratio DSM/360 can be computed with the YEARFRAC function with dayCountConvention = 2 (actual/360).
     *
     */

    const yearFrac = getYearFrac(start, end, 2);
    return ((100 - p) / p) * (1 / yearFrac);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VDB
// -----------------------------------------------------------------------------
const DEFAULT_VDB_NO_SWITCH = false;
export const VDB = {
  description: _t("Variable declining balance. WARNING : does not handle decimal periods."),
  args: [
    arg("cost (number)", _t("The initial cost of the asset.")),
    arg("salvage (number)", _t("The value of the asset at the end of depreciation.")),
    arg("life (number)", _t("The number of periods over which the asset is depreciated.")),
    arg("start (number)", _t("Starting period to calculate depreciation.")),
    arg("end (number)", _t("Ending period to calculate depreciation.")),
    arg(
      `factor (number, default=${DEFAULT_DDB_DEPRECIATION_FACTOR})`,
      _t("The number of months in the first year of depreciation.")
    ),
    arg(
      `no_switch (number, default=${DEFAULT_VDB_NO_SWITCH})`,
      _t(
        "Whether to switch to straight-line depreciation when the depreciation is greater than the declining balance calculation."
      )
    ),
  ],
  compute: function (
    cost: Maybe<FunctionResultObject>,
    salvage: Maybe<FunctionResultObject>,
    life: Maybe<FunctionResultObject>,
    startPeriod: Maybe<FunctionResultObject>,
    endPeriod: Maybe<FunctionResultObject>,
    factor: Maybe<FunctionResultObject> = { value: DEFAULT_DDB_DEPRECIATION_FACTOR },
    noSwitch: Maybe<FunctionResultObject> = { value: DEFAULT_VDB_NO_SWITCH }
  ): number {
    factor = factor || 0;
    const _cost = toNumber(cost, this.locale);
    const _salvage = toNumber(salvage, this.locale);
    const _life = toNumber(life, this.locale);
    /* TODO : handle decimal periods
     * on end_period it looks like it is a simple linear function, but I cannot understand exactly how
     * decimals periods are handled with start_period.
     */
    const _startPeriod = Math.trunc(toNumber(startPeriod, this.locale));
    const _endPeriod = Math.trunc(toNumber(endPeriod, this.locale));
    const _factor = toNumber(factor, this.locale);
    const _noSwitch = toBoolean(noSwitch);

    assertCostPositiveOrZero(_cost);
    assertSalvagePositiveOrZero(_salvage);
    assertStartAndEndPeriodAreValid(_startPeriod, _endPeriod, _life);
    assertDeprecationFactorStrictlyPositive(_factor);

    if (_cost === 0) return 0;
    if (_salvage >= _cost) {
      return _startPeriod < 1 ? _cost - _salvage : 0;
    }

    const doubleDeprecFactor = _factor / _life;
    if (doubleDeprecFactor >= 1) {
      return _startPeriod < 1 ? _cost - _salvage : 0;
    }

    let previousCost = _cost;
    let currentDeprec: number = 0;
    let resultDeprec = 0;
    let isLinearDeprec = false;
    for (let i = 0; i < _endPeriod; i++) {
      // compute the current deprecation, or keep the last one if we reached a stage of linear deprecation
      if (!isLinearDeprec || _noSwitch) {
        const doubleDeprec = previousCost * doubleDeprecFactor;

        const remainingPeriods = _life - i;
        const linearDeprec = (previousCost - _salvage) / remainingPeriods;

        if (!_noSwitch && linearDeprec > doubleDeprec) {
          isLinearDeprec = true;
          currentDeprec = linearDeprec;
        } else {
          currentDeprec = doubleDeprec;
        }
      }

      const nextCost = Math.max(previousCost - currentDeprec, _salvage);
      if (i >= _startPeriod) {
        resultDeprec += previousCost - nextCost;
      }
      previousCost = nextCost;
    }

    return resultDeprec;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// XIRR
// -----------------------------------------------------------------------------
export const XIRR = {
  description: _t("Internal rate of return given non-periodic cash flows."),
  args: [
    arg(
      "cashflow_amounts (range<number>)",
      _t("An range containing the income or payments associated with the investment.")
    ),
    arg(
      "cashflow_dates (range<number>)",
      _t("An range with dates corresponding to the cash flows in cashflow_amounts.")
    ),
    arg(
      `rate_guess (number, default=${RATE_GUESS_DEFAULT})`,
      _t("An estimate for what the internal rate of return will be.")
    ),
  ],
  compute: function (
    cashflowAmounts: Matrix<FunctionResultObject>,
    cashflowDates: Matrix<FunctionResultObject>,
    rateGuess: Maybe<FunctionResultObject> = { value: RATE_GUESS_DEFAULT }
  ): number {
    const guess = toNumber(rateGuess, this.locale);

    const _cashFlows = cashflowAmounts.flat().map((val) => toNumber(val, this.locale));
    const _dates = cashflowDates.flat().map((val) => toNumber(val, this.locale));

    assertCashFlowsAndDatesHaveSameDimension(cashflowAmounts, cashflowDates);
    assertCashFlowsHavePositiveAndNegativesValues(_cashFlows);
    assertEveryDateGreaterThanFirstDateOfCashFlowDates(_dates);
    assertRateGuessStrictlyGreaterThanMinusOne(guess);

    const map = new Map<number, number>();
    for (const i of range(0, _dates.length)) {
      const date = _dates[i];
      if (map.has(date)) map.set(date, map.get(date)! + _cashFlows[i]);
      else map.set(date, _cashFlows[i]);
    }
    const dates = Array.from(map.keys());
    const values = dates.map((date) => map.get(date)!);

    /**
     * https://support.microsoft.com/en-us/office/xirr-function-de1242ec-6477-445b-b11b-a303ad9adc9d
     *
     * The rate is computed iteratively by trying to solve the equation
     *
     *
     * 0 =    SUM     [ P_i * (1 + rate) ^((d_0 - d_i) / 365) ]  + P_0
     *     i = 1 => n
     *
     * with P_i = price number i
     *      d_i = date number i
     *
     * This function is not defined for rate < -1. For the case where we get rates < -1 in the Newton method, add
     * a fallback for a number very close to -1 to continue the Newton method.
     *
     */
    const func = (rate: number) => {
      let value = values[0];
      for (const i of range(1, values.length)) {
        const dateDiff = (dates[0] - dates[i]) / 365;
        value += values[i] * (1 + rate) ** dateDiff;
      }
      return value;
    };
    const derivFunc = (rate: number) => {
      let deriv = 0;
      for (const i of range(1, values.length)) {
        const dateDiff = (dates[0] - dates[i]) / 365;
        deriv += dateDiff * values[i] * (1 + rate) ** (dateDiff - 1);
      }
      return deriv;
    };
    const nanFallback = (previousFallback: number | undefined) => {
      // -0.9 => -0.99 => -0.999 => ...
      if (!previousFallback) return -0.9;
      return previousFallback / 10 - 0.9;
    };

    return newtonMethod(func, derivFunc, guess, 40, 1e-5, nanFallback);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// XNPV
// -----------------------------------------------------------------------------
export const XNPV = {
  description: _t("Net present value given to non-periodic cash flows.."),
  args: [
    arg("discount (number)", _t("The discount rate of the investment over one period.")),
    arg(
      "cashflow_amounts (number, range<number>)",
      _t("An range containing the income or payments associated with the investment.")
    ),
    arg(
      "cashflow_dates (number, range<number>)",
      _t("An range with dates corresponding to the cash flows in cashflow_amounts.")
    ),
  ],
  compute: function (
    discount: Maybe<FunctionResultObject>,
    cashflowAmounts: Arg,
    cashflowDates: Arg
  ): number {
    const rate = toNumber(discount, this.locale);

    const _cashFlows = isMatrix(cashflowAmounts)
      ? cashflowAmounts.flat().map((data) => strictToNumber(data, this.locale))
      : [strictToNumber(cashflowAmounts, this.locale)];
    const _dates = isMatrix(cashflowDates)
      ? cashflowDates.flat().map((data) => strictToNumber(data, this.locale))
      : [strictToNumber(cashflowDates, this.locale)];

    if (isMatrix(cashflowDates) && isMatrix(cashflowAmounts)) {
      assertCashFlowsAndDatesHaveSameDimension(cashflowAmounts, cashflowDates);
    } else {
      assert(
        () => _cashFlows.length === _dates.length,
        _t("There must be the same number of values in cashflow_amounts and cashflow_dates.")
      );
    }
    assertEveryDateGreaterThanFirstDateOfCashFlowDates(_dates);
    assertRateStrictlyPositive(rate);

    if (_cashFlows.length === 1) return _cashFlows[0];

    // aggregate values of the same date
    const map = new Map<number, number>();
    for (const i of range(0, _dates.length)) {
      const date = _dates[i];
      if (map.has(date)) map.set(date, map.get(date)! + _cashFlows[i]);
      else map.set(date, _cashFlows[i]);
    }
    const dates = Array.from(map.keys());
    const values = dates.map((date) => map.get(date)!);

    /**
     * https://support.microsoft.com/en-us/office/xirr-function-de1242ec-6477-445b-b11b-a303ad9adc9d
     *
     * The present value is computed using
     *
     *
     * NPV =    SUM     [ P_i *(1 + rate) ^((d_0 - d_i) / 365) ]  + P_0
     *       i = 1 => n
     *
     * with P_i = price number i
     *      d_i = date number i
     *
     *
     */
    let pv = values[0];
    for (const i of range(1, values.length)) {
      const dateDiff = (dates[0] - dates[i]) / 365;
      pv += values[i] * (1 + rate) ** dateDiff;
    }
    return pv;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YIELD
// -----------------------------------------------------------------------------

export const YIELD = {
  description: _t("Annual yield of a security paying periodic interest."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("price (number)", _t("The price at which the security is bought per 100 face value.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      "frequency (number)",
      _t("The number of interest or coupon payments per year (1, 2, or 4).")
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    price: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    frequency: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _rate = toNumber(rate, this.locale);
    const _price = toNumber(price, this.locale);
    const _redemption = toNumber(redemption, this.locale);
    const _frequency = Math.trunc(toNumber(frequency, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _t("The rate (%s) must be positive or null.", _rate.toString()));
    assertPriceStrictlyPositive(_price);
    assertRedemptionStrictlyPositive(_redemption);

    const years = getYearFrac(_settlement, _maturity, _dayCountConvention);
    const nbrRealCoupons = years * _frequency;
    const nbrFullCoupons = Math.ceil(nbrRealCoupons);
    const timeFirstCoupon = nbrRealCoupons - Math.floor(nbrRealCoupons) || 1;

    const cashFlowFromCoupon = (100 * _rate) / _frequency;

    if (nbrFullCoupons === 1) {
      const subPart = _price + cashFlowFromCoupon * (1 - timeFirstCoupon);
      return (
        ((_redemption + cashFlowFromCoupon - subPart) * _frequency * (1 / timeFirstCoupon)) /
        subPart
      );
    }

    // The result of YIELD function is the yield at which the PRICE function will return the given price.
    // This algorithm uses the Newton's method on the PRICE function to determine the result.
    // Newton's method: https://en.wikipedia.org/wiki/Newton%27s_method

    // As the PRICE function isn't continuous, we apply the Newton's method on the numerator of the PRICE formula.

    // For simplicity, it is not yield but yieldFactorPerPeriod (= 1 + yield / frequency) which will be calibrated in Newton's method.
    // yield can be deduced from yieldFactorPerPeriod in sequence.

    function priceNumerator(
      price: number,
      timeFirstCoupon: number,
      nbrFullCoupons: number,
      yieldFactorPerPeriod: number,
      cashFlowFromCoupon: number,
      redemption: number
    ): number {
      let result =
        redemption -
        (price + cashFlowFromCoupon * (1 - timeFirstCoupon)) *
          yieldFactorPerPeriod ** (nbrFullCoupons - 1 + timeFirstCoupon);
      for (let i = 1; i <= nbrFullCoupons; i++) {
        result += cashFlowFromCoupon * yieldFactorPerPeriod ** (i - 1);
      }
      return result;
    }

    function priceNumeratorDeriv(
      price: number,
      timeFirstCoupon: number,
      nbrFullCoupons: number,
      yieldFactorPerPeriod: number,
      cashFlowFromCoupon: number
    ): number {
      let result =
        -(price + cashFlowFromCoupon * (1 - timeFirstCoupon)) *
        (nbrFullCoupons - 1 + timeFirstCoupon) *
        yieldFactorPerPeriod ** (nbrFullCoupons - 2 + timeFirstCoupon);
      for (let i = 1; i <= nbrFullCoupons; i++) {
        result += cashFlowFromCoupon * (i - 1) * yieldFactorPerPeriod ** (i - 2);
      }
      return result;
    }

    function func(x: number) {
      return priceNumerator(
        _price,
        timeFirstCoupon,
        nbrFullCoupons,
        x,
        cashFlowFromCoupon,
        _redemption
      );
    }
    function derivFunc(x: number) {
      return priceNumeratorDeriv(_price, timeFirstCoupon, nbrFullCoupons, x, cashFlowFromCoupon);
    }

    const initYield = _rate + 1;
    const initYieldFactorPerPeriod = 1 + initYield / _frequency;

    const methodResult = newtonMethod(func, derivFunc, initYieldFactorPerPeriod, 100, 1e-5);
    return (methodResult - 1) * _frequency;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YIELDDISC
// -----------------------------------------------------------------------------
export const YIELDDISC = {
  description: _t("Annual yield of a discount security."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("price (number)", _t("The price at which the security is bought per 100 face value.")),
    arg("redemption (number)", _t("The redemption amount per 100 face value, or par.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    price: Maybe<FunctionResultObject>,
    redemption: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _price = toNumber(price, this.locale);
    const _redemption = toNumber(redemption, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);
    assertPriceStrictlyPositive(_price);
    assertRedemptionStrictlyPositive(_redemption);

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/YIELDDISC
     *
     *                    (redemption / price) - 1
     * YIELDDISC = _____________________________________
     *             YEARFRAC(settlement, maturity, basis)
     */
    const yearFrac = getYearFrac(_settlement, _maturity, _dayCountConvention);
    return (_redemption / _price - 1) / yearFrac;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YIELDMAT
// -----------------------------------------------------------------------------

export const YIELDMAT = {
  description: _t("Annual yield of a security paying interest at maturity."),
  args: [
    arg(
      "settlement (date)",
      _t(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )
    ),
    arg(
      "maturity (date)",
      _t("The maturity or end date of the security, when it can be redeemed at face, or par value.")
    ),
    arg("issue (date)", _t("The date the security was initially issued.")),
    arg("rate (number)", _t("The annualized rate of interest.")),
    arg("price (number)", _t("The price at which the security is bought.")),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} )`,
      _t("An indicator of what day count method to use.")
    ),
  ],
  compute: function (
    settlement: Maybe<FunctionResultObject>,
    maturity: Maybe<FunctionResultObject>,
    issue: Maybe<FunctionResultObject>,
    rate: Maybe<FunctionResultObject>,
    price: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement, this.locale));
    const _maturity = Math.trunc(toNumber(maturity, this.locale));
    const _issue = Math.trunc(toNumber(issue, this.locale));
    const _rate = toNumber(rate, this.locale);
    const _price = toNumber(price, this.locale);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(
      () => _settlement >= _issue,
      _t(
        "The settlement (%s) must be greater than or equal to the issue (%s).",
        _settlement.toString(),
        _issue.toString()
      )
    );
    assert(() => _rate >= 0, _t("The rate (%s) must be positive or null.", _rate.toString()));
    assertPriceStrictlyPositive(_price);

    const issueToMaturity = getYearFrac(_issue, _maturity, _dayCountConvention);
    const issueToSettlement = getYearFrac(_issue, _settlement, _dayCountConvention);
    const settlementToMaturity = getYearFrac(_settlement, _maturity, _dayCountConvention);

    const numerator =
      (100 * (1 + _rate * issueToMaturity)) / (_price + 100 * _rate * issueToSettlement) - 1;

    return numerator / settlementToMaturity;
  },
  isExported: true,
} satisfies AddFunctionDescription;
