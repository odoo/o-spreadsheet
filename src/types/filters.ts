import { Zone } from ".";

export type FilterValue = string[] | "ANY";

type ColIndex = number;
type RowIndex = number;

export type FilterZone = {
  zone: Zone;
  filters: Record<ColIndex, RowIndex[] | undefined>;
};
