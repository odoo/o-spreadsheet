import {
  addMonthsToDate,
  getYearFrac,
  isDefined,
  isLastDayOfMonth,
  jsDateToRoundNumber,
  range,
  transpose2dArray,
} from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue, MatrixArgValue, PrimitiveArgValue } from "../types";
import { args } from "./arguments";
import {
  assert,
  reduceAny,
  reduceNumbers,
  strictToNumber,
  toBoolean,
  toJsDate,
  toNumber,
  visitNumbers,
} from "./helpers";
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
  assertLifeStrictlyPositive,
  assertMaturityAndSettlementDatesAreValid,
  assertNumberOfPeriodsStrictlyPositive,
  assertPeriodPositiveOrZero,
  assertPeriodSmallerOrEqualToLife,
  assertPeriodStrictlyPositive,
  assertPresentValueStrictlyPositive,
  assertPriceStrictlyPositive,
  assertRateGuessStrictlyGreaterThanMinusOne,
  assertRateStrictlyPositive,
  assertRedemptionStrictlyPositive,
  assertSalvagePositiveOrZero,
  assertSalvageSmallerOrEqualThanCost,
  assertSettlementAndIssueDatesAreValid,
  assertSettlementLessThanOneYearBeforeMaturity,
  assertStartAndEndPeriodAreValid,
} from "./helper_financial";
import { DAYS, YEARFRAC } from "./module_date";

const DEFAULT_DAY_COUNT_CONVENTION = 0;
const DEFAULT_END_OR_BEGINNING = 0;
const DEFAULT_FUTURE_VALUE = 0;

const COUPON_FUNCTION_ARGS = args(`
settlement (date) ${_lt(
  "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
)}
maturity (date) ${_lt(
  "The maturity or end date of the security, when it can be redeemed at face, or par value."
)}
frequency (number) ${_lt("The number of interest or coupon payments per year (1, 2, or 4).")}
day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
  "An indicator of what day count method to use."
)}
`);

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
        _lt(`Function [[FUNCTION_NAME]] didn't find any result.`)
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
    assert(() => count < maxIterations, _lt(`Function [[FUNCTION_NAME]] didn't find any result.`));
    count++;
  } while (!yEqual0);
  return x;
}

