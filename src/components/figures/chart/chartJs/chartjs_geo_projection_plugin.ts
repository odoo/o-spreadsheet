import { Plugin } from "chart.js";

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
    if (chart.options?.scales?.projection?.projection === "conicConformal") {
      chart.scales?.projection?.projection?.rotate([100, 0]); // Centered on the US
    }
  },
};
