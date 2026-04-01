import { diff } from "./diff.js";
import { createDomNode, resolveVNode } from "./dom.js";
import { cleanupAllEffects, finishHooks, prepareHooks } from "./hooks.js";
import { patch } from "./patch.js";

export class FunctionComponent {
  constructor(componentFunction, props = {}, container) {
    this.componentFunction = componentFunction;
    this.props = props;
    this.container = container;
    this.hooks = [];
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.currentTree = null;
    this.isMounted = false;
    this.isUpdateScheduled = false;
    this.isDisposed = false;
  }

  renderVirtualDOM() {
    prepareHooks(this);

    let unresolvedTree;

    try {
      unresolvedTree = this.componentFunction(this.props);
    } finally {
      finishHooks();
    }

    const resolvedTree = resolveVNode(unresolvedTree);

    if (!resolvedTree || Array.isArray(resolvedTree)) {
      throw new Error("루트 컴포넌트는 하나의 Virtual DOM 노드를 반환해야 합니다.");
    }

    return resolvedTree;
  }

  mount() {
    if (this.isDisposed) {
      return null;
    }

    const nextTree = this.renderVirtualDOM();
    const dom = createDomNode(nextTree);

    this.currentTree = nextTree;
    this.container.replaceChildren(dom);
    this.isMounted = true;
    this.flushEffects();

    return dom;
  }

  update() {
    if (this.isDisposed) {
      return null;
    }

    if (!this.isMounted) {
      return this.mount();
    }

    const nextTree = this.renderVirtualDOM();
    const patchResult = diff(this.currentTree, nextTree);

    patch(patchResult, this.container);

    this.currentTree = nextTree;
    this.flushEffects();

    return nextTree.dom;
  }

  scheduleUpdate() {
    if (this.isUpdateScheduled) {
      return;
    }

    this.isUpdateScheduled = true;

    Promise.resolve().then(() => {
      this.isUpdateScheduled = false;

      if (this.isDisposed) {
        return;
      }

      this.update();
    });
  }

  flushEffects() {
    const effectsToRun = [...this.pendingEffects];
    this.pendingEffects = [];

    effectsToRun.forEach((runEffect) => {
      runEffect();
    });
  }

  cleanup() {
    this.isDisposed = true;
    cleanupAllEffects(this);
    this.container.replaceChildren();
    this.currentTree = null;
    this.isMounted = false;
  }
}
