import { History } from "../src/history_manager";
import { UID } from "../src/types";

interface Command {
  position: number;
  value: string;
}

class MiniEditor {
  private commands: Record<UID, Command> = {};
  private state = "";

  get text(): string {
    return this.state;
  }

  private apply = (command: Command) => {
    const { position, value } = command;
    this.state = this.state.slice(0, position + 1) + value + this.state.slice(position + 1);
  };

  private revert = (command: Command) => {
    const { position, value } = command;
    this.state = this.state.slice(0, position + 1) + this.state.slice(position + value.length + 1);
  };

  private history = new History(this.apply, this.revert, {
    /**
     * Build a transformation function to transform any command as if the execution of
     * a previous `command` was omitted.
     */
    buildTransformationWithout: (command) => (commandToTransform) =>
      undoTransformation(commandToTransform as Command, command as Command),
    /**
     * Build a transformation function to transform any command as if a new `command` was
     * executed before.
     */
    buildTransformationWith: (command) => (commandToTransform) =>
      redoTransformation(commandToTransform as Command, command as Command),
  });

  execAfter(insertAfter: UID | null, instruction: [UID, string, number]) {
    const [commandId, text, position] = instruction;
    if (insertAfter !== null && !(insertAfter in this.commands)) {
      throw new Error(`Cannot inster after command ${commandId}: the command cannot be found`);
    }
    if (commandId in this.commands) {
      throw new Error(`Duplicate command id: ${commandId}`);
    }
    const command: Command = {
      value: text,
      position: position - 1,
    };
    this.history.insertExternalInstruction(commandId, command, insertAfter);
  }

  add(commandId: UID, text: string, position: number) {
    if (commandId in this.commands) {
      throw new Error(`Duplicate command id: ${commandId}`);
    }
    const command: Command = {
      value: text,
      position: position - 1,
    };
    this.commands[commandId] = command;
    this.history.addInstruction(commandId, command);
  }

  undo(commandId: UID) {
    this.history.undo(commandId);
  }

  redo(commandId: UID) {
    this.history.redo(commandId);
  }
}

function redoTransformation(toTransform: Command, cancelled: Command): Command {
  if (cancelled.position <= toTransform.position) {
    return {
      ...toTransform,
      position: toTransform.position + cancelled.value.length,
    };
  }
  return toTransform;
}

function undoTransformation(toTransform: Command, cancelled: Command): Command {
  if (cancelled.position <= toTransform.position) {
    return {
      ...toTransform,
      position: toTransform.position - cancelled.value.length,
    };
  }
  return toTransform;
}

