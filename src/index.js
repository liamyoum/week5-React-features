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

// title 문자열을 보여 주는 stateless child component이다.
function SectionTitle({ text }) {
  return <h2 className="section-title">{text}</h2>;
}

// label과 value를 한 줄로 보여 주는 stateless child component이다.
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

// key 비교에 사용할 id를 data attribute로 표시하는 child component이다.
function KeyedItem({ item }) {
  return (
    <li className="item" data-key={item.id}>
      {item.label}
    </li>
  );
}

// key가 있는 children 목록을 만드는 stateless child component이다.
function KeyedList({ items }) {
  return (
    <ul className="item-list">
      {items.map((item) => (
        <KeyedItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

// key가 없는 children 목록을 만들어 fallback diff를 보여 주는 component이다.
function UnkeyedList({ items }) {
  return (
    <ul className="item-list">
      {items.map((item) => (
        <KeyedItem item={item} />
      ))}
    </ul>
  );
}

// 루트 state, hooks, 이벤트 핸들러를 모두 관리하는 root component이다.
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

  return (
    <main className="page">
      <section className="card">
        <h1 className="title">mini React Core</h1>
        <p className="description">
          이 화면은 서비스용 데모 앱이 아니라 core 동작을 확인하기 위한 최소 렌더링 결과이다.
        </p>

        <SectionTitle text="Root State" />

        <div className="info-list">
          <InfoRow label="count" value={String(count)} />
          <InfoRow label="memo(count * 2)" value={String(doubledCount)} />
          <InfoRow
            label="list order"
            value={isReversed ? "reversed" : "normal"}
          />
        </div>

        <div className="button-row">
          <button type="button" onClick={increaseOnce}>
            +1
          </button>
          <button type="button" onClick={increaseTwiceInOneTick}>
            +2 in one tick
          </button>
          <button type="button" onClick={toggleOrder}>
            toggle keyed order
          </button>
        </div>

        <SectionTitle text="Keyed Children" />
        <p className="note">
          아래 목록은 key(id)를 기준으로 비교되므로 순서가 바뀌어도 같은 DOM 노드를 재사용한다.
        </p>
        <KeyedList items={keyedItems} />

        <SectionTitle text="Fallback Children" />
        <p className="note">
          다음 목록은 key가 없어서 index 기반 fallback 비교를 사용한다. 순서 변경 시 identity를
          정확히 보장하지 못한다.
        </p>
        <UnkeyedList items={keyedItems} />
      </section>
    </main>
  );
}

const container = document.getElementById("app");
render(App, container);
