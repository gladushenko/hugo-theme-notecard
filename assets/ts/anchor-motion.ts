const ANCHOR_LINK_SELECTOR = 'a[href]';

/**
 * Проверяет, что ссылка ведет на якорь внутри текущей страницы.
 *
 * @param href Значение href у ссылки.
 * @returns boolean.
 */
function isLocalAnchor(href: string | null): href is string {
    return !!href && href.startsWith('#');
}

/**
 * Находит вертикальную позицию целевого элемента относительно документа.
 *
 * @param target Элемент, к которому нужно прокрутить страницу.
 * @returns number.
 */
function getDocumentOffsetTop(target: HTMLElement): number {
    return target.getBoundingClientRect().top - document.documentElement.getBoundingClientRect().top;
}

/**
 * Плавно прокручивает страницу к якорю и обновляет URL.
 *
 * @param link Ссылка, по которой кликнул пользователь.
 * @param event Событие клика.
 * @returns void.
 */
function scrollToAnchor(link: HTMLAnchorElement, event: Event): void {
    const href = link.getAttribute('href');
    if (!isLocalAnchor(href)) return;

    const targetId = decodeURI(href.substring(1));
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    window.history.pushState({}, '', href);
    scrollTo({ top: getDocumentOffsetTop(target), behavior: 'smooth' });
}

/**
 * Подключает плавную прокрутку для локальных якорных ссылок.
 *
 * @returns void.
 */
function setupSmoothAnchors(): void {
    document.querySelectorAll<HTMLAnchorElement>(ANCHOR_LINK_SELECTOR).forEach((link) => {
        const href = link.getAttribute('href');
        if (!isLocalAnchor(href)) return;

        link.addEventListener('click', (event) => scrollToAnchor(link, event));
    });
}

export { setupSmoothAnchors };
