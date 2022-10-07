const { Spreadsheet, Model, registries, UuidGenerator, helpers } = o_spreadsheet;

registries.topbarMenuRegistry.addChild("Make Flashy !", ["format"], {
  name: "Make Flashy !",
  sequence: 1,
  action: (env) => {
    const selection = env.model.getters.getSelection();
    const activeSheetId = env.model.getters.getActiveSheetId();

    env.model.dispatch("UPDATE_CELL", {
      sheetId: activeSheetId,
      col: selection.anchor.cell.col,
      row: selection.anchor.cell.row,
      content: "FLASHYYY !",
    });
    env.model.dispatch("SET_FORMATTING", {
      sheetId: activeSheetId,
      target: [selection.anchor.zone],
      style: { fillColor: "#bb00ff", fontSize: 24 },
    });
    env.model.dispatch("ADD_MERGE", {
      sheetId: activeSheetId,
      target: [
        {
          ...selection.anchor.zone,
          right: selection.anchor.zone.right + 1,
        },
      ],
    });
  },
});

registries.rowMenuRegistry.add("Make Boring", {
  name: "Make Boring",
  sequence: 99,
  separator: true,
  action: (env) => {
    const selection = env.model.getters.getSelection();
    const activeSheetId = env.model.getters.getActiveSheetId();
    env.model.dispatch("SET_FORMATTING", {
      sheetId: activeSheetId,
      target: [selection.anchor.zone],
      style: { fillColor: "", fontSize: 10 },
    });
  },
});

const randomGenerator = new helpers.UuidGenerator();
registries.functionRegistry.add("randomString", {
  args: [],
  category: "string",
  description: "generates a small random string",
  compute: (args) => {
    return randomGenerator.uuidv4().substr(0, 8);
  },
  returns: "STRING",
  isExported: "false",
});
