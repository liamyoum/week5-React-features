import assert from "node:assert/strict";
import test from "node:test";

import { createElement, h, TEXT_ELEMENT } from "../../src/core/createElement.js";
import { diff } from "../../src/core/diff.js";
import { createDomNode, resolveVNode } from "../../src/core/dom.js";
import { patch } from "../../src/core/patch.js";
import { setupDom } from "../helpers/dom-test-utils.js";

test("createElement flattens children, converts primitive values, and keeps key", () => {
  const vnode = createElement(
    "section",
    { id: "demo", key: "root-node" },
    "hello",
    [1, null, undefined, false, h("span", { className: "tag" }, "child")],
  );

  assert.equal(vnode.type, "section");
  assert.equal(vnode.key, "root-node");
  assert.equal(vnode.props.children.length, 3);
  assert.equal(vnode.props.children[0].type, TEXT_ELEMENT);
  assert.equal(vnode.props.children[0].props.nodeValue, "hello");
  assert.equal(vnode.props.children[1].type, TEXT_ELEMENT);
  assert.equal(vnode.props.children[1].props.nodeValue, "1");
  assert.equal(vnode.props.children[2].type, "span");
});

test("resolveVNode executes stateless child components and carries the key to host nodes", () => {
  function Child({ label }) {
    return h("article", { className: "card" }, label);
  }

  const tree = resolveVNode(
    h("section", null, h(Child, { label: "child text", key: "child-1" })),
  );
  const childNode = tree.props.children[0];

  assert.equal(tree.type, "section");
  assert.equal(childNode.type, "article");
  assert.equal(childNode.key, "child-1");
  assert.equal(childNode.props.children[0].props.nodeValue, "child text");
});

test("diff and patch update props, text, and keyed child order without replacing reused nodes", () => {
  const { cleanup } = setupDom('<div id="root"></div>');
  const container = document.getElementById("root");

  try {
    const previousTree = resolveVNode(
      h(
        "ul",
        { className: "buttons" },
        h("li", { key: "a", className: "item" }, "Alpha"),
        h("li", { key: "b", className: "item" }, "Beta"),
        h("li", { key: "c", className: "item" }, "Gamma"),
      ),
    );
    const rootDom = createDomNode(previousTree);
    container.appendChild(rootDom);

    const oldAlphaDom = previousTree.props.children[0].dom;
    const oldBetaDom = previousTree.props.children[1].dom;
    const oldGammaDom = previousTree.props.children[2].dom;

    const nextTree = resolveVNode(
      h(
        "ul",
        { className: "buttons sorted" },
        h("li", { key: "c", className: "item" }, "Gamma"),
        h("li", { key: "a", className: "item" }, "Alpha"),
        h("li", { key: "b", className: "item is-hot" }, "Beta updated"),
      ),
    );

    const patchResult = diff(previousTree, nextTree);
    patch(patchResult, container);

    assert.equal(container.firstChild.className, "buttons sorted");
    assert.equal(container.firstChild.childNodes[0], oldGammaDom);
    assert.equal(container.firstChild.childNodes[1], oldAlphaDom);
    assert.equal(container.firstChild.childNodes[2], oldBetaDom);
    assert.equal(container.firstChild.childNodes[2].textContent, "Beta updated");
    assert.equal(container.firstChild.childNodes[2].className, "item is-hot");
  } finally {
    cleanup();
  }
});
