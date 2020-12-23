import { Command, CoreCommand, UID } from "./types";
import { RevisionData } from "./types/multi_users";

let debugInstance: DebugManager | undefined;

interface LocalStep {
  type: "LOCAL";
  userId: UID;
  command: Command;
  hasCore?: boolean;
}

interface RemoteStep {
  type: "REMOTE";
  userId: UID;
  commands: CoreCommand[];
}

interface AckStep {
  type: "ACK";
  userId: UID;
  commands: CoreCommand[];
}

interface AckUndoStep {
  type: "ACK_UNDO";
  userId: UID;
  toReplay: RevisionData[];
}

interface RemoteUndoStep {
  type: "REMOTE_UNDO";
  userId: UID;
  toReplay: RevisionData[];
}

type Step = LocalStep | RemoteStep | AckStep | RemoteUndoStep | AckUndoStep;

class DebugManager {
  steps: Step[] = [];

  public addLocalCommand(command: Command, userId: UID) {
    this.steps.push({
      type: "LOCAL",
      userId,
      command,
    });
  }

  public addAcknowledge(commands: CoreCommand[], userId: UID) {
    this.steps.push({
      type: "ACK",
      userId,
      commands,
    });
  }

  public addRemoteCommands(commands: CoreCommand[], userId: UID) {
    this.steps.push({
      type: "REMOTE",
      userId,
      commands,
    });
  }

  public addAcknowledgeUndo(toReplay: RevisionData[], userId: UID) {
    this.steps.push({
      type: "ACK_UNDO",
      userId,
      toReplay,
    });
  }

  public addRemoteSelectiveUndo(toReplay: RevisionData[], userId: UID) {
    this.steps.push({
      type: "REMOTE_UNDO",
      userId,
      toReplay,
    });
  }

  public getDebugData(): Step[] {
    return this.steps;
  }
}

export function getDebugManager() {
  if (!debugInstance) {
    debugInstance = new DebugManager();
  }
  return debugInstance;
}

//@ts-ignore
window.getDebugManager = getDebugManager();
