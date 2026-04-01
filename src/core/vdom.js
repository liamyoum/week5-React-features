(() => {
  const learningReact = (window.LearningReact = window.LearningReact || {});

  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;
  const COMMENT_NODE = 8;

  /**
   * HTML 문자열을 VNode 트리로 바꿉니다.
   * 1. `<template>`로 HTML을 파싱합니다.
   * 2. 의미 있는 루트 요소 하나만 허용합니다.
   * 3. 루트 DOM 노드를 재귀적으로 순수 객체로 바꿉니다.
   */
  function createVNodeFromHTML(html) {
    if (typeof html !== "string") {
      throw new TypeError("HTML 문자열만 VNode로 변환할 수 있습니다.");
    }

    const template = document.createElement("template");
    template.innerHTML = html.trim();

    const rootNodes = Array.from(template.content.childNodes).filter(isMeaningfulNode);

    if (rootNodes.length !== 1) {
      throw new Error("HTML은 의미 있는 루트 요소를 하나만 가져야 합니다.");
    }

    if (rootNodes[0].nodeType !== ELEMENT_NODE) {
      throw new Error("루트 노드는 텍스트가 아니라 HTML 요소여야 합니다.");
    }

    return createVNodeFromDOMNode(rootNodes[0]);
  }

  /**
   * 실제 DOM 노드 하나를 VNode 객체 하나로 바꿉니다.
   */
  function createVNodeFromDOMNode(domNode) {
    if (domNode.nodeType === TEXT_NODE) {
      return {
        type: "text",
        value: domNode.textContent ?? ""
      };
    }

    if (domNode.nodeType !== ELEMENT_NODE) {
      throw new Error(`지원하지 않는 nodeType입니다: ${domNode.nodeType}`);
    }

    const element = /** @type {Element} */ (domNode);

    return {
      type: "element",
      tagName: element.tagName.toLowerCase(),
      props: collectProps(element),
      children: Array.from(element.childNodes)
        .filter(isMeaningfulNode)
        .map(createVNodeFromDOMNode)
    };
  }

  function collectProps(element) {
    const props = {};

    for (const attribute of element.attributes) {
      props[attribute.name] = attribute.value;
    }

    return props;
  }

  function isMeaningfulNode(node) {
    if (node.nodeType === COMMENT_NODE) {
      return false;
    }

    if (node.nodeType === TEXT_NODE && !(node.textContent ?? "").trim()) {
      return false;
    }

    return true;
  }

  learningReact.vdom = {
    createVNodeFromHTML,
    createVNodeFromDOMNode
  };
})();
