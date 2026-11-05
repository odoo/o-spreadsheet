import { onWillDestroy, Plugin, signal } from "@odoo/owl";

export class DevicePixelRatioPlugin extends Plugin {
  devicePixelRatio = signal(window.devicePixelRatio);

  setup() {
    let mediaQueries: MediaQueryList;

    const listener = () => {
      this.devicePixelRatio.set(window.devicePixelRatio);
      listenToPixelRatioChange(); // re-arm with the new ratio
    };

    const listenToPixelRatioChange = () => {
      mediaQueries?.removeEventListener("change", listener);
      mediaQueries = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mediaQueries.addEventListener("change", listener, { once: true });
    };

    listenToPixelRatioChange();
    onWillDestroy(() => {
      mediaQueries?.removeEventListener("change", listener);
    });
  }
}
