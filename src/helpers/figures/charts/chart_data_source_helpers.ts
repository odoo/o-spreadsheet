import { CellValueType } from "../../../types/cells";
import { ChartRangeDataSource } from "../../../types/chart/chart";
import { Getters } from "../../../types/getters";
import { Zone } from "../../../types/misc";
import { zoneToXc } from "../../zones";

export function getUnboundRange(getters: Getters, zone: Zone): string {
  return zoneToXc(getters.getUnboundedZone(getters.getActiveSheetId(), zone));
}

export function isDatasetTitled(getters: Getters, zone: Zone): boolean {
  const sheetId = getters.getActiveSheetId();
  const cell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });
  return ![CellValueType.number, CellValueType.empty].includes(cell.type);
}

export function dataset(zone: Zone, getters: Getters, id = "0") {
  return { dataRange: getUnboundRange(getters, zone), dataSetId: id };
}

export function rangeSource(
  dataSets: ReturnType<typeof dataset>[],
  dataSetsHaveTitle: boolean,
  labelRange?: string
): ChartRangeDataSource<string> {
  return { type: "range", dataSets, dataSetsHaveTitle, labelRange };
}
