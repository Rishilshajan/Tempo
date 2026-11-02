// One same-URL history entry per open layer. Never intercept ordinary page navigation.
const key = "__tempoOverlay";
type Layer = { id: string; url: string; close: () => boolean; active: boolean };
type Browser = Pick<Window, "history" | "location" | "addEventListener">;
export class OverlayHistory {
  private layers: Layer[] = [];
  constructor(private browser: Browser) {
    browser.addEventListener("popstate", this.pop);
  }
  private marker() {
    return this.browser.history.state?.[key] as string | undefined;
  }
  register(id: string, close: () => boolean) {
    const existing = this.layers.find((layer) => layer.id === id);
    if (existing) {
      existing.active = true;
      existing.close = close;
      existing.url = this.browser.location.href;
      if (this.marker() !== id) {
        this.layers = this.layers.filter((layer) => layer !== existing);
        this.layers.push(existing);
        this.browser.history.pushState(
          { ...this.browser.history.state, [key]: id },
          "",
          existing.url,
        );
      }
      return () => this.release(existing);
    }
    const layer = { id, url: this.browser.location.href, close, active: true };
    this.layers.push(layer);
    this.browser.history.pushState(
      { ...this.browser.history.state, [key]: id },
      "",
      layer.url,
    );
    return () => this.release(layer);
  }
  private release(layer: Layer) {
    layer.active = false;
    // Defer cleanup so Strict Mode's effect replay can reattach, and sheet-to-sheet
    // transitions can register their new layer before history is changed.
    queueMicrotask(() => {
      if (
        !layer.active &&
        this.marker() === layer.id &&
        this.browser.location.href === layer.url
      )
        this.browser.history.back();
    });
  }
  private pop = () => {
    const marker = this.marker();
    const target = this.layers.findIndex((layer) => layer.id === marker);
    const leaving = this.layers
      .slice(target + 1)
      .filter((layer) => layer.active);
    for (const layer of leaving.reverse()) {
      if (this.browser.location.href !== layer.url) continue;
      if (!layer.close()) {
        this.browser.history.pushState(
          { ...this.browser.history.state, [key]: layer.id },
          "",
          layer.url,
        );
        return;
      }
      layer.active = false;
    }
    // A manually closed layer may remain below another layer. Skip that stale
    // entry rather than making the user press Back twice.
    if (target >= 0 && !this.layers[target].active) this.browser.history.back();
  };
}
let controller: OverlayHistory | undefined;
export function overlayHistory() {
  return (controller ??= new OverlayHistory(window));
}
