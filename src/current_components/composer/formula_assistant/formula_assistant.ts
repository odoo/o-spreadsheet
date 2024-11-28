import { Component } from "@odoo/owl";
import { COMPOSER_ASSISTANT_COLOR } from "../../../constants";
import { FunctionDescription, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

// -----------------------------------------------------------------------------
// Formula Assistant component
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-formula-assistant {
    background: #ffffff;
    .o-formula-assistant-head {
      background-color: #f2f2f2;
      padding: 10px;
    }
    .collapsed {
      transform: rotate(180deg);
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
        color: ${COMPOSER_ASSISTANT_COLOR};
        text-shadow: 0px 0px 1px ${COMPOSER_ASSISTANT_COLOR};
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

export class FunctionDescriptionProvider extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunctionDescriptionProvider";
  static props = {
    functionName: String,
    functionDescription: Object,
    argToFocus: Number,
  };

  getContext(): Props {
    return this.props;
  }

  get formulaArgSeparator() {
    return this.env.model.getters.getLocale().formulaArgSeparator + " ";
  }
}
