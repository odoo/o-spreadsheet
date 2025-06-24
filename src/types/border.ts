import { BorderDescr, UnboundedZone } from "..";

export const borderStyles = ["thin", "medium", "thick", "dashed", "dotted"] as const;
export type BorderStyle = (typeof borderStyles)[number];

export type NewBorderData = {
  top?: BorderDescr;
  bottom?: BorderDescr;
  left?: BorderDescr;
  right?: BorderDescr;
  vertical?: BorderDescr;
  horizontal?: BorderDescr;
};

export type NewBorder = {
  zone: UnboundedZone;
  border: NewBorderData;
};
