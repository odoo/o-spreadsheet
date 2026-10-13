import { onWillDestroy, Plugin, signal } from "@odoo/owl";

export class DevicePixelRatioPlugin extends Plugin {
  devicePixelRatio = signal(window.devicePixelRatio);

  setup() {
    let mql: MediaQueryList;

    const listener = () => {
      this.devicePixelRatio.set(window.devicePixelRatio);
      listenToPixelRatioChange(); // re-arm with the new ratio
    };

    const listenToPixelRatioChange = () => {
      mql?.removeEventListener("change", listener);
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mql.addEventListener("change", listener, { once: true });
    };

    listenToPixelRatioChange();
    onWillDestroy(() => {
      mql?.removeEventListener("change", listener);
    });
  }
}
