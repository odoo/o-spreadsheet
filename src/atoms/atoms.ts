import { reactive } from "@odoo/owl";

// function atomNode(value, reaction = () => { console.log("top")}) {
//   const reactiveValue = reactive(value, reaction);
//   return {
//     value: reactiveValue,
//     map: (fn) => {
//       const node = atomNode(reactiveValue, () => {
//         console.log("map")
//         node.value = fn(reactiveValue);
//       });
//       node.value = fn(reactiveValue);
//       return node;
//     },
//   };
// }

export function atom<T extends object>(initialValue: (ctx: Context) => T): Atom<T> {
  return { initialValue };
}

export function action(fn: (state: AtomState) => void) {}

interface Atom<T extends object = object> {
  initialValue: (ctx: Context) => T;
}

interface AtomState<T extends object = object> {
  value: T;
}

interface Context {
  get<T extends object>(atom: Atom<T>): AtomState<T>;
}

export function createContext() {
  return new ScopeContext();
}

class ScopeContext {
  private atoms = new Map<Atom<any>, AtomState<any>>();

  get<T extends object>(atom: Atom<T>): AtomState<T> {
    const atomState = this.atoms.get(atom);
    if (!atomState) {
      this.init(atom);
    }
    return this.atoms.get(atom)!;
  }

  private init(atom: Atom) {
    this.atoms.set(
      atom,
      reactive({
        value: atom.initialValue(this.atomCtx(atom)),
      })
    );
  }

  private reset(atom: Atom) {
    const atomState = this.atoms.get(atom);
    if (atomState) {
      atomState.value = atom.initialValue(this.atomCtx(atom));
    }
  }

  private atomCtx(currentAtom: Atom): Context {
    return {
      get: <T extends object>(dependencyAtom: Atom<T>): AtomState<T> => {
        const atomState = this.get(dependencyAtom);
        return reactive(atomState, () => this.reset(currentAtom));
      },
    };
  }
}
