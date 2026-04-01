// src/core/createElement.js
var TEXT_ELEMENT = "TEXT_ELEMENT";
function createTextElement(value) {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      nodeValue: String(value),
      children: []
    },
    dom: null
  };
}
function flattenChildren(children, result = []) {
  children.forEach((child) => {
    if (Array.isArray(child)) {
      flattenChildren(child, result);
      return;
    }
    if (child === null || child === void 0 || child === false || child === true) {
      return;
    }
    if (typeof child === "string" || typeof child === "number") {
      result.push(createTextElement(child));
      return;
    }
    result.push(child);
  });
  return result;
}
function createElement(type, props = {}, ...children) {
  const nextProps = { ...props };
  const key = nextProps.key ?? null;
  delete nextProps.key;
  return {
    type,
    key,
    props: {
      ...nextProps,
      children: flattenChildren(children)
    },
    dom: null
  };
}
var h = createElement;

// src/core/hooks.js
var currentInstance = null;
var isRenderingRootComponent = false;
function haveDepsChanged(previousDeps, nextDeps) {
  if (!Array.isArray(previousDeps) || !Array.isArray(nextDeps)) {
    return true;
  }
  if (previousDeps.length !== nextDeps.length) {
    return true;
  }
  return nextDeps.some((dep, index) => !Object.is(dep, previousDeps[index]));
}
function assertHookUsage(name) {
  if (!currentInstance || !isRenderingRootComponent) {
    throw new Error(
      `${name} can only run while the root FunctionComponent is rendering.`
    );
  }
}
function assertHookSlotType(instance, hookIndex, expectedType, hookName) {
  const existingHook = instance.hooks[hookIndex];
  if (existingHook && existingHook.type !== expectedType) {
    throw new Error(
      `${hookName} must keep the same call order on every render. Check conditional Hook calls or changed Hook positions.`
    );
  }
}
function prepareHooks(instance) {
  currentInstance = instance;
  isRenderingRootComponent = true;
  instance.hookIndex = 0;
  instance.pendingEffects = [];
}
function finishHooks() {
  isRenderingRootComponent = false;
  currentInstance = null;
}
function cleanupAllEffects(instance) {
  instance.hooks.forEach((hook) => {
    if (hook?.type === "effect" && typeof hook.cleanup === "function") {
      hook.cleanup();
      hook.cleanup = null;
    }
  });
}
function useState(initialValue) {
  assertHookUsage("useState");
  const instance = currentInstance;
  const hookIndex = instance.hookIndex;
  assertHookSlotType(instance, hookIndex, "state", "useState");
  if (!instance.hooks[hookIndex]) {
    instance.hooks[hookIndex] = {
      type: "state",
      value: typeof initialValue === "function" ? initialValue() : initialValue
    };
  }
  const setState = (nextValue) => {
    const hook = instance.hooks[hookIndex];
    const previousValue = hook.value;
    const resolvedValue = typeof nextValue === "function" ? nextValue(previousValue) : nextValue;
    if (Object.is(previousValue, resolvedValue)) {
      return;
    }
    hook.value = resolvedValue;
    instance.scheduleUpdate();
  };
  const value = instance.hooks[hookIndex].value;
  instance.hookIndex += 1;
  return [value, setState];
}
function useEffect(effect, deps) {
  assertHookUsage("useEffect");
  const instance = currentInstance;
  const hookIndex = instance.hookIndex;
  assertHookSlotType(instance, hookIndex, "effect", "useEffect");
  const hook = instance.hooks[hookIndex] ?? {
    type: "effect",
    deps: void 0,
    cleanup: null
  };
  if (haveDepsChanged(hook.deps, deps)) {
    instance.pendingEffects.push(() => {
      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }
      const cleanup = effect();
      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
      hook.deps = Array.isArray(deps) ? [...deps] : void 0;
    });
  }
  instance.hooks[hookIndex] = hook;
  instance.hookIndex += 1;
}
function useMemo(factory, deps) {
  assertHookUsage("useMemo");
  const instance = currentInstance;
  const hookIndex = instance.hookIndex;
  assertHookSlotType(instance, hookIndex, "memo", "useMemo");
  const hook = instance.hooks[hookIndex] ?? {
    type: "memo",
    deps: void 0,
    value: void 0
  };
  if (haveDepsChanged(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = Array.isArray(deps) ? [...deps] : void 0;
  }
  instance.hooks[hookIndex] = hook;
  instance.hookIndex += 1;
  return hook.value;
}

// src/core/dom.js
function isEventProp(name) {
  return name.startsWith("on");
}
function isClassProp(name) {
  return name === "class" || name === "className";
}
function getEventName(name) {
  return name.slice(2).toLowerCase();
}
function clearStyle(dom, previousValue) {
  if (typeof previousValue === "string") {
    dom.style.cssText = "";
    return;
  }
  if (previousValue && typeof previousValue === "object") {
    Object.keys(previousValue).forEach((styleName) => {
      dom.style[styleName] = "";
    });
  }
}
function setStyleObject(dom, value = {}, previousValue = {}) {
  Object.keys(previousValue).forEach((styleName) => {
    if (!(styleName in value)) {
      dom.style[styleName] = "";
    }
  });
  Object.keys(value).forEach((styleName) => {
    dom.style[styleName] = value[styleName];
  });
}
function setStyle(dom, value, previousValue) {
  clearStyle(dom, previousValue);
  if (typeof value === "string") {
    dom.style.cssText = value;
    return;
  }
  if (value && typeof value === "object") {
    setStyleObject(dom, value, typeof previousValue === "object" ? previousValue : {});
  }
}
function removeDomProperty(dom, name, previousValue) {
  if (isClassProp(name)) {
    dom.removeAttribute("class");
    return;
  }
  if (name === "style") {
    clearStyle(dom, previousValue);
    dom.removeAttribute("style");
    return;
  }
  if (isEventProp(name) && typeof previousValue === "function") {
    dom.removeEventListener(getEventName(name), previousValue);
    return;
  }
  if (name in dom && typeof dom[name] !== "function") {
    try {
      dom[name] = "";
    } catch (_error) {
    }
  }
  dom.removeAttribute(name);
}
function setDomProperty(dom, name, value, previousValue) {
  if (isClassProp(name)) {
    if (value === false || value === null || value === void 0) {
      removeDomProperty(dom, name, previousValue);
      return;
    }
    dom.setAttribute("class", String(value));
    return;
  }
  if (name === "style") {
    if (value === false || value === null || value === void 0) {
      removeDomProperty(dom, name, previousValue);
      return;
    }
    setStyle(dom, value, previousValue);
    return;
  }
  if (isEventProp(name) && typeof value === "function") {
    if (typeof previousValue === "function") {
      dom.removeEventListener(getEventName(name), previousValue);
    }
    dom.addEventListener(getEventName(name), value);
    return;
  }
  if (value === false || value === null || value === void 0) {
    removeDomProperty(dom, name, previousValue);
    return;
  }
  if (name in dom && typeof value !== "object" && typeof value !== "function") {
    dom[name] = value;
    return;
  }
  dom.setAttribute(name, String(value));
}
function getComparableProps(props = {}) {
  const comparableProps = {};
  Object.keys(props).forEach((name) => {
    if (name !== "children" && name !== "key") {
      comparableProps[name] = props[name];
    }
  });
  return comparableProps;
}
function buildInitialPropChanges(props = {}) {
  const set = Object.entries(getComparableProps(props)).map(([name, value]) => ({
    name,
    value,
    previousValue: void 0
  }));
  return {
    set,
    remove: []
  };
}
function applyPropChanges(dom, propChanges) {
  propChanges.remove.forEach(({ name, previousValue }) => {
    removeDomProperty(dom, name, previousValue);
  });
  propChanges.set.forEach(({ name, value, previousValue }) => {
    setDomProperty(dom, name, value, previousValue);
  });
}
function createDomNode(vnode) {
  if (vnode.type === TEXT_ELEMENT) {
    const textNode = document.createTextNode(vnode.props.nodeValue);
    vnode.dom = textNode;
    return textNode;
  }
  const dom = document.createElement(vnode.type);
  vnode.dom = dom;
  applyPropChanges(dom, buildInitialPropChanges(vnode.props));
  vnode.props.children.forEach((child) => {
    dom.appendChild(createDomNode(child));
  });
  return dom;
}
function resolveVNode(vnode) {
  if (vnode === null || vnode === void 0 || vnode === false || vnode === true) {
    return null;
  }
  if (Array.isArray(vnode)) {
    const resolvedChildren2 = [];
    vnode.forEach((child) => {
      const resolvedChild = resolveVNode(child);
      if (Array.isArray(resolvedChild)) {
        resolvedChildren2.push(...resolvedChild.filter(Boolean));
      } else if (resolvedChild) {
        resolvedChildren2.push(resolvedChild);
      }
    });
    return resolvedChildren2;
  }
  if (typeof vnode === "string" || typeof vnode === "number") {
    return {
      type: TEXT_ELEMENT,
      key: null,
      props: {
        nodeValue: String(vnode),
        children: []
      },
      dom: null
    };
  }
  if (typeof vnode.type === "function") {
    const renderedVNode = vnode.type(vnode.props || {});
    const resolvedVNode = resolveVNode(renderedVNode);
    if (resolvedVNode && !Array.isArray(resolvedVNode) && vnode.key !== null && resolvedVNode.key === null) {
      resolvedVNode.key = vnode.key;
    }
    return resolvedVNode;
  }
  const resolvedChildren = [];
  (vnode.props?.children || []).forEach((child) => {
    const resolvedChild = resolveVNode(child);
    if (Array.isArray(resolvedChild)) {
      resolvedChildren.push(...resolvedChild.filter(Boolean));
    } else if (resolvedChild) {
      resolvedChildren.push(resolvedChild);
    }
  });
  return {
    type: vnode.type,
    key: vnode.key ?? null,
    props: {
      ...vnode.props || {},
      children: resolvedChildren
    },
    dom: null
  };
}

// src/core/diff.js
function shouldReplace(oldVNode, newVNode) {
  return oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key;
}
function diffProps(oldProps = {}, newProps = {}) {
  const previousProps = getComparableProps(oldProps);
  const nextProps = getComparableProps(newProps);
  const remove = [];
  const set = [];
  Object.keys(previousProps).forEach((name) => {
    if (!(name in nextProps)) {
      remove.push({
        name,
        previousValue: previousProps[name]
      });
    }
  });
  Object.keys(nextProps).forEach((name) => {
    if (!Object.is(previousProps[name], nextProps[name])) {
      set.push({
        name,
        value: nextProps[name],
        previousValue: previousProps[name]
      });
    }
  });
  return { set, remove };
}
function hasPropChanges(propChanges) {
  return propChanges.set.length > 0 || propChanges.remove.length > 0;
}
function isKeyedChild(child) {
  return child && child.key !== null;
}
function findFallbackOldChild(oldChildren, usedOldIndices, startIndex) {
  const directChild = oldChildren[startIndex];
  if (directChild && !isKeyedChild(directChild) && !usedOldIndices.has(startIndex)) {
    return { child: directChild, index: startIndex };
  }
  for (let index = 0; index < oldChildren.length; index += 1) {
    const oldChild = oldChildren[index];
    if (!isKeyedChild(oldChild) && !usedOldIndices.has(index)) {
      return { child: oldChild, index };
    }
  }
  return null;
}
function diffChildren(oldChildren = [], newChildren = []) {
  const childPatches = [];
  const oldKeyedChildren = /* @__PURE__ */ new Map();
  const usedOldIndices = /* @__PURE__ */ new Set();
  oldChildren.forEach((child, index) => {
    if (isKeyedChild(child)) {
      oldKeyedChildren.set(child.key, { child, index });
    }
  });
  newChildren.forEach((newChild, newIndex) => {
    let matchedEntry = null;
    if (isKeyedChild(newChild)) {
      matchedEntry = oldKeyedChildren.get(newChild.key) ?? null;
    } else {
      matchedEntry = findFallbackOldChild(oldChildren, usedOldIndices, newIndex);
    }
    if (matchedEntry) {
      usedOldIndices.add(matchedEntry.index);
      childPatches.push(diff(matchedEntry.child, newChild));
      return;
    }
    childPatches.push({
      type: "CREATE",
      oldVNode: null,
      newVNode: newChild
    });
  });
  oldChildren.forEach((oldChild, index) => {
    if (!usedOldIndices.has(index)) {
      childPatches.push({
        type: "REMOVE",
        oldVNode: oldChild,
        newVNode: null
      });
    }
  });
  return childPatches;
}
function diff(oldVNode, newVNode) {
  if (!oldVNode && newVNode) {
    return {
      type: "CREATE",
      oldVNode: null,
      newVNode
    };
  }
  if (oldVNode && !newVNode) {
    return {
      type: "REMOVE",
      oldVNode,
      newVNode: null
    };
  }
  if (shouldReplace(oldVNode, newVNode)) {
    return {
      type: "REPLACE",
      oldVNode,
      newVNode
    };
  }
  if (newVNode.type === TEXT_ELEMENT) {
    if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
      return {
        type: "TEXT",
        oldVNode,
        newVNode
      };
    }
    newVNode.dom = oldVNode.dom;
    return {
      type: "NONE",
      oldVNode,
      newVNode
    };
  }
  const propChanges = diffProps(oldVNode.props, newVNode.props);
  const childPatches = diffChildren(
    oldVNode.props.children,
    newVNode.props.children
  );
  const hasChildChanges = childPatches.some(
    (childPatch) => childPatch.type !== "NONE"
  );
  if (!hasPropChanges(propChanges) && !hasChildChanges) {
    newVNode.dom = oldVNode.dom;
    return {
      type: "NONE",
      oldVNode,
      newVNode,
      propChanges,
      childPatches
    };
  }
  return {
    type: "UPDATE",
    oldVNode,
    newVNode,
    propChanges,
    childPatches
  };
}

