/**
 * 루트 함수형 컴포넌트를 감싸는 클래스이다.
 * hooks 배열, mount(), update(), 간단한 batching 스케줄링을 담당한다.
 */
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

  // 최초 렌더링 시 Virtual DOM을 만들고 실제 DOM으로 변환한다.
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

  // 상태 변경 후 새 Virtual DOM을 diff/patch 파이프라인으로 반영한다.
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

  // 같은 tick 안의 여러 setState를 한 번의 update로 묶기 위한 간단한 batching이다.
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

  // Runs queued effects only after the patch step has finished.
  flushEffects() {
    const effectsToRun = [...this.pendingEffects];
    this.pendingEffects = [];

    effectsToRun.forEach((runEffect) => {
      runEffect();
    });
  }

  // Unmount path that clears DOM and runs every remaining effect cleanup.
  cleanup() {
    this.isDisposed = true;
    cleanupAllEffects(this);
    this.container.replaceChildren();
    this.currentTree = null;
    this.isMounted = false;
  }
}
