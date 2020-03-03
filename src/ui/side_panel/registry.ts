export interface SidePanelContent {
  title: string;
  Body: any;
  Footer?: any;
}

export class SidePanelRegistry {
  private static registry: { [key: string]: SidePanelContent } = {};

  static get(name: string): SidePanelContent {
    if (!SidePanelRegistry.registry[name]) {
      console.warn(`Component ${name} is not registered in the side panel content registry`);
    }
    return SidePanelRegistry.registry[name];
  }

  static add(name: string, title: string, body: any) {
    SidePanelRegistry.registry[name] = {
      title,
      Body: body
    };
  }
}
