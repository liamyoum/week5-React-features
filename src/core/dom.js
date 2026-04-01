import { TEXT_ELEMENT } from "./createElement.js";

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
    if (value === false || value === null || value === undefined) {
      removeDomProperty(dom, name, previousValue);
      return;
    }

    dom.setAttribute("class", String(value));
    return;
  }

  if (name === "style") {
    if (value === false || value === null || value === undefined) {
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

  if (value === false || value === null || value === undefined) {
    removeDomProperty(dom, name, previousValue);
    return;
  }

  if (name in dom && typeof value !== "object" && typeof value !== "function") {
    dom[name] = value;
    return;
  }

  dom.setAttribute(name, String(value));
}

export function getComparableProps(props = {}) {
  const comparableProps = {};

  Object.keys(props).forEach((name) => {
    if (name !== "children" && name !== "key") {
      comparableProps[name] = props[name];
    }
  });

  return comparableProps;
}

export function buildInitialPropChanges(props = {}) {
  const set = Object.entries(getComparableProps(props)).map(([name, value]) => ({
    name,
    value,
    previousValue: undefined,
  }));

  return {
    set,
    remove: [],
  };
}

export function applyPropChanges(dom, propChanges) {
  propChanges.remove.forEach(({ name, previousValue }) => {
    removeDomProperty(dom, name, previousValue);
  });

  propChanges.set.forEach(({ name, value, previousValue }) => {
    setDomProperty(dom, name, value, previousValue);
  });
}

export function createDomNode(vnode) {
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

export function resolveVNode(vnode) {
  if (
    vnode === null ||
    vnode === undefined ||
    vnode === false ||
    vnode === true
  ) {
    return null;
  }

  if (Array.isArray(vnode)) {
    const resolvedChildren = [];

    vnode.forEach((child) => {
      const resolvedChild = resolveVNode(child);

      if (Array.isArray(resolvedChild)) {
        resolvedChildren.push(...resolvedChild.filter(Boolean));
      } else if (resolvedChild) {
        resolvedChildren.push(resolvedChild);
      }
    });

    return resolvedChildren;
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    return {
      type: TEXT_ELEMENT,
      key: null,
      props: {
        nodeValue: String(vnode),
        children: [],
      },
      dom: null,
    };
  }

  if (typeof vnode.type === "function") {
    const renderedVNode = vnode.type(vnode.props || {});
    const resolvedVNode = resolveVNode(renderedVNode);

    if (
      resolvedVNode &&
      !Array.isArray(resolvedVNode) &&
      vnode.key !== null &&
      resolvedVNode.key === null
    ) {
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
      ...(vnode.props || {}),
      children: resolvedChildren,
    },
    dom: null,
  };
}
