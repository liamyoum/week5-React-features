import { h } from "./core/createElement.js";
import { useEffect, useMemo, useState } from "./core/hooks.js";
import { render } from "./core/render.js";

const STORAGE_KEY = "mini-react-useless-button-lab-v1";

const BUTTON_LIBRARY = [
  {
    id: "dramatic-sigh",
    label: "드라마틱 한숨",
    description: "아무도 묻지 않았지만 오늘 하루가 힘들었다는 분위기를 냅니다.",
    actionLabel: "한숨 쉬기",
    accent: "sunset",
  },
  {
    id: "coffee-telepathy",
    label: "커피 텔레파시",
    description: "카페인 없이 커피의 힘을 믿어 보는 순수한 의지 버튼입니다.",
    actionLabel: "간절히 바라기",
    accent: "amber",
  },
  {
    id: "tab-hoarding",
    label: "탭 48개 열기",
    description: "생산성은 없지만 브라우저는 분명 무거워집니다.",
    actionLabel: "탭 더 쌓기",
    accent: "mint",
  },
  {
    id: "meeting-nod",
    label: "회의 중 고개 끄덕이기",
    description: "이해는 못 했지만 일단 공감하는 척할 때 쓰는 버튼입니다.",
    actionLabel: "고개 끄덕이기",
    accent: "lavender",
  },
  {
    id: "keyboard-polish",
    label: "키보드 닦는 척",
    description: "할 일 대신 책상 정리에 몰입하는 전형적인 우회 전략입니다.",
    actionLabel: "번쩍 닦기",
    accent: "rose",
  },
  {
    id: "window-stare",
    label: "창밖 보기",
    description: "아이디어가 올 것 같지만 대개는 구름만 구경하게 됩니다.",
    actionLabel: "하늘 바라보기",
    accent: "sky",
  },
  {
    id: "badge-rearrange",
    label: "이모지 정렬",
    description: "중요하지 않은 우선순위를 지나치게 진지하게 정리합니다.",
    actionLabel: "정렬 다시 하기",
    accent: "grape",
  },
  {
    id: "vibe-check",
    label: "갑자기 바이브 체크",
    description: "문제 해결은 없지만 분위기는 조금 더 복잡해집니다.",
    actionLabel: "분위기 측정",
    accent: "lime",
  },
];

function createDefaultButtons() {
  return BUTTON_LIBRARY.slice(0, 6).map((item) => ({
    ...item,
    presses: 0,
  }));
}

function createDefaultLabState() {
  return {
    buttons: createDefaultButtons(),
    sortMode: "lab",
    draftLabel: "",
    lastPressedId: null,
    chaosCount: 0,
  };
}

function slugifyLabel(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-가-힣]/g, "")
    .replace(/\-+/g, "-");
}

function findNextSuggestion(buttons) {
  const usedIds = new Set(buttons.map((button) => button.id));

  return BUTTON_LIBRARY.find((button) => !usedIds.has(button.id)) ?? null;
}

function shuffleButtons(buttons) {
  const nextButtons = [...buttons];

  for (let index = nextButtons.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporary = nextButtons[index];
    nextButtons[index] = nextButtons[randomIndex];
    nextButtons[randomIndex] = temporary;
  }

  return nextButtons;
}

function loadInitialLabState() {
  if (typeof localStorage === "undefined") {
    return createDefaultLabState();
  }

  try {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return createDefaultLabState();
    }

    const parsedState = JSON.parse(rawState);

    if (!Array.isArray(parsedState.buttons) || parsedState.buttons.length === 0) {
      return createDefaultLabState();
    }

    return {
      buttons: parsedState.buttons.map((button, index) => ({
        id: typeof button.id === "string" ? button.id : `restored-${index}`,
        label: typeof button.label === "string" ? button.label : `복원된 버튼 ${index + 1}`,
        description:
          typeof button.description === "string"
            ? button.description
            : "이 버튼은 과거의 실험 로그에서 돌아왔습니다.",
        actionLabel:
          typeof button.actionLabel === "string"
            ? button.actionLabel
            : "괜히 누르기",
        accent:
          typeof button.accent === "string"
            ? button.accent
            : BUTTON_LIBRARY[index % BUTTON_LIBRARY.length].accent,
        presses: Number.isFinite(button.presses) ? button.presses : 0,
      })),
      sortMode:
        parsedState.sortMode === "popular" || parsedState.sortMode === "alphabet"
          ? parsedState.sortMode
          : "lab",
      draftLabel: "",
      lastPressedId:
        typeof parsedState.lastPressedId === "string" ? parsedState.lastPressedId : null,
      chaosCount: Number.isFinite(parsedState.chaosCount) ? parsedState.chaosCount : 0,
    };
  } catch (_error) {
    return createDefaultLabState();
  }
}

