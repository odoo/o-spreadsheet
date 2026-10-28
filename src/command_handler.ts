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
  SingleCommandHandler,
  SingleCommandValidator,
} from "./types/commands";

type HandlerKind = "validators" | "preHandlers" | "handlers";

interface DeclaredKey {
  key: string;
  /** set of command types, when the key is a command set name */
  commandSet?: Set<CommandTypes>;
}

type Declarations = Record<HandlerKind, DeclaredKey[]>;

type Registration =
  | { plugin: CommandHandler<Command>; declarations: Declarations }
  | { kind: HandlerKind; type: CommandTypes; handler: (cmd: any) => any };

/**
 * Keys of the handlers declared by each plugin class. They are the same for
 * every instance of the class, so they are shared by all models.
 */
const classDeclarations = new WeakMap<Function, Declarations>();

function getDeclarations(plugin: CommandHandler<Command>): Declarations {
  let declarations = classDeclarations.get(plugin.constructor);
  if (declarations) {
    return declarations;
  }
  for (const method of ["allowDispatch", "beforeHandle", "handle"]) {
    if (method in plugin) {
      throw new Error(
        `Plugin ${plugin.constructor.name} defines "${method}", use validators, preHandlers or handlers instead`
      );
    }
  }
  declarations = { validators: [], preHandlers: [], handlers: [] };
  for (const kind of ["validators", "preHandlers", "handlers"] as const) {
    for (const key of Object.keys(plugin[kind])) {
      const isSet = isCommandSetName(key);
      if (!isSet && !coreCommands.has(key as any) && !localCommands.has(key as any)) {
        throw new Error(
          `"${key}" is neither a command type nor a command set name (plugin ${plugin.constructor.name})`
        );
      }
      declarations[kind].push({ key, commandSet: isSet ? commandSets[key] : undefined });
    }
  }
  classDeclarations.set(plugin.constructor, declarations);
  return declarations;
}

export class CommandHandlerRegistryClass<T extends Command> implements CommandHandlerRegistry {
  private registrations: Registration[] = [];
  /**
   * Handlers of each command type, resolved from the registrations the first
   * time they are requested. Command sets are not expanded at registration since
   * a model is created far more often than it sees every command type.
   */
  private resolved: Record<HandlerKind, Map<CommandTypes, any[]>> = {
    validators: new Map(),
    preHandlers: new Map(),
    handlers: new Map(),
  };

  getHandlers<C extends CommandTypes>(cmd: C): SingleCommandHandler<Extract<T, { type: C }>>[] {
    return this.resolve("handlers", cmd);
  }

  getPreHandlers<C extends CommandTypes>(cmd: C): SingleCommandHandler<Extract<T, { type: C }>>[] {
    return this.resolve("preHandlers", cmd);
  }

  addHandler<C extends CommandTypes>(cmd: C, f: SingleCommandHandler<Extract<T, { type: C }>>) {
    this.register({ kind: "handlers", type: cmd, handler: f });
  }

  addPreHandler<C extends CommandTypes>(cmd: C, f: SingleCommandHandler<Extract<T, { type: C }>>) {
    this.register({ kind: "preHandlers", type: cmd, handler: f });
  }

  getValidators<C extends CommandTypes>(cmd: C): SingleCommandValidator<Extract<T, { type: C }>>[] {
    return this.resolve("validators", cmd);
  }

  addValidator<C extends CommandTypes>(cmd: C, f: SingleCommandValidator<Extract<T, { type: C }>>) {
    this.register({ kind: "validators", type: cmd, handler: f });
  }

  registerPlugin(plugin: CommandHandler<T>) {
    const handler = plugin as CommandHandler<Command>;
    this.register({ plugin: handler, declarations: getDeclarations(handler) });
  }

  private register(registration: Registration) {
    this.registrations.push(registration);
    this.resolved.validators.clear();
    this.resolved.preHandlers.clear();
    this.resolved.handlers.clear();
  }

  private resolve(kind: HandlerKind, cmd: CommandTypes): any[] {
    let handlers = this.resolved[kind].get(cmd);
    if (!handlers) {
      handlers = [];
      for (const registration of this.registrations) {
        if (!("plugin" in registration)) {
          if (registration.kind === kind && registration.type === cmd) {
            handlers.push(registration.handler);
          }
          continue;
        }
        const { plugin, declarations } = registration;
        if (!canHandleType(plugin, cmd)) {
          continue;
        }
        for (const { key, commandSet } of declarations[kind]) {
          const handler = plugin[kind][key];
          if (handler && (commandSet ? commandSet.has(cmd) : key === cmd)) {
            handlers.push(handler.bind(plugin));
          }
        }
      }
      this.resolved[kind].set(cmd, handlers);
    }
    return handlers;
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
