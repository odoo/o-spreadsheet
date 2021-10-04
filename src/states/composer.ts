import { createMachine, MachineConfig } from "xstate";
import { composerTokenize } from "../formulas";
import { zoneToXc } from "../helpers";
import { Zone } from "../types";
import { selectionMachine } from "./selection";

export class ComposerContext {
  content: string = "";

  get tokens() {
    return this.content.startsWith("=") ? composerTokenize(this.content) : [];
  }

  canStartRangeSelection(): boolean {
    if (this.content.startsWith("=")) {
      const tokenAtCursor = this.tokens[this.tokens.length - 1];
      if (tokenAtCursor) {
        const tokenIdex = this.tokens.map((token) => token.start).indexOf(tokenAtCursor.start);

        let count = tokenIdex;
        let currentToken = tokenAtCursor;
        // check previous token
        while (!["COMMA", "LEFT_PAREN", "OPERATOR"].includes(currentToken.type)) {
          if (currentToken.type !== "SPACE" || count < 1) {
            return false;
          }
          count--;
          currentToken = this.tokens[count];
        }

        count = tokenIdex + 1;
        currentToken = this.tokens[count];
        // check next token
        while (currentToken && !["COMMA", "RIGHT_PAREN", "OPERATOR"].includes(currentToken.type)) {
          if (currentToken.type !== "SPACE") {
            return false;
          }
          count++;
          currentToken = this.tokens[count];
        }
        count++;
        currentToken = this.tokens[count];
      }
      return true;
    }
    return false;
  }
}

const rangeSelectionMachine: MachineConfig<ComposerContext, any, any> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        characterInserted: {
          cond: (context) => context.canStartRangeSelection(),
          target: "selecting",
        },
      },
    },
    selecting: {
      on: {
        characterInserted: {
          cond: (context) => !context.canStartRangeSelection(),
          target: "idle",
        },
        rangeSelected: {
          actions: [
            {
              type: "insertSelectedRange",
              exec: (context, { zones }: { zones: Zone[] }) => {
                console.log("sdqlmjqsdlfjsdqmlfj");
                context.content += zones.map(zoneToXc).join(",");
              },
            },
          ],
        },
      },
      invoke: {
        id: "hello",
        src: selectionMachine,
      },
    },
  },
};

const keyboardMachine: MachineConfig<ComposerContext, any, any> = {
  initial: "manualInput",
  states: {
    manualInput: {
      on: {
        characterInserted: {
          actions: [
            {
              type: "insertCharacter",
              exec: (context, { character }) => {
                context.content += character;
              },
            },
          ],
        },
      },
    },
  },
};

export const composerMachine = createMachine<ComposerContext>({
  type: "parallel",
  states: {
    keyboardMachine,
    rangeSelectionMachine,
  },
});
