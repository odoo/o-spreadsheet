import { Highlight, NamedRange } from "@odoo/o-spreadsheet-engine";
import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { interactiveUpdateNamedRange } from "../../../../helpers/ui/named_range_interactive";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";
import { SelectionInput } from "../../../selection_input/selection_input";
import { TextInput } from "../../../text_input/text_input";

interface Props {
  namedRange: NamedRange;
}

interface State {
  isSelectionInputFocused?: boolean;
  currentRange?: string;
}

export class NamedRangePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NamedRangePreview";
  static props = {
    namedRange: Object,
  };
  static components = { SelectionInput, TextInput };

  state = useState<State>({});

  private ref = useRef("namedRangePreview");

  setup() {
    useHighlightsOnHover(this.ref, this);
  }

  get highlights(): Highlight[] {
    if (this.state.isSelectionInputFocused) {
      return [];
    }
    return [{ range: this.props.namedRange.range, color: HIGHLIGHT_COLOR, noFill: true }];
  }

  deleteNamedRange() {
    this.env.model.dispatch("DELETE_NAMED_RANGE", {
      name: this.props.namedRange.name,
    });
  }

  updateNamedRangeName(newName: string) {
    newName = newName.replace(/ /g, "_");
    interactiveUpdateNamedRange(this.env, {
      oldRangeName: this.props.namedRange.name,
      newRangeName: newName,
      ranges: [this.env.model.getters.getRangeData(this.props.namedRange.range)],
    });
  }

  onSelectionInputChanged(ranges: string[]) {
    this.state.currentRange = ranges[0];
  }

  onSelectionInputConfirmed() {
    this.state.isSelectionInputFocused = false;
    if (this.state.currentRange) {
      const range = this.env.model.getters.getRangeFromSheetXC(
        this.env.model.getters.getActiveSheetId(),
        this.state.currentRange
      );
      if (range.invalidSheetName || range.invalidXc) {
        return;
      }

      interactiveUpdateNamedRange(this.env, {
        oldRangeName: this.props.namedRange.name,
        newRangeName: this.props.namedRange.name,
        ranges: [this.env.model.getters.getRangeData(range)],
      });
    }
  }

  onSelectionInputFocused() {
    this.state.isSelectionInputFocused = true;
  }

  get rangeString(): string {
    return this.env.model.getters.getRangeString(
      this.props.namedRange.range,
      this.env.model.getters.getActiveSheetId()
    );
  }
}
