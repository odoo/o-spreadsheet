import { Registry } from "../registry";

//------------------------------------------------------------------------------
// Currency Registry
//------------------------------------------------------------------------------

export interface Currency {
  name: string;
  code: string;
  symbol: string;
  decimalPlaces: number;
  position: "before" | "after";
}

export const currenciesRegistry = new Registry<Currency>();
