# mini React

## 1. 프로젝트 소개

이 프로젝트는 React의 핵심 개념인 `Component`, `State`, `Hooks`, `Virtual DOM`, `Diff`, `Patch`가 어떻게 연결되어 동작하는지 이해하기 위해 만든 과제용 mini React 구현이다.

목표는 실전 서비스용 프레임워크를 만드는 것이 아니라, React 내부 원리를 직접 코드로 설명 가능한 수준까지 단순하게 구현하는 것이다.

이 저장소는 데모 웹앱 제작이 목적이 아니므로, 루트 컴포넌트 1개와 stateless child 컴포넌트만으로 core 동작을 확인하는 최소 화면만 둔다.

---

## 2. 구현 목표

- 함수형 컴포넌트 기반 구조
- 함수형 컴포넌트를 감싸는 `FunctionComponent` 클래스
- `hooks` 배열 기반 Hook 저장소
- `mount()`와 `update()`
- `useState`
- `useEffect`
- `useMemo`
- 객체 트리 형태의 Virtual DOM
- 이전/새 Virtual DOM 비교를 위한 `diff`
- 실제 DOM에 변경만 반영하는 `patch`
- `key` 기반 children reconciliation

아래 제약도 코드 구조에 반영했다.

- Hook은 루트 컴포넌트에서만 사용 가능
- State는 루트 컴포넌트에서만 관리
- 자식 컴포넌트는 state를 가지지 않음
- 자식 컴포넌트는 props만 사용
- 자식 컴포넌트는 stateless pure function
- 데이터 흐름은 `Lifting State Up` 방식

---

## 3. 디렉터리 구조

```text
index.html
style.css
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
```

---

## 4. 각 파일의 역할

### `index.html`
- 브라우저 진입 파일
- `#app` 컨테이너 제공
- `src/index.js`를 ES module로 실행

### `style.css`
- 과제 확인용 최소 스타일
- core 동작을 읽기 쉽게 만드는 역할만 담당

### `src/core/createElement.js`
- JSX 대신 사용할 `createElement` / `h` 구현
- Virtual DOM 객체 생성
- 문자열/숫자 children을 text vnode로 변환

### `src/core/FunctionComponent.js`
- 루트 함수형 컴포넌트를 감싸는 클래스
- `hooks` 배열 저장
- `mount()` 구현
- `update()` 구현
- 간단한 microtask batching 스케줄링 구현

### `src/core/hooks.js`
- `useState`, `useEffect`, `useMemo` 구현
- `hookIndex`로 hook 호출 순서 추적
- Hook이 루트 컴포넌트에서만 동작하도록 제한

### `src/core/render.js`
- 외부 렌더링 진입점
- `FunctionComponent` 생성 및 mount/update 연결

### `src/core/dom.js`
- Virtual DOM을 실제 DOM으로 변환
- DOM props 반영
- 자식 함수형 컴포넌트를 stateless pure function으로 실행하여 host vnode로 변환

### `src/core/diff.js`
- 이전/새 Virtual DOM 비교
- props 비교
- children 비교
- `key` 기반 reconciliation

### `src/core/patch.js`
- `diff()` 결과를 실제 DOM에 적용
- 필요한 DOM만 생성/교체/삭제
- 최종 children 순서를 새 Virtual DOM 기준으로 정렬

### `src/index.js`
- 과제 확인용 루트 컴포넌트 정의
- 루트에서만 state와 hooks 사용
- 자식 컴포넌트는 props만 받는 stateless pure function으로 유지

---

## 5. 최소 구현 대상이 어느 파일에 구현되어 있는가

- `FunctionComponent` 클래스: `src/core/FunctionComponent.js`
- `hooks` 배열: `src/core/FunctionComponent.js`
- `mount()`: `src/core/FunctionComponent.js`
- `update()`: `src/core/FunctionComponent.js`
- `useState`: `src/core/hooks.js`
- `useEffect`: `src/core/hooks.js`
- `useMemo`: `src/core/hooks.js`

---

## 6. Component / State / Hooks / Virtual DOM / Real DOM / Diff / Patch의 관계

전체 관계는 다음 흐름으로 이해할 수 있다.

1. 루트 함수형 컴포넌트가 현재 state를 읽는다.
2. Hook은 `hooks` 배열에서 값을 읽거나 갱신한다.
3. 컴포넌트는 현재 상태를 바탕으로 Virtual DOM을 만든다.
4. 최초 렌더링이면 Virtual DOM이 Real DOM으로 변환된다.
5. 이후 state가 바뀌면 새 Virtual DOM을 다시 만든다.
6. `diff()`가 이전 Virtual DOM과 새 Virtual DOM을 비교한다.
7. `patch()`가 Real DOM에서 바뀐 부분만 반영한다.
8. DOM 반영이 끝난 뒤 `useEffect`가 실행된다.

한 줄로 요약하면 아래와 같다.

`Component -> Hook(state/memo/effect) -> Virtual DOM 생성 -> Diff -> Patch -> Real DOM 반영`

