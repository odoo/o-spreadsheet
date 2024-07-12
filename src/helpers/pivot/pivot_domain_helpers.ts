import { Pivot, PivotDomain } from "../../types";

/**
 * Split a pivot domain into the part related to the rows of the pivot, and the part related to the columns.
 */
export function domainToColRowDomain(pivot: Pivot, domain: PivotDomain) {
  const rowFields = pivot.definition.rows.map((c) => c.nameWithGranularity);
  const rowDomain = domain.filter((node) => rowFields.includes(node.field));
  const columnFields = pivot.definition.columns.map((c) => c.nameWithGranularity);
  const colDomain = domain.filter((node) => columnFields.includes(node.field));
  return { colDomain, rowDomain };
}
