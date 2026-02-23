import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  CELL_BORDER_COLOR,
  FROZEN_PANE_BORDER_COLOR,
  FROZEN_PANE_HEADER_BORDER_COLOR,
  GRAY_200_DARK,
  GRAY_700,
  HEADER_BORDER_COLOR,
  TEXT_HEADER_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import { getSpreadsheetTheme } from "../../src/helpers/rendering";

describe("Grid dark mode tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Not sure these tests are really interesting ...
  test("Grid theme in light mode (default)", () => {
    const theme = getSpreadsheetTheme(false);

    expect(theme.backgroundColor).toBe("#ffffff");
    expect(theme.textColor).toBe("#000000");
    expect(theme.gridBorderColor).toBe(CELL_BORDER_COLOR);
    expect(theme.headerBackgroundColor).toBe(BACKGROUND_HEADER_COLOR);
    expect(theme.headerActiveBackgroundColor).toBe(BACKGROUND_HEADER_ACTIVE_COLOR);
    expect(theme.headerSelectedBackgroundColor).toBe(BACKGROUND_HEADER_SELECTED_COLOR);
    expect(theme.headerTextColor).toBe(TEXT_HEADER_COLOR);
    expect(theme.headerBorderColor).toBe(HEADER_BORDER_COLOR);
    expect(theme.frozenPaneBorderColor).toBe(FROZEN_PANE_BORDER_COLOR);
    expect(theme.frozenPaneHeaderBorderColor).toBe(FROZEN_PANE_HEADER_BORDER_COLOR);
  });

  test("Grid theme in dark mode", () => {
    const theme = getSpreadsheetTheme(true);

    expect(theme.backgroundColor).toBe(GRAY_200_DARK);
    expect(theme.textColor).toBe("#d1d5db");
    expect(theme.gridBorderColor).toBe(GRAY_700);
    expect(theme.headerBackgroundColor).toBe(GRAY_200_DARK);
    expect(theme.headerActiveBackgroundColor).toBe("#4b5563");
    expect(theme.headerSelectedBackgroundColor).toBe("#374151");
    expect(theme.headerTextColor).toBe("#d1d5db");
    expect(theme.headerBorderColor).toBe("#4b5563");
    expect(theme.frozenPaneBorderColor).toBe("#4b5563");
    expect(theme.frozenPaneHeaderBorderColor).toBe("#4b5563");
  });
});
