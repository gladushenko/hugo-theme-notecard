type HeadingOffset = {
    id: string;
    offset: number;
};

type TocItemMap = Record<string, HTMLElement>;

const ARTICLE_HEADING_SELECTOR = '.article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id], .article-content h5[id], .article-content h6[id]';
const TOC_SELECTOR = '#TableOfContents';
const TOC_ITEM_SELECTOR = '#TableOfContents li';
const ACTIVE_TOC_CLASS = 'active-class';
const ACTIVE_OFFSET = 20;

/**
 * Ограничивает частоту вызова функции одним requestAnimationFrame.
 *
 * @param callback Функция, которую нужно вызвать после текущего кадра.
 * @returns () => void.
 */
function onNextFrame(callback: () => void): () => void {
    let frameId: number | null = null;

    return () => {
        if (frameId) {
            window.cancelAnimationFrame(frameId);
        }

        frameId = window.requestAnimationFrame(callback);
    };
}

/**
 * Прокручивает оглавление так, чтобы активный пункт был ближе к центру.
 *
 * @param tocItem Активный пункт оглавления.
 * @param tocContainer Прокручиваемый контейнер оглавления.
 * @returns void.
 */
function centerTocItem(tocItem: HTMLElement, tocContainer: HTMLElement): void {
    const link = tocItem.querySelector('a');
    const linkHeight = link?.offsetHeight ?? 0;
    const nextScrollTop = tocItem.offsetTop - tocContainer.offsetHeight / 2 + linkHeight / 2 - tocContainer.offsetTop;

    tocContainer.scrollTo({
        top: Math.max(nextScrollTop, 0),
        behavior: 'smooth',
    });
}

/**
 * Создает соответствие id заголовка и пункта оглавления.
 *
 * @param tocItems Все элементы списка в оглавлении.
 * @returns TocItemMap.
 */
function mapTocItemsByHeadingId(tocItems: NodeListOf<Element>): TocItemMap {
    const itemsById: TocItemMap = {};

    tocItems.forEach((tocItem: HTMLElement) => {
        const link = tocItem.querySelector('a');
        const href = link?.getAttribute('href');

        if (href?.startsWith('#')) {
            itemsById[href.slice(1)] = tocItem;
        }
    });

    return itemsById;
}

/**
 * Считывает текущие вертикальные позиции заголовков статьи.
 *
 * @param headings Заголовки статьи.
 * @returns HeadingOffset[].
 */
function readHeadingOffsets(headings: NodeListOf<Element>): HeadingOffset[] {
    return Array.from(headings)
        .map((heading: HTMLElement) => ({ id: heading.id, offset: heading.offsetTop }))
        .sort((left, right) => left.offset - right.offset);
}

/**
 * Выбирает активный заголовок по текущей прокрутке страницы.
 *
 * @param offsets Позиции заголовков.
 * @param scrollTop Текущая прокрутка документа.
 * @returns string | undefined.
 */
function findActiveHeadingId(offsets: HeadingOffset[], scrollTop: number): string | undefined {
    let activeId: string | undefined;

    for (const section of offsets) {
        if (scrollTop >= section.offset - ACTIVE_OFFSET) {
            activeId = section.id;
        }
    }

    return activeId;
}

/**
 * Подключает подсветку активного пункта оглавления при скролле.
 *
 * @returns void.
 */
function setupScrollspy(): void {
    const headings = document.querySelectorAll(ARTICLE_HEADING_SELECTOR);
    const tocContainer = document.querySelector(TOC_SELECTOR) as HTMLElement | null;
    const tocItems = document.querySelectorAll(TOC_ITEM_SELECTOR);

    if (headings.length === 0 || !tocContainer || tocItems.length === 0) return;

    let headingOffsets = readHeadingOffsets(headings);
    let tocHovered = false;
    let activeTocItem: HTMLElement | undefined;
    const tocItemsByHeadingId = mapTocItemsByHeadingId(tocItems);

    /**
     * Пересчитывает активный заголовок и обновляет класс в оглавлении.
     *
     * @returns void.
     */
    const updateActiveTocItem = (): void => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const activeHeadingId = findActiveHeadingId(headingOffsets, scrollTop);
        const nextTocItem = activeHeadingId ? tocItemsByHeadingId[activeHeadingId] : undefined;

        if (nextTocItem === activeTocItem) return;

        activeTocItem?.classList.remove(ACTIVE_TOC_CLASS);

        if (nextTocItem) {
            nextTocItem.classList.add(ACTIVE_TOC_CLASS);

            if (!tocHovered) {
                centerTocItem(nextTocItem, tocContainer);
            }
        }

        activeTocItem = nextTocItem;
    };

    /**
     * Обновляет позиции заголовков после изменения размеров.
     *
     * @returns void.
     */
    const refreshOffsets = (): void => {
        headingOffsets = readHeadingOffsets(headings);
        updateActiveTocItem();
    };

    tocContainer.addEventListener('mouseenter', onNextFrame(() => tocHovered = true));
    tocContainer.addEventListener('mouseleave', onNextFrame(() => tocHovered = false));
    window.addEventListener('scroll', onNextFrame(updateActiveTocItem));
    window.addEventListener('resize', onNextFrame(refreshOffsets));

    const articleContent = document.querySelector('.article-content');
    if (articleContent) {
        new ResizeObserver(onNextFrame(refreshOffsets)).observe(articleContent);
    }
}

export { setupScrollspy };
