type ElementProps = Record<string, any> | null;

/**
 * Применяет JSX-атрибуты к созданному DOM-элементу.
 *
 * @param element DOM-элемент.
 * @param props Набор атрибутов из JSX.
 * @returns void.
 */
function applyProps(element: HTMLElement, props: ElementProps): void {
    if (!props) return;

    for (const name in props) {
        if (!Object.prototype.hasOwnProperty.call(props, name)) continue;

        const value = props[name];

        if (name === 'dangerouslySetInnerHTML') {
            element.innerHTML = value.__html;
        }
        else if (value === true) {
            element.setAttribute(name, name);
        }
        else if (value !== false && value != null) {
            element.setAttribute(name, value.toString());
        }
    }
}

/**
 * Добавляет дочерние узлы, которые пришли из JSX.
 *
 * @param element Родительский DOM-элемент.
 * @param children Дочерние элементы или текстовые значения.
 * @returns void.
 */
function appendChildren(element: HTMLElement, children: unknown[]): void {
    for (const child of children) {
        if (!child) continue;

        element.appendChild(
            (child as Node).nodeType == null
                ? document.createTextNode(child.toString())
                : child as Node
        );
    }
}

/**
 * Минимальная JSX-фабрика для клиентских компонентов темы.
 *
 * @param tag Имя HTML-тега.
 * @param props Атрибуты элемента.
 * @param children Дочерние элементы.
 * @returns HTMLElement.
 */
function createElement(tag: string, props: ElementProps, ...children: unknown[]): HTMLElement {
    const element = document.createElement(tag);

    applyProps(element, props);
    appendChildren(element, children);

    return element;
}

export default createElement;
