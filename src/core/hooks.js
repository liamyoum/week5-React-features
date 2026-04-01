/**
 * mini React의 Hook 구현부이다.
 * Hook은 루트 FunctionComponent가 렌더링되는 동안에만 사용할 수 있다.
 */
let currentInstance = null;
let isRenderingRootComponent = false;

function haveDepsChanged(previousDeps, nextDeps) {
  if (!Array.isArray(previousDeps) || !Array.isArray(nextDeps)) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((dep, index) => !Object.is(dep, previousDeps[index]));
}

function assertHookUsage(name) {
  if (!currentInstance || !isRenderingRootComponent) {
    throw new Error(
      `${name} can only run while the root FunctionComponent is rendering.`,
    );
  }
}

function assertHookSlotType(instance, hookIndex, expectedType, hookName) {
  const existingHook = instance.hooks[hookIndex];

  if (existingHook && existingHook.type !== expectedType) {
    throw new Error(
      `${hookName} must keep the same call order on every render. ` +
        `Check conditional Hook calls or changed Hook positions.`,
    );
  }
}

export function prepareHooks(instance) {
  currentInstance = instance;
  isRenderingRootComponent = true;
  instance.hookIndex = 0;
  instance.pendingEffects = [];
}

export function finishHooks() {
  isRenderingRootComponent = false;
  currentInstance = null;
}

export function cleanupAllEffects(instance) {
  instance.hooks.forEach((hook) => {
    if (hook?.type === "effect" && typeof hook.cleanup === "function") {
      hook.cleanup();
      hook.cleanup = null;
    }
  });
}

// state 값을 hooks 배열에 저장하고 setState 호출 시 update를 예약한다.
export function useState(initialValue) {
  assertHookUsage("useState");

  const instance = currentInstance;
  const hookIndex = instance.hookIndex;

  assertHookSlotType(instance, hookIndex, "state", "useState");

  if (!instance.hooks[hookIndex]) {
    instance.hooks[hookIndex] = {
      type: "state",
      value:
        typeof initialValue === "function" ? initialValue() : initialValue,
    };
  }

  const setState = (nextValue) => {
    const hook = instance.hooks[hookIndex];
    const previousValue = hook.value;
    const resolvedValue =
      typeof nextValue === "function" ? nextValue(previousValue) : nextValue;

    if (Object.is(previousValue, resolvedValue)) {
      return;
    }

    hook.value = resolvedValue;
    instance.scheduleUpdate();
  };

  const value = instance.hooks[hookIndex].value;
  instance.hookIndex += 1;

  return [value, setState];
}

// dependency 배열을 비교해 patch 이후 실행할 effect를 등록한다.
export function useEffect(effect, deps) {
  assertHookUsage("useEffect");

  const instance = currentInstance;
  const hookIndex = instance.hookIndex;

  assertHookSlotType(instance, hookIndex, "effect", "useEffect");
  const hook =
    instance.hooks[hookIndex] ??
    {
      type: "effect",
      deps: undefined,
      cleanup: null,
    };

  if (haveDepsChanged(hook.deps, deps)) {
    instance.pendingEffects.push(() => {
      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const cleanup = effect();
      hook.cleanup = typeof cleanup === "function" ? cleanup : null;
      hook.deps = Array.isArray(deps) ? [...deps] : undefined;
    });
  }

  instance.hooks[hookIndex] = hook;
  instance.hookIndex += 1;
}

// dependency가 바뀌지 않으면 이전 계산 결과를 재사용한다.
export function useMemo(factory, deps) {
  assertHookUsage("useMemo");

  const instance = currentInstance;
  const hookIndex = instance.hookIndex;

  assertHookSlotType(instance, hookIndex, "memo", "useMemo");
  const hook =
    instance.hooks[hookIndex] ??
    {
      type: "memo",
      deps: undefined,
      value: undefined,
    };

  if (haveDepsChanged(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = Array.isArray(deps) ? [...deps] : undefined;
  }

  instance.hooks[hookIndex] = hook;
  instance.hookIndex += 1;

  return hook.value;
}
