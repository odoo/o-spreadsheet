import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { Component } from "@odoo/owl";
import { ChartJsComponent } from "../components/figures/chart/chartJs/chartjs";
import { ZoomableChartJsComponent } from "../components/figures/chart/chartJs/zoomable_chart/zoomable_chartjs";
import { GaugeChartComponent } from "../components/figures/chart/gauge/gauge_chart_component";
import { ScorecardChart as ScorecardChartComponent } from "../components/figures/chart/scorecard/chart_scorecard";

export const chartComponentRegistry = new Registry<new (...args: any) => Component>();

chartComponentRegistry.add("line", ZoomableChartJsComponent);
chartComponentRegistry.add("bar", ZoomableChartJsComponent);
chartComponentRegistry.add("combo", ZoomableChartJsComponent);
chartComponentRegistry.add("pie", ChartJsComponent);
chartComponentRegistry.add("gauge", GaugeChartComponent);
chartComponentRegistry.add("scatter", ZoomableChartJsComponent);
chartComponentRegistry.add("bubble", ChartJsComponent);
chartComponentRegistry.add("scorecard", ScorecardChartComponent);
chartComponentRegistry.add("waterfall", ZoomableChartJsComponent);
chartComponentRegistry.add("pyramid", ChartJsComponent);
chartComponentRegistry.add("radar", ChartJsComponent);
chartComponentRegistry.add("geo", ChartJsComponent);
chartComponentRegistry.add("funnel", ChartJsComponent);
chartComponentRegistry.add("sunburst", ChartJsComponent);
chartComponentRegistry.add("treemap", ChartJsComponent);
chartComponentRegistry.add("calendar", ChartJsComponent);
