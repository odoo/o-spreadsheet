import { Component, onWillUnmount, useState } from "@odoo/owl";
import { FunctionDescription, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

// -----------------------------------------------------------------------------
// Formula Assistant component
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-formula-assistant {
    .o-formula-assistant-head {
      background-color: #f2f2f2;
      padding: 10px;
    }
    .o-formula-assistant-core {
      border-bottom: 1px solid gray;
    }
    .o-formula-assistant-arg-description {
      font-size: 85%;
    }
    .o-formula-assistant-focus {
      div:first-child,
      span {
        color: purple;
        text-shadow: 0px 0px 1px purple;
      }
      div:last-child {
        color: black;
      }
    }
    .o-formula-assistant-gray {
      color: gray;
    }
  }
`;

interface Props {
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
}

interface AssistantState {
  allowCellSelectionBehind: boolean;
}

export class FunctionDescriptionProvider extends Component<Props, SpreadsheetChildEnv> {
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

  get formulaArgSeparator() {
    return this.env.model.getters.getLocale().formulaArgSeparator + " ";
  }
}

FunctionDescriptionProvider.props = {
  functionName: String,
  functionDescription: Object,
  argToFocus: Number,
};
