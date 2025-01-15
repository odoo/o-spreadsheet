import { iterateChildren } from "../../src/components/helpers/dom_helpers";

export class ContentEditableSelectionHelper {
  private el: HTMLElement;
  anchorNode: Node | null = null;
  focusNode: Node | null = null;
  anchorOffset: number = 0;
  focusOffset: number = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.attachEventHandlers();
  }

  updateEl(el: HTMLElement) {
    // const mutationObserver = new MutationObserver((mutations) => {
    //   for (const mutation of mutations) {
    //     if (mutation.addedNodes.length === mutation.removedNodes.length) {
    //       for (let i = 0; i < mutation.addedNodes.length; i++) {
    //         const addedNode = mutation.addedNodes[i];
    //         const removedNode = mutation.removedNodes[i];
    //         if (
    //           removedNode.contains(this.anchorNode) &&
    //           addedNode.textContent === removedNode.textContent
    //         ) {
    //           // @ts-ignore
    //           console.log("replacing", removedNode.outerHTML, addedNode.outerHTML);
    //           // console.log(mutation.removedNodes.length);
    //           this.anchorNode = addedNode;
    //         }
    //         if (
    //           removedNode.contains(this.focusNode) &&
    //           addedNode.textContent === removedNode.textContent
    //         ) {
    //           this.focusNode = addedNode;
    //         }
    //       }
    //     }
    //   }
    // });
    // disconnect please
    // mutationObserver.observe(el, {
    //   subtree: true,
    //   childList: true,
    // });
    this.el = el;
    this.reset();
    this.attachEventHandlers();
  }

  getRange() {
    return {
      setStart: (node: Node, offset: number) => {
        if (!this.el.contains(node)) {
          throw new Error("sqdfqsdf");
        }

        this.anchorNode = node;
        this.anchorOffset = offset;
      },
      setEnd: (node: Node, offset: number) => {
        if (!this.el.contains(node)) {
          throw new Error("sqdfqsdf");
        }
        this.focusNode = node;
        this.focusOffset = offset;
      },
    };
  }

  getStartAndEndSelection() {
    // in case the DOM has changed when patching the composer content
    // if (this.anchorNode && !this.el.contains(this.anchorNode)) {
    //   this.anchorNode = null;
    //   this.anchorOffset = 0;
    // }
    // if (this.focusNode && !this.el.contains(this.focusNode)) {
    //   this.focusNode = null;
    //   this.focusOffset = 0;
    // }
    return {
      startElement: this.anchorNode || this.el,
      startSelectionOffset: this.anchorOffset,
      endElement: this.focusNode || this.el,
      endSelectionOffset: this.focusOffset,
    };
  }

  setEmptyRange() {
    this.reset();
    return this.getRange();
  }

  removeSelection() {
    this.reset();
  }

  removeAll() {
    this.reset();
  }

  scrollSelectionIntoView() {}

  setSelection(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number) {
    if (!this.el.contains(focusNode)) {
      throw new Error("Focus node is not in the composer");
    }
    this.anchorNode = anchorNode;
    this.focusNode = focusNode;
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
  }

  private reset() {
    this.anchorNode = null;
    this.focusNode = null;
    this.anchorOffset = 0;
    this.focusOffset = 0;
  }

  private attachEventHandlers() {
    if (this.el === null) return;
    this.el.addEventListener("keydown", (ev: KeyboardEvent) => this.onKeyDown(this.el, ev));
    this.el.addEventListener("focus", (ev: FocusEvent) => {
      this.reset();
      // @ts-ignore
      window.mockContentHelper = this;
    });
  }

  /**
   * Mock default keydown events
   */
  private onKeyDown(el: HTMLElement, ev: KeyboardEvent) {
    if (ev.defaultPrevented) {
      return;
    }
    switch (ev.key) {
      case "Home":
        const firstTextNode = [...iterateChildren(el)].find(
          (child) => child.nodeType === Node.TEXT_NODE
        )!;
        this.anchorNode = firstTextNode;
        this.focusNode = firstTextNode;
        this.anchorOffset = 0;
        this.focusOffset = 0;
        break;
      case "End":
        const end = el.textContent ? el.textContent.length : 0;
        const lastTextNode = [...iterateChildren(el)]
          .reverse()
          .find((child) => child.nodeType === Node.TEXT_NODE)!;
        this.anchorNode = lastTextNode;
        this.focusNode = lastTextNode;
        this.anchorOffset = lastTextNode.textContent?.length || 0;
        this.focusOffset = lastTextNode.textContent?.length || 0;
        break;
      case "ArrowRight":
        if (
          this.focusNode?.textContent?.length === this.focusOffset &&
          this.focusNode.nextSibling
        ) {
          const nextTextNode = [...iterateChildren(this.focusNode.nextSibling)].find(
            (child) => child.nodeType === Node.TEXT_NODE
          )!;
          this.focusNode = nextTextNode;
          this.focusOffset = 0;
        } else {
          this.focusOffset += 1;
        }
        if (!ev.shiftKey) {
          this.anchorNode = this.focusNode;
          this.anchorOffset = this.focusOffset;
        }
        break;
      case "ArrowLeft":
        if (this.focusOffset === 0 && this.focusNode?.previousSibling) {
          const nextTextNode = [...iterateChildren(this.focusNode.previousSibling)].find(
            (child) => child.nodeType === Node.TEXT_NODE
          )!;
          this.focusNode = nextTextNode;
          this.focusOffset = nextTextNode.textContent?.length || 0;
        } else {
          this.focusOffset -= 1;
        }
        if (!ev.shiftKey) {
          this.anchorNode = this.focusNode;
          this.anchorOffset = this.focusOffset;
        }
        break;
    }
  }
}
