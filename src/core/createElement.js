/**
 * JSX 없이 Virtual DOM 객체를 만들기 위한 함수이다.
 * React.createElement와 비슷하게 type, props, children을 받아 vnode를 생성한다.
 */
export const TEXT_ELEMENT = "TEXT_ELEMENT";

function createTextElement(value) {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      nodeValue: String(value),
      children: [],
    },
    dom: null,
  };
}

function flattenChildren(children, result = []) {
  children.forEach((child) => {
    if (Array.isArray(child)) {
      flattenChildren(child, result);
      return;
    }

    if (
      child === null ||
      child === undefined ||
      child === false ||
      child === true
    ) {
      return;
    }

    if (typeof child === "string" || typeof child === "number") {
      result.push(createTextElement(child));
      return;
    }

    result.push(child);
  });

  return result;
}

export function createElement(type, props = {}, ...children) {
  const nextProps = { ...props };
  const key = nextProps.key ?? null;

  delete nextProps.key;

  return {
    type,
    key,
    props: {
      ...nextProps,
      children: flattenChildren(children),
    },
    dom: null,
  };
}

export const h = createElement;
