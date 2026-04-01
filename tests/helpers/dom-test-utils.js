import { JSDOM } from "jsdom";

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

export function setupDom(markup = '<div id="root"></div>') {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${markup}</body></html>`, {
    url: "http://localhost",
  });
  const { window } = dom;

  setGlobal("window", window);
  setGlobal("document", window.document);
  setGlobal("HTMLElement", window.HTMLElement);
  setGlobal("Node", window.Node);
  setGlobal("Event", window.Event);
  setGlobal("MouseEvent", window.MouseEvent);
  setGlobal("CustomEvent", window.CustomEvent);
  setGlobal("navigator", window.navigator);
  setGlobal("localStorage", window.localStorage);

  return {
    window,
    cleanup() {
      dom.window.close();
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.HTMLElement;
      delete globalThis.Node;
      delete globalThis.Event;
      delete globalThis.MouseEvent;
      delete globalThis.CustomEvent;
      delete globalThis.navigator;
      delete globalThis.localStorage;
    },
  };
}

export async function flushMicrotasks(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}
