import { _t, CellPosition, UID } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { Cell } from "@odoo/o-spreadsheet-engine/types/cells";
import {
  PivotFilter,
  SpreadsheetPivotCoreDefinition,
} from "@odoo/o-spreadsheet-engine/types/pivot";
import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { PivotFilterMenu } from "../../../filters/pivot_filter_menu/pivot_filter_menu";
import { Popover } from "../../../popover";
import { PivotDimension } from "../pivot_layout_configurator/pivot_dimension/pivot_dimension";

interface Props {
  definition: SpreadsheetPivotRuntimeDefinition;
  filter: PivotFilter;
  onFiltersUpdated: (definition: Partial<SpreadsheetPivotCoreDefinition>) => void;
}

export class PivotFilterEditor extends Component<Props> {
  static template = "o-spreadsheet-PivotFilterEditor";
  static components = {
    PivotDimension,
    Popover,
    PivotFilterMenu,
  };
  static props = {
    definition: Object,
    filter: Object,
    onFiltersUpdated: Function,
  };

  private buttonFilter = useRef("buttonFilter");
  private popover = useState({ isOpen: false });

  filterCaption() {
    const numberOfHiddenValues = this.props.filter.hiddenValues.length;
    const totalValues = this.props.filter.numberOfValues;
    const numberOfShownValues = totalValues - numberOfHiddenValues;
    if (numberOfHiddenValues === 0) {
      return _t("showing all items");
    } else if (numberOfShownValues === 1) {
      return _t("showing 1 item");
    } else {
      return _t("showing %s items", numberOfShownValues);
    }
  }

  setup() {
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonFilter.el) {
        this.popover.isOpen = false;
      }
    });
  }

  get popoverProps() {
    const { x, y, width, height } = this.buttonFilter.el!.getBoundingClientRect();
    return {
      anchorRect: { x, y, width, height },
      positioning: "bottom-left",
    };
  }

  getCell(position: CellPosition): Cell | undefined {
    return this.env.model.getters.getCell(position);
  }

  filterPosition(filter: PivotFilter): CellPosition {
    if (!this.props.definition.range) {
      throw new Error("No range defined for the pivot");
    }
    const zone = this.props.definition.range?.zone;
    const sheetId = this.props.definition.range?.sheetId as UID;
    for (let col = zone.left; col <= zone.right; col++) {
      const position = { sheetId, row: zone.top, col };
      const cell = this.getCell(position);
      if (cell) {
        const content = cell.content;
        if (content === filter.displayName) {
          return { sheetId, col, row: zone.top };
        }
      }
    }
    throw new Error("No position found for the filter " + filter.displayName);
  }

  removeFilter(filter: PivotFilter) {
    const { filters } = this.props.definition;
    this.props.onFiltersUpdated({
      filters: filters.filter((f) => f.fieldName !== filter.fieldName),
    });
  }

  openMenuFilter() {
    this.popover.isOpen = !this.popover.isOpen;
  }

  closeMenuFilter() {
    this.popover.isOpen = false;
  }

  updateFilterData(hiddenValues: string[]) {
    const { filters } = this.props.definition;
    const filter = this.props.filter;
    const updatedFilters = filters.map((f) => {
      if (f.fieldName === filter.fieldName) {
        return {
          ...f,
          hiddenValues,
        };
      }
      return f;
    });
    this.props.onFiltersUpdated({
      filters: updatedFilters,
    });
  }
}
