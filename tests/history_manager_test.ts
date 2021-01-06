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
    this.state = this.state.slice(0, position) + value + this.state.slice(position);
  };
  private revert = (command: Command) => {
    const { position, value } = command;
    this.state = this.state.slice(0, position) + this.state.slice(position + value.length);
  };
  private history = new History(this.apply, this.revert);

  add(commandId, text, position) {
    if (commandId in this.commands) {
      throw new Error(`Duplicate command id: ${commandId}`);
    }
    const command = {
      value: text,
      position,
    };
    this.commands[commandId] = command;
    this.history.addStep(commandId, command);
  }

  undo(commandId: UID) {
    const commandToCancel = this.commands[commandId];
    this.history.undo(
      commandId,
      (command) => undoTransformation(command, commandToCancel),
      (command) => redoTransformation(command, commandToCancel)
    );
  }

  redo(commandId: UID) {
    this.history.redo(commandId);
  }
}

function redoTransformation(toTransform: Command, cancelled: Command) {
  if (cancelled.position <= toTransform.position) {
    return {
      ...toTransform,
      position: toTransform.position + cancelled.value.length,
    };
  }
  return toTransform;
}

function undoTransformation(toTransform: Command, cancelled: Command) {
  if (cancelled.position <= toTransform.position) {
    return {
      ...toTransform,
      position: toTransform.position - cancelled.value.length,
    };
  }
  return toTransform;
}

describe("Undo/Redo manager", () => {
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

  test("redo a single step", () => {
    const editor = new MiniEditor();
    editor.add("1", "A", 0);
    editor.undo("1");
    editor.redo("1");
    expect(editor.text).toBe("A");
  });

  test("redo first step", () => {
    const editor = new MiniEditor();
    editor.add("1", "A", 0);
    editor.add("2", "B", 1);
    editor.undo("1");
    editor.redo("1");
    expect(editor.text).toBe("AB");
  });
});
