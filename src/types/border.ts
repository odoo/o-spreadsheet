import { Color, UnboundedZone } from "..";

export const borderStyles = ["thin", "medium", "thick", "dashed", "dotted"] as const;
export type BorderStyle = (typeof borderStyles)[number];

export type BorderPositions = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  vertical?: boolean;
  horizontal?: boolean;
};

/**
 * A complete border(s) data is a set of position-color-style information
 */
export type OldBorderData = BorderDescr & {
  position: BorderPositionDescr;
};

export interface OldBorder {
  top?: BorderDescr;
  left?: BorderDescr;
  bottom?: BorderDescr;
  right?: BorderDescr;
}

export type BorderDescr = { style: BorderStyle; color: Color };

export type BorderData = BorderDescr & {
  position: BorderPositions;
};

export type Border = {
  zone: UnboundedZone;
  border: BorderData;
};

export type BorderPositionDescr =
  | "all"
  | "hv"
  | "h"
  | "v"
  | "external"
  | "left"
  | "top"
  | "right"
  | "bottom"
  | "clear";
