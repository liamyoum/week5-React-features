/**
 * Virtual DOM을 실제 DOM으로 바꾸고, props를 DOM에 반영하는 유틸리티 모음이다.
 * 자식 함수형 컴포넌트는 여기서 순수 함수처럼 실행되어 host vnode로 변환된다.
 */
import { TEXT_ELEMENT } from "./createElement.js";

function isEventProp(name) {
  return name.startsWith("on");
}

function getEventName(name) {
  return name.slice(2).toLowerCase();
}

function setStyle(dom, value = {}, previousValue = {}) {
  Object.keys(previousValue).forEach((styleName) => {
    if (!(styleName in value)) {
      dom.style[styleName] = "";
    }
  });

  Object.keys(value).forEach((styleName) => {
    dom.style[styleName] = value[styleName];
  });
}

function removeDomProperty(dom, name, previousValue) {
  if (name === "className") {
    dom.removeAttribute("class");
    return;
  }

  if (name === "style" && previousValue && typeof previousValue === "object") {
    Object.keys(previousValue).forEach((styleName) => {
      dom.style[styleName] = "";
    });
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
      // DOM property에 직접 빈 값을 넣을 수 없는 경우를 대비한 보호 코드이다.
    }
  }

  dom.removeAttribute(name);
}

function setDomProperty(dom, name, value, previousValue) {
  if (name === "className") {
    dom.setAttribute("class", value);
    return;
  }

  if (name === "style" && value && typeof value === "object") {
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

// host vnode를 실제 DOM 노드로 바꾸는 함수이다.
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

// 함수형 컴포넌트를 실행해 최종 host vnode 트리로 평탄화한다.
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