---

## 7. 전체 동작 흐름

### 최초 렌더링

1. `render(App, container)` 호출
2. `FunctionComponent` 생성
3. `mount()` 실행
4. 루트 컴포넌트 실행
5. Virtual DOM 생성
6. `createDomNode()`로 실제 DOM 생성
7. 컨테이너에 붙이기
8. patch 이후 실행되어야 하는 `useEffect` 실행

### 상태 변경 후 렌더링

1. 이벤트 핸들러에서 `setState()` 호출
2. `hooks` 배열 안의 state 값 변경
3. `scheduleUpdate()`가 update 예약
4. `update()` 실행
5. 루트 컴포넌트를 다시 실행하여 새 Virtual DOM 생성
6. `diff(oldTree, newTree)` 수행
7. `patch()`가 실제 DOM의 변경된 부분만 반영
8. patch가 끝난 뒤 `useEffect` 실행

---

## 8. setState 이후 어떤 일이 일어나는가

이 프로젝트에서 `setState`는 단순히 값을 바꾸는 함수가 아니다.

1. `hooks` 배열 안의 state 저장소를 갱신한다.
2. `update()`가 필요하다고 표시한다.
3. 새 Virtual DOM 생성을 예약한다.
4. 이전 Virtual DOM과 새 Virtual DOM의 diff를 계산한다.
5. patch를 통해 실제 DOM에 필요한 변경만 반영한다.
6. DOM 반영이 끝난 뒤 effect를 실행한다.

즉, state 변경은 렌더링 파이프라인의 시작점이다.

---

## 9. UI를 어떻게 Component로 나눌 것인가

이번 과제는 서비스 화면을 만드는 것이 아니라 mini React core를 구현하는 것이 목적이다. 그래서 컴포넌트 분리 기준도 일반 원칙 수준으로만 적용했다.

분리 기준은 아래와 같다.

- state를 직접 관리하는 컴포넌트는 루트 1개로 제한한다.
- 반복되는 시각 구조는 stateless child 컴포넌트로 분리한다.
- child는 props만 받아 같은 입력에 같은 출력을 만드는 순수 함수로 유지한다.

현재 코드에서는 아래처럼 나누었다.

- `App`: 루트 컴포넌트, state와 hooks를 모두 관리
- `SectionTitle`, `InfoRow`, `KeyedList`, `KeyedItem`: props만 받는 stateless child

---

## 10. 왜 state를 루트에 두었는가

이번 구현에서는 state를 루트 컴포넌트에만 두었다.

이유는 다음과 같다.

- Hook 저장소를 하나의 `FunctionComponent` 인스턴스에서만 관리하면 구조가 단순하다.
- 어떤 state가 어디에 저장되는지 추적하기 쉽다.
- 렌더링 흐름을 한 곳에서 설명할 수 있다.
- `Lifting State Up` 패턴을 강제로 따르게 되어 데이터 흐름이 단방향이 된다.
- 과제 목표인 “React 내부 원리 이해”에 더 적합하다.

실제 React처럼 각 컴포넌트가 독립 state를 가지게 만들 수도 있지만, 그러면 인스턴스 관리와 생명주기 관리가 복잡해진다. 이번 과제에서는 그 복잡도를 의도적으로 제외했다.

---

## 11. 왜 자식 컴포넌트를 stateless로 두었는가

자식 컴포넌트를 stateless pure function으로 둔 이유는 다음과 같다.

- 루트와 child의 역할을 명확히 분리할 수 있다.
- child는 props만 받으므로 예측 가능하다.
- Virtual DOM 비교 시 child를 단순한 출력 함수처럼 취급할 수 있다.
- Hook을 child에서 허용하지 않으면 현재 mini React 구조를 훨씬 쉽게 설명할 수 있다.
- “상태는 위로 올리고, 아래는 표현만 담당한다”는 구조를 학습하기 좋다.

즉, child는 로직 저장소가 아니라 표현 함수이다.

---

## 12. batching은 구현하지 않았다면 어떻게 설계할 수 있는가

이번 구현에서는 batching을 완전히 생략하지 않고, 아주 단순한 형태로 넣었다.

### 현재 구현

- `scheduleUpdate()`는 매 `setState()`마다 즉시 `update()`를 실행하지 않는다.
- 이미 update가 예약되어 있으면 다시 예약하지 않는다.
- `Promise.resolve().then(...)`으로 같은 tick 안의 여러 state 변경을 한 번의 update로 묶는다.

예를 들어 한 이벤트 핸들러 안에서 아래 코드가 실행되면:

```js
setCount((prev) => prev + 1);
setCount((prev) => prev + 1);
```

동일 tick 안에서 한 번의 `update()`만 실행된다.

### 더 확장하려면

- update queue를 둘 수 있다.
- 여러 root를 지원하도록 root별 scheduler를 둘 수 있다.
- 우선순위 개념을 추가할 수 있다.
- 브라우저 idle time 또는 scheduler와 연결할 수 있다.

하지만 이번 과제에서는 학습 목적상 microtask batching 정도만 넣고 복잡한 스케줄링은 제외했다.

---

## 13. key 기반 diff가 왜 필요한가

children 배열을 단순히 index만으로 비교하면 순서가 바뀌었을 때 같은 항목을 다른 항목으로 오해할 수 있다.

예를 들어:

```text
이전: [A, B, C]
이후: [C, A, B]
```

index만 비교하면 대부분을 교체하게 된다. 반면 key를 사용하면 C, A, B 각각이 누구인지 식별할 수 있으므로 기존 DOM 노드를 재사용하면서 순서만 바꿀 수 있다.

즉, key는 “이 child가 누구인지”를 식별하는 안정적인 기준이다.

---

## 14. value만으로 key를 대체하기 어려운 이유

단순한 value는 key를 완전히 대체하기 어렵다.

- 같은 value가 여러 번 나올 수 있다.
- value는 표시 문자열일 뿐, 항목의 정체성을 보장하지 않는다.
- 값은 바뀔 수 있지만 identity는 유지되어야 한다.
- label이 같아도 서로 다른 데이터일 수 있다.

예를 들어 todo 목록에서 `"공부하기"`라는 텍스트가 두 개 있을 수 있다. 이 경우 value만으로는 어떤 항목이 어떤 항목인지 구분할 수 없다.

그래서 key는 보통 아래처럼 “변하지 않는 식별자”여야 한다.

- database id
- UUID
- 생성 시 부여한 고유 id

---

## 15. 실제 React와 이번 구현의 차이점

이번 구현은 React의 핵심 개념을 학습하기 위한 단순화 버전이다.

### 실제 React에는 있지만 이번 구현에는 없는 것

- Fiber architecture
- concurrent rendering
- scheduler
- priority 기반 작업 분할
- 컴포넌트별 독립 인스턴스와 세밀한 lifecycle
- context
- ref
- class component
- error boundary
- Suspense
- 정교한 event system

### 이번 구현의 특징

- Hook 저장소가 단일 `hooks` 배열이다.
- state는 루트 컴포넌트에만 존재한다.
- child 컴포넌트는 stateless pure function이다.
- diff 알고리즘은 교육용으로 단순화되어 있다.
- patch는 필요한 DOM만 갱신하지만 실제 React만큼 정교하지는 않다.
- batching도 매우 단순한 microtask 수준이다.

즉, “React를 완전히 복제한 것”이 아니라 “React 개념을 손으로 직접 구현해 보는 작은 모델”에 가깝다.

---

## 16. FunctionComponent, hooks 배열, mount(), update(), useState, useEffect, useMemo 설명

### `FunctionComponent`

`src/core/FunctionComponent.js`에 구현되어 있다.

역할:

- 루트 함수형 컴포넌트 실행
- `hooks` 배열 보관
- `hookIndex` 초기화
- 최초 렌더링 시 `mount()`
- 상태 변경 후 `update()`
- effect 실행 시점 관리

### `hooks` 배열

각 Hook은 호출 순서대로 `hooks[index]`에 저장된다.

- 첫 번째 `useState` -> `hooks[0]`
- 두 번째 `useState` 또는 `useMemo` -> `hooks[1]`
- 세 번째 `useEffect` -> `hooks[2]`

이 구조 때문에 Hook은 항상 같은 순서로 호출되어야 한다.

### `mount()`

1. 루트 컴포넌트 실행
2. Virtual DOM 생성
3. 실제 DOM 생성
4. 컨테이너에 붙이기
5. effect 실행

### `update()`

1. 새 Virtual DOM 생성
2. 이전 트리와 diff
3. patch 적용
4. effect 실행

### `useState`

- `hooks` 배열에 상태 값을 저장한다.
- `setState`는 저장소를 바꾸고 update를 예약한다.

### `useEffect`

- dependency 배열을 비교해 effect 실행 여부를 결정한다.
- patch 이후 실행한다.
- 이전 cleanup이 있으면 먼저 실행한다.

### `useMemo`

- dependency 배열이 바뀌지 않으면 이전 계산 결과를 재사용한다.
- dependency가 바뀌었을 때만 factory를 다시 실행한다.

---

## 17. 실행 방법

이 프로젝트는 별도 라이브러리 없이 브라우저에서 바로 실행할 수 있다.

### 방법 1. VS Code Live Server

1. 프로젝트 루트를 연다.
2. `index.html`을 Live Server로 실행한다.

### 방법 2. 단순 정적 서버

```bash
npx serve .
```

또는:

```bash
python -m http.server
```

그 뒤 브라우저에서 서버 주소를 열면 된다.

---

## 18. 정리

이번 mini React는 아래 한 줄로 정리할 수 있다.

`루트 컴포넌트가 hooks 배열을 사용해 Virtual DOM을 만들고, state 변경 시 diff/patch를 통해 실제 DOM의 필요한 부분만 갱신하는 교육용 구현`
