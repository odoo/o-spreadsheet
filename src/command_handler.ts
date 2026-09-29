import {
  commandSets,
  coreCommands,
  evaluationCommandTypes,
  isCommandSetName,
  isCoreCommand,
  isEvaluationCommand,
  localCommands,
} from "./command_registry";
import { CorePlugin } from "./plugins/core_plugin";
import { EvaluationPlugin } from "./plugins/evaluation_plugin";
import {
  Command,
  CommandHandler,
  CommandHandlerRegistry,
  CommandTypes,
  CommandsHandlers,
  CommandsHandlersList,
  CommandsValidators,
  CommandsValidatorsList,
  SingleCommandHandler,
  SingleCommandValidator,
} from "./types/commands";

export class CommandHandlerRegistryClass<T extends Command> implements CommandHandlerRegistry {
  private handlers: CommandsHandlersList<T> = {};
  private preHandlers: CommandsHandlersList<T> = {};
  private validators: CommandsValidatorsList<T> = {};

  getHandlers<C extends CommandTypes>(cmd: C): SingleCommandHandler<Extract<T, { type: C }>>[] {
    return this.handlers[cmd] ?? [];
  }

  getPreHandlers<C extends CommandTypes>(cmd: C): SingleCommandHandler<Extract<T, { type: C }>>[] {
    return this.preHandlers[cmd] ?? [];
  }

  addHandler<C extends CommandTypes>(cmd: C, f: SingleCommandHandler<Extract<T, { type: C }>>) {
    this.handlers[cmd] ??= [];
    this.handlers[cmd].push(f);
  }

  addPreHandler<C extends CommandTypes>(cmd: C, f: SingleCommandHandler<Extract<T, { type: C }>>) {
    this.preHandlers[cmd] ??= [];
    this.preHandlers[cmd].push(f);
  }

  getValidators<C extends CommandTypes>(cmd: C): SingleCommandValidator<Extract<T, { type: C }>>[] {
    return this.validators[cmd] ?? [];
  }

  addValidator<C extends CommandTypes>(cmd: C, f: SingleCommandValidator<Extract<T, { type: C }>>) {
    this.validators[cmd] ??= [];
    this.validators[cmd].push(f);
  }

  registerPlugin(plugin: CommandHandler<T>) {
    this.registerDeclaredHandlers(plugin, plugin.validators, this.addValidator);
    this.registerDeclaredHandlers(plugin, plugin.preHandlers, this.addPreHandler);
    this.registerDeclaredHandlers(plugin, plugin.handlers, this.addHandler);
  }

  private registerDeclaredHandlers<F extends (...args: any[]) => any>(
    plugin: CommandHandler<T>,
    declaredHandlers: CommandsHandlers<T> | CommandsValidators<T>,
    register: (cmd: CommandTypes, f: F) => void
  ) {
    for (const key of Object.keys(declaredHandlers)) {
      const handler = declaredHandlers[key]?.bind(plugin);
      if (
        !isCommandSetName(key) &&
        !coreCommands.has(key as any) &&
        !localCommands.has(key as any)
      ) {
        throw new Error(
          `"${key}" is neither a command type nor a command set name (plugin ${plugin.constructor.name})`
        );
      }
      const commands = isCommandSetName(key)
        ? commandSets[key].keys().filter((commandType) => canHandleType(plugin, commandType))
        : [key as CommandTypes];
      for (const command of commands) {
        register.call(this, command, handler);
      }
    }
  }
}

export function canHandle(handler: CommandHandler<Command>, command: Command): boolean {
  if (handler instanceof CorePlugin) {
    return isCoreCommand(command);
  }
  if (handler instanceof EvaluationPlugin) {
    return isEvaluationCommand(command);
  }
  return true;
}

export function canHandleType(
  handler: CommandHandler<Command>,
  commandType: CommandTypes
): boolean {
  if (handler instanceof CorePlugin) {
    return coreCommands.has(commandType as any);
  }
  if (handler instanceof EvaluationPlugin) {
    return evaluationCommandTypes.has(commandType as any);
  }
  return true;
}
