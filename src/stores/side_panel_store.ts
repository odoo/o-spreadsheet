import { Component } from "@odoo/owl";
import { sidePanelRegistry } from "../registries";
import { Providers } from "./providers";

// class SidePanelState {
//   panelProps = {};
//   // undefined values are annoying here
//   sidePanelKey?: string;

//   get isOpen() {
//     return this.sidePanelKey !== undefined;
//   }
// }

interface OpenedSidePanel {
  isOpen: true;
  title: string;
  Body: Component;
  Footer?: Component;
  panelProps: object;
}

interface ClosedSidePanel {
  isOpen: false;
}

// @ts-ignore
type SidePanel = OpenedSidePanel | ClosedSidePanel;

class SidePanelStore {
  panelProps: object = {};
  sidePanelKey?: string;

  // constructor() {
  //   super(new SidePanelState());
  // }

  open(sidePanelKey: string, props: any) {
    // private state ?
    this.panelProps = props;
    this.sidePanelKey = sidePanelKey;
  }

  toggle(sidePanelKey: string, props: any) {
    if (sidePanelKey === this.sidePanelKey) {
      this.close();
    } else {
      this.open(sidePanelKey, props);
    }
  }

  close() {
    this.sidePanelKey = undefined;
    this.panelProps = {};
  }
}

// const sidePanelStateProvider = (providers: Providers) => {
//   const sidePanel = providers.watch(sidePanelProvider)
// }

export const sidePanelProvider = () => new SidePanelStore();

export const sidePanelStateProvider = (providers: Providers): Readonly<SidePanel> => {
  const sidePanel = providers.watch(sidePanelProvider);
  console.log("new sidePanelStateProvider");
  if (sidePanel.sidePanelKey === undefined) {
    return { isOpen: false };
  }
  const content = sidePanelRegistry.get(sidePanel.sidePanelKey);
  return {
    isOpen: true,
    Body: content.Body,
    Footer: content.Footer,
    title: content.title,
    panelProps: sidePanel.panelProps,
  };
};
