import { _t } from "../translation";

type UnitTransformation = {
  transform: (number) => number;
  inverseTransform: (number) => number;
};

type Unit = UnitTransformation & { category: string; factor: number; order?: number };

const transformFromFactor = (factor: number): UnitTransformation => ({
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
  g: { ...standard, category: "weight", label: _t("Gram") },
  u: { ...transformFromFactor(1.66053e-24), category: "weight", label: _t("Atomic Mass Unit") },
  grain: { ...transformFromFactor(0.0647989), category: "weight", label: _t("Grain") },
  ozm: { ...transformFromFactor(28.3495), category: "weight", label: _t("Ounce mass") },
  lbm: { ...transformFromFactor(453.592), category: "weight", label: _t("Pound mass") },
  stone: { ...transformFromFactor(6350.29), category: "weight", label: _t("Stone") },
  sg: { ...transformFromFactor(14593.90294), category: "weight", label: _t("Slug") },
  cwt: { ...transformFromFactor(45359.237), category: "weight", label: _t("U.S. (short)") },
  uk_cwt: { ...transformFromFactor(50802.3), category: "weight", label: _t("U.K. (long)") },
  ton: { ...transformFromFactor(907184.74), category: "weight", label: _t("U.S. Ton") },
  uk_ton: { ...transformFromFactor(1016046.9), category: "weight", label: _t("U.K. Ton") },

  // DISTANCE UNITS : Standard = meter
  m: { ...standard, category: "distance", label: _t("Meter") },
  km: { ...transformFromFactor(1000), category: "distance", label: _t("Kilometer") },
  ang: { ...transformFromFactor(ANG2M), category: "distance", label: _t("Angstrom") },
  Picapt: { ...transformFromFactor(PICAPT2M), category: "distance", label: _t("Picapt") },
  pica: { ...transformFromFactor(IN2M / 6), category: "distance", label: _t("Pica") },
  in: { ...transformFromFactor(IN2M), category: "distance", label: _t("Inch") },
  ft: { ...transformFromFactor(FT2M), category: "distance", label: _t("Foot") },
  yd: { ...transformFromFactor(YD2M), category: "distance", label: _t("Yard") },
  ell: { ...transformFromFactor(1.143), category: "distance", label: _t("Ell") },
  mi: { ...transformFromFactor(MI2M), category: "distance", label: _t("Statute Mile") },
  survey_mi: {
    ...transformFromFactor(1609.34),
    category: "distance",
    label: _t("U.S. Survey Mile"),
  },
  Nmi: { ...transformFromFactor(NMI2M), category: "distance", label: _t("Nautical Mile") },
  ly: { ...transformFromFactor(LY2M), category: "distance", label: _t("Light Year") },
  parsec: { ...transformFromFactor(3.0856775814914e16), category: "distance", label: _t("Parsec") },

  // TIME UNITS : Standard = second
  sec: { ...standard, category: "time", label: _t("Second") },
  min: { ...transformFromFactor(60), category: "time", label: _t("Minute") },
  hr: { ...transformFromFactor(3600), category: "time", label: _t("Hour") },
  day: { ...transformFromFactor(86400), category: "time", label: _t("Day") },
  yr: { ...transformFromFactor(31556952), category: "time", label: _t("Year") },

  // PRESSURE UNITS : Standard = Pascal
  Pa: { ...standard, category: "pressure", label: _t("Pascal") },
  bar: { ...transformFromFactor(100000), category: "pressure", label: _t("Bar") },
  mmHg: {
    ...transformFromFactor(133.322),
    category: "pressure",
    label: _t("Millimeter of Mercury"),
  },
  Torr: { ...transformFromFactor(133.322), category: "pressure", label: _t("Torr") },
  psi: {
    ...transformFromFactor(6894.76),
    category: "pressure",
    label: _t("Pounds per Square Inch"),
  },
  atm: { ...transformFromFactor(101325), category: "pressure", label: _t("Atmosphere") },

  // FORCE UNITS : Standard = Newton
  N: { ...standard, category: "force", label: _t("Newton") },
  dyn: { ...transformFromFactor(1e-5), category: "force", label: _t("Dyne") },
  pond: { ...transformFromFactor(0.00980665), category: "force", label: _t("Pond") },
  lbf: { ...transformFromFactor(4.44822), category: "force", label: _t("Pound-force") },

  // ENERGY UNITS : Standard = Joule
  J: { ...standard, category: "energy", label: _t("Joule") },
  eV: { ...transformFromFactor(1.60218e-19), category: "energy", label: _t("Electron volt") },
  e: { ...transformFromFactor(1e-7), category: "energy", label: _t("Erg") },
  flb: { ...transformFromFactor(1.3558179483), category: "energy", label: _t("Foot-pound") },
  c: { ...transformFromFactor(4.184), category: "energy", label: _t("Calorie") },
  cal: { ...transformFromFactor(4.1868), category: "energy", label: _t("Calorie (International)") },
  BTU: { ...transformFromFactor(1055.06), category: "energy", label: _t("British Thermal Unit") },
  Wh: { ...transformFromFactor(3600), category: "energy", label: _t("Watt-hour") },
  HPh: { ...transformFromFactor(2684520), category: "energy", label: _t("Horsepower-hour") },

  // POWER UNITS : Standard = Watt
  W: { ...standard, category: "power", label: _t("Watt") },
  PS: { ...transformFromFactor(735.499), category: "power", label: _t("Horse Strength") },
  HP: { ...transformFromFactor(745.7), category: "power", label: _t("Horsepower") },

  // MAGNETISM UNITS : Standard = Tesla
  T: { ...standard, category: "magnetism", label: _t("Tesla") },
  ga: { ...transformFromFactor(1e-4), category: "magnetism", label: _t("Gauss") },

  // TEMPERATURE UNITS : Standard = Kelvin
  K: { ...standard, category: "temperature", label: _t("Kelvin") },
  C: {
    transform: (T) => T + 273.15,
    inverseTransform: (T) => T - 273.15,
    category: "temperature",
    label: _t("Degree Celsius"),
  },
  F: {
    transform: (T) => ((T - 32) * 5) / 9 + 273.15,
    inverseTransform: (T) => ((T - 273.15) * 9) / 5 + 32,
    category: "temperature",
    label: _t("Degree Fahrenheit"),
  },
  Rank: { ...transformFromFactor(5 / 9), category: "temperature", label: _t("Degree Rankine") },
  Reau: {
    transform: (T) => T * 1.25 + 273.15,
    inverseTransform: (T) => (T - 273.15) / 1.25,
    category: "temperature",
    label: _t("Degree Reaumur"),
  },

  // VOLUME UNITS : Standard = cubic meter
  "m^3": { ...standard, category: "volume", order: 3, label: _t("Cubic Meter") },
  "ang^3": {
    ...transformFromFactor(Math.pow(ANG2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Angstrom"),
  },
  "Picapt^3": {
    ...transformFromFactor(Math.pow(PICAPT2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Picapt"),
  },
  tsp: { ...transformFromFactor(4.92892e-6), category: "volume", label: _t("Teaspoon") },
  tspm: { ...transformFromFactor(5e-6), category: "volume", label: _t("Modern Teaspoon") },
  tbs: {
    ...transformFromFactor(1.4786764825785619e-5),
    category: "volume",
    label: _t("Tablespoon"),
  },
  "in^3": {
    ...transformFromFactor(Math.pow(IN2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Inch"),
  },
  oz: { ...transformFromFactor(2.95735295625e-5), category: "volume", label: _t("Fluid Ounce") },
  cup: { ...transformFromFactor(0.000237), category: "volume", label: _t("Cup") },
  pt: { ...transformFromFactor(0.0004731765), category: "volume", label: _t("Pint") },
  uk_pt: { ...transformFromFactor(0.000568261), category: "volume", label: _t("U.K. Pint") },
  qt: { ...transformFromFactor(0.0009463529), category: "volume", label: _t("U.S. Quart") },
  l: { ...transformFromFactor(1e-3), category: "volume", label: _t("Liter") },
  uk_qt: { ...transformFromFactor(0.0011365225), category: "volume", label: _t("U.K. Quart") },
  gal: { ...transformFromFactor(0.0037854118), category: "volume", label: _t("Gallon") },
  uk_gal: { ...transformFromFactor(0.00454609), category: "volume", label: _t("U.K. Gallon") },
  "ft^3": {
    ...transformFromFactor(Math.pow(FT2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Foot"),
  },
  bushel: { ...transformFromFactor(0.0352390704), category: "volume", label: _t("U.S. Bushel") },
  barrel: { ...transformFromFactor(0.158987295), category: "volume", label: _t("U.S. Oil Barrel") },
  "yd^3": {
    ...transformFromFactor(Math.pow(YD2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Yard"),
  },
  MTON: { ...transformFromFactor(1.13267386368), category: "volume", label: _t("Measurement Ton") },
  GRT: { ...transformFromFactor(2.83168), category: "volume", label: _t("Gross Register Ton") },
  "mi^3": {
    ...transformFromFactor(Math.pow(MI2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Statute Mile"),
  },
  "Nmi^3": {
    ...transformFromFactor(Math.pow(NMI2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Nautical Mile"),
  },
  "ly^3": {
    ...transformFromFactor(Math.pow(LY2M, 3)),
    category: "volume",
    order: 3,
    label: _t("Cubic Light Year"),
  },

  // AREA UNITS : Standard = square meter
  "m^2": { ...standard, category: "area", order: 2, label: _t("Square Meter") },
  "ang^2": {
    ...transformFromFactor(Math.pow(ANG2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Angstrom"),
  },
  "Picapt^2": {
    ...transformFromFactor(Math.pow(PICAPT2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Picapt"),
  },
  "in^2": {
    ...transformFromFactor(Math.pow(IN2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Inch"),
  },
  "ft^2": {
    ...transformFromFactor(Math.pow(FT2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Foot"),
  },
  "yd^2": {
    ...transformFromFactor(Math.pow(YD2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Yard"),
  },
  ar: { ...transformFromFactor(100), category: "area", label: _t("Are") },
  Morgen: { ...transformFromFactor(2500), category: "area", label: _t("Morgen") },
  uk_acre: { ...transformFromFactor(4046.8564224), category: "area", label: _t("U.K. Acre") },
  us_acre: { ...transformFromFactor(4046.8726098743), category: "area", label: _t("U.S. Acre") },
  ha: { ...transformFromFactor(1e4), category: "area", label: _t("Hectare") },
  "mi^2": {
    ...transformFromFactor(Math.pow(MI2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Statute Mile"),
  },
  "Nmi^2": {
    ...transformFromFactor(Math.pow(NMI2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Nautical Mile"),
  },
  "ly^2": {
    ...transformFromFactor(Math.pow(LY2M, 2)),
    category: "area",
    order: 2,
    label: _t("Square Light Year"),
  },

  // INFORMATION UNITS : Standard = bit
  bit: { ...standard, category: "information", label: _t("Bit") },
  byte: { ...transformFromFactor(8), category: "information", label: _t("Byte") },

  // SPEED UNITS : Standard = m/s
  "m/sec": { ...standard, category: "speed", label: _t("Meter per Second") },
  "m/hr": { ...transformFromFactor(1 / 3600), category: "speed", label: _t("Meter per Hour") },
  "km/hr": { ...transformFromFactor(1 / 3.6), category: "speed", label: _t("Kilometer per Hour") },
  mph: { ...transformFromFactor(0.44704), category: "speed", label: _t("Miles per Hour") },
  kn: { ...transformFromFactor(0.5144444444), category: "speed", label: _t("Knot") },
  admkn: { ...transformFromFactor(0.5147733333), category: "speed", label: _t("Admiralty Knot") },
};

export const UNITS_ALIASES = {
  shweight: "cwt",
  lcwt: "uk_cwt",
  hweight: "uk_cwt",
  LTON: "uk_ton",
  brton: "uk_ton",
  pc: "parsec",
  Pica: "Picapt",
  d: "day",
  mn: "min",
  s: "sec",
  p: "Pa",
  at: "atm",
  dy: "dyn",
  ev: "eV",
  hh: "HPh",
  wh: "Wh",
  btu: "BTU",
  h: "HP",
  cel: "C",
  fah: "F",
  kel: "K",
  us_pt: "pt",
  L: "l",
  lt: "l",
  ang3: "ang^3",
  ft3: "ft^3",
  in3: "in^3",
  ly3: "ly^3",
  m3: "m^3",
  mi3: "mi^3",
  yd3: "yd^3",
  Nmi3: "Nmi^3",
  Picapt3: "Picapt^3",
  "Pica^3": "Picapt^3",
  Pica3: "Picapt^3",
  regton: "GRT",
  ang2: "ang^2",
  ft2: "ft^2",
  in2: "in^2",
  ly2: "ly^2",
  m2: "m^2",
  mi2: "mi^2",
  Nmi2: "Nmi^2",
  Picapt2: "Picapt^2",
  "Pica^2": "Picapt^2",
  Pica2: "Picapt^2",
  yd2: "yd^2",
  "m/h": "m/hr",
  "m/sec": "m/s",
};

export const UNIT_PREFIXES = {
  "": 1,
  Y: 1e24,
  Z: 1e21,
  E: 1e18,
  P: 1e15,
  T: 1e12,
  G: 1e9,
  M: 1e6,
  k: 1e3,
  h: 1e2,
  da: 1e1,
  e: 1e1,
  d: 1e-1,
  c: 1e-2,
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12,
  f: 1e-15,
  a: 1e-18,
  z: 1e-21,
  y: 1e-21,
  Yi: Math.pow(2, 80),
  Zi: Math.pow(2, 70),
  Ei: Math.pow(2, 60),
  Pi: Math.pow(2, 50),
  Ti: Math.pow(2, 40),
  Gi: Math.pow(2, 30),
  Mi: Math.pow(2, 20),
  ki: Math.pow(2, 10),
};

const TRANSLATED_CATEGORIES = {
  weight: _t("Weight"),
  distance: _t("Distance"),
  time: _t("Time"),
  pressure: _t("Pressure"),
  force: _t("Force"),
  energy: _t("Energy"),
  power: _t("Power"),
  magnetism: _t("Magnetism"),
  temperature: _t("Temperature"),
  volume: _t("Volume"),
  area: _t("Area"),
  information: _t("Information"),
  speed: _t("Speed"),
};

export const UNIT_OPTIONS = Object.entries(UNITS).map(([key, value]) => ({
  value: key,
  label: `${getTranslatedCategory(value.category)} - ${value.label}`,
}));

export function getTranslatedCategory(key: string): string {
  return TRANSLATED_CATEGORIES[key] ?? "";
}

export function getTransformation(key: string): Unit | undefined {
  for (const [prefix, value] of Object.entries(UNIT_PREFIXES)) {
    if (prefix && !key.startsWith(prefix)) continue;
    const _key = key.slice(prefix.length);
    let conversion = UNITS[_key];
    if (!conversion && UNITS_ALIASES[_key]) {
      conversion = UNITS[UNITS_ALIASES[_key]];
    }
    if (conversion) {
      return {
        ...conversion,
        factor: conversion.order ? Math.pow(value, conversion.order) : value,
      };
    }
  }
  return;
}
