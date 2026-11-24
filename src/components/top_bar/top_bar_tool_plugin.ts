import { Plugin, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";

/**
 * This plugin is used to manage the dropdown that is currently
 * opened after clicking an item on the toolbar.
 * It can only have one displayed at a time.
 *
 */
export class TopBarToolPlugin extends Plugin {
  private _currentDropdown = signal<Component | null>(null);

  closeDropdowns() {
    this._currentDropdown.set(null);
  }

  openDropdown(dropdownComponent: Component) {
    this._currentDropdown.set(dropdownComponent);
  }

  get currentDropdown() {
    return this._currentDropdown;
  }
}