describe("Undo/Redo manager", () => {
  describe("Undo", () => {
    test("undo a single step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      expect(editor.text).toBe("A");
      editor.undo("1");
      expect(editor.text).toBe("");
    });

    test("undo first step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      expect(editor.text).toBe("AB");
      editor.undo("1");
      expect(editor.text).toBe("B");
    });

    test("undo step in the middle", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "BBB", 1);
      editor.add("3", "C", 4);
      expect(editor.text).toBe("ABBBC");
      editor.undo("2");
      expect(editor.text).toBe("AC");
    });

    test("undo step with transformation", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "BB", 1);
      editor.add("3", "CCC", 3);
      editor.undo("2");
      expect(editor.text).toBe("ACCC");
    });

    test("undos last two steps in execution order", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      expect(editor.text).toBe("ABC");
      editor.undo("2");
      expect(editor.text).toBe("AC");
      editor.undo("3");
      expect(editor.text).toBe("A");
    });

    test("undo first two steps in execution order", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      expect(editor.text).toBe("ABC");
      editor.undo("1");
      expect(editor.text).toBe("BC");
      editor.undo("2");
      expect(editor.text).toBe("C");
    });

    test("undo first two steps in reverse execution order", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      expect(editor.text).toBe("ABC");
      editor.undo("2");
      expect(editor.text).toBe("AC");
      editor.undo("1");
      expect(editor.text).toBe("C");
    });

    test("undo last two steps in reverse execution order", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      expect(editor.text).toBe("ABC");
      editor.undo("3");
      expect(editor.text).toBe("AB");
      editor.undo("2");
      expect(editor.text).toBe("A");
    });
  });

  describe("Redo", () => {
    test("redo a single step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.undo("1");
      editor.redo("1");
      expect(editor.text).toBe("A");
    });

    test("undo&redo a single step then add a new step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.undo("1");
      editor.redo("1");
      expect(editor.text).toBe("A");
      editor.add("2", "B", 1);
      expect(editor.text).toBe("AB");
    });

    test("undo&redo a single step twice with new step in between", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.undo("1");
      editor.redo("1");
      expect(editor.text).toBe("A");
      editor.add("2", "B", 1);
      editor.undo("1");
      expect(editor.text).toBe("B");
      editor.redo("1");
      expect(editor.text).toBe("AB");
    });

    test("redo last step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.undo("2");
      editor.redo("2");
      expect(editor.text).toBe("AB");
    });

    test("redo first step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.undo("1");
      editor.redo("1");
      expect(editor.text).toBe("AB");
    });

    test("undo&redo redo first step twice with new step in between", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.undo("1");
      editor.redo("1");
      expect(editor.text).toBe("AB");
      editor.add("3", "C", 2);
      expect(editor.text).toBe("ABC");
      editor.undo("1");
      expect(editor.text).toBe("BC");
      editor.redo("1");
      expect(editor.text).toBe("ABC");
    });

    test("redo middle step", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "BB", 1);
      editor.add("3", "CCC", 3);
      editor.undo("2");
      editor.redo("2");
      expect(editor.text).toBe("ABBCCC");
    });

    test("redo after two reverse undos", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "BB", 1);
      editor.add("3", "CCC", 3);
      editor.undo("2");
      editor.undo("1");
      expect(editor.text).toBe("CCC");
      editor.redo("2");
      expect(editor.text).toBe("BBCCC");
    });

    test("redo after two undos", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "BB", 1);
      editor.add("3", "CCC", 3);
      editor.undo("1");
      editor.undo("2");
      expect(editor.text).toBe("CCC");
      editor.redo("2");
      expect(editor.text).toBe("BBCCC");
    });

    test("Two undo, redo the first undone", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      editor.add("4", "D", 3);
      expect(editor.text).toBe("ABCD");
      editor.undo("1");
      expect(editor.text).toBe("BCD");
      editor.undo("3");
      expect(editor.text).toBe("BD");
      editor.redo("1");
      expect(editor.text).toBe("ABD");
    });
  });

  describe("External instruction insertion", () => {
    test("insert after a single instruction", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.execAfter("1", ["2", "B", 1]);
      expect(editor.text).toBe("AB");
    });

    test("insert before a single instruction", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.execAfter(null, ["2", "B", 0]);
      expect(editor.text).toBe("BA");
    });

    test("insert between two instructions", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.execAfter("1", ["3", "C", 1]);
      expect(editor.text).toBe("ACB");
    });

    test("insert before first cancelled", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.undo("1");
      editor.execAfter(null, ["3", "C", 0]);
      expect(editor.text).toBe("CB");
    });

    test("insert before cancelled", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      editor.undo("2");
      editor.execAfter("1", ["4", "D", 1]);
      expect(editor.text).toBe("ADC");
    });

    test("insert after a transformed command", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);

      editor.undo("2");
      editor.execAfter("3", ["4", "D", 3]);
      expect(editor.text).toBe("ACD");
      editor.undo("1");
      expect(editor.text).toBe("CD");
    });

    test("insert last then redo previous instruction", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      editor.undo("2");
      editor.execAfter("3", ["4", "D", 3]);
      expect(editor.text).toBe("ACD");
      editor.redo("2");
      expect(editor.text).toBe("ABCD");
    });

    test("insert before cancelled, then redo ", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      editor.undo("2");
      editor.execAfter("1", ["4", "D", 1]);
      expect(editor.text).toBe("ADC");
      editor.redo("2");
      expect(editor.text).toBe("ADBC");
    });

    test("undo/redo external ", () => {
      const editor = new MiniEditor();
      editor.add("1", "A", 0);
      editor.add("2", "B", 1);
      editor.add("3", "C", 2);
      editor.execAfter("1", ["4", "D", 1]);
      editor.undo("4");
      expect(editor.text).toBe("ABC");
      editor.redo("4");
      expect(editor.text).toBe("ADBC");
    });
  });
});
