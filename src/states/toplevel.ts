import { createMachine, interpret } from "xstate";
import { Model } from "../model";
const composerMachine = createMachine<{ model: Model }>({
  initial: "idle",
  states: {
    idle: {
      on: {
        openComposerWithContentFocus: "editingWithContentFocus",
        openComposerWithCellFocus: "editingWithCellFocus",
      },
    },
    editingWithContentFocus: {
      on: {
        composerClosed: "idle",
      },
    },
    editingWithCellFocus: {
      // on: {
      //   keyboardArrows: "idle",
      //   composerClosed: "idle",
      //   dsqf: {
      //       actions: [{
      //           exec: (context, event) => {
      //               context.model
      //           }
      //       }]
      //   }
      // },
    },
  },
});

export const composerState = interpret(composerMachine)
  .onTransition((state) => console.log(state))
  .start();