// -----------------------------------------------------------------------------
// ACCRINTM
// -----------------------------------------------------------------------------
export const ACCRINTM: AddFunctionDescription = {
  description: _lt("Accrued interest of security paying at maturity."),
  args: args(`
        issue (date) ${_lt("The date the security was initially issued.")}
        maturity (date) ${_lt("The maturity date of the security.")}
        rate (number) ${_lt("The annualized rate of interest.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    issue: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(issue));
    const end = Math.trunc(toNumber(maturity));
    const _redemption = toNumber(redemption);
    const _rate = toNumber(rate);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertSettlementAndIssueDatesAreValid(end, start);
    assertDayCountConventionIsValid(_dayCountConvention);
    assertRedemptionStrictlyPositive(_redemption);
    assertRateStrictlyPositive(_rate);

    const yearFrac = YEARFRAC.compute(start, end, dayCountConvention) as number;
    return _redemption * _rate * yearFrac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// AMORLINC
// -----------------------------------------------------------------------------
export const AMORLINC: AddFunctionDescription = {
  description: _lt("Depreciation for an accounting period."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        purchase_date (date) ${_lt("The date the asset was purchased.")}
        first_period_end (date) ${_lt("The date the first period ended.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        period (number) ${_lt("The single period within life for which to calculate depreciation.")}
        rate (number) ${_lt("The deprecation rate.")}
        day_count_convention  (number, optional) ${_lt(
          "An indicator of what day count method to use."
        )}
    `),
  returns: ["NUMBER"],
  compute: function (
    cost: PrimitiveArgValue,
    purchaseDate: PrimitiveArgValue,
    firstPeriodEnd: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    period: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _cost = toNumber(cost);
    const _purchaseDate = Math.trunc(toNumber(purchaseDate));
    const _firstPeriodEnd = Math.trunc(toNumber(firstPeriodEnd));
    const _salvage = toNumber(salvage);
    const _period = toNumber(period);
    const _rate = toNumber(rate);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertCostStrictlyPositive(_cost);
    assertSalvagePositiveOrZero(_salvage);
    assertSalvageSmallerOrEqualThanCost(_salvage, _cost);
    assertPeriodPositiveOrZero(_period);
    assertRateStrictlyPositive(_rate);
    assertDayCountConventionIsValid(_dayCountConvention);
    assert(
      () => _purchaseDate <= _firstPeriodEnd,
      _lt(
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
    const yearFrac = YEARFRAC.compute(
      _purchaseDate,
      _firstPeriodEnd,
      _dayCountConvention
    ) as number;
    const firstDeprec = _purchaseDate === _firstPeriodEnd ? deprec : deprec * yearFrac;

    const valueAtPeriod = _cost - firstDeprec - deprec * roundedPeriod;

    if (valueAtPeriod >= _salvage) {
      return roundedPeriod === 0 ? firstDeprec : deprec;
    }
    return _salvage - valueAtPeriod < deprec ? deprec - (_salvage - valueAtPeriod) : 0;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUPDAYS
// -----------------------------------------------------------------------------
export const COUPDAYS: AddFunctionDescription = {
  description: _lt("Days in coupon period containing settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/COUPDAYS
    if (_dayCountConvention === 1) {
      const before = COUPPCD.compute(settlement, maturity, frequency, dayCountConvention) as number;
      const after = COUPNCD.compute(settlement, maturity, frequency, dayCountConvention) as number;
      return after - before;
    }

    const daysInYear = _dayCountConvention === 3 ? 365 : 360;
    return daysInYear / _frequency;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUPDAYBS
// -----------------------------------------------------------------------------
export const COUPDAYBS: AddFunctionDescription = {
  description: _lt("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const couponBeforeStart = COUPPCD.compute(start, end, frequency, dayCountConvention) as number;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return start - couponBeforeStart;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(couponBeforeStart, start, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const startDate = toJsDate(start);
    const dateCouponBeforeStart = toJsDate(couponBeforeStart);

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
};

// -----------------------------------------------------------------------------
// COUPDAYSNC
// -----------------------------------------------------------------------------
export const COUPDAYSNC: AddFunctionDescription = {
  description: _lt("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const couponAfterStart = COUPNCD.compute(start, end, frequency, dayCountConvention) as number;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return couponAfterStart - start;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(start, couponAfterStart, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const coupDayBs = COUPDAYBS.compute(
      settlement,
      maturity,
      frequency,
      _dayCountConvention
    ) as number;
    const coupDays = COUPDAYS.compute(
      settlement,
      maturity,
      frequency,
      _dayCountConvention
    ) as number;
    return coupDays - coupDayBs;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUPNCD
// -----------------------------------------------------------------------------
export const COUPNCD: AddFunctionDescription = {
  description: _lt("Next coupon date after the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute(settlement, maturity, frequency, dayCountConvention) as number;
    const date = addMonthsToDate(toJsDate(end), -(coupNum - 1) * monthsPerPeriod, true);
    return jsDateToRoundNumber(date);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUPNUM
// -----------------------------------------------------------------------------
export const COUPNUM: AddFunctionDescription = {
  description: _lt("Number of coupons between settlement and maturity."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    let num = 1;
    let currentDate = end;
    const monthsPerPeriod = 12 / _frequency;

    while (currentDate > start) {
      currentDate = jsDateToRoundNumber(
        addMonthsToDate(toJsDate(currentDate), -monthsPerPeriod, false)
      );
      num++;
    }
    return num - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUPPCD
// -----------------------------------------------------------------------------
export const COUPPCD: AddFunctionDescription = {
  description: _lt("Last coupon date prior to or on the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute(settlement, maturity, frequency, dayCountConvention) as number;
    const date = addMonthsToDate(toJsDate(end), -coupNum * monthsPerPeriod, true);
    return jsDateToRoundNumber(date);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CUMIPMT
// -----------------------------------------------------------------------------
export const CUMIPMT: AddFunctionDescription = {
  description: _lt("Cumulative interest paid over a set of periods."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  first_period (number) ${_lt(
    "The number of the payment period to begin the cumulative calculation."
  )}
  last_period (number) ${_lt("The number of the payment period to end the cumulative calculation.")}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    firstPeriod: PrimitiveArgValue,
    lastPeriod: PrimitiveArgValue,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    const first = toNumber(firstPeriod);
    const last = toNumber(lastPeriod);
    const _rate = toNumber(rate);
    const pv = toNumber(presentValue);
    const nOfPeriods = toNumber(numberOfPeriods);

    assertFirstAndLastPeriodsAreValid(first, last, nOfPeriods);
    assertRateStrictlyPositive(_rate);
    assertPresentValueStrictlyPositive(pv);

    let cumSum = 0;
    for (let i = first; i <= last; i++) {
      const impt = IPMT.compute(rate, i, nOfPeriods, presentValue, 0, endOrBeginning) as number;
      cumSum += impt;
    }

    return cumSum;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CUMPRINC
// -----------------------------------------------------------------------------
export const CUMPRINC: AddFunctionDescription = {
  description: _lt("Cumulative principal paid over a set of periods."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  first_period (number) ${_lt(
    "The number of the payment period to begin the cumulative calculation."
  )}
  last_period (number) ${_lt("The number of the payment period to end the cumulative calculation.")}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    firstPeriod: PrimitiveArgValue,
    lastPeriod: PrimitiveArgValue,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    const first = toNumber(firstPeriod);
    const last = toNumber(lastPeriod);
    const _rate = toNumber(rate);
    const pv = toNumber(presentValue);
    const nOfPeriods = toNumber(numberOfPeriods);

    assertFirstAndLastPeriodsAreValid(first, last, nOfPeriods);
    assertRateStrictlyPositive(_rate);
    assertPresentValueStrictlyPositive(pv);

    let cumSum = 0;
    for (let i = first; i <= last; i++) {
      const ppmt = PPMT.compute(rate, i, nOfPeriods, presentValue, 0, endOrBeginning) as number;
      cumSum += ppmt;
    }

    return cumSum;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DB
// -----------------------------------------------------------------------------
export const DB: AddFunctionDescription = {
  description: _lt("Depreciation via declining balance method."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
        period (number) ${_lt("The single period within life for which to calculate depreciation.")}
        month (number, optional) ${_lt("The number of months in the first year of depreciation.")}
    `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  computeFormat: () => "#,##0.00",
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue,
    period: PrimitiveArgValue,
    ...args: PrimitiveArgValue[]
  ): number {
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);
    const _period = Math.trunc(toNumber(period));
    const _month = args.length ? Math.trunc(toNumber(args[0])) : 12;
    const lifeLimit = _life + (_month === 12 ? 0 : 1);

    assertCostPositiveOrZero(_cost);
    assertSalvagePositiveOrZero(_salvage);
    assertPeriodStrictlyPositive(_period);
    assertLifeStrictlyPositive(_life);
    assert(
      () => 1 <= _month && _month <= 12,
      _lt("The month (%s) must be between 1 and 12 inclusive.", _month.toString())
    );
    assert(
      () => _period <= lifeLimit,
      _lt(
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

    return before - after;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DDB
// -----------------------------------------------------------------------------
const DEFAULT_DDB_DEPRECIATION_FACTOR = 2;
export const DDB: AddFunctionDescription = {
  description: _lt("Depreciation via double-declining balance method."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
        period (number) ${_lt("The single period within life for which to calculate depreciation.")}
        factor (number, default=${DEFAULT_DDB_DEPRECIATION_FACTOR}) ${_lt(
    "The factor by which depreciation decreases."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue,
    period: PrimitiveArgValue,
    factor: PrimitiveArgValue = DEFAULT_DDB_DEPRECIATION_FACTOR
  ): number {
    factor = factor || 0;
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);
    const _period = toNumber(period);
    const _factor = toNumber(factor);

    assertCostPositiveOrZero(_cost);
    assertSalvagePositiveOrZero(_salvage);
    assertPeriodStrictlyPositive(_period);
    assertLifeStrictlyPositive(_life);
    assertPeriodSmallerOrEqualToLife(_period, _life);
    assertDeprecationFactorStrictlyPositive(_factor);

    if (_cost === 0 || _salvage >= _cost) return 0;

    const deprecFactor = _factor / _life;
    if (deprecFactor > 1) {
      return period === 1 ? _cost - _salvage : 0;
    }

    if (_period <= 1) {
      return _cost * deprecFactor;
    }

    const previousCost = _cost * Math.pow(1 - deprecFactor, _period - 1);
    const nextCost = _cost * Math.pow(1 - deprecFactor, _period);

    const deprec = nextCost < _salvage ? previousCost - _salvage : previousCost - nextCost;
    return Math.max(deprec, 0);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DISC
// -----------------------------------------------------------------------------
export const DISC: AddFunctionDescription = {
  description: _lt("Discount rate of a security based on price."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      price (number) ${_lt("The price at which the security is bought per 100 face value.")}
      redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    price: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

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
    const yearsFrac = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
    return (_redemption - _price) / _redemption / yearsFrac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DOLLARDE
// -----------------------------------------------------------------------------
export const DOLLARDE: AddFunctionDescription = {
  description: _lt("Convert a decimal fraction to decimal value."),
  args: args(`
      fractional_price (number) ${_lt(
        "The price quotation given using fractional decimal conventions."
      )}
      unit (number) ${_lt("The units of the fraction, e.g. 8 for 1/8ths or 32 for 1/32nds.")}
    `),
  returns: ["NUMBER"],
  compute: function (fractionalPrice: PrimitiveArgValue, unit: PrimitiveArgValue): number {
    const price = toNumber(fractionalPrice);
    const _unit = Math.trunc(toNumber(unit));

    assert(() => _unit > 0, _lt("The unit (%s) must be strictly positive.", _unit.toString()));

    const truncatedPrice = Math.trunc(price);
    const priceFractionalPart = price - truncatedPrice;

    const frac = 10 ** Math.ceil(Math.log10(_unit)) / _unit;

    return truncatedPrice + priceFractionalPart * frac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DOLLARFR
// -----------------------------------------------------------------------------
export const DOLLARFR: AddFunctionDescription = {
  description: _lt("Convert a decimal value to decimal fraction."),
  args: args(`
  decimal_price (number) ${_lt("The price quotation given as a decimal value.")}
      unit (number) ${_lt(
        "The units of the desired fraction, e.g. 8 for 1/8ths or 32 for 1/32nds."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (decimalPrice: PrimitiveArgValue, unit: PrimitiveArgValue): number {
    const price = toNumber(decimalPrice);
    const _unit = Math.trunc(toNumber(unit));

    assert(() => _unit > 0, _lt("The unit (%s) must be strictly positive.", _unit.toString()));

    const truncatedPrice = Math.trunc(price);
    const priceFractionalPart = price - truncatedPrice;

    const frac = _unit / 10 ** Math.ceil(Math.log10(_unit));

    return truncatedPrice + priceFractionalPart * frac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DURATION
// -----------------------------------------------------------------------------
export const DURATION: AddFunctionDescription = {
  description: _lt("Number of periods for an investment to reach a value."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        yield (number) ${_lt("The expected annual yield of the security.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));

    const years = YEARFRAC.compute(start, end, _dayCountConvention) as number;
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
};

// -----------------------------------------------------------------------------
// EFFECT
// -----------------------------------------------------------------------------
export const EFFECT: AddFunctionDescription = {
  description: _lt("Annual effective interest rate."),
  args: args(`
  nominal_rate (number) ${_lt("The nominal interest rate per year.")}
  periods_per_year (number) ${_lt("The number of compounding periods per year.")}
  `),
  returns: ["NUMBER"],
  compute: function (nominal_rate: PrimitiveArgValue, periods_per_year: PrimitiveArgValue): number {
    const nominal = toNumber(nominal_rate);
    const periods = Math.trunc(toNumber(periods_per_year));

    assert(
      () => nominal > 0,
      _lt("The nominal rate (%s) must be strictly greater than 0.", nominal.toString())
    );
    assert(
      () => periods > 0,
      _lt("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return Math.pow(1 + nominal / periods, periods) - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FV
// -----------------------------------------------------------------------------
const DEFAULT_PRESENT_VALUE = 0;
export const FV: AddFunctionDescription = {
  description: _lt("Future value of an annuity investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_amount (number) ${_lt("The amount per period to be paid.")}
  present_value (number, default=${DEFAULT_PRESENT_VALUE}) ${_lt(
    "The current value of the annuity."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    presentValue: PrimitiveArgValue = DEFAULT_PRESENT_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    presentValue = presentValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const n = toNumber(numberOfPeriods);
    const p = toNumber(paymentAmount);
    const pv = toNumber(presentValue);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    return r ? -pv * (1 + r) ** n - (p * (1 + r * type) * ((1 + r) ** n - 1)) / r : -(pv + p * n);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FVSCHEDULE
// -----------------------------------------------------------------------------
export const FVSCHEDULE: AddFunctionDescription = {
  description: _lt("Future value of principal from series of rates."),
  args: args(`
  principal (number) ${_lt("The amount of initial capital or value to compound against.")}
  rate_schedule (number, range<number>) ${_lt(
    "A series of interest rates to compound against the principal."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (principalAmount: PrimitiveArgValue, rateSchedule: ArgValue): number {
    const principal = toNumber(principalAmount);
    return reduceAny([rateSchedule], (acc, rate) => acc * (1 + toNumber(rate)), principal);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// INTRATE
// -----------------------------------------------------------------------------
export const INTRATE: AddFunctionDescription = {
  description: _lt("Calculates effective interest rate."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      investment (number) ${_lt("The amount invested in the security.")}
      redemption (number) ${_lt("The amount to be received at maturity.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    investment: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _redemption = toNumber(redemption);
    const _investment = toNumber(investment);

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertInvestmentStrictlyPositive(_investment);
    assertRedemptionStrictlyPositive(_redemption);

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/INTRATE
     *
     *             (Redemption  - Investment) / Investment
     * INTRATE =  _________________________________________
     *              YEARFRAC(settlement, maturity, basis)
     */
    const yearFrac = YEARFRAC.compute(_settlement, _maturity, dayCountConvention) as number;
    return (_redemption - _investment) / _investment / yearFrac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IPMT
// -----------------------------------------------------------------------------
export const IPMT: AddFunctionDescription = {
  description: _lt("Payment on the principal of an investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  period (number) ${_lt("The amortization period, in terms of number of periods.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    const payment = PMT.compute(
      rate,
      numberOfPeriods,
      presentValue,
      futureValue,
      endOrBeginning
    ) as number;
    const ppmt = PPMT.compute(
      rate,
      currentPeriod,
      numberOfPeriods,
      presentValue,
      futureValue,
      endOrBeginning
    ) as number;
    return payment - ppmt;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IRR
// -----------------------------------------------------------------------------
const DEFAULT_RATE_GUESS = 0.1;
export const IRR: AddFunctionDescription = {
  description: _lt("Internal rate of return given periodic cashflows."),
  args: args(`
  cashflow_amounts (number, range<number>) ${_lt(
    "An array or range containing the income or payments associated with the investment."
  )}
  rate_guess (number, default=${DEFAULT_RATE_GUESS}) ${_lt(
    "An estimate for what the internal rate of return will be."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "0%",
  compute: function (
    cashFlowAmounts: MatrixArgValue,
    rateGuess: PrimitiveArgValue = DEFAULT_RATE_GUESS
  ): number {
    const _rateGuess = toNumber(rateGuess);

    assertRateGuessStrictlyGreaterThanMinusOne(_rateGuess);

    // check that values contains at least one positive value and one negative value
    // and extract number present in the cashFlowAmount argument

    let positive = false;
    let negative = false;
    let amounts: number[] = [];

    visitNumbers([cashFlowAmounts], (amount) => {
      if (amount > 0) positive = true;
      if (amount < 0) negative = true;
      amounts.push(amount);
    });

    assert(
      () => positive && negative,
      _lt("The cashflow_amounts must include negative and positive values.")
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

    return newtonMethod(func, derivFunc, _rateGuess + 1, 20, 1e-5) - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISPMT
// -----------------------------------------------------------------------------
export const ISPMT: AddFunctionDescription = {
  description: _lt("Returns the interest paid at a particular period of an investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  period (number) ${_lt("The period for which you want to view the interest payment.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue
  ): number {
    const interestRate = toNumber(rate);
    const period = toNumber(currentPeriod);
    const nOfPeriods = toNumber(numberOfPeriods);
    const investment = toNumber(presentValue);

    assert(
      () => nOfPeriods !== 0,
      _lt("The number of periods must be different than 0.", nOfPeriods.toString())
    );

    const currentInvestment = investment - investment * (period / nOfPeriods);
    return -1 * currentInvestment * interestRate;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MDURATION
// -----------------------------------------------------------------------------
export const MDURATION: AddFunctionDescription = {
  description: _lt("Modified Macaulay duration."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        yield (number) ${_lt("The expected annual yield of the security.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    const duration = DURATION.compute(
      settlement,
      maturity,
      rate,
      securityYield,
      frequency,
      dayCountConvention
    ) as number;
    const y = toNumber(securityYield);
    const k = Math.trunc(toNumber(frequency));
    return duration / (1 + y / k);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MIRR
// -----------------------------------------------------------------------------
export const MIRR: AddFunctionDescription = {
  description: _lt("Modified internal rate of return."),
  args: args(`
  cashflow_amounts (range<number>) ${_lt(
    "A range containing the income or payments associated with the investment. The array should contain bot payments and incomes."
  )}
  financing_rate (number) ${_lt("The interest rate paid on funds invested.")}
  reinvestment_return_rate (number) ${_lt(
    "The return (as a percentage) earned on reinvestment of income received from the investment."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    cashflowAmount: MatrixArgValue,
    financingRate: PrimitiveArgValue,
    reinvestmentRate: PrimitiveArgValue
  ): number {
    const fRate = toNumber(financingRate);
    const rRate = toNumber(reinvestmentRate);
    const cashFlow = transpose2dArray(cashflowAmount).flat().filter(isDefined).map(toNumber);
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
      _lt("There must be both positive and negative values in cashflow_amounts.")
    );

    const exponent = 1 / (n - 1);

    return (-fv / pv) ** exponent - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NOMINAL
// -----------------------------------------------------------------------------
export const NOMINAL: AddFunctionDescription = {
  description: _lt("Annual nominal interest rate."),
  args: args(`
  effective_rate (number) ${_lt("The effective interest rate per year.")}
  periods_per_year (number) ${_lt("The number of compounding periods per year.")}
  `),
  returns: ["NUMBER"],
  compute: function (
    effective_rate: PrimitiveArgValue,
    periods_per_year: PrimitiveArgValue
  ): number {
    const effective = toNumber(effective_rate);
    const periods = Math.trunc(toNumber(periods_per_year));

    assert(
      () => effective > 0,
      _lt("The effective rate (%s) must must strictly greater than 0.", effective.toString())
    );
    assert(
      () => periods > 0,
      _lt("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return (Math.pow(effective + 1, 1 / periods) - 1) * periods;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NPER
// -----------------------------------------------------------------------------
export const NPER: AddFunctionDescription = {
  description: _lt("Number of payment periods for an investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  payment_amount (number) ${_lt("The amount of each payment made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const p = toNumber(paymentAmount);
    const pv = toNumber(presentValue);
    const fv = toNumber(futureValue);
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
};

// -----------------------------------------------------------------------------
// NPV
// -----------------------------------------------------------------------------

function npvResult(r: number, startValue: number, values: ArgValue[]): number {
  let i = 0;
  return reduceNumbers(
    values,
    (acc, v) => {
      i++;
      return acc + v / (1 + r) ** i;
    },
    startValue
  );
}

export const NPV: AddFunctionDescription = {
  description: _lt(
    "The net present value of an investment based on a series of periodic cash flows and a discount rate."
  ),
  args: args(`
  discount (number) ${_lt("The discount rate of the investment over one period.")}
  cashflow1 (number, range<number>) ${_lt("The first future cash flow.")}
  cashflow2 (number, range<number>, repeating) ${_lt("Additional future cash flows.")}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  computeFormat: () => "#,##0.00",
  compute: function (discount: PrimitiveArgValue, ...values: ArgValue[]): number {
    const _discount = toNumber(discount);

    assert(
      () => _discount !== -1,
      _lt("The discount (%s) must be different from -1.", _discount.toString())
    );

    return npvResult(_discount, 0, values);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PDURATION
// -----------------------------------------------------------------------------
export const PDURATION: AddFunctionDescription = {
  description: _lt("Computes the number of periods needed for an investment to reach a value."),
  args: args(`
  rate (number) ${_lt("The rate at which the investment grows each period.")}
  present_value (number) ${_lt("The investment's current value.")}
  future_value (number) ${_lt("The investment's desired future value.")}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue
  ): number {
    const _rate = toNumber(rate);
    const _presentValue = toNumber(presentValue);
    const _futureValue = toNumber(futureValue);

    assertRateStrictlyPositive(_rate);
    assert(
      () => _presentValue > 0,
      _lt("The present_value (%s) must be strictly positive.", _presentValue.toString())
    );
    assert(
      () => _futureValue > 0,
      _lt("The future_value (%s) must be strictly positive.", _futureValue.toString())
    );

    return (Math.log(_futureValue) - Math.log(_presentValue)) / Math.log(1 + _rate);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PMT
// -----------------------------------------------------------------------------
export const PMT: AddFunctionDescription = {
  description: _lt("Periodic payment for an annuity investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const n = toNumber(numberOfPeriods);
    const r = toNumber(rate);
    const t = toBoolean(endOrBeginning) ? 1 : 0;
    let fv = toNumber(futureValue);
    let pv = toNumber(presentValue);

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
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PPMT
// -----------------------------------------------------------------------------
export const PPMT: AddFunctionDescription = {
  description: _lt("Payment on the principal of an investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  period (number) ${_lt("The amortization period, in terms of number of periods.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const n = toNumber(numberOfPeriods);
    const r = toNumber(rate);
    const period = toNumber(currentPeriod);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const fv = toNumber(futureValue);
    const pv = toNumber(presentValue);

    assertNumberOfPeriodsStrictlyPositive(n);
    assert(
      () => period > 0 && period <= n,
      _lt("The period must be between 1 and number_of_periods", n.toString())
    );

    const payment = PMT.compute(r, n, pv, fv, endOrBeginning) as number;

    if (type === 1 && period === 1) return payment;
    const eqPeriod = type === 0 ? period - 1 : period - 2;
    const eqPv = pv + payment * type;

    const capitalAtPeriod = -(FV.compute(r, eqPeriod, payment, eqPv, 0) as number);
    const currentInterest = capitalAtPeriod * r;
    return payment + currentInterest;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PV
// -----------------------------------------------------------------------------
export const PV: AddFunctionDescription = {
  description: _lt("Present value of an annuity investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_amount (number) ${_lt("The amount per period to be paid.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const n = toNumber(numberOfPeriods);
    const p = toNumber(paymentAmount);
    const fv = toNumber(futureValue);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/PV
    return r ? -((p * (1 + r * type) * ((1 + r) ** n - 1)) / r + fv) / (1 + r) ** n : -(fv + p * n);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PRICE
// -----------------------------------------------------------------------------
export const PRICE: AddFunctionDescription = {
  description: _lt("Price of a security paying periodic interest."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      rate (number) ${_lt("The annualized rate of interest.")}
      yield (number) ${_lt("The expected annual yield of the security.")}
      redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
      frequency (number) ${_lt("The number of interest or coupon payments per year (1, 2, or 4).")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));
    assertRedemptionStrictlyPositive(_redemption);

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
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
};

// -----------------------------------------------------------------------------
// PRICEDISC
// -----------------------------------------------------------------------------
export const PRICEDISC: AddFunctionDescription = {
  description: _lt("Price of a discount security."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      discount (number) ${_lt("The discount rate of the security at time of purchase.")}
      redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    discount: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _discount = toNumber(discount);
    const _redemption = toNumber(redemption);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

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
    const yearsFrac = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
    return _redemption - _discount * _redemption * yearsFrac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PRICEMAT
// -----------------------------------------------------------------------------
export const PRICEMAT: AddFunctionDescription = {
  description: _lt(
    "Calculates the price of a security paying interest at maturity, based on expected yield."
  ),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      issue (date) ${_lt("The date the security was initially issued.")}
      rate (number) ${_lt("The annualized rate of interest.")}
      yield (number) ${_lt("The expected annual yield of the security.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    issue: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _issue = Math.trunc(toNumber(issue));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _dayCount = Math.trunc(toNumber(dayCountConvention));

    assertSettlementAndIssueDatesAreValid(_settlement, _issue);
    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCount);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));

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
    const settlementToMaturity = YEARFRAC.compute(_settlement, _maturity, _dayCount) as number;
    const issueToSettlement = YEARFRAC.compute(_settlement, _issue, _dayCount) as number;
    const issueToMaturity = YEARFRAC.compute(_issue, _maturity, _dayCount) as number;

    const numerator = 100 + issueToMaturity * _rate * 100;
    const denominator = 1 + settlementToMaturity * _yield;
    const term2 = issueToSettlement * _rate * 100;
    return numerator / denominator - term2;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RATE
// -----------------------------------------------------------------------------
const RATE_GUESS_DEFAULT = 0.1;
export const RATE: AddFunctionDescription = {
  description: _lt("Interest rate of an annuity investment."),
  args: args(`
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_per_period (number) ${_lt("The amount per period to be paid.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  rate_guess (number, default=${RATE_GUESS_DEFAULT}) ${_lt(
    "An estimate for what the interest rate will be."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "0%",
  compute: function (
    numberOfPeriods: PrimitiveArgValue,
    paymentPerPeriod: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING,
    rateGuess: PrimitiveArgValue = RATE_GUESS_DEFAULT
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    rateGuess = rateGuess || RATE_GUESS_DEFAULT;
    const n = toNumber(numberOfPeriods);
    const payment = toNumber(paymentPerPeriod);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const guess = toNumber(rateGuess);
    let fv = toNumber(futureValue);
    let pv = toNumber(presentValue);

    assertNumberOfPeriodsStrictlyPositive(n);
    assert(
      () => [payment, pv, fv].some((val) => val > 0) && [payment, pv, fv].some((val) => val < 0),
      _lt(
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

    return newtonMethod(func, derivFunc, guess, 40, 1e-5);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RECEIVED
// -----------------------------------------------------------------------------
export const RECEIVED: AddFunctionDescription = {
  description: _lt("Amount received at maturity for a security."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      investment (number) ${_lt(
        "The amount invested (irrespective of face value of each security)."
      )}
      discount (number) ${_lt("The discount rate of the security invested in.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    investment: PrimitiveArgValue,
    discount: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _investment = toNumber(investment);
    const _discount = toNumber(discount);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

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
    const yearsFrac = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
    return _investment / (1 - _discount * yearsFrac);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RRI
// -----------------------------------------------------------------------------
export const RRI: AddFunctionDescription = {
  description: _lt(
    "Computes the rate needed for an investment to reach a specific value within a specific number of periods."
  ),
  args: args(`
      number_of_periods (number) ${_lt("The number of periods.")}
      present_value (number) ${_lt("The present value of the investment.")}
      future_value (number) ${_lt("The future value of the investment.")}
    `),
  returns: ["NUMBER"],
  compute: function (
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue
  ): number {
    const n = toNumber(numberOfPeriods);
    const pv = toNumber(presentValue);
    const fv = toNumber(futureValue);

    assertNumberOfPeriodsStrictlyPositive(n);

    /**
     * https://support.microsoft.com/en-us/office/rri-function-6f5822d8-7ef1-4233-944c-79e8172930f4
     *
     * RRI = (future value / present value) ^ (1 / number of periods) - 1
     */
    return (fv / pv) ** (1 / n) - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SLN
// -----------------------------------------------------------------------------
export const SLN: AddFunctionDescription = {
  description: _lt("Depreciation of an asset using the straight-line method."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
    `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue
  ): number {
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);

    // No assertion is done on the values of the arguments to be compatible with Excel/Gsheet that don't check the values.
    // It's up to the user to make sure the arguments make sense, which is good design because the user is smart.

    return (_cost - _salvage) / _life;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SYD
// -----------------------------------------------------------------------------
export const SYD: AddFunctionDescription = {
  description: _lt("Depreciation via sum of years digit method."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
        period (number) ${_lt("The single period within life for which to calculate depreciation.")}
    `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue,
    period: PrimitiveArgValue
  ): number {
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);
    const _period = toNumber(period);

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

    return (_cost - _salvage) * (remainingPeriods / deprecFactor);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TBILLPRICE
// -----------------------------------------------------------------------------
export const TBILLPRICE: AddFunctionDescription = {
  description: _lt("Price of a US Treasury bill."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      discount (number) ${_lt("The discount rate of the bill at time of purchase.")}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    discount: PrimitiveArgValue
  ): number {
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const disc = toNumber(discount);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end);
    assertDiscountStrictlyPositive(disc);
    assertDiscountStrictlySmallerThanOne(disc);

    /**
     * https://support.microsoft.com/en-us/office/tbillprice-function-eacca992-c29d-425a-9eb8-0513fe6035a2
     *
     * TBILLPRICE = 100 * (1 - discount * DSM / 360)
     *
     * with DSM = number of days from settlement to maturity
     *
     * The ratio DSM/360 can be computed with the YEARFRAC function with dayCountConvention = 2 (actual/360).
     */
    const yearFrac = YEARFRAC.compute(start, end, 2) as number;
    return 100 * (1 - disc * yearFrac);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TBILLEQ
// -----------------------------------------------------------------------------
export const TBILLEQ: AddFunctionDescription = {
  description: _lt("Equivalent rate of return for a US Treasury bill."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      discount (number) ${_lt("The discount rate of the bill at time of purchase.")}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    discount: PrimitiveArgValue
  ): number {
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const disc = toNumber(discount);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end);
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

    const nDays = DAYS.compute(end, start) as number;
    if (nDays <= 182) {
      return (365 * disc) / (360 - disc * nDays);
    }

    const p = (TBILLPRICE.compute(start, end, disc) as number) / 100;

    const daysInYear = nDays === 366 ? 366 : 365;
    const x = nDays / daysInYear;
    const num = -2 * x + 2 * Math.sqrt(x ** 2 - (2 * x - 1) * (1 - 1 / p));
    const denom = 2 * x - 1;

    return num / denom;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TBILLYIELD
// -----------------------------------------------------------------------------
export const TBILLYIELD: AddFunctionDescription = {
  description: _lt("The yield of a US Treasury bill based on price."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      price (number) ${_lt("The price at which the security is bought per 100 face value.")}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    price: PrimitiveArgValue
  ): number {
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const p = toNumber(price);

    assertMaturityAndSettlementDatesAreValid(start, end);
    assertSettlementLessThanOneYearBeforeMaturity(start, end);
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

    const yearFrac = YEARFRAC.compute(start, end, 2) as number;
    return ((100 - p) / p) * (1 / yearFrac);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// VDB
// -----------------------------------------------------------------------------
const DEFAULT_VDB_NO_SWITCH = false;
export const VDB: AddFunctionDescription = {
  description: _lt("Variable declining balance. WARNING : does not handle decimal periods."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
        start (number) ${_lt("Starting period to calculate depreciation.")}
        end (number) ${_lt("Ending period to calculate depreciation.")}
        factor (number, default=${DEFAULT_DDB_DEPRECIATION_FACTOR}) ${_lt(
    "The number of months in the first year of depreciation."
  )}
  no_switch (number, default=${DEFAULT_VDB_NO_SWITCH}) ${_lt(
    "Whether to switch to straight-line depreciation when the depreciation is greater than the declining balance calculation."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue,
    startPeriod: PrimitiveArgValue,
    endPeriod: PrimitiveArgValue,
    factor: PrimitiveArgValue = DEFAULT_DDB_DEPRECIATION_FACTOR,
    noSwitch: PrimitiveArgValue = DEFAULT_VDB_NO_SWITCH
  ): number {
    factor = factor || 0;
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);
    /* TODO : handle decimal periods
     * on end_period it looks like it is a simple linear function, but I cannot understand exactly how
     * decimals periods are handled with start_period.
     */
    const _startPeriod = Math.trunc(toNumber(startPeriod));
    const _endPeriod = Math.trunc(toNumber(endPeriod));
    const _factor = toNumber(factor);
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
};

// -----------------------------------------------------------------------------
// XIRR
// -----------------------------------------------------------------------------
export const XIRR: AddFunctionDescription = {
  description: _lt("Internal rate of return given non-periodic cash flows."),
  args: args(`
  cashflow_amounts (range<number>) ${_lt(
    "An range containing the income or payments associated with the investment."
  )}
  cashflow_dates (range<number>) ${_lt(
    "An range with dates corresponding to the cash flows in cashflow_amounts."
  )}
  rate_guess (number, default=${RATE_GUESS_DEFAULT}) ${_lt(
    "An estimate for what the internal rate of return will be."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    cashflowAmounts: MatrixArgValue,
    cashflowDates: MatrixArgValue,
    rateGuess: PrimitiveArgValue = RATE_GUESS_DEFAULT
  ): number {
    rateGuess = rateGuess || 0;
    const guess = toNumber(rateGuess);

    const _cashFlows = cashflowAmounts.flat().map(toNumber);
    const _dates = cashflowDates.flat().map(toNumber);

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
};

// -----------------------------------------------------------------------------
// XNPV
// -----------------------------------------------------------------------------
export const XNPV: AddFunctionDescription = {
  description: _lt("Net present value given to non-periodic cash flows.."),
  args: args(`
  discount (number) ${_lt("The discount rate of the investment over one period.")}
  cashflow_amounts (number, range<number>) ${_lt(
    "An range containing the income or payments associated with the investment."
  )}
  cashflow_dates (number, range<number>) ${_lt(
    "An range with dates corresponding to the cash flows in cashflow_amounts."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    discount: PrimitiveArgValue,
    cashflowAmounts: ArgValue,
    cashflowDates: ArgValue
  ): number {
    const rate = toNumber(discount);

    const _cashFlows = Array.isArray(cashflowAmounts)
      ? cashflowAmounts.flat().map(strictToNumber)
      : [strictToNumber(cashflowAmounts)];
    const _dates = Array.isArray(cashflowDates)
      ? cashflowDates.flat().map(strictToNumber)
      : [strictToNumber(cashflowDates)];

    if (Array.isArray(cashflowDates) && Array.isArray(cashflowAmounts)) {
      assertCashFlowsAndDatesHaveSameDimension(cashflowAmounts, cashflowDates);
    } else {
      assert(
        () => _cashFlows.length === _dates.length,
        _lt("There must be the same number of values in cashflow_amounts and cashflow_dates.")
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
};

// -----------------------------------------------------------------------------
// YIELD
// -----------------------------------------------------------------------------

export const YIELD: AddFunctionDescription = {
  description: _lt("Annual yield of a security paying periodic interest."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        price (number) ${_lt("The price at which the security is bought per 100 face value.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    price: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertCouponFrequencyIsValid(_frequency);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assertPriceStrictlyPositive(_price);
    assertRedemptionStrictlyPositive(_redemption);

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
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
};

// -----------------------------------------------------------------------------
// YIELDDISC
// -----------------------------------------------------------------------------
export const YIELDDISC: AddFunctionDescription = {
  description: _lt("Annual yield of a discount security."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        price (number) ${_lt("The price at which the security is bought per 100 face value.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    price: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

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
    const yearFrac = YEARFRAC.compute(settlement, maturity, dayCountConvention) as number;
    return (_redemption / _price - 1) / yearFrac;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// YIELDMAT
// -----------------------------------------------------------------------------

export const YIELDMAT: AddFunctionDescription = {
  description: _lt("Annual yield of a security paying interest at maturity."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        issue (date) ${_lt("The date the security was initially issued.")}
        rate (number) ${_lt("The annualized rate of interest.")}
        price (number) ${_lt("The price at which the security is bought.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    issue: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    price: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _issue = Math.trunc(toNumber(issue));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assertMaturityAndSettlementDatesAreValid(_settlement, _maturity);
    assertDayCountConventionIsValid(_dayCountConvention);

    assert(
      () => _settlement >= _issue,
      _lt(
        "The settlement (%s) must be greater than or equal to the issue (%s).",
        _settlement.toString(),
        _issue.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assertPriceStrictlyPositive(_price);

    const issueToMaturity = YEARFRAC.compute(_issue, _maturity, _dayCountConvention) as number;
    const issueToSettlement = YEARFRAC.compute(_issue, _settlement, _dayCountConvention) as number;
    const settlementToMaturity = YEARFRAC.compute(
      _settlement,
      _maturity,
      _dayCountConvention
    ) as number;

    const numerator =
      (100 * (1 + _rate * issueToMaturity)) / (_price + 100 * _rate * issueToSettlement) - 1;

    return numerator / settlementToMaturity;
  },
  isExported: true,
};
