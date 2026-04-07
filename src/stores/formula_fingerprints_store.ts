import { AlternatingColorGenerator, setColorAlpha } from "../helpers";
import { PositionMap } from "../helpers/cells/position_map";
import { DATA_FINGERPRINT, Fingerprint } from "../plugins/ui_core_views/fingerprint";
import { CellPosition, Color, Command, isCoreCommand } from "../types/index";
import { SpreadsheetStore } from "./spreadsheet_store";

export class FormulaFingerprintStore extends SpreadsheetStore {
  mutators = ["enable", "disable"] as const;
  private isInvalidated = false;
  private fingerprintColors: Record<Fingerprint, Color> = {
    [DATA_FINGERPRINT]: "#D9D9D9",
  };
  isEnabled: boolean = false;
  colors = new PositionMap<Color>();

  handle(cmd: Command) {
    if (isCoreCommand(cmd) && this.isEnabled) {
      this.isInvalidated = true;
    }
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "ACTIVATE_SHEET":
        if (this.isEnabled) {
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
    this.isEnabled = true;
    this.computeFingerprints();
  }

  disable() {
    this.isEnabled = false;
    this.colors = new PositionMap();
  }

  private computeFingerprints() {
    this.colors = new PositionMap();
    const fingerprints = new PositionMap<Fingerprint>();
    const allFingerprints = new Set<Fingerprint>();
    const activeSheetId = this.getters.getActiveSheetId();
    const cells = this.getters.getCells(activeSheetId);
    for (const cellId in cells) {
      const cell = cells[cellId];
      const fingerprint = this.getters.getCellFingerprint(cell);
      if (!fingerprint) {
        continue;
      }
      allFingerprints.add(fingerprint);
      const position = this.getters.getCellPosition(cell.id);
      fingerprints.set(position, fingerprint);
    }
    this.assignColors(allFingerprints);
    for (const [position, fingerprint] of fingerprints.entries()) {
      const color = this.fingerprintColors[fingerprint];
      this.colors.set(position, color);
      this.colorSpreadZone(position, color);
    }
  }

  private colorSpreadZone(position: CellPosition, fingerprintColor: Color) {
    const spreadZone = this.getters.getSpreadZone(position);
    if (!spreadZone) {
      return;
    }
    const sheetId = position.sheetId;
    for (let row = spreadZone.top; row <= spreadZone.bottom; row++) {
      for (let col = spreadZone.left; col <= spreadZone.right; col++) {
        const spreadPosition = { sheetId, col, row };
        this.colors.set(spreadPosition, fingerprintColor);
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
