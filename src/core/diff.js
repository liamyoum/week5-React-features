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

function isKeyedChild(child) {
  return child && child.key !== null;
}

function findFallbackOldChild(oldChildren, usedOldIndices, startIndex) {
  const directChild = oldChildren[startIndex];

  if (
    directChild &&
    !isKeyedChild(directChild) &&
    !usedOldIndices.has(startIndex)
  ) {
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
  const oldKeyedChildren = new Map();
  const usedOldIndices = new Set();

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
