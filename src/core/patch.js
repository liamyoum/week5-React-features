/**
 * diff 결과를 실제 DOM에 반영한다.
 * UPDATE 단계에서는 props를 갱신하고, 자식 patch를 적용한 뒤 최종 순서를 새 children 기준으로 맞춘다.
 */
import { applyPropChanges, createDomNode } from "./dom.js";

function reorderChildren(parentDom, nextChildren) {
  const desiredNodes = nextChildren.map((child) => child.dom).filter(Boolean);

  desiredNodes.forEach((childDom, index) => {
    const currentNode = parentDom.childNodes[index];

    if (currentNode !== childDom) {
      parentDom.insertBefore(childDom, currentNode || null);
    }
  });
}

function removeExtraNodes(parentDom, expectedLength) {
  while (parentDom.childNodes.length > expectedLength) {
    parentDom.removeChild(parentDom.lastChild);
  }
}

// diff 결과를 읽고 실제 DOM에 필요한 최소 변경만 반영한다.
export function patch(patchResult, container = null) {
  switch (patchResult.type) {
    case "CREATE": {
      return createDomNode(patchResult.newVNode);
    }

    case "REMOVE": {
      const dom = patchResult.oldVNode?.dom;

      if (dom?.parentNode) {
        dom.parentNode.removeChild(dom);
      }

      return null;
    }

    case "REPLACE": {
      const newDom = createDomNode(patchResult.newVNode);
      const oldDom = patchResult.oldVNode.dom;
      const parentDom = oldDom.parentNode || container;

      if (parentDom) {
        parentDom.replaceChild(newDom, oldDom);
      }

      return newDom;
    }

    case "TEXT": {
      const dom = patchResult.oldVNode.dom;
      dom.nodeValue = patchResult.newVNode.props.nodeValue;
      patchResult.newVNode.dom = dom;
      return dom;
    }

    case "NONE": {
      if (patchResult.oldVNode && patchResult.newVNode) {
        patchResult.newVNode.dom = patchResult.oldVNode.dom;
        return patchResult.newVNode.dom;
      }

      return null;
    }

    case "UPDATE": {
      const { oldVNode, newVNode, propChanges, childPatches } = patchResult;
      const dom = oldVNode.dom;

      newVNode.dom = dom;
      applyPropChanges(dom, propChanges);

      childPatches.forEach((childPatch) => {
        patch(childPatch, dom);
      });

      reorderChildren(dom, newVNode.props.children);
      removeExtraNodes(dom, newVNode.props.children.length);

      return dom;
    }

    default:
      throw new Error(`알 수 없는 patch 타입입니다: ${patchResult.type}`);
  }
}
