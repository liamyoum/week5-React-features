import assert from "node:assert/strict";
import test from "node:test";

import { h } from "../../src/core/createElement.js";
import { useEffect, useMemo, useState } from "../../src/core/hooks.js";
import { render, unmountRoot } from "../../src/core/render.js";
import { flushMicrotasks, setupDom } from "../helpers/dom-test-utils.js";

test("useState, useMemo, useEffect, and batching work together in the root runtime", async (t) => {
  const { cleanup } = setupDom('<div id="root"></div>');
  const container = document.getElementById("root");

  let renderCount = 0;
  let memoCalculationCount = 0;
  let effectRunCount = 0;
  let cleanupRunCount = 0;
  let runtimeApi = {};

  function App() {
    renderCount += 1;

    const [count, setCount] = useState(0);
    const [draft, setDraft] = useState("");
    const doubled = useMemo(() => {
      memoCalculationCount += 1;
      return count * 2;
    }, [count]);

    useEffect(() => {
      effectRunCount += 1;

      return () => {
        cleanupRunCount += 1;
      };
    }, [count]);

    runtimeApi = {
      setCount,
      setDraft,
    };

    return h(
      "section",
      null,
      h("span", { id: "count-value" }, count),
      h("span", { id: "memo-value" }, doubled),
      h("span", { id: "draft-value" }, draft),
    );
  }

  t.after(() => {
    unmountRoot();
    cleanup();
  });

  render(App, container);

  assert.equal(document.getElementById("count-value").textContent, "0");
  assert.equal(document.getElementById("memo-value").textContent, "0");
  assert.equal(renderCount, 1);
  assert.equal(memoCalculationCount, 1);
  assert.equal(effectRunCount, 1);

  runtimeApi.setDraft("memo does not rerun");
  await flushMicrotasks();

  assert.equal(document.getElementById("draft-value").textContent, "memo does not rerun");
  assert.equal(renderCount, 2);
  assert.equal(memoCalculationCount, 1);
  assert.equal(effectRunCount, 1);

  runtimeApi.setDraft("memo does not rerun");
  await flushMicrotasks();

  assert.equal(renderCount, 2);
  assert.equal(memoCalculationCount, 1);

  runtimeApi.setCount((previousCount) => previousCount + 1);
  runtimeApi.setCount((previousCount) => previousCount + 1);
  await flushMicrotasks();

  assert.equal(document.getElementById("count-value").textContent, "2");
  assert.equal(document.getElementById("memo-value").textContent, "4");
  assert.equal(renderCount, 3);
  assert.equal(memoCalculationCount, 2);
  assert.equal(effectRunCount, 2);
  assert.equal(cleanupRunCount, 1);

  unmountRoot();
  assert.equal(cleanupRunCount, 2);
});

test("hooks throw when a child component tries to use them outside the root render phase", (t) => {
  const { cleanup } = setupDom('<div id="root"></div>');
  const container = document.getElementById("root");

  function Child() {
    useState(0);
    return h("div", null, "child");
  }

  function App() {
    return h("section", null, h(Child));
  }

  t.after(() => {
    unmountRoot();
    cleanup();
  });

  assert.throws(
    () => {
      render(App, container);
    },
    /root FunctionComponent is rendering/,
  );
});
