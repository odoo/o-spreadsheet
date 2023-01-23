import { Component, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types";
import { Menu } from "../menu/menu";

interface Props {}

export class MenuContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MenuContainer";
  static components = { Menu };

  state = useState(this.env.menuService);

  get hasMenu() {
    return this.state.hasOpenMenu();
  }

  get menuProps() {
    return this.state.getCurrentMenuProps();
  }
}
