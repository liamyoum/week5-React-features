/**
 * mini React 외부 진입점이다.
 * 루트 함수를 FunctionComponent로 감싸고 mount, update, unmount를 연결한다.
 */
import { FunctionComponent } from "./FunctionComponent.js";

let rootInstance = null;

export function render(rootComponent, container, props = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new Error("render에는 유효한 DOM 컨테이너가 필요합니다.");
  }

  const shouldCreateNewRoot =
    !rootInstance ||
    rootInstance.componentFunction !== rootComponent ||
    rootInstance.container !== container;

  if (shouldCreateNewRoot) {
    if (rootInstance) {
      rootInstance.cleanup();
    }

    rootInstance = new FunctionComponent(rootComponent, props, container);
    rootInstance.mount();
    return rootInstance;
  }

  rootInstance.props = props;
  rootInstance.update();
  return rootInstance;
}

export function getRootInstance() {
  return rootInstance;
}

// Exposes an explicit unmount path so cleanup effects can run on root teardown.
export function unmountRoot() {
  if (!rootInstance) {
    return;
  }

  rootInstance.cleanup();
  rootInstance = null;
}
