import { StateObserver, type StateObserverChange } from "../state_observer";
import type { WorkbookHistory } from "../types/history";
import type { Validation, Validator } from "../types/validator";

/**
 * BasePlugin
 *
 * Since the spreadsheet internal state is quite complex, it is split into
 * multiple parts, each managing a specific concern.
 *
 * This file introduces the BasePlugin, which is the common class that defines
 * how each of these model sub parts should interact with each other.
 * There are two kinds of plugins: core plugins handling persistent data
 * and UI plugins handling transient data.
 */
export class BasePlugin<
  State = unknown,
  Command = unknown,
  Result = unknown,
  Change extends StateObserverChange = StateObserverChange,
  ExcelData = unknown
> implements Validator<Result>
{
  static getters: readonly string[] = [];

  protected history: WorkbookHistory<State>;
  protected readonly successResult: Result;

  constructor(stateObserver: StateObserver<Command, Change>, successResult: Result) {
    this.successResult = successResult;
    this.history = Object.assign(Object.create(stateObserver), {
      update: stateObserver.addChange.bind(stateObserver, this),
      selectCell: () => {},
    });
  }

  /**
   * Export for excel should be available for all plugins, even for the UI.
   * In some cases, we need to export evaluated value, which is available from
   * UI plugin only.
   */
  exportForExcel(_data: ExcelData) {}

  // ---------------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------------

  /**
   * Before a command is accepted, the model will ask each plugin if the command
   * is allowed. If all of them return true, then we can proceed. Otherwise,
   * the command is cancelled.
   *
   * There should not be any side effects in this method.
   */
  allowDispatch(_command: Command): Result | Result[] {
    return this.successResult;
  }

  /**
   * This method is useful when a plugin needs to perform some action before a
   * command is handled in another plugin. This should only be used if it is not
   * possible to do the work in the handle method.
   */
  beforeHandle(_command: Command): void {}

  /**
   * This is the standard place to handle any command. Most of the plugin
   * command handling work should take place here.
   */
  handle(_command: Command): void {}

  /**
   * Sometimes, it is useful to perform some work after a command (and all its
   * subcommands) has been completely handled. For example, when we paste
   * multiple cells, we only want to reevaluate the cell values once at the end.
   */
  finalize(): void {}

  /**
   * Combine multiple validation functions into a single function
   * returning the list of results of every validation.
   */
  batchValidations<T>(...validations: Validation<T, Result>[]): Validation<T, Result> {
    return (toValidate: T) => {
      const outcomes: Result[] = [];
      for (const validation of validations) {
        const result = validation.call(this, toValidate);
        if (Array.isArray(result)) {
          outcomes.push(...result);
        } else {
          outcomes.push(result);
        }
      }
      return outcomes;
    };
  }

  /**
   * Combine multiple validation functions. Every validation is executed one after
   * the other. As soon as one validation fails, it stops and the cancelled reason
   * is returned.
   */
  chainValidations<T>(...validations: Validation<T, Result>[]): Validation<T, Result> {
    return (toValidate: T) => {
      for (const validation of validations) {
        let results = validation.call(this, toValidate);
        if (!Array.isArray(results)) {
          results = [results];
        }
        const cancelledReasons = results.filter((result) => result !== this.successResult);
        if (cancelledReasons.length) {
          return cancelledReasons;
        }
      }
      return this.successResult;
    };
  }

  checkValidations<T>(
    command: T,
    ...validations: Validation<NoInfer<T>, Result>[]
  ): Result | Result[] {
    return this.batchValidations(...validations)(command);
  }
}
