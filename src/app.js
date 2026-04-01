(() => {
  const learningReact = window.LearningReact;
  const miniReact = learningReact?.miniReact;

  if (!miniReact) {
    throw new Error("app.js보다 먼저 mini-react.js가 로드되어야 합니다.");
  }

  const { FunctionComponent, renderChild, useState, useEffect, useMemo } = miniReact;

  const appRoot = document.querySelector("#app-root");
  const increaseButton = document.querySelector("#increase-button");
  const toggleHighlightButton = document.querySelector("#toggle-highlight-button");
  const toggleExtraButton = document.querySelector("#toggle-extra-button");
  const hooksView = document.querySelector("#hooks-view");
  const patchLogView = document.querySelector("#patch-log");
  const effectLogView = document.querySelector("#effect-log");
  const memoStatus = document.querySelector("#memo-status");
  const status = document.querySelector("#status");

  const actions = {
    increment: null,
    toggleHighlight: null,
    toggleExtra: null
  };

  const effectLogs = [];
  let memoComputationCount = 0;

  function pushEffectLog(message) {
    effectLogs.unshift(message);
    effectLogs.splice(8);
  }

  function Summary(props) {
    return `<p class="summary-line">memo summary: ${props.summary}</p>`;
  }

  function App(props) {
    const [count, setCount] = useState(0);
    const [highlighted, setHighlighted] = useState(false);
    const [showExtra, setShowExtra] = useState(false);

    const summary = useMemo(() => {
      memoComputationCount += 1;

      let total = 0;
      for (let index = 0; index < 12000; index += 1) {
        total += count * index;
      }

      return `count=${count}, expensiveTotal=${total}`;
    }, [count]);

    useEffect(() => {
      pushEffectLog(`effect 실행: count=${count}`);
      document.title = `React Core count=${count}`;

      return () => {
        pushEffectLog(`cleanup 실행: 이전 count=${count}`);
      };
    }, [count]);

    actions.increment = () => setCount((previousCount) => previousCount + 1);
    actions.toggleHighlight = () => setHighlighted((previousValue) => !previousValue);
    actions.toggleExtra = () => setShowExtra((previousValue) => !previousValue);

    return `
      <article class="${highlighted ? "card card--highlight" : "card"}">
        <p class="eyebrow">Integrated Runtime</p>
        <h2>Hook + VDOM + Diff + Patch 연결</h2>
        <p>count: ${count}</p>
        <p>highlighted: ${highlighted}</p>
        <p>showExtra: ${showExtra}</p>
        <p>renderCount: ${props.__meta.renderCount}</p>
        <p>lastReason: ${props.__meta.lastReason}</p>
        ${renderChild(Summary, { summary })}
        <ul class="demo-list">
          <li>TEXT patch 확인용 count 텍스트: ${count}</li>
          <li class="${highlighted ? "chip chip--on" : "chip"}">PROPS patch 확인용 class</li>
          ${showExtra ? "<li>INSERT / REMOVE patch 확인용 extra item</li>" : ""}
        </ul>
      </article>
    `;
  }

  function renderHookView(instance) {
    if (!hooksView) {
      return;
    }

    hooksView.textContent = JSON.stringify(
      instance.hooks.map((slot, index) => ({
        index,
        kind: slot.kind,
        value: slot.value,
        deps: slot.deps,
        hasCleanup: typeof slot.cleanup === "function"
      })),
      null,
      2
    );
  }

  function renderPatchLog(patches, isMount) {
    if (!patchLogView) {
      return;
    }

    if (isMount) {
      patchLogView.innerHTML = "<li>mount: 첫 실제 DOM 노드를 생성했습니다.</li>";
      return;
    }

    if (patches.length === 0) {
      patchLogView.innerHTML = "<li>변경 사항이 없어 patch 적용을 생략했습니다.</li>";
      return;
    }

    patchLogView.innerHTML = patches
      .map((patch) => `<li>${summarizePatch(patch)}</li>`)
      .join("");
  }

  function renderEffectLog() {
    if (!effectLogView) {
      return;
    }

    effectLogView.innerHTML = effectLogs.map((message) => `<li>${message}</li>`).join("");
  }

  function renderMemoCount() {
    if (!memoStatus) {
      return;
    }

    memoStatus.textContent = `memo 계산 함수 실행 횟수: ${memoComputationCount}`;
  }

  function summarizePatch(patch) {
    const pathLabel = patch.path.length === 0 ? "root" : patch.path.join(".");

    switch (patch.type) {
      case "TEXT":
        return `TEXT @ ${pathLabel}: "${patch.payload}"`;
      case "PROPS":
        return `PROPS @ ${pathLabel}: ${JSON.stringify(patch.payload)}`;
      case "INSERT":
        return `INSERT @ ${pathLabel}: 새 노드 추가`;
      case "REMOVE":
        return `REMOVE @ ${pathLabel}: 기존 노드 제거`;
      case "REPLACE":
        return `REPLACE @ ${pathLabel}: 노드 전체 교체`;
      default:
        return `${patch.type} @ ${pathLabel}`;
    }
  }

  const appInstance = new FunctionComponent({
    component: App,
    target: /** @type {HTMLElement | null} */ (appRoot),
    props: {},
    name: "App",
    onCommit: ({ instance, reason, patches, isMount }) => {
      renderHookView(instance);
      renderPatchLog(patches, isMount);
      renderEffectLog();
      renderMemoCount();

      if (status) {
        status.textContent = `commit 완료: reason=${reason}, patchCount=${patches.length}`;
      }
    }
  });

  increaseButton?.addEventListener("click", () => {
    actions.increment?.();
  });

  toggleHighlightButton?.addEventListener("click", () => {
    actions.toggleHighlight?.();
  });

  toggleExtraButton?.addEventListener("click", () => {
    actions.toggleExtra?.();
  });

  appInstance.mount();
})();