function createCustomButton(label, index) {
  const accent = BUTTON_LIBRARY[index % BUTTON_LIBRARY.length].accent;
  const trimmedLabel = label.trim();

  return {
    id: `custom-${slugifyLabel(trimmedLabel) || "button"}-${Date.now()}`,
    label: trimmedLabel,
    description: `"${trimmedLabel}" 연구가 사회에 미치는 영향은 아직 아무도 모릅니다.`,
    actionLabel: "괜히 눌러보기",
    accent,
    presses: 0,
  };
}

function HeroBadge({ text }) {
  return <span className="hero-badge">{text}</span>;
}

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <strong className="stat-value">{value}</strong>
      <p className="stat-detail">{detail}</p>
    </article>
  );
}

function SortChip({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      className={isActive ? "chip-button chip-button--active" : "chip-button"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function OrderPill({ text }) {
  return <span className="order-pill">{text}</span>;
}

function ButtonCard({ button, rank, isTop, onPress, onRetire }) {
  return (
    <article className={`button-card accent-${button.accent}`}>
      <div className="button-card__header">
        <span className="button-card__rank">#{rank}</span>
        <span className={isTop ? "button-card__badge is-top" : "button-card__badge"}>
          {isTop ? "금주의 쓸데없음" : button.actionLabel}
        </span>
      </div>

      <h3 className="button-card__title">{button.label}</h3>
      <p className="button-card__description">{button.description}</p>

      <div className="button-card__meter">
        <span>눌린 횟수</span>
        <strong>{button.presses}회</strong>
      </div>

      <div className="button-card__actions">
        <button type="button" className="primary-button" onClick={onPress}>
          {button.actionLabel}
        </button>
        <button type="button" className="secondary-button" onClick={onRetire}>
          연구 종료
        </button>
      </div>
    </article>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="empty-state">
      <h3>연구 대상이 모두 사라졌습니다.</h3>
      <p>새 버튼을 만들거나 기본 연구실을 복원해서 다시 무의미를 쌓아 보세요.</p>
      <button type="button" className="primary-button" onClick={onReset}>
        기본 연구실 복원
      </button>
    </div>
  );
}

function App() {
  const [labState, setLabState] = useState(() => loadInitialLabState());

  const visibleButtons = useMemo(() => {
    if (labState.sortMode === "popular") {
      return [...labState.buttons].sort((left, right) => {
        if (right.presses !== left.presses) {
          return right.presses - left.presses;
        }

        return left.label.localeCompare(right.label, "ko");
      });
    }

    if (labState.sortMode === "alphabet") {
      return [...labState.buttons].sort((left, right) =>
        left.label.localeCompare(right.label, "ko"),
      );
    }

    return labState.buttons;
  }, [labState.buttons, labState.sortMode]);

  const dashboard = useMemo(() => {
    const totalPresses = labState.buttons.reduce(
      (sum, button) => sum + button.presses,
      0,
    );
    const topButton = [...labState.buttons].sort((left, right) => {
      if (right.presses !== left.presses) {
        return right.presses - left.presses;
      }

      return left.label.localeCompare(right.label, "ko");
    })[0] ?? null;
    const mostIgnoredButton = [...labState.buttons].sort((left, right) => {
      if (left.presses !== right.presses) {
        return left.presses - right.presses;
      }

      return left.label.localeCompare(right.label, "ko");
    })[0] ?? null;
    const lastPressedButton =
      labState.buttons.find((button) => button.id === labState.lastPressedId) ?? null;

    return {
      totalPresses,
      topButton,
      mostIgnoredButton,
      lastPressedButton,
      buttonCount: labState.buttons.length,
    };
  }, [labState.buttons, labState.lastPressedId]);

  const nextSuggestion = useMemo(
    () => findNextSuggestion(labState.buttons),
    [labState.buttons],
  );

  const headline = useMemo(() => {
    if (!dashboard.topButton || dashboard.totalPresses === 0) {
      return "오늘의 연구 주제는 아직 비어 있습니다. 먼저 아무 버튼이나 눌러 보세요.";
    }

    return `"${dashboard.topButton.label}"가 ${dashboard.topButton.presses}회로 선두입니다. 예상대로 아무 의미는 없습니다.`;
  }, [dashboard.topButton, dashboard.totalPresses]);

  useEffect(() => {
    const title =
      dashboard.totalPresses === 0
        ? "쓸데없는 버튼 연구소"
        : `쓸데없는 클릭 ${dashboard.totalPresses}회`;

    document.title = title;
    console.log(`[useEffect] patch finished -> ${title}`);

    return () => {
      console.log(
        `[useEffect] cleanup before next render -> total ${dashboard.totalPresses}`,
      );
    };
  }, [dashboard.totalPresses, dashboard.topButton, labState.sortMode]);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        buttons: labState.buttons,
        sortMode: labState.sortMode,
        lastPressedId: labState.lastPressedId,
        chaosCount: labState.chaosCount,
      }),
    );
  }, [labState.buttons, labState.sortMode, labState.lastPressedId, labState.chaosCount]);

  const pressButton = (buttonId) => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: previousState.buttons.map((button) =>
        button.id === buttonId
          ? { ...button, presses: button.presses + 1 }
          : button,
      ),
      lastPressedId: buttonId,
    }));
  };

  const retireButton = (buttonId) => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: previousState.buttons.filter((button) => button.id !== buttonId),
      lastPressedId:
        previousState.lastPressedId === buttonId ? null : previousState.lastPressedId,
    }));
  };

  const updateDraftLabel = (event) => {
    setLabState((previousState) => ({
      ...previousState,
      draftLabel: event.target.value,
    }));
  };

  const addCustomButton = (event) => {
    event.preventDefault();

    setLabState((previousState) => {
      const trimmedLabel = previousState.draftLabel.trim();

      if (!trimmedLabel) {
        return previousState;
      }

      return {
        ...previousState,
        buttons: [
          createCustomButton(trimmedLabel, previousState.buttons.length),
          ...previousState.buttons,
        ],
        draftLabel: "",
        sortMode: "lab",
      };
    });
  };

  const addSuggestedButton = () => {
    setLabState((previousState) => {
      const suggestion = findNextSuggestion(previousState.buttons);

      if (!suggestion) {
        return previousState;
      }

      return {
        ...previousState,
        buttons: [...previousState.buttons, { ...suggestion, presses: 0 }],
        sortMode: "lab",
      };
    });
  };

  const triggerChaosShuffle = () => {
    setLabState((previousState) => ({
      ...previousState,
      buttons: shuffleButtons(previousState.buttons),
      sortMode: "lab",
      chaosCount: previousState.chaosCount + 1,
    }));
  };

  const resetLab = () => {
    setLabState(createDefaultLabState());
  };

  return (
    <main className="page">
      <section className="hero-card">
        <div className="hero-card__body">
          <div className="hero-copy">
            <div className="hero-badges">
              <HeroBadge text="mini React Demo" />
              <HeroBadge text="state + hooks + keyed diff" />
            </div>

            <h1 className="hero-title">쓸데없는 버튼 연구소</h1>
            <p className="hero-description">
              누른다고 해서 삶이 나아지진 않지만, state와 diff와 patch가 제대로 움직이는지는
              확실하게 보여 주는 실험용 웹사이트입니다.
            </p>
            <p className="hero-headline">{headline}</p>
          </div>

          <div className="hero-aside">
            <p className="aside-label">마지막 관측</p>
            <strong className="aside-value">
              {dashboard.lastPressedButton
                ? dashboard.lastPressedButton.label
                : "아직 아무도 누르지 않음"}
            </strong>
            <p className="aside-note">
              혼돈 셔플 {labState.chaosCount}회, 정렬 모드 {labState.sortMode}
            </p>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="총 쓸데없는 클릭"
          value={`${dashboard.totalPresses}회`}
          detail="모든 버튼의 누적 실험 횟수"
        />
        <StatCard
          label="등록된 버튼"
          value={`${dashboard.buttonCount}개`}
          detail="현재 연구실에 남아 있는 실험 대상"
        />
        <StatCard
          label="가장 뜨거운 버튼"
          value={dashboard.topButton ? dashboard.topButton.label : "아직 없음"}
          detail={
            dashboard.topButton
              ? `${dashboard.topButton.presses}회로 선두`
              : "첫 클릭을 기다리는 중"
          }
        />
        <StatCard
          label="가장 조용한 버튼"
          value={dashboard.mostIgnoredButton ? dashboard.mostIgnoredButton.label : "없음"}
          detail={
            dashboard.mostIgnoredButton
              ? `${dashboard.mostIgnoredButton.presses}회만 눌림`
              : "모든 버튼이 사라졌습니다"
          }
        />
      </section>

      <section className="layout-grid">
        <aside className="side-panel">
          <div className="panel-card">
            <p className="panel-label">정렬 모드</p>
            <div className="chip-group">
              <SortChip
                label="실험 순"
                isActive={labState.sortMode === "lab"}
                onClick={() =>
                  setLabState((previousState) => ({
                    ...previousState,
                    sortMode: "lab",
                  }))
                }
              />
              <SortChip
                label="인기 순"
                isActive={labState.sortMode === "popular"}
                onClick={() =>
                  setLabState((previousState) => ({
                    ...previousState,
                    sortMode: "popular",
                  }))
                }
              />
              <SortChip
                label="이름 순"
                isActive={labState.sortMode === "alphabet"}
                onClick={() =>
                  setLabState((previousState) => ({
                    ...previousState,
                    sortMode: "alphabet",
                  }))
                }
              />
            </div>

            <p className="panel-label">연구실 조작</p>
            <div className="stacked-actions">
              <button type="button" className="primary-button" onClick={triggerChaosShuffle}>
                혼돈 셔플 실행
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={addSuggestedButton}
                disabled={!nextSuggestion}
              >
                {nextSuggestion ? `${nextSuggestion.label} 추가` : "추천 버튼 소진"}
              </button>
              <button type="button" className="secondary-button" onClick={resetLab}>
                기본 연구실 초기화
              </button>
            </div>
          </div>

          <div className="panel-card">
            <p className="panel-label">새 버튼 제조</p>
            <form className="composer-form" onSubmit={addCustomButton}>
              <input
                className="composer-input"
                type="text"
                value={labState.draftLabel}
                onInput={updateDraftLabel}
                placeholder="예: 괜히 새로고침"
                autoComplete="off"
              />
              <button type="submit" className="primary-button">
                버튼 생성
              </button>
            </form>
            <p className="panel-note">
              루트 state에서만 입력값을 관리하고, submit 시 CREATE patch가 발생합니다.
            </p>
          </div>

          <div className="panel-card">
            <p className="panel-label">현재 렌더 순서</p>
            <div className="order-strip">
              {visibleButtons.map((button) => (
                <OrderPill key={button.id} text={button.label} />
              ))}
            </div>
            <p className="panel-note">
              각 카드는 stable key를 사용하므로 순서를 바꿔도 가능한 한 같은 DOM 노드를 재사용합니다.
            </p>
          </div>
        </aside>

        <section className="button-grid">
          {visibleButtons.length === 0 ? (
            <EmptyState onReset={resetLab} />
          ) : (
            visibleButtons.map((button, index) => (
              <ButtonCard
                key={button.id}
                button={button}
                rank={index + 1}
                isTop={dashboard.topButton ? dashboard.topButton.id === button.id : false}
                onPress={() => pressButton(button.id)}
                onRetire={() => retireButton(button.id)}
              />
            ))
          )}
        </section>
      </section>
    </main>
  );
}

const container = document.getElementById("app");
render(App, container);
