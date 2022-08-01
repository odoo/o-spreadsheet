import { Component, onWillUnmount, useState } from "@odoo/owl";
import { FunctionDescription } from "../../../types";

// -----------------------------------------------------------------------------
// Formula Assistant component
// -----------------------------------------------------------------------------

interface Props {
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
  borderStyle: string;
}

interface AssistantState {
  allowCellSelectionBehind: boolean;
}

export class FunctionDescriptionProvider extends Component<Props> {
  static template = "o-spreadsheet-FunctionDescriptionProvider";
  assistantState: AssistantState = useState({
    allowCellSelectionBehind: false,
  });

  private timeOutId = 0;

  setup() {
    onWillUnmount(() => {
      if (this.timeOutId) {
        clearTimeout(this.timeOutId);
      }
    });
  }

  getContext(): Props {
    return this.props;
  }

  onMouseMove() {
    this.assistantState.allowCellSelectionBehind = true;
    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
    }
    this.timeOutId = setTimeout(() => {
      this.assistantState.allowCellSelectionBehind = false;
    }, 2000) as unknown as number;
  }
}
