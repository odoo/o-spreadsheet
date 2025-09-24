export interface Currency {
  name: string;
  code: string;
  symbol: string;
  decimalPlaces: number;
  position: "before" | "after";
}
