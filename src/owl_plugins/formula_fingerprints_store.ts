import { signal } from "@odoo/owl";
import { isCoreCommand } from "../command_registry";
import { PositionMap } from "../helpers/cells/position_map";
import { AlternatingColorGenerator, setColorAlpha } from "../helpers/color";
import { DATA_FINGERPRINT, Fingerprint } from "../plugins/evaluation/fingerprint";
import { Command } from "../types/commands";
import { CellPosition, Color } from "../types/misc";
import { OwlPluginWithModel } from "./owl_plugin_with_model";

export class FormulaFingerprintPlugin extends OwlPluginWithModel {
  mutators = ["enable", "disable"] as const;
  private isInvalidated = false;
  private fingerprintColors = {
    [DATA_FINGERPRINT]: "#D9D9D9",
  };
  isEnabled = signal(false);
  colors = signal(new PositionMap<Color>());

  handle(cmd: Command) {
    if (isCoreCommand(cmd) && this.isEnabled()) {
      this.isInvalidated = true;
    }
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "ACTIVATE_SHEET":
        if (this.isEnabled()) {
          this.isInvalidated = true;
        }
        break;
    }
  }

  finalize() {
    if (this.isInvalidated) {
      this.isInvalidated = false;
      this.computeFingerprints();
    }
  }

  enable() {
    this.isEnabled.set(true);
    this.computeFingerprints();
  }

  disable() {
    this.isEnabled.set(false);
    this.colors.set(new PositionMap<Color>());
  }

  private computeFingerprints() {
    this.colors.set(new PositionMap<Color>());
    const fingerprints = new PositionMap<Fingerprint>();
    const allFingerprints = new Set<Fingerprint>();
    const activeSheetId = this.model().getters.getActiveSheetId();
    const cells = this.model().getters.getCells(activeSheetId);
    for (const cellId in cells) {
      const cell = cells[cellId];
      const fingerprint = this.model().getters.getCellFingerprint(cell);
      if (!fingerprint) {
        continue;
      }
      allFingerprints.add(fingerprint);
      const position = this.model().getters.getCellPosition(cell.id);
      fingerprints.set(position, fingerprint);
    }
    this.assignColors(allFingerprints);
    for (const [position, fingerprint] of fingerprints.entries()) {
      const color = this.fingerprintColors[fingerprint];
      this.colors().set(position, color);
      this.colorSpreadZone(position, color);
    }
  }

  private colorSpreadZone(position: CellPosition, fingerprintColor: Color) {
    const spreadZone = this.model().getters.getSpreadZone(position);
    if (!spreadZone) {
      return;
    }
    const sheetId = position.sheetId;
    for (let row = spreadZone.top; row <= spreadZone.bottom; row++) {
      for (let col = spreadZone.left; col <= spreadZone.right; col++) {
        const spreadPosition = { sheetId, col, row };
        this.colors().set(spreadPosition, fingerprintColor);
      }
    }
  }

  private assignColors(fingerprints: Set<Fingerprint>) {
    const colors = new AlternatingColorGenerator(fingerprints.size);
    Object.keys(this.fingerprintColors).forEach(() => colors.next());
    for (const fingerprint of fingerprints) {
      if (!this.fingerprintColors[fingerprint]) {
        this.fingerprintColors[fingerprint] = setColorAlpha(colors.next(), 0.8);
      }
    }
  }
}