// src/core/patch.js
function reorderChildren(parentDom, nextChildren) {
  const desiredNodes = nextChildren.map((child) => child.dom).filter(Boolean);
  desiredNodes.forEach((childDom, index) => {
    const currentNode = parentDom.childNodes[index];
    if (currentNode !== childDom) {
      parentDom.insertBefore(childDom, currentNode || null);
    }
  });
}
function removeExtraNodes(parentDom, expectedLength) {
  while (parentDom.childNodes.length > expectedLength) {
    parentDom.removeChild(parentDom.lastChild);
  }
}
function patch(patchResult, container2 = null) {
  switch (patchResult.type) {
    case "CREATE": {
      return createDomNode(patchResult.newVNode);
    }
    case "REMOVE": {
      const dom = patchResult.oldVNode?.dom;
      if (dom?.parentNode) {
        dom.parentNode.removeChild(dom);
      }
      return null;
    }
    case "REPLACE": {
      const newDom = createDomNode(patchResult.newVNode);
      const oldDom = patchResult.oldVNode.dom;
      const parentDom = oldDom.parentNode || container2;
      if (parentDom) {
        parentDom.replaceChild(newDom, oldDom);
      }
      return newDom;
    }
    case "TEXT": {
      const dom = patchResult.oldVNode.dom;
      dom.nodeValue = patchResult.newVNode.props.nodeValue;
      patchResult.newVNode.dom = dom;
      return dom;
    }
    case "NONE": {
      if (patchResult.oldVNode && patchResult.newVNode) {
        patchResult.newVNode.dom = patchResult.oldVNode.dom;
        return patchResult.newVNode.dom;
      }
      return null;
    }
    case "UPDATE": {
      const { oldVNode, newVNode, propChanges, childPatches } = patchResult;
      const dom = oldVNode.dom;
      newVNode.dom = dom;
      applyPropChanges(dom, propChanges);
      childPatches.forEach((childPatch) => {
        patch(childPatch, dom);
      });
      reorderChildren(dom, newVNode.props.children);
      removeExtraNodes(dom, newVNode.props.children.length);
      return dom;
    }
    default:
      throw new Error(`\uC54C \uC218 \uC5C6\uB294 patch \uD0C0\uC785\uC785\uB2C8\uB2E4: ${patchResult.type}`);
  }
}

