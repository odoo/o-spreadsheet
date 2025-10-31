import { getTableTopLeft } from "@odoo/o-spreadsheet-engine/helpers/table_helpers";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { CarouselPanel } from "../components/side_panel/carousel_panel/carousel_panel";
import { ChartPanel } from "../components/side_panel/chart/main_chart_panel/main_chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting/conditional_formatting";
import { DataValidationPanel } from "../components/side_panel/data_validation/data_validation_panel";
import { DataValidationEditor } from "../components/side_panel/data_validation/dv_editor/dv_editor";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace/find_and_replace";
import { MoreFormatsPanel } from "../components/side_panel/more_formats/more_formats";
import { PivotMeasureDisplayPanel } from "../components/side_panel/pivot/pivot_measure_display_panel/pivot_measure_display_panel";
import { PivotSidePanel } from "../components/side_panel/pivot/pivot_side_panel/pivot_side_panel";
import { RemoveDuplicatesPanel } from "../components/side_panel/remove_duplicates/remove_duplicates";
import { SettingsPanel } from "../components/side_panel/settings/settings_panel";
import { SidePanelState } from "../components/side_panel/side_panel/side_panel_store";
import { SplitIntoColumnsPanel } from "../components/side_panel/split_to_columns_panel/split_to_columns_panel";
import { TablePanel } from "../components/side_panel/table_panel/table_panel";
import {
  TableStyleEditorPanel,
  TableStyleEditorPanelProps,
} from "../components/side_panel/table_style_editor_panel/table_style_editor_panel";
import { Getters, UID } from "../types";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------

export interface SidePanelContent {
  title: string | ((env: SpreadsheetChildEnv, props: object) => string);
  Body: any;
  Footer?: any;
  /**
   * A callback used to validate the props or generate new props
   * based on the current state of the spreadsheet model, using the getters.
   */
  computeState?: (getters: Getters, initialProps: object) => SidePanelState;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: _t("Conditional formatting"),
  Body: ConditionalFormattingPanel,
});

sidePanelRegistry.add("ChartPanel", {
  title: _t("Chart"),
  Body: ChartPanel,
  computeState: (getters: Getters, initialProps: { chartId: UID }) => {
    const figureId = getters.getSelectedFigureId();
    const chartId = figureId ? getters.getChartIdFromFigureId(figureId) : initialProps.chartId;
    if (!chartId || !getters.isChartDefined(chartId)) {
      return { isOpen: false };
    }
    return { isOpen: true, props: { chartId } };
  },
});

sidePanelRegistry.add("FindAndReplace", {
  title: _t("Find and Replace"),
  Body: FindAndReplacePanel,
});

sidePanelRegistry.add("SplitToColumns", {
  title: _t("Split text into columns"),
  Body: SplitIntoColumnsPanel,
});

sidePanelRegistry.add("Settings", {
  title: _t("Spreadsheet settings"),
  Body: SettingsPanel,
});

sidePanelRegistry.add("RemoveDuplicates", {
  title: _t("Remove duplicates"),
  Body: RemoveDuplicatesPanel,
});

sidePanelRegistry.add("DataValidation", {
  title: _t("Data validation"),
  Body: DataValidationPanel,
});

sidePanelRegistry.add("DataValidationEditor", {
  title: _t("Data validation"),
  Body: DataValidationEditor,
});

sidePanelRegistry.add("MoreFormats", {
  title: _t("More formats"),
  Body: MoreFormatsPanel,
});

sidePanelRegistry.add("TableSidePanel", {
  title: _t("Edit table"),
  Body: TablePanel,
  computeState: (getters: Getters) => {
    const table = getters.getFirstTableInSelection();
    if (!table) {
      return { isOpen: false };
    }

    const coreTable = getters.getCoreTable(getTableTopLeft(table));
    return { isOpen: true, props: { table: coreTable }, key: table.id };
  },
});

sidePanelRegistry.add("TableStyleEditorPanel", {
  title: _t("Create custom table style"),
  Body: TableStyleEditorPanel,
  computeState: (getters: Getters, initialProps: TableStyleEditorPanelProps) => {
    return {
      isOpen: true,
      props: { ...initialProps },
      key: initialProps.styleId ?? "new",
    };
  },
});

sidePanelRegistry.add("PivotSidePanel", {
  title: (env: SpreadsheetChildEnv, props: { pivotId: UID }) => {
    return _t("Pivot #%s", env.model.getters.getPivotFormulaId(props.pivotId));
  },
  Body: PivotSidePanel,
  computeState: (getters: Getters, props: { pivotId: UID }) => {
    return {
      isOpen: getters.isExistingPivot(props.pivotId),
      props,
      key: `pivot_key_${props.pivotId}`,
    };
  },
});

sidePanelRegistry.add("PivotMeasureDisplayPanel", {
  title: (env: SpreadsheetChildEnv, props: PivotMeasureDisplayPanel["props"]) => {
    const measure = env.model.getters.getPivot(props.pivotId).getMeasure(props.measure.id);
    return _t('Measure "%s" options', measure.displayName);
  },
  Body: PivotMeasureDisplayPanel,
  computeState: (getters: Getters, props: PivotMeasureDisplayPanel["props"]) => {
    try {
      // This will throw if the pivot or measure does not exist
      getters.getPivot(props.pivotId).getMeasure(props.measure.id);
      return {
        isOpen: true,
        props,
        key: `pivot_measure_display_${props.pivotId}_${props.measure.id}`,
      };
    } catch (e) {
      return { isOpen: false };
    }
  },
});

sidePanelRegistry.add("CarouselPanel", {
  title: _t("Carousel"),
  Body: CarouselPanel,
  computeState: (getters: Getters, initialProps: { figureId: UID }) => {
    const figureId = initialProps.figureId || getters.getSelectedFigureId();
    if (!figureId || !getters.doesCarouselExist(figureId)) {
      return { isOpen: false };
    }

    return { isOpen: true, props: { figureId } };
  },
});
