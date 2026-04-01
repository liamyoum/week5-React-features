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
var STORAGE_KEY = "mini-react-useless-button-lab-v1";
var customButtonSequence = 0;
var BUTTON_LIBRARY = [
  {
    id: "dramatic-sigh",
    label: "\uB4DC\uB77C\uB9C8\uD2F1 \uD55C\uC228",
    description: "\uC544\uBB34\uB3C4 \uBB3B\uC9C0 \uC54A\uC558\uC9C0\uB9CC \uC624\uB298 \uD558\uB8E8\uAC00 \uD798\uB4E4\uC5C8\uB2E4\uB294 \uBD84\uC704\uAE30\uB97C \uB0C5\uB2C8\uB2E4.",
    actionLabel: "\uD55C\uC228 \uC26C\uAE30",
    accent: "sunset"
  },
  {
    id: "coffee-telepathy",
    label: "\uCEE4\uD53C \uD154\uB808\uD30C\uC2DC",
    description: "\uCE74\uD398\uC778 \uC5C6\uC774 \uCEE4\uD53C\uC758 \uD798\uC744 \uBBFF\uC5B4 \uBCF4\uB294 \uC21C\uC218\uD55C \uC758\uC9C0 \uBC84\uD2BC\uC785\uB2C8\uB2E4.",
    actionLabel: "\uAC04\uC808\uD788 \uBC14\uB77C\uAE30",
    accent: "amber"
  },
  {
    id: "tab-hoarding",
    label: "\uD0ED 48\uAC1C \uC5F4\uAE30",
    description: "\uC0DD\uC0B0\uC131\uC740 \uC5C6\uC9C0\uB9CC \uBE0C\uB77C\uC6B0\uC800\uB294 \uBD84\uBA85 \uBB34\uAC70\uC6CC\uC9D1\uB2C8\uB2E4.",
    actionLabel: "\uD0ED \uB354 \uC313\uAE30",
    accent: "mint"
  },
  {
    id: "meeting-nod",
    label: "\uD68C\uC758 \uC911 \uACE0\uAC1C \uB044\uB355\uC774\uAE30",
    description: "\uC774\uD574\uB294 \uBABB \uD588\uC9C0\uB9CC \uC77C\uB2E8 \uACF5\uAC10\uD558\uB294 \uCC99\uD560 \uB54C \uC4F0\uB294 \uBC84\uD2BC\uC785\uB2C8\uB2E4.",
    actionLabel: "\uACE0\uAC1C \uB044\uB355\uC774\uAE30",
    accent: "lavender"
  },
  {
    id: "keyboard-polish",
    label: "\uD0A4\uBCF4\uB4DC \uB2E6\uB294 \uCC99",
    description: "\uD560 \uC77C \uB300\uC2E0 \uCC45\uC0C1 \uC815\uB9AC\uC5D0 \uBAB0\uC785\uD558\uB294 \uC804\uD615\uC801\uC778 \uC6B0\uD68C \uC804\uB7B5\uC785\uB2C8\uB2E4.",
    actionLabel: "\uBC88\uCA4D \uB2E6\uAE30",
    accent: "rose"
  },
  {
    id: "window-stare",
    label: "\uCC3D\uBC16 \uBCF4\uAE30",
    description: "\uC544\uC774\uB514\uC5B4\uAC00 \uC62C \uAC83 \uAC19\uC9C0\uB9CC \uB300\uAC1C\uB294 \uAD6C\uB984\uB9CC \uAD6C\uACBD\uD558\uAC8C \uB429\uB2C8\uB2E4.",
    actionLabel: "\uD558\uB298 \uBC14\uB77C\uBCF4\uAE30",
    accent: "sky"
  },
  {
    id: "badge-rearrange",
    label: "\uC774\uBAA8\uC9C0 \uC815\uB82C",
    description: "\uC911\uC694\uD558\uC9C0 \uC54A\uC740 \uC6B0\uC120\uC21C\uC704\uB97C \uC9C0\uB098\uCE58\uAC8C \uC9C4\uC9C0\uD558\uAC8C \uC815\uB9AC\uD569\uB2C8\uB2E4.",
    actionLabel: "\uC815\uB82C \uB2E4\uC2DC \uD558\uAE30",
    accent: "grape"
  },
  {
    id: "vibe-check",
    label: "\uAC11\uC790\uAE30 \uBC14\uC774\uBE0C \uCCB4\uD06C",
    description: "\uBB38\uC81C \uD574\uACB0\uC740 \uC5C6\uC9C0\uB9CC \uBD84\uC704\uAE30\uB294 \uC870\uAE08 \uB354 \uBCF5\uC7A1\uD574\uC9D1\uB2C8\uB2E4.",
    actionLabel: "\uBD84\uC704\uAE30 \uCE21\uC815",
    accent: "lime"
  }
];
function createDefaultButtons() {
  return BUTTON_LIBRARY.slice(0, 6).map((item) => ({
    ...item,
    presses: 0
  }));
}
function createDefaultLabState() {
  return {
    buttons: createDefaultButtons(),
    sortMode: "lab",
    draftLabel: "",
    lastPressedId: null,
    chaosCount: 0
  };
}
function slugifyLabel(label) {
  return label.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-가-힣]/g, "").replace(/\-+/g, "-");
}
function findNextSuggestion(buttons) {
  const usedIds = new Set(buttons.map((button) => button.id));
  return BUTTON_LIBRARY.find((button) => !usedIds.has(button.id)) ?? null;
}
function shuffleButtons(buttons) {
  const nextButtons = [...buttons];
  for (let index = nextButtons.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporary = nextButtons[index];
    nextButtons[index] = nextButtons[randomIndex];
    nextButtons[randomIndex] = temporary;
  }
  return nextButtons;
}
function loadInitialLabState() {
  if (typeof localStorage === "undefined") {
    return createDefaultLabState();
  }
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return createDefaultLabState();
    }
    const parsedState = JSON.parse(rawState);
    if (!Array.isArray(parsedState.buttons)) {
      return createDefaultLabState();
    }
    return {
      buttons: parsedState.buttons.map((button, index) => ({
        id: typeof button.id === "string" ? button.id : `restored-${index}`,
        label: typeof button.label === "string" ? button.label : `\uBCF5\uC6D0\uB41C \uBC84\uD2BC ${index + 1}`,
        description: typeof button.description === "string" ? button.description : "\uC774 \uBC84\uD2BC\uC740 \uACFC\uAC70\uC758 \uC2E4\uD5D8 \uB85C\uADF8\uC5D0\uC11C \uB3CC\uC544\uC654\uC2B5\uB2C8\uB2E4.",
        actionLabel: typeof button.actionLabel === "string" ? button.actionLabel : "\uAD1C\uD788 \uB204\uB974\uAE30",
        accent: typeof button.accent === "string" ? button.accent : BUTTON_LIBRARY[index % BUTTON_LIBRARY.length].accent,
        presses: Number.isFinite(button.presses) ? button.presses : 0
      })),
      sortMode: parsedState.sortMode === "popular" || parsedState.sortMode === "alphabet" ? parsedState.sortMode : "lab",
      draftLabel: "",
      lastPressedId: typeof parsedState.lastPressedId === "string" ? parsedState.lastPressedId : null,
      chaosCount: Number.isFinite(parsedState.chaosCount) ? parsedState.chaosCount : 0
    };
  } catch (_error) {
    return createDefaultLabState();
  }
}
function createCustomButton(label, index) {
  const accent = BUTTON_LIBRARY[index % BUTTON_LIBRARY.length].accent;
  const trimmedLabel = label.trim();
  customButtonSequence += 1;
  return {
    id: `custom-${slugifyLabel(trimmedLabel) || "button"}-${Date.now()}-${customButtonSequence}`,
    label: trimmedLabel,
    description: `"${trimmedLabel}" \uC5F0\uAD6C\uAC00 \uC0AC\uD68C\uC5D0 \uBBF8\uCE58\uB294 \uC601\uD5A5\uC740 \uC544\uC9C1 \uC544\uBB34\uB3C4 \uBAA8\uB985\uB2C8\uB2E4.`,
    actionLabel: "\uAD1C\uD788 \uB20C\uB7EC\uBCF4\uAE30",
    accent,
    presses: 0
  };
}
function HeroBadge({ text }) {
  return /* @__PURE__ */ h("span", { className: "hero-badge" }, text);
}
function StatCard({ label, value, detail }) {
  return /* @__PURE__ */ h("article", { className: "stat-card" }, /* @__PURE__ */ h("p", { className: "stat-label" }, label), /* @__PURE__ */ h("strong", { className: "stat-value" }, value), /* @__PURE__ */ h("p", { className: "stat-detail" }, detail));
}
function SortChip({ label, isActive, onClick }) {
  return /* @__PURE__ */ h(
    "button",
    {
      type: "button",
      className: isActive ? "chip-button chip-button--active" : "chip-button",
      onClick
    },
    label
  );
}
function OrderPill({ text }) {
  return /* @__PURE__ */ h("span", { className: "order-pill" }, text);
}
function ButtonCard({ button, rank, isTop, onPress, onRetire }) {
  return /* @__PURE__ */ h("article", { className: `button-card accent-${button.accent}` }, /* @__PURE__ */ h("div", { className: "button-card__header" }, /* @__PURE__ */ h("span", { className: "button-card__rank" }, "#", rank), /* @__PURE__ */ h("span", { className: isTop ? "button-card__badge is-top" : "button-card__badge" }, isTop ? "\uAE08\uC8FC\uC758 \uC4F8\uB370\uC5C6\uC74C" : button.actionLabel)), /* @__PURE__ */ h("h3", { className: "button-card__title" }, button.label), /* @__PURE__ */ h("p", { className: "button-card__description" }, button.description), /* @__PURE__ */ h("div", { className: "button-card__meter" }, /* @__PURE__ */ h("span", null, "\uB20C\uB9B0 \uD69F\uC218"), /* @__PURE__ */ h("strong", null, button.presses, "\uD68C")), /* @__PURE__ */ h("div", { className: "button-card__actions" }, /* @__PURE__ */ h("button", { type: "button", className: "primary-button", onClick: onPress }, button.actionLabel), /* @__PURE__ */ h("button", { type: "button", className: "secondary-button", onClick: onRetire }, "\uC5F0\uAD6C \uC885\uB8CC")));
}
function EmptyState({ onReset }) {
  return /* @__PURE__ */ h("div", { className: "empty-state" }, /* @__PURE__ */ h("h3", null, "\uC5F0\uAD6C \uB300\uC0C1\uC774 \uBAA8\uB450 \uC0AC\uB77C\uC84C\uC2B5\uB2C8\uB2E4."), /* @__PURE__ */ h("p", null, "\uC0C8 \uBC84\uD2BC\uC744 \uB9CC\uB4E4\uAC70\uB098 \uAE30\uBCF8 \uC5F0\uAD6C\uC2E4\uC744 \uBCF5\uC6D0\uD574\uC11C \uB2E4\uC2DC \uBB34\uC758\uBBF8\uB97C \uC313\uC544 \uBCF4\uC138\uC694."), /* @__PURE__ */ h("button", { type: "button", className: "primary-button", onClick: onReset }, "\uAE30\uBCF8 \uC5F0\uAD6C\uC2E4 \uBCF5\uC6D0"));
}
function App() {
  console.count("[render] App");
  const [labState, setLabState] = useState(() => loadInitialLabState());
  const visibleButtons = useMemo(() => {
    console.count("[memo] visibleButtons");
    if (labState.sortMode === "popular") {
      return [...labState.buttons].sort((left, right) => {
        if (right.presses !== left.presses) {
          return right.presses - left.presses;
        }
        return left.label.localeCompare(right.label, "ko");
      });
    }
    if (labState.sortMode === "alphabet") {
      return [...labState.buttons].sort(
        (left, right) => left.label.localeCompare(right.label, "ko")
      );
    }
    return labState.buttons;
  }, [labState.buttons, labState.sortMode]);
  const dashboard = useMemo(() => {
    console.count("[memo] dashboard");
    const totalPresses = labState.buttons.reduce(
      (sum, button) => sum + button.presses,
      0
    );
    const topButton = [...labState.buttons].sort((left, right) => {
      if (right.presses !== left.presses) {
        return right.presses - left.presses;
      }
      return left.label.localeCompare(right.label, "ko");
    })[0] ?? null;
    const mostIgnoredButton = [...labState.buttons].sort((left, right) => {
      if (left.presses !== right.presses) {
        return left.presses - right.presses;
      }
      return left.label.localeCompare(right.label, "ko");
    })[0] ?? null;
    const lastPressedButton = labState.buttons.find((button) => button.id === labState.lastPressedId) ?? null;
    return {
      totalPresses,
      topButton,
      mostIgnoredButton,
      lastPressedButton,
      buttonCount: labState.buttons.length
    };
  }, [labState.buttons, labState.lastPressedId]);
  const nextSuggestion = useMemo(
    () => findNextSuggestion(labState.buttons),
    [labState.buttons]
  );
  const headline = useMemo(() => {
    if (!dashboard.topButton || dashboard.totalPresses === 0) {
      return "\uC624\uB298\uC758 \uC5F0\uAD6C \uC8FC\uC81C\uB294 \uC544\uC9C1 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uC544\uBB34 \uBC84\uD2BC\uC774\uB098 \uB20C\uB7EC \uBCF4\uC138\uC694.";
    }
    return `"${dashboard.topButton.label}"\uAC00 ${dashboard.topButton.presses}\uD68C\uB85C \uC120\uB450\uC785\uB2C8\uB2E4. \uC608\uC0C1\uB300\uB85C \uC544\uBB34 \uC758\uBBF8\uB294 \uC5C6\uC2B5\uB2C8\uB2E4.`;
  }, [dashboard.topButton, dashboard.totalPresses]);
  useEffect(() => {
    const title = dashboard.totalPresses === 0 ? "\uC4F8\uB370\uC5C6\uB294 \uBC84\uD2BC \uC5F0\uAD6C\uC18C" : `\uC4F8\uB370\uC5C6\uB294 \uD074\uB9AD ${dashboard.totalPresses}\uD68C`;
    document.title = title;
    console.log(`[useEffect] patch finished -> ${title}`);
    return () => {
      console.log(
        `[useEffect] cleanup before next render -> total ${dashboard.totalPresses}`
      );
    };
  }, [dashboard.totalPresses]);
  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        buttons: labState.buttons,
        sortMode: labState.sortMode,
        lastPressedId: labState.lastPressedId,
        chaosCount: labState.chaosCount
      })
    );
  }, [labState.buttons, labState.sortMode, labState.lastPressedId, labState.chaosCount]);
  const pressButton = (buttonId) => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: previousState.buttons.map(
        (button) => button.id === buttonId ? { ...button, presses: button.presses + 1 } : button
      ),
      lastPressedId: buttonId
    }));
  };
  const retireButton = (buttonId) => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: previousState.buttons.filter((button) => button.id !== buttonId),
      lastPressedId: previousState.lastPressedId === buttonId ? null : previousState.lastPressedId
    }));
  };
  const updateDraftLabel = (event) => {
    setLabState((previousState) => ({
      ...previousState,
      draftLabel: event.target.value
    }));
  };
  const addCustomButton = (event) => {
    event.preventDefault();
    setLabState((previousState) => {
      const trimmedLabel = previousState.draftLabel.trim();
      if (!trimmedLabel) {
        return previousState;
      }
      return {
        ...previousState,
        buttons: [
          createCustomButton(trimmedLabel, previousState.buttons.length),
          ...previousState.buttons
        ],
        draftLabel: "",
        sortMode: "lab"
      };
    });
  };
  const addSuggestedButton = () => {
    setLabState((previousState) => {
      const suggestion = findNextSuggestion(previousState.buttons);
      if (!suggestion) {
        return previousState;
      }
      return {
        ...previousState,
        buttons: [...previousState.buttons, { ...suggestion, presses: 0 }],
        sortMode: "lab"
      };
    });
  };
  const triggerChaosShuffle = () => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: shuffleButtons(previousState.buttons),
      sortMode: "lab",
      chaosCount: previousState.chaosCount + 1
    }));
  };
  const resetLab = () => {
    setLabState(createDefaultLabState());
  };
  return /* @__PURE__ */ h("main", { className: "page" }, /* @__PURE__ */ h("section", { className: "hero-card" }, /* @__PURE__ */ h("div", { className: "hero-card__body" }, /* @__PURE__ */ h("div", { className: "hero-copy" }, /* @__PURE__ */ h("div", { className: "hero-badges" }, /* @__PURE__ */ h(HeroBadge, { text: "mini React Demo" }), /* @__PURE__ */ h(HeroBadge, { text: "state + hooks + keyed diff" })), /* @__PURE__ */ h("h1", { className: "hero-title" }, "\uC4F8\uB370\uC5C6\uB294 \uBC84\uD2BC \uC5F0\uAD6C\uC18C"), /* @__PURE__ */ h("p", { className: "hero-description" }, "\uB204\uB978\uB2E4\uACE0 \uD574\uC11C \uC0B6\uC774 \uB098\uC544\uC9C0\uC9C4 \uC54A\uC9C0\uB9CC, state\uC640 diff\uC640 patch\uAC00 \uC81C\uB300\uB85C \uC6C0\uC9C1\uC774\uB294\uC9C0\uB294 \uD655\uC2E4\uD558\uAC8C \uBCF4\uC5EC \uC8FC\uB294 \uC2E4\uD5D8\uC6A9 \uC6F9\uC0AC\uC774\uD2B8\uC785\uB2C8\uB2E4."), /* @__PURE__ */ h("p", { className: "hero-headline" }, headline)), /* @__PURE__ */ h("div", { className: "hero-aside" }, /* @__PURE__ */ h("p", { className: "aside-label" }, "\uB9C8\uC9C0\uB9C9 \uAD00\uCE21"), /* @__PURE__ */ h("strong", { className: "aside-value" }, dashboard.lastPressedButton ? dashboard.lastPressedButton.label : "\uC544\uC9C1 \uC544\uBB34\uB3C4 \uB204\uB974\uC9C0 \uC54A\uC74C"), /* @__PURE__ */ h("p", { className: "aside-note" }, "\uD63C\uB3C8 \uC154\uD50C ", labState.chaosCount, "\uD68C, \uC815\uB82C \uBAA8\uB4DC ", labState.sortMode)))), /* @__PURE__ */ h("section", { className: "stats-grid" }, /* @__PURE__ */ h(
    StatCard,
    {
      label: "\uCD1D \uC4F8\uB370\uC5C6\uB294 \uD074\uB9AD",
      value: `${dashboard.totalPresses}\uD68C`,
      detail: "\uBAA8\uB4E0 \uBC84\uD2BC\uC758 \uB204\uC801 \uC2E4\uD5D8 \uD69F\uC218"
    }
  ), /* @__PURE__ */ h(
    StatCard,
    {
      label: "\uB4F1\uB85D\uB41C \uBC84\uD2BC",
      value: `${dashboard.buttonCount}\uAC1C`,
      detail: "\uD604\uC7AC \uC5F0\uAD6C\uC2E4\uC5D0 \uB0A8\uC544 \uC788\uB294 \uC2E4\uD5D8 \uB300\uC0C1"
    }
  ), /* @__PURE__ */ h(
    StatCard,
    {
      label: "\uAC00\uC7A5 \uB728\uAC70\uC6B4 \uBC84\uD2BC",
      value: dashboard.topButton ? dashboard.topButton.label : "\uC544\uC9C1 \uC5C6\uC74C",
      detail: dashboard.topButton ? `${dashboard.topButton.presses}\uD68C\uB85C \uC120\uB450` : "\uCCAB \uD074\uB9AD\uC744 \uAE30\uB2E4\uB9AC\uB294 \uC911"
    }
  ), /* @__PURE__ */ h(
    StatCard,
    {
      label: "\uAC00\uC7A5 \uC870\uC6A9\uD55C \uBC84\uD2BC",
      value: dashboard.mostIgnoredButton ? dashboard.mostIgnoredButton.label : "\uC5C6\uC74C",
      detail: dashboard.mostIgnoredButton ? `${dashboard.mostIgnoredButton.presses}\uD68C\uB9CC \uB20C\uB9BC` : "\uBAA8\uB4E0 \uBC84\uD2BC\uC774 \uC0AC\uB77C\uC84C\uC2B5\uB2C8\uB2E4"
    }
  )), /* @__PURE__ */ h("section", { className: "layout-grid" }, /* @__PURE__ */ h("aside", { className: "side-panel" }, /* @__PURE__ */ h("div", { className: "panel-card" }, /* @__PURE__ */ h("p", { className: "panel-label" }, "\uC815\uB82C \uBAA8\uB4DC"), /* @__PURE__ */ h("div", { className: "chip-group" }, /* @__PURE__ */ h(
    SortChip,
    {
      label: "\uC2E4\uD5D8 \uC21C",
      isActive: labState.sortMode === "lab",
      onClick: () => setLabState((previousState) => ({
        ...previousState,
        sortMode: "lab"
      }))
    }
  ), /* @__PURE__ */ h(
    SortChip,
    {
      label: "\uC778\uAE30 \uC21C",
      isActive: labState.sortMode === "popular",
      onClick: () => setLabState((previousState) => ({
        ...previousState,
        sortMode: "popular"
      }))
    }
  ), /* @__PURE__ */ h(
    SortChip,
    {
      label: "\uC774\uB984 \uC21C",
      isActive: labState.sortMode === "alphabet",
      onClick: () => setLabState((previousState) => ({
        ...previousState,
        sortMode: "alphabet"
      }))
    }
  )), /* @__PURE__ */ h("p", { className: "panel-label" }, "\uC5F0\uAD6C\uC2E4 \uC870\uC791"), /* @__PURE__ */ h("div", { className: "stacked-actions" }, /* @__PURE__ */ h("button", { type: "button", className: "primary-button", onClick: triggerChaosShuffle }, "\uD63C\uB3C8 \uC154\uD50C \uC2E4\uD589"), /* @__PURE__ */ h(
    "button",
    {
      type: "button",
      className: "secondary-button",
      onClick: addSuggestedButton,
      disabled: !nextSuggestion
    },
    nextSuggestion ? `${nextSuggestion.label} \uCD94\uAC00` : "\uCD94\uCC9C \uBC84\uD2BC \uC18C\uC9C4"
  ), /* @__PURE__ */ h("button", { type: "button", className: "secondary-button", onClick: resetLab }, "\uAE30\uBCF8 \uC5F0\uAD6C\uC2E4 \uCD08\uAE30\uD654"))), /* @__PURE__ */ h("div", { className: "panel-card" }, /* @__PURE__ */ h("p", { className: "panel-label" }, "\uC0C8 \uBC84\uD2BC \uC81C\uC870"), /* @__PURE__ */ h("form", { className: "composer-form", onSubmit: addCustomButton }, /* @__PURE__ */ h(
    "input",
    {
      className: "composer-input",
      type: "text",
      value: labState.draftLabel,
      onInput: updateDraftLabel,
      placeholder: "\uC608: \uAD1C\uD788 \uC0C8\uB85C\uACE0\uCE68",
      autoComplete: "off"
    }
  ), /* @__PURE__ */ h("button", { type: "submit", className: "primary-button" }, "\uBC84\uD2BC \uC0DD\uC131")), /* @__PURE__ */ h("p", { className: "panel-note" }, "\uB8E8\uD2B8 state\uC5D0\uC11C\uB9CC \uC785\uB825\uAC12\uC744 \uAD00\uB9AC\uD558\uACE0, submit \uC2DC CREATE patch\uAC00 \uBC1C\uC0DD\uD569\uB2C8\uB2E4.")), /* @__PURE__ */ h("div", { className: "panel-card" }, /* @__PURE__ */ h("p", { className: "panel-label" }, "\uD604\uC7AC \uB80C\uB354 \uC21C\uC11C"), /* @__PURE__ */ h("div", { className: "order-strip" }, visibleButtons.map((button) => /* @__PURE__ */ h(OrderPill, { key: button.id, text: button.label }))), /* @__PURE__ */ h("p", { className: "panel-note" }, "\uAC01 \uCE74\uB4DC\uB294 stable key\uB97C \uC0AC\uC6A9\uD558\uBBC0\uB85C \uC21C\uC11C\uB97C \uBC14\uAFD4\uB3C4 \uAC00\uB2A5\uD55C \uD55C \uAC19\uC740 DOM \uB178\uB4DC\uB97C \uC7AC\uC0AC\uC6A9\uD569\uB2C8\uB2E4."))), /* @__PURE__ */ h("section", { className: "button-grid" }, visibleButtons.length === 0 ? /* @__PURE__ */ h(EmptyState, { onReset: resetLab }) : visibleButtons.map((button, index) => /* @__PURE__ */ h(
    ButtonCard,
    {
      key: button.id,
      button,
      rank: index + 1,
      isTop: dashboard.topButton ? dashboard.topButton.id === button.id : false,
      onPress: () => pressButton(button.id),
      onRetire: () => retireButton(button.id)
    }
  )))));
}
var container = document.getElementById("app");
render(App, container);
//# sourceMappingURL=app.js.map
