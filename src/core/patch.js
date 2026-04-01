(() => {
  const learningReact = (window.LearningReact = window.LearningReact || {});
  const TEXT_NODE = 3;

  /**
   * VNode를 실제 DOM 노드로 복원합니다.
   */
  function createRealNode(vnode) {
    if (vnode.type === "text") {
      return document.createTextNode(vnode.value ?? "");
    }

    const element = document.createElement(vnode.tagName ?? "div");
    applyPropChanges(element, vnode.props ?? {});

    for (const childVNode of vnode.children ?? []) {
      element.appendChild(createRealNode(childVNode));
    }

    return element;
  }

  /**
   * patch 배열을 실제 DOM 변경으로 실행합니다.
   */
  function applyPatches(liveRoot, patches) {
    if (!(liveRoot instanceof HTMLElement)) {
      throw new TypeError("HTMLElement 루트가 필요합니다.");
    }

    const orderedPatches = [
      ...patches.filter((patch) => patch.type === "PROPS" || patch.type === "TEXT"),
      ...patches.filter((patch) => patch.type === "REPLACE"),
      ...patches
        .filter((patch) => patch.type === "REMOVE")
        .sort((left, right) => comparePathsDescending(left.path, right.path)),
      ...patches
        .filter((patch) => patch.type === "INSERT")
        .sort((left, right) => comparePathsAscending(left.path, right.path))
    ];

    for (const patch of orderedPatches) {
      switch (patch.type) {
        case "REPLACE":
          applyReplacePatch(liveRoot, patch);
          break;
        case "PROPS":
          applyPropsPatch(liveRoot, patch);
          break;
        case "TEXT":
          applyTextPatch(liveRoot, patch);
          break;
        case "INSERT":
          applyInsertPatch(liveRoot, patch);
          break;
        case "REMOVE":
          applyRemovePatch(liveRoot, patch);
          break;
        default:
          throw new Error(`지원하지 않는 patch 타입입니다: ${patch.type}`);
      }
    }
  }

  function applyReplacePatch(liveRoot, patch) {
    const nextNode = createRealNode(/** @type {any} */ (patch.payload));
    const targetNode = getNodeByPath(liveRoot, patch.path);

    if (patch.path.length === 0) {
      if (targetNode) {
        liveRoot.replaceChild(nextNode, targetNode);
      } else {
        liveRoot.appendChild(nextNode);
      }

      return;
    }

    if (!targetNode?.parentNode) {
      throw new Error(`REPLACE 대상 노드를 찾지 못했습니다: ${formatPath(patch.path)}`);
    }

    targetNode.parentNode.replaceChild(nextNode, targetNode);
  }

  function applyPropsPatch(liveRoot, patch) {
    const targetNode = getNodeByPath(liveRoot, patch.path);

    if (!(targetNode instanceof Element)) {
      throw new Error(`PROPS 대상이 Element가 아닙니다: ${formatPath(patch.path)}`);
    }

    applyPropChanges(targetNode, /** @type {Record<string, string | null>} */ (patch.payload));
  }

  function applyTextPatch(liveRoot, patch) {
    const targetNode = getNodeByPath(liveRoot, patch.path);

    if (!targetNode || targetNode.nodeType !== TEXT_NODE) {
      throw new Error(`TEXT 대상이 Text node가 아닙니다: ${formatPath(patch.path)}`);
    }

    targetNode.textContent = String(patch.payload ?? "");
  }

  function applyInsertPatch(liveRoot, patch) {
    const nextNode = createRealNode(/** @type {any} */ (patch.payload));

    if (patch.path.length === 0) {
      liveRoot.appendChild(nextNode);
      return;
    }

    const parentPath = patch.path.slice(0, -1);
    const parentNode = getNodeByPath(liveRoot, parentPath);
    const insertIndex = patch.path[patch.path.length - 1];

    if (!(parentNode instanceof Element)) {
      throw new Error(`INSERT 부모 노드를 찾지 못했습니다: ${formatPath(parentPath)}`);
    }

    parentNode.insertBefore(nextNode, parentNode.childNodes[insertIndex] ?? null);
  }

  function applyRemovePatch(liveRoot, patch) {
    const targetNode = getNodeByPath(liveRoot, patch.path);

    if (targetNode?.parentNode) {
      targetNode.parentNode.removeChild(targetNode);
    }
  }

  function applyPropChanges(element, propChanges) {
    for (const [name, value] of Object.entries(propChanges)) {
      if (value === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    }
  }

  function getNodeByPath(liveRoot, path) {
    let currentNode = liveRoot.firstChild;

    if (!currentNode) {
      return null;
    }

    if (path.length === 0) {
      return currentNode;
    }

    for (const index of path) {
      currentNode = currentNode.childNodes[index];

      if (!currentNode) {
        return null;
      }
    }

    return currentNode;
  }

  function comparePathsAscending(left, right) {
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = left[index] ?? -1;
      const rightValue = right[index] ?? -1;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }
    }

    return left.length - right.length;
  }

  function comparePathsDescending(left, right) {
    return comparePathsAscending(right, left);
  }

  function formatPath(path) {
    return path.length === 0 ? "root" : path.join(".");
  }

  learningReact.patch = {
    applyPatches,
    createRealNode
  };
})();
