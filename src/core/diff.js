(() => {
  const learningReact = (window.LearningReact = window.LearningReact || {});

  /**
   * 두 VNode 트리를 비교해 patch 배열을 만듭니다.
   */
  function diffTrees(oldTree, newTree) {
    return diffNode(oldTree, newTree, []);
  }

  /**
   * 같은 요소의 props를 비교해 바뀐 값만 남깁니다.
   */
  function diffProps(oldProps = {}, newProps = {}) {
    const changes = {};

    for (const key of Object.keys(oldProps)) {
      if (!(key in newProps)) {
        changes[key] = null;
      }
    }

    for (const key of Object.keys(newProps)) {
      if (oldProps[key] !== newProps[key]) {
        changes[key] = newProps[key];
      }
    }

    return changes;
  }

  function diffNode(oldNode, newNode, path) {
    if (!oldNode && newNode) {
      return [{ type: "INSERT", path, payload: newNode }];
    }

    if (oldNode && !newNode) {
      return [{ type: "REMOVE", path, payload: null }];
    }

    if (!oldNode || !newNode) {
      return [];
    }

    if (shouldReplaceNode(oldNode, newNode)) {
      return [{ type: "REPLACE", path, payload: newNode }];
    }

    if (oldNode.type === "text" && newNode.type === "text") {
      return oldNode.value !== newNode.value
        ? [{ type: "TEXT", path, payload: newNode.value ?? "" }]
        : [];
    }

    const patches = [];
    const propChanges = diffProps(oldNode.props ?? {}, newNode.props ?? {});

    if (Object.keys(propChanges).length > 0) {
      patches.push({
        type: "PROPS",
        path,
        payload: propChanges
      });
    }

    const oldChildren = oldNode.children ?? [];
    const newChildren = newNode.children ?? [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let index = 0; index < maxLength; index += 1) {
      patches.push(...diffNode(oldChildren[index], newChildren[index], [...path, index]));
    }

    return patches;
  }

  function shouldReplaceNode(oldNode, newNode) {
    if (oldNode.type !== newNode.type) {
      return true;
    }

    if (oldNode.type === "text") {
      return false;
    }

    return oldNode.tagName !== newNode.tagName;
  }

  learningReact.diff = {
    diffTrees,
    diffProps
  };
})();
