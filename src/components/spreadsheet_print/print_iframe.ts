import { onMounted, Signal, signal } from "@odoo/owl";
import { useLayoutEffect } from "../../owl3_compatibility_layer";
import { _t } from "../../translation";
import { keyboardEventToShortcutString } from "../helpers/dom_helpers";

const PRINT_IFRAME_CSS = /* css */ `
  html, body {
    margin: 0;
    padding: 0;
  }

  body {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #e7e9ed;
    font-family: "Roboto", "Arial";
    min-width: min-content; /* Ensure the body does not shrink smaller than its content */
  }

  .o-print-page {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    box-sizing: border-box;
    margin: 1rem;
    background-color: #ffffff;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }

  .o-empty-print-page {
    align-items: center;
    color: #5f636f;
    font-style: italic;
  }

  @media print {
    body {
      display: block;
      background-color: transparent;
    }

    .o-print-page {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-shadow: none;
      break-after: page;
    }

    .o-print-page:last-child {
      break-after: auto;
    }

    .o-empty-print-page {
      display: none;
    }
  }
`;

interface PrintIframeArgs {
  iframeRef: () => HTMLIFrameElement | null;
  pageCount: () => number;
  /** Dimensions/padding of a page */
  pageStyle: () => string;
  /** `@page` css rules */
  pageRule: () => string;
}

export interface PrintIframe {
  canvases: Signal<HTMLCanvasElement[]>;
  print: () => void;
}

export function usePrintIframe(args: PrintIframeArgs): PrintIframe {
  const canvases = signal<HTMLCanvasElement[]>([]);
  let styleElement: HTMLStyleElement | undefined = undefined;
  let currentIframeDocument: Document | null = null;

  onMounted(initializeIframe);
  useLayoutEffect(syncIframeContent);

  function initializeIframe() {
    const iframe = args.iframeRef();
    if (!iframe || !iframe?.contentDocument) {
      throw new Error("No iframe element found for print preview");
    }

    iframe.addEventListener("load", () => {
      // In older firefox versions with an `about:blank` iframe, the iframe would have a readyState "complete" at first
      // render, marking it ready to use. But then an async navigation event would occur, replacing the whole iframe document.
      // And for those `about:blank` iframes, other browsers might not dispatch a `load` event at all.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=543435
      if (currentIframeDocument !== iframe.contentDocument) {
        currentIframeDocument = iframe.contentDocument;
        setupIframeDocument(currentIframeDocument);
        syncIframeContent();
      }
    });
    currentIframeDocument = iframe.contentDocument;
    setupIframeDocument(currentIframeDocument);
    syncIframeContent();
  }

  function setupIframeDocument(doc: Document | null) {
    if (!doc) {
      throw new Error("No document in the iframe");
    }

    styleElement = doc.createElement("style");
    doc.head.appendChild(styleElement);
    doc.body.replaceChildren();

    doc.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (keyboardEventToShortcutString(ev) === "Ctrl+P") {
        ev.preventDefault();
      }
    });
  }

  function syncIframeContent() {
    const iframe = args.iframeRef();
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      return;
    }

    const pageRule = args.pageRule();
    if (styleElement) {
      styleElement.textContent = PRINT_IFRAME_CSS + pageRule;
    }
    syncPages(doc);
  }

  function syncPages(doc: Document) {
    const pageCount = args.pageCount();
    const isEmptyPage = !!doc.body.querySelector(".o-empty-print-page");
    if (pageCount === 0) {
      if (!isEmptyPage) {
        doc.body.replaceChildren(createEmptyPageElement());
      }
    } else {
      if (isEmptyPage) {
        doc.body.replaceChildren();
      }
      while (doc.body.children.length > pageCount) {
        doc.body.lastElementChild?.remove();
      }
      while (doc.body.children.length < pageCount) {
        doc.body.appendChild(createPageElement());
      }
    }

    for (const page of doc.body.children) {
      page.setAttribute("style", args.pageStyle());
    }

    const newCanvases = [...doc.querySelectorAll("canvas")];
    if (!areSameCanvases(canvases(), newCanvases)) {
      canvases.set(newCanvases);
    }
  }

  function print() {
    args.iframeRef()?.contentWindow?.focus();
    args.iframeRef()?.contentWindow?.print();
  }

  return { canvases, print };
}

function createPageElement() {
  const page = document.createElement("div");
  page.classList.add("o-print-page");
  const canvas = document.createElement("canvas");
  page.appendChild(canvas);
  return page;
}

function createEmptyPageElement() {
  const page = document.createElement("div");
  page.classList.add("o-print-page", "o-empty-print-page");
  const message = document.createElement("h4");
  message.textContent = _t("No content to print");
  page.appendChild(message);
  return page;
}

function areSameCanvases(a: HTMLCanvasElement[], b: HTMLCanvasElement[]): boolean {
  return a.length === b.length && a.every((canvas, i) => canvas === b[i]);
}
