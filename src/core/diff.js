/**
 * 이전 Virtual DOM과 새로운 Virtual DOM을 비교해 patch에 필요한 정보만 만든다.
 * children은 key를 우선 사용하고, key가 없을 때만 남은 unkeyed child를 순서대로 매칭한다.
 */
import { TEXT_ELEMENT } from "./createElement.js";
import { getComparableProps } from "./dom.js";

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
        previousValue: previousProps[name],
      });
    }
  });

  Object.keys(nextProps).forEach((name) => {
    if (!Object.is(previousProps[name], nextProps[name])) {
      set.push({
        name,
        value: nextProps[name],
        previousValue: previousProps[name],
      });
    }
  });

  return { set, remove };
}

function hasPropChanges(propChanges) {
  return propChanges.set.length > 0 || propChanges.remove.length > 0;
}

function diffChildren(oldChildren = [], newChildren = []) {
  const childPatches = [];
  const oldKeyedChildren = new Map();
  const oldUnkeyedChildren = [];
  const usedOldIndices = new Set();

  oldChildren.forEach((child, index) => {
    if (child.key !== null) {
      oldKeyedChildren.set(child.key, { child, index });
      return;
    }

    oldUnkeyedChildren.push({ child, index });
  });

  let unkeyedCursor = 0;

  newChildren.forEach((newChild) => {
    let matchedEntry = null;

    if (newChild.key !== null) {
      matchedEntry = oldKeyedChildren.get(newChild.key) ?? null;
    } else if (unkeyedCursor < oldUnkeyedChildren.length) {
      matchedEntry = oldUnkeyedChildren[unkeyedCursor];
      unkeyedCursor += 1;
    }

    if (matchedEntry) {
      usedOldIndices.add(matchedEntry.index);
      childPatches.push(diff(matchedEntry.child, newChild));
      return;
    }

    childPatches.push({
      type: "CREATE",
      oldVNode: null,
      newVNode: newChild,
    });
  });

  oldChildren.forEach((oldChild, index) => {
    if (!usedOldIndices.has(index)) {
      childPatches.push({
        type: "REMOVE",
        oldVNode: oldChild,
        newVNode: null,
      });
    }
  });

  return childPatches;
}

// 이전 vnode와 새 vnode를 비교해 patch 단계에 필요한 정보만 만든다.
export function diff(oldVNode, newVNode) {
  if (!oldVNode && newVNode) {
    return {
      type: "CREATE",
      oldVNode: null,
      newVNode,
    };
  }

  if (oldVNode && !newVNode) {
    return {
      type: "REMOVE",
      oldVNode,
      newVNode: null,
    };
  }

  if (shouldReplace(oldVNode, newVNode)) {
    return {
      type: "REPLACE",
      oldVNode,
      newVNode,
    };
  }

  if (newVNode.type === TEXT_ELEMENT) {
    if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
      return {
        type: "TEXT",
        oldVNode,
        newVNode,
      };
    }

    newVNode.dom = oldVNode.dom;

    return {
      type: "NONE",
      oldVNode,
      newVNode,
    };
  }

  const propChanges = diffProps(oldVNode.props, newVNode.props);
  const childPatches = diffChildren(
    oldVNode.props.children,
    newVNode.props.children,
  );
  const hasChildChanges = childPatches.some(
    (childPatch) => childPatch.type !== "NONE",
  );

  if (!hasPropChanges(propChanges) && !hasChildChanges) {
    newVNode.dom = oldVNode.dom;

    return {
      type: "NONE",
      oldVNode,
      newVNode,
      propChanges,
      childPatches,
    };
  }

  return {
    type: "UPDATE",
    oldVNode,
    newVNode,
    propChanges,
    childPatches,
  };
}
