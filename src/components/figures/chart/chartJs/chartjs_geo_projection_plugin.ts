import { ChartDataset, ChartType, Plugin } from "chart.js";

export interface PluginOptions {
  // Pass callback rather than features themselves, so they are neither deepCopied by the component nor proxified by chartJS
  getGeoFeatures: () => GeoJSON.Feature[];
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartGeoPlugin?: PluginOptions;
  }
}

declare module "chartjs-chart-geo" {
  interface IChoroplethControllerDatasetOptions {
    labelsAndValues?: Record<string, { label: string; value: number }>;
  }
}

/**
 * ChartJS plugin for geo charts. It is useful to avoid deepCopy issues with geo charts for 1) the dataset and 2) the projection
 *
 * 1) The geo chart dataset expects the GeoJSON features to be present in the dataset.data array. But those can be quite big (>1MB),
 * and we call deepCopy on the runtime, which isn't ideal. We then pass a labelsAndValues object to the runtime, and we use this
 * plugin to transform it into a proper dataset in the internal chart representation.
 *
 * 2) We pass the projection as a string instead of a customized d3 object so
 * Chart.js creates a fresh projection instance. Custom changes (e.g. rotation)
 * are then applied in `beforeUpdate`.
 *
 * This is important because Chart.js mutates the projection instance at runtime,
 * and a customize d3 projection object would not be copied during deepCopy.
 */
export const geoProjectionPlugin: Plugin = {
  id: "chartGeoPlugin",
  beforeUpdate(chart: any, args, options: PluginOptions) {
    if (chart.config.type !== "choropleth") {
      return;
    }
    if (chart.options?.scales?.projection?.projection === "conicConformal") {
      chart.scales?.projection?.projection?.rotate([100, 0]); // Centered on the US
    }

    const dataset = chart.data.datasets?.[0] as ChartDataset<"choropleth">;
    if (!dataset || !dataset.data || dataset.data?.length) {
      return;
    }
    const labelsAndValues = dataset.labelsAndValues || {};
    const features = options.getGeoFeatures();
    for (const feature of features) {
      const featureId = feature.id ?? "";
      dataset.data.push({
        feature: {
          ...feature,
          properties: { name: feature.id ? labelsAndValues[featureId]?.label : undefined },
        },
        // @ts-ignore: typing doesn't accept undefined values, but they have the desired behaviour (uncolored country with hover effect).
        value: labelsAndValues[featureId]?.value,
      });
    }

    dataset.outline = features;
  },
};
