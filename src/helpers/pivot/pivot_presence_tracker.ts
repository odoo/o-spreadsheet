import { toString } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { CellValue } from "../..";
import { PivotDomain } from "../../types";

export class PivotPresenceTracker {
  private trackedValues: Set<String> = new Set();

  private domainToArray(domain: PivotDomain): (string | CellValue)[] {
    return domain.flatMap((node) => [node.field, toString(node.value)]);
  }

  isValuePresent(measure: string, domain: PivotDomain) {
    const key = JSON.stringify({ measure, domain: this.domainToArray(domain) });
    return this.trackedValues.has(key);
  }

  isHeaderPresent(domain: PivotDomain) {
    const key = JSON.stringify({ domain: this.domainToArray(domain) });
    return this.trackedValues.has(key);
  }

  trackValue(measure: string, domain: PivotDomain) {
    const key = JSON.stringify({ measure, domain: this.domainToArray(domain) });
    this.trackedValues.add(key);
  }

  trackHeader(domain: PivotDomain) {
    const key = JSON.stringify({ domain: this.domainToArray(domain) });
    this.trackedValues.add(key);
  }
}
