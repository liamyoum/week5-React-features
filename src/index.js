/**
 * 과제용 mini React 실행 파일이다.
 * 루트 컴포넌트만 state와 hooks를 사용하고, 자식 컴포넌트는 stateless pure function으로 유지한다.
 */
import { h } from "./core/createElement.js";
import { useEffect, useMemo, useState } from "./core/hooks.js";
import { render } from "./core/render.js";

const BASE_ITEMS = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
];

function SectionTitle({ text }) {
  return h("h2", { className: "section-title" }, text);
}

function InfoRow({ label, value }) {
  return h(
    "div",
    { className: "info-row" },
    h("span", { className: "info-label" }, label),
    h("span", { className: "info-value" }, value),
  );
}

function KeyedItem({ item }) {
  return h("li", { className: "item", "data-key": item.id }, item.label);
}

function KeyedList({ items }) {
  return h(
    "ul",
    { className: "item-list" },
    items.map((item) => h(KeyedItem, { key: item.id, item })),
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [isReversed, setIsReversed] = useState(false);

  const doubledCount = useMemo(() => count * 2, [count]);

  const keyedItems = useMemo(() => {
    const items = BASE_ITEMS.map((item) => ({
      id: item.id,
      label: `${item.label} / count=${count}`,
    }));

    return isReversed ? [...items].reverse() : items;
  }, [count, isReversed]);

  useEffect(() => {
    const title = `mini React count ${count}`;
    document.title = title;
    console.log(`[useEffect] patch finished -> ${title}`);

    return () => {
      console.log(`[useEffect] cleanup before next render -> count ${count}`);
    };
  }, [count, isReversed]);

  const increaseOnce = () => {
    setCount((previousCount) => previousCount + 1);
  };

  const increaseTwiceInOneTick = () => {
    setCount((previousCount) => previousCount + 1);
    setCount((previousCount) => previousCount + 1);
  };

  const toggleOrder = () => {
    setIsReversed((previousValue) => !previousValue);
  };

  return h(
    "main",
    { className: "page" },
    h(
      "section",
      { className: "card" },
      h("h1", { className: "title" }, "mini React Core"),
      h(
        "p",
        { className: "description" },
        "이 화면은 서비스용 데모 앱이 아니라 core 동작을 확인하기 위한 최소 렌더링 결과이다.",
      ),
      h(SectionTitle, { text: "Root State" }),
      h(
        "div",
        { className: "info-list" },
        h(InfoRow, { label: "count", value: String(count) }),
        h(InfoRow, {
          label: "memo(count * 2)",
          value: String(doubledCount),
        }),
        h(InfoRow, {
          label: "list order",
          value: isReversed ? "reversed" : "normal",
        }),
      ),
      h(
        "div",
        { className: "button-row" },
        h("button", { type: "button", onClick: increaseOnce }, "+1"),
        h(
          "button",
          { type: "button", onClick: increaseTwiceInOneTick },
          "+2 in one tick",
        ),
        h(
          "button",
          { type: "button", onClick: toggleOrder },
          "toggle keyed order",
        ),
      ),
      h(SectionTitle, { text: "Keyed Children" }),
      h(
        "p",
        { className: "note" },
        "아래 목록은 key(id)를 기준으로 비교되므로 순서가 바뀌어도 같은 DOM 노드를 재사용한다.",
      ),
      h(KeyedList, { items: keyedItems }),
    ),
  );
}

const container = document.getElementById("app");
render(App, container);
