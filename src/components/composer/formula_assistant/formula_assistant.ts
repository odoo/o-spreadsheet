import { Component, useState } from "@odoo/owl";
import { BUTTON_ACTIVE_TEXT_COLOR, COMPOSER_ASSISTANT_COLOR, GRAY_400 } from "../../../constants";
import { FunctionDescription, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { Collapse } from "../../side_panel/components/collapse/collapse";

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
    .collapsor {
      cursor: pointer;
      &:hover {
        background-color: ${GRAY_400};
        color: ${BUTTON_ACTIVE_TEXT_COLOR};
      }

      .collapsor-arrow {
        transform-origin: 6px 8px;
        transform: rotate(-180deg);
        transition: transform 0.2s ease-in-out;

        .o-icon {
          width: 12px;
          height: 16px;
        }
      }
      &.collapsed .collapsor-arrow {
        transform: rotate(0deg);
      }
    }
  }
`;

interface Props {
  functionDescription: FunctionDescription;
  argsToFocus: number[];
}

export class FunctionDescriptionProvider extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunctionDescriptionProvider";
  static props = {
    functionDescription: Object,
    argsToFocus: Array,
  };
  static components = { Collapse };

  private state: { isCollapsed: boolean } = useState({
    isCollapsed: true,
  });

  toggle() {
    this.state.isCollapsed = !this.state.isCollapsed;
  }

  getContext(): Props {
    return this.props;
  }

  get formulaArgSeparator() {
    return this.env.model.getters.getLocale().formulaArgSeparator + " ";
  }
}
