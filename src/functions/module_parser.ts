import { _t } from "../translation";
import { AddFunctionDescription, CellValue, Maybe } from "../types";
import { arg } from "./arguments";
import { toNumber, toString } from "./helpers";

const transformFromFactor = (factor: number) => ({
  transform: (x: number) => x * factor,
  inverseTransform: (x: number) => x / factor,
});
const standard = { transform: (x: number) => x, inverseTransform: (x: number) => x };

const ANG2M = 1e-10;
const IN2M = 0.0254;
const PICAPT2M = IN2M / 72;
const FT2M = 0.3048;
const YD2M = 0.9144;
const MI2M = 1609.34;
const NMI2M = 1852;
const LY2M = 9.46073047258e15;

const UNITS = {
  // WEIGHT UNITs : Standard = gramme
  g: { ...standard, category: "weight" },
  u: { ...transformFromFactor(1.66053e-24), category: "weight" },
  grain: { ...transformFromFactor(0.0647989), category: "weight" },
  ozm: { ...transformFromFactor(28.3495), category: "weight" },
  lbm: { ...transformFromFactor(453.592), category: "weight" },
  stone: { ...transformFromFactor(6350.29), category: "weight" },
  sg: { ...transformFromFactor(14593.90294), category: "weight" },
  cwt: { ...transformFromFactor(45359.237), category: "weight" },
  uk_cwt: { ...transformFromFactor(50802.3), category: "weight" },
  ton: { ...transformFromFactor(907185), category: "weight" },

  // DISTANCE UNITS : Standard = meter
  m: { ...standard, category: "distance" },
  ang: { ...transformFromFactor(ANG2M), category: "distance" },
  Picapt: { ...transformFromFactor(PICAPT2M), category: "distance" },
  pica: { ...transformFromFactor(IN2M / 6), category: "distance" },
  in: { ...transformFromFactor(IN2M), category: "distance" },
  ft: { ...transformFromFactor(FT2M), category: "distance" },
  yd: { ...transformFromFactor(YD2M), category: "distance" },
  ell: { ...transformFromFactor(1.143), category: "distance" },
  mi: { ...transformFromFactor(MI2M), category: "distance" },
  survey_mi: { ...transformFromFactor(1609.34), category: "distance" },
  Nmi: { ...transformFromFactor(NMI2M), category: "distance" },
  ly: { ...transformFromFactor(LY2M), category: "distance" },
  parsec: { ...transformFromFactor(3.0856775814914e16), category: "distance" },

  // TIME UNITS : Standard = second
  sec: { ...standard, category: "time" },
  min: { ...transformFromFactor(60), category: "time" },
  hr: { ...transformFromFactor(3600), category: "time" },
  day: { ...transformFromFactor(86400), category: "time" },
  yr: { ...transformFromFactor(31556952), category: "time" },

  // PRESSURE UNITS : Standard = Pascal
  Pa: { ...standard, category: "pressure" },
  mmHg: { ...transformFromFactor(133.322), category: "pressure" },
  Torr: { ...transformFromFactor(133.322), category: "pressure" },
  psi: { ...transformFromFactor(6894.76), category: "pressure" },
  atm: { ...transformFromFactor(101325), category: "pressure" },

  // FORCE UNITS : Standard = Newton
  N: { ...standard, category: "force" },
  dyn: { ...transformFromFactor(1e-5), category: "force" },
  pond: { ...transformFromFactor(0.00980665), category: "force" },
  lbf: { ...transformFromFactor(4.44822), category: "force" },

  // ENERGY UNITS : Standard = Joule
  J: { ...standard, category: "energy" },
  eV: { ...transformFromFactor(1.60218e-19), category: "energy" },
  e: { ...transformFromFactor(1e-7), category: "energy" },
  flb: { ...transformFromFactor(1.3558179483), category: "energy" },
  c: { ...transformFromFactor(4.184), category: "energy" },
  cal: { ...transformFromFactor(4.1868), category: "energy" },
  BTU: { ...transformFromFactor(1055.06), category: "energy" },
  Wh: { ...transformFromFactor(3600), category: "energy" },
  HPh: { ...transformFromFactor(2684519.5376962), category: "energy" },

  // POWER UNITS : Standard = Watt
  W: { ...standard, category: "power" },
  PS: { ...transformFromFactor(735.499), category: "power" },
  HP: { ...transformFromFactor(745.7), category: "power" },

  // MAGNETISM UNITS : Standard = Tesla
  T: { ...standard, category: "magnetism" },
  ga: { ...transformFromFactor(1e-4), category: "magnetism" },

  // TEMPERATURE UNITS : Standard = Kelvin
  K: { ...standard, category: "temperature" },
  C: {
    transform: (T) => T + 273.15,
    inverseTransform: (T) => T - 273.15,
    category: "temperature",
  },
  F: {
    transform: (T) => ((T - 32) * 5) / 9 + 273.15,
    inverseTransform: (T) => ((T + 273.15) * 9) / 5 + 32,
    category: "temperature",
  },
  Rank: { ...transformFromFactor(5 / 9), category: "temperature" },
  Reau: {
    transform: (T) => T * 1.25 + 273.15,
    inverseTransform: (T) => (T - 273.15) / 1.25,
    category: "temperature",
  },

  // VOLUME UNITS : Standard = cubic meter
  "m^3": { ...standard, category: "volume" },
  "ang^3": { ...transformFromFactor(Math.pow(ANG2M, 3)), category: "volume" },
  "Picapt^3": { ...transformFromFactor(Math.pow(PICAPT2M, 3)), category: "volume" },
  tsp: { ...transformFromFactor(4.92892e-6), category: "volume" },
  tspm: { ...transformFromFactor(5e-6), category: "volume" },
  tbs: { ...transformFromFactor(1.4786764825785619e-5), category: "volume" },
  "in^3": { ...transformFromFactor(Math.pow(IN2M, 3)), category: "volume" },
  oz: { ...transformFromFactor(2.95735295625e-5), category: "volume" },
  cup: { ...transformFromFactor(0.000237), category: "volume" },
  pt: { ...transformFromFactor(0.0004731765), category: "volume" },
  uk_pt: { ...transformFromFactor(0.000568261), category: "volume" },
  qt: { ...transformFromFactor(0.0009463529), category: "volume" },
  l: { ...transformFromFactor(1e-3), category: "volume" },
  uk_qt: { ...transformFromFactor(0.0011365225), category: "volume" },
  gal: { ...transformFromFactor(0.0037854118), category: "volume" },
  uk_gal: { ...transformFromFactor(0.00454609), category: "volume" },
  "ft^3": { ...transformFromFactor(Math.pow(FT2M, 3)), category: "volume" },
  bushel: { ...transformFromFactor(0.0352390704), category: "volume" },
  barrel: { ...transformFromFactor(0.158987295), category: "volume" },
  "yd^3": { ...transformFromFactor(Math.pow(YD2M, 3)), category: "volume" },
  MTON: { ...transformFromFactor(1.13267386368), category: "volume" },
  GRT: { ...transformFromFactor(2.83168), category: "volume" },
  "mi^3": { ...transformFromFactor(Math.pow(MI2M, 3)), category: "volume" },
  "Nmi^3": { ...transformFromFactor(Math.pow(NMI2M, 3)), category: "volume" },
  "ly^3": { ...transformFromFactor(Math.pow(LY2M, 3)), category: "volume" },

  // AREA UNITS : Standard = square meter
  "m^2": { ...standard, category: "area" },
  "ang^2": { ...transformFromFactor(Math.pow(ANG2M, 2)), category: "area" },
  "Picapt^2": { ...transformFromFactor(Math.pow(PICAPT2M, 2)), category: "area" },
  "in^2": { ...transformFromFactor(Math.pow(IN2M, 2)), category: "area" },
  "ft^2": { ...transformFromFactor(Math.pow(FT2M, 2)), category: "area" },
  "yd^2": { ...transformFromFactor(Math.pow(YD2M, 2)), category: "area" },
  ar: { ...transformFromFactor(100), category: "area" },
  Morgen: { ...transformFromFactor(2500), category: "area" },
  uk_acre: { ...transformFromFactor(4046.8564224), category: "area" },
  us_acre: { ...transformFromFactor(4046.8726098743), category: "area" },
  ha: { ...transformFromFactor(1e4), category: "area" },
  "mi^2": { ...transformFromFactor(Math.pow(MI2M, 2)), category: "area" },
  "Nmi^2": { ...transformFromFactor(Math.pow(NMI2M, 2)), category: "area" },
  "ly^2": { ...transformFromFactor(Math.pow(LY2M, 2)), category: "area" },

  // INFORMATION UNITS : Standard = bit
  bit: { ...standard, category: "information" },
  byte: { ...transformFromFactor(8), category: "information" },

  // SPEED UNITS : Standard = m/s
  "m/s": { ...standard, category: "speed" },
  "m/hr": { ...transformFromFactor(1 / 3600), category: "speed" },
  mph: { ...transformFromFactor(0.44704), category: "speed" },
  kn: { ...transformFromFactor(0.5144444444), category: "speed" },
  admkn: { ...transformFromFactor(0.5147733333), category: "speed" },
};

// -----------------------------------------------------------------------------
// CONVERT
// -----------------------------------------------------------------------------
export const CONVERT = {
  description: _t("Converts a numeric value to a different unit of measure."),
  args: [
    arg("value (number)", _t("the numeric value in start_unit to convert to end_unit")),
    arg("start_unit (string)", _t("The starting unit, the unit currently assigned to value")),
    arg("end_unit (string)", _t("The unit of measure into which to convert value")),
  ],
  returns: ["NUMBER"],
  compute: function (
    value: Maybe<CellValue>,
    start_unit: Maybe<CellValue>,
    end_unit: Maybe<CellValue>
  ): number {
    const _value = toNumber(value, this.locale);
    const _start_unit = toString(start_unit);
    const _end_unit = toString(end_unit);
    const start_conversion = UNITS[_start_unit];
    const end_conversion = UNITS[_end_unit];
    if (!start_conversion || !end_conversion) {
      throw new Error(_t("Invalid units of measure"));
    }
    if (start_conversion.category !== end_conversion.category) {
      throw new Error(_t("Incompatible units of measure"));
    }
    return end_conversion.inverseTransform(start_conversion.transform(_value));
  },
  isExported: true,
} satisfies AddFunctionDescription;