// src/core/FunctionComponent.js
var FunctionComponent = class {
  constructor(componentFunction, props = {}, container2) {
    this.componentFunction = componentFunction;
    this.props = props;
    this.container = container2;
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
      throw new Error("\uB8E8\uD2B8 \uCEF4\uD3EC\uB10C\uD2B8\uB294 \uD558\uB098\uC758 Virtual DOM \uB178\uB4DC\uB97C \uBC18\uD658\uD574\uC57C \uD569\uB2C8\uB2E4.");
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
};

// src/core/render.js
var rootInstance = null;
function render(rootComponent, container2, props = {}) {
  if (!(container2 instanceof HTMLElement)) {
    throw new Error("render\uC5D0\uB294 \uC720\uD6A8\uD55C DOM \uCEE8\uD14C\uC774\uB108\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  }
  const shouldCreateNewRoot = !rootInstance || rootInstance.componentFunction !== rootComponent || rootInstance.container !== container2;
  if (shouldCreateNewRoot) {
    if (rootInstance) {
      rootInstance.cleanup();
    }
    rootInstance = new FunctionComponent(rootComponent, props, container2);
    rootInstance.mount();
    return rootInstance;
  }
  rootInstance.props = props;
  rootInstance.update();
  return rootInstance;
}

// src/index.js
var BASE_ITEMS = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" }
];
function SectionTitle({ text }) {
  return /* @__PURE__ */ h("h2", { className: "section-title" }, text);
}
function InfoRow({ label, value }) {
  return /* @__PURE__ */ h("div", { className: "info-row" }, /* @__PURE__ */ h("span", { className: "info-label" }, label), /* @__PURE__ */ h("span", { className: "info-value" }, value));
}
function KeyedItem({ item }) {
  return /* @__PURE__ */ h("li", { className: "item", "data-key": item.id }, item.label);
}
function KeyedList({ items }) {
  return /* @__PURE__ */ h("ul", { className: "item-list" }, items.map((item) => /* @__PURE__ */ h(KeyedItem, { key: item.id, item })));
}
function UnkeyedList({ items }) {
  return /* @__PURE__ */ h("ul", { className: "item-list" }, items.map((item) => /* @__PURE__ */ h(KeyedItem, { item })));
}
function App() {
  const [count, setCount] = useState(0);
  const [isReversed, setIsReversed] = useState(false);
  const doubledCount = useMemo(() => count * 2, [count]);
  const keyedItems = useMemo(() => {
    const items = BASE_ITEMS.map((item) => ({
      id: item.id,
      label: `${item.label} / count=${count}`
    }));
    return isReversed ? [...items].reverse() : items;
  }, [count, isReversed]);
  useEffect(() => {
    const title = `mini React count ${count}`;
    document.title = title;
    console.log(`[useEffect] patch finished -> ${title}`);
    return () => {
      console.log(`[useEffect] cleanup before next render -> count ${count}`);
    };
  }, [count, isReversed]);
  const increaseOnce = () => {
    setCount((previousCount) => previousCount + 1);
  };
  const increaseTwiceInOneTick = () => {
    setCount((previousCount) => previousCount + 1);
    setCount((previousCount) => previousCount + 1);
  };
  const toggleOrder = () => {
    setIsReversed((previousValue) => !previousValue);
  };
  return /* @__PURE__ */ h("main", { className: "page" }, /* @__PURE__ */ h("section", { className: "card" }, /* @__PURE__ */ h("h1", { className: "title" }, "mini React Core"), /* @__PURE__ */ h("p", { className: "description" }, "\uC774 \uD654\uBA74\uC740 \uC11C\uBE44\uC2A4\uC6A9 \uB370\uBAA8 \uC571\uC774 \uC544\uB2C8\uB77C core \uB3D9\uC791\uC744 \uD655\uC778\uD558\uAE30 \uC704\uD55C \uCD5C\uC18C \uB80C\uB354\uB9C1 \uACB0\uACFC\uC774\uB2E4."), /* @__PURE__ */ h(SectionTitle, { text: "Root State" }), /* @__PURE__ */ h("div", { className: "info-list" }, /* @__PURE__ */ h(InfoRow, { label: "count", value: String(count) }), /* @__PURE__ */ h(InfoRow, { label: "memo(count * 2)", value: String(doubledCount) }), /* @__PURE__ */ h(
    InfoRow,
    {
      label: "list order",
      value: isReversed ? "reversed" : "normal"
    }
  )), /* @__PURE__ */ h("div", { className: "button-row" }, /* @__PURE__ */ h("button", { type: "button", onClick: increaseOnce }, "+1"), /* @__PURE__ */ h("button", { type: "button", onClick: increaseTwiceInOneTick }, "+2 in one tick"), /* @__PURE__ */ h("button", { type: "button", onClick: toggleOrder }, "toggle keyed order")), /* @__PURE__ */ h(SectionTitle, { text: "Keyed Children" }), /* @__PURE__ */ h("p", { className: "note" }, "\uC544\uB798 \uBAA9\uB85D\uC740 key(id)\uB97C \uAE30\uC900\uC73C\uB85C \uBE44\uAD50\uB418\uBBC0\uB85C \uC21C\uC11C\uAC00 \uBC14\uB00C\uC5B4\uB3C4 \uAC19\uC740 DOM \uB178\uB4DC\uB97C \uC7AC\uC0AC\uC6A9\uD55C\uB2E4."), /* @__PURE__ */ h(KeyedList, { items: keyedItems }), /* @__PURE__ */ h(SectionTitle, { text: "Fallback Children" }), /* @__PURE__ */ h("p", { className: "note" }, "\uB2E4\uC74C \uBAA9\uB85D\uC740 key\uAC00 \uC5C6\uC5B4\uC11C index \uAE30\uBC18 fallback \uBE44\uAD50\uB97C \uC0AC\uC6A9\uD55C\uB2E4. \uC21C\uC11C \uBCC0\uACBD \uC2DC identity\uB97C \uC815\uD655\uD788 \uBCF4\uC7A5\uD558\uC9C0 \uBABB\uD55C\uB2E4."), /* @__PURE__ */ h(UnkeyedList, { items: keyedItems })));
}
var container = document.getElementById("app");
render(App, container);
//# sourceMappingURL=app.js.map
