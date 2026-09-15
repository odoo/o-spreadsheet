import { Plugin } from "chart.js";

/**
 * d3 adaptively resamples every projected segment (default precision is
 * sqrt(0.5)), which dominates the cost of drawing a map. Our GeoJSON is already
 * simplified and rendered small, so a coarser value is visually indistinguishable
 * but noticeably cheaper.
 */
const PROJECTION_PRECISION = 1;

/**
 * ChartJS plugin to apply custom changes to a d3 projection.
 *
 * We pass the projection as a string instead of a customized d3 object so
 * Chart.js creates a fresh projection instance. Custom changes (e.g. rotation)
 * are then applied in `beforeUpdate`.
 *
 * This is important because Chart.js mutates the projection instance at runtime,
 * and a customize d3 projection object would not be copied during deepCopy.
 */
export const geoProjectionPlugin: Plugin = {
  id: "geoProjection",
  beforeUpdate(chart: any) {
    const projection = chart.scales?.projection?.projection;
    if (!projection) {
      return;
    }
    if (chart.options?.scales?.projection?.projection === "conicConformal") {
      projection.rotate?.([100, 0]); // Centered on the US
    }
    if (typeof projection.precision === "function") {
      projection.precision(PROJECTION_PRECISION);
    }
  },
};
