import { PivotDataLayer, PivotDomain } from "../../types";

export class PivotPostProcessLayer {
  constructor(private readonly dataLayer: PivotDataLayer) {}

  getPivotCellValueAndFormat(measure: string, domain: PivotDomain) {
    // here goes calculated fields stuff and show as value stuff
    return this.dataLayer.getPivotCellValueAndFormat(measure, domain);
  }
}
