import { WorkbookData } from "../types";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 5;

export function migrate(data: any): WorkbookData {
  const index = MIGRATIONS.findIndex((m) => m.from === data.version);
  for (let i = index; i < MIGRATIONS.length; i++) {
    data = MIGRATIONS[i].applyMigration(data);
  }
  return data;
}

// -----------------------------------------------------------------------------
// Migrations
// -----------------------------------------------------------------------------

interface Migration {
  from: number;
  to: number;
  applyMigration(data: any): any;
}

const MIGRATIONS: Migration[] = [
  {
    // add the `activeSheet` field on data
    from: 1,
    to: 2,
    applyMigration(data: any): any {
      if (data.sheets && data.sheets[0]) {
        data.activeSheet = data.sheets[0].name;
      }
      return data;
    },
  },
  {
    // add an id field in each sheet
    from: 2,
    to: 3,
    applyMigration(data: any): any {
      if (data.sheets && data.sheets.length) {
        for (let sheet of data.sheets) {
          sheet.id = sheet.id || sheet.name;
        }
      }
      return data;
    },
  },
  {
    // activeSheet is now an id, not the name of a sheet
    from: 3,
    to: 4,
    applyMigration(data: any): any {
      const activeSheet = data.sheets.find((s) => s.name === data.activeSheet);
      data.activeSheet = activeSheet.id;
      return data;
    },
  },
  {
    // add figures object in each sheets
    from: 4,
    to: 5,
    applyMigration(data: any): any {
      for (let sheet of data.sheets) {
        sheet.figures = sheet.figures || [];
      }
      return data;
    },
  },
];
