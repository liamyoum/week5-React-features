# AGENTS.md

## 프로젝트 목적
이 프로젝트는 React의 핵심 개념인 Component, State, Hooks가 어떻게 동작하는지 이해하기 위해,
필수 요소만 포함한 mini React를 직접 구현하는 과제용 프로젝트이다.

이 프로젝트의 목적은 실전 서비스용 프레임워크를 만드는 것이 아니라,
React의 내부 동작 원리를 학습하고 직접 구현해 보는 데 있다.

중요:
- 데모 페이지나 예제 웹앱은 구현 대상이 아니다.
- 과제의 필수 요소만 구현한다.
- 코드의 단순성, 설명 가능성, 학습 목적을 우선한다.

---

## 기술 제한
이 프로젝트에서 사용할 수 있는 기술은 아래만 허용한다.

- JavaScript 또는 TypeScript
- HTML
- CSS

외부 프레임워크 및 라이브러리는 사용하지 않는다.
예: React, Vue, Svelte 등 금지

---

## 필수 구현 범위

### 1. Component
- 반드시 함수형 컴포넌트로 구현한다.
- 함수형 컴포넌트를 감싸는 `FunctionComponent` 클래스를 직접 만든다.
- 자식 컴포넌트는 props만 받는 stateless pure function 형태여야 한다.

### 2. FunctionComponent 클래스
반드시 아래 기능을 포함해야 한다.
- hooks 배열 (상태 저장용)
- mount() : 최초 렌더링
- update() : 상태 변경 후 다시 렌더링

### 3. State
- State는 값이 변경될 수 있는 동적 데이터이다.
- State는 루트 컴포넌트에서만 관리한다.
- 상태가 변경되면 화면이 다시 그려져야 한다.

### 4. Hooks
함수형 컴포넌트에서 상태와 생명주기 성격의 기능을 사용할 수 있도록 아래 hook을 최소 구현한다.
- useState
- useEffect
- useMemo

추가 규칙:
- hooks 저장소는 배열 기반으로 구현한다.
- hook 호출 순서를 추적하기 위해 hookIndex를 사용한다.
- Hook은 최상위 컴포넌트에서만 사용할 수 있어야 한다.

### 5. Virtual DOM + Diff + Patch
- Virtual DOM은 객체 트리 형태로 구현한다.
- 이전 Virtual DOM과 새 Virtual DOM을 비교하는 diff를 구현한다.
- 바뀐 부분만 실제 DOM에 반영하는 patch를 구현한다.
- children 비교는 key 기반으로 구현한다.
- 목표는 전체를 다시 그리지 않고 필요한 부분만 업데이트하는 것이다.

---

## 반드시 지켜야 할 제약 조건
1. Hook은 최상위 컴포넌트에서만 사용 가능하다.
2. State는 최상위 컴포넌트(루트 컴포넌트)에서만 관리한다.
3. 자식 컴포넌트는 state를 가지지 않는다.
4. 자식 컴포넌트는 부모로부터 전달받은 props만 사용한다.
5. 자식 컴포넌트는 상태 없는(stateless) 순수 함수로 구현한다.
6. 데이터 흐름은 Lifting State Up 패턴을 따른다.

이 제약은 코드 구조와 README 설명 모두에 반영되어야 한다.

---

## 중점 포인트 반영 규칙
다음 항목은 README에 반드시 설명하고, 코드 구조에도 반영해야 한다.

### 1. UI를 어떻게 Component로 나눌 것인가
- 이 프로젝트에서는 라이브러리 수준만 구현하므로,
  README에서 “컴포넌트 분리 기준”을 일반 원칙 수준으로 설명한다.

### 2. State를 어디에 두는 것이 좋은가
- 루트 컴포넌트에 state를 두는 이유를 설명한다.

### 3. setState는 상태 변경 외에 무엇을 해야 하는가
아래 흐름을 README에 반드시 설명한다.
- 상태 저장소 갱신
- update 트리거
- 새 Virtual DOM 생성
- diff 수행
- patch 수행

### 4. 여러 상태 변경을 한 번에 처리하는 방법
- batching은 선택 과제이다.
- 구현하지 않아도 된다.
- 다만 README에서 어떻게 설계할 수 있는지 간단히 설명한다.

### 5. 실제 React와의 차이점
README에 반드시 설명한다.
예:
- Fiber 없음
- concurrent rendering 없음
- scheduler 없음
- 단순한 hooks 배열 구조
- 단순화된 diff/patch

---

## 코드 작성 규칙
1. 각 파일 상단 또는 주요 함수에 주석을 작성한다.
2. 주석은 “이 코드가 무슨 역할을 하는지”를 설명해야 한다.
3. 과제 제출용이므로 읽기 쉬운 이름을 사용한다.
4. 복잡한 고급 패턴보다 명확한 구조를 우선한다.
5. 필수 구현 외 확장은 최소화한다.

---

## 권장 디렉터리 구조
```text
index.html
src/
  core/
    createElement.js
    FunctionComponent.js
    hooks.js
    render.js
    diff.js
    patch.js
    dom.js
  index.js
README.md
AGENTS.md