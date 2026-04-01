# week5-React-features

React Core를 학습용 단계 코드로 잘게 쪼개지 않고, 최종 통합 구조 기준으로 다시 정리한 저장소입니다.

## 목표

- 함수형 컴포넌트가 왜 `props -> HTML` 계산 함수처럼 보이는지 이해하기
- `useState`, `useEffect`, `useMemo`가 왜 `hooks 배열 + hookIndex` 구조로 동작하는지 이해하기
- Hook 런타임이 어떻게 VDOM, Diff, Patch와 연결되는지 이해하기
- 최종적으로 `state 변경 -> component 재실행 -> VDOM 생성 -> diff -> patch -> effect` 흐름을 설명할 수 있게 되기

## 읽는 순서

1. [src/app.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/app.js)
2. [src/mini-react.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/mini-react.js)
3. [src/core/vdom.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/vdom.js)
4. [src/core/diff.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/diff.js)
5. [src/core/patch.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/patch.js)

## 구조

```text
.
├── index.html
├── specification.md
├── README.md
└── src
    ├── app.js
    ├── mini-react.js
    └── core
        ├── vdom.js
        ├── diff.js
        └── patch.js
```

## 각 파일 역할

- [src/app.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/app.js)
  - 실제 데모 컴포넌트
  - 버튼 이벤트 연결
  - Hook 슬롯 / Patch 로그 / Effect 로그 렌더링
- [src/mini-react.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/mini-react.js)
  - `FunctionComponent`
  - `useState`
  - `useEffect`
  - `useMemo`
  - `renderChild`
- [src/core/vdom.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/vdom.js)
  - HTML 문자열 -> VNode
- [src/core/diff.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/diff.js)
  - old/new VNode 비교 -> patch 배열
- [src/core/patch.js](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/src/core/patch.js)
  - patch 배열 -> 실제 DOM 업데이트

## 실행 방법

- 루트 [index.html](/Users/liamtsy/Desktop/krafton_jungle/W02-05/week5/week5-React-features/index.html)을 브라우저에서 직접 열면 됩니다.
- 모듈 import 대신 일반 `<script>` 순서로 로드하므로 `file://`로 열어도 동작하도록 정리했습니다.

## 핵심 연결 흐름

1. 버튼이 state setter를 호출한다.
2. `FunctionComponent.update()`가 루트 컴포넌트를 다시 실행한다.
3. 새 HTML 문자열을 `createVNodeFromHTML()`로 VNode로 바꾼다.
4. 이전 VNode와 `diffTrees()`로 비교한다.
5. 나온 patch를 `applyPatches()`로 실제 DOM에 반영한다.
6. 마지막에 `useEffect()`로 예약된 effect를 실행한다.

## 학습 포인트

- 왜 state는 함수 내부 변수로 두면 안 되는가?
- 왜 Hook은 호출 순서가 중요하고, 왜 조건문 안에서 호출하면 안 되는가?
- 왜 effect는 render 중이 아니라 commit 후에 실행해야 하는가?
- 왜 useMemo는 rerender를 막지 않고 계산 결과만 재사용하는가?
- 왜 VDOM은 "빠르다"보다 "비교 가능한 데이터 구조"라는 점이 더 본질적인가?
