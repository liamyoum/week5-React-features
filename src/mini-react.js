(() => {
	const learningReact = (window.LearningReact =
		window.LearningReact || {});
	const vdomCore = learningReact.vdom;
	const diffCore = learningReact.diff;
	const patchCore = learningReact.patch;

	if (!vdomCore || !diffCore || !patchCore) {
		throw new Error(
			'mini-react.js보다 먼저 vdom.js, diff.js, patch.js가 로드되어야 합니다.'
		);
	}

	let currentInstance = null;
	let currentRenderScope = 'idle';

	function renderChild(component, props) {
		const previousScope = currentRenderScope;
		currentRenderScope = 'child';

		try {
			return component(props);
		} finally {
			currentRenderScope = previousScope;
		}
	}

	function ensureHookAccess(hookName) {
		if (!currentInstance) {
			throw new Error(
				`${hookName}는 render 중에만 호출할 수 있습니다.`
			);
		}

		if (currentRenderScope !== 'root') {
			throw new Error(
				`${hookName}는 루트 컴포넌트에서만 호출할 수 있습니다.`
			);
		}

		return currentInstance;
	}

	function areDepsEqual(previousDeps, nextDeps) {
		if (!Array.isArray(previousDeps) || !Array.isArray(nextDeps)) {
			return false;
		}

		if (previousDeps.length !== nextDeps.length) {
			return false;
		}

		return previousDeps.every((value, index) =>
			Object.is(value, nextDeps[index])
		);
	}

	function useState(initialValue) {
		const instance = ensureHookAccess('useState');
		const slotIndex = instance.hookIndex;

		if (!instance.hooks[slotIndex]) {
			instance.hooks[slotIndex] = {
				kind: 'state',
				value: initialValue
			};
		}

		const slot = instance.hooks[slotIndex];
		instance.hookIndex += 1;

		return [
			slot.value,
			(nextValueOrUpdater) => {
				const previousValue = slot.value;
				const nextValue =
					typeof nextValueOrUpdater === 'function'
						? nextValueOrUpdater(previousValue)
						: nextValueOrUpdater;

				if (Object.is(previousValue, nextValue)) {
					return;
				}

				slot.value = nextValue;
				instance.update(`useState slot ${slotIndex} setter`);
			}
		];
	}

	function useEffect(effectFn, deps) {
		const instance = ensureHookAccess('useEffect');

		if (!Array.isArray(deps)) {
			throw new Error(
				'useEffect는 deps 배열을 반드시 받아야 합니다.'
			);
		}

		const slotIndex = instance.hookIndex;

		if (!instance.hooks[slotIndex]) {
			instance.hooks[slotIndex] = {
				kind: 'effect',
				deps: undefined,
				cleanup: null
			};
		}

		const slot = instance.hooks[slotIndex];
		const shouldRun = !areDepsEqual(slot.deps, deps);

		slot.deps = deps;
		instance.hookIndex += 1;

		if (shouldRun) {
			instance.pendingEffects.push({
				slot,
				effectFn
			});
		}
	}

	function useMemo(factory, deps) {
		const instance = ensureHookAccess('useMemo');

		if (!Array.isArray(deps)) {
			throw new Error('useMemo는 deps 배열을 반드시 받아야 합니다.');
		}

		const slotIndex = instance.hookIndex;

		if (!instance.hooks[slotIndex]) {
			instance.hooks[slotIndex] = {
				kind: 'memo',
				deps,
				value: factory()
			};
		} else {
			const slot = instance.hooks[slotIndex];

			if (!areDepsEqual(slot.deps, deps)) {
				slot.deps = deps;
				slot.value = factory();
			}
		}

		const slot = instance.hooks[slotIndex];
		instance.hookIndex += 1;
		return slot.value;
	}

	class FunctionComponent {
		constructor(options) {
			this.component = options.component;
			this.target = options.target;
			this.props = options.props;
			this.name = options.name;
			this.onCommit = options.onCommit ?? null;
			this.hooks = [];
			this.hookIndex = 0;
			this.pendingEffects = [];
			this.currentVNode = null;
			this.renderCount = 0;
			this.lastReason = '아직 렌더링 전';
		}

		mount() {
			this.update('mount');
		}

		update(reason) {
			this.renderCount += 1;
			this.lastReason = reason;
			this.hookIndex = 0;
			this.pendingEffects = [];

			currentInstance = this;
			currentRenderScope = 'root';

			let nextHTML = '';

			try {
				nextHTML = this.component({
					...this.props,
					__meta: {
						renderCount: this.renderCount,
						lastReason: this.lastReason
					}
				});
			} finally {
				currentInstance = null;
				currentRenderScope = 'idle';
			}

			const nextVNode = vdomCore.createVNodeFromHTML(nextHTML);
			const isMount = this.currentVNode === null;
			let patches = [];

			if (isMount) {
				if (this.target) {
					this.target.replaceChildren(
						patchCore.createRealNode(nextVNode)
					);
				}
			} else {
				patches = diffCore.diffTrees(this.currentVNode, nextVNode);

				if (this.target && patches.length > 0) {
					patchCore.applyPatches(this.target, patches);
				}
			}

			this.currentVNode = nextVNode;
			this.flushEffects(); // 렌더링이 다 끝나고 미뤄두었던 effect들 실행

			if (typeof this.onCommit === 'function') {
				this.onCommit({
					instance: this,
					reason,
					patches,
					isMount
				});
			}
		}

		flushEffects() {
			for (const effectJob of this.pendingEffects) {
				if (typeof effectJob.slot.cleanup === 'function') {
					effectJob.slot.cleanup();
				}

				const cleanup = effectJob.effectFn();
				effectJob.slot.cleanup =
					typeof cleanup === 'function' ? cleanup : null;
			}
		}

		setProps(nextProps) {
			this.props = nextProps;
			this.update('setProps');
		}
	}

	learningReact.miniReact = {
		FunctionComponent,
		renderChild,
		useState,
		useEffect,
		useMemo
	};
})();
