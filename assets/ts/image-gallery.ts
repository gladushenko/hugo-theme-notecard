const GALLERY_IMAGE_SELECTOR = 'img.gallery-image';
const FIGURE_SELECTOR = 'figure.gallery-image';
const EMPTY_PARAGRAPH_CLASS = 'no-text';

/**
 * Оборачивает соседние figure в общий контейнер галереи.
 *
 * @param figures Соседние элементы figure.
 * @returns void.
 */
function wrapFiguresIntoGallery(figures: HTMLElement[]): void {
    if (figures.length === 0) return;

    const gallery = document.createElement('div');
    gallery.className = 'gallery';

    const parent = figures[0].parentNode;
    parent?.insertBefore(gallery, figures[0]);

    figures.forEach((figure) => gallery.appendChild(figure));
}

/**
 * Декодирует HTML-сущности, которые приходят из data-атрибута.
 *
 * @param html Строка с HTML-сущностями.
 * @returns string.
 */
function decodeHtmlEntities(html: string): string {
    return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * Проверяет, что картинка находится в отдельном абзаце без текста.
 *
 * @param image Изображение галереи.
 * @param container Контейнер статьи.
 * @returns HTMLParagraphElement | null.
 */
function getImageOnlyParagraph(image: HTMLImageElement, container: HTMLElement): HTMLParagraphElement | null {
    const paragraph = image.closest('p');
    if (!paragraph || !container.contains(paragraph)) return null;

    if (paragraph.textContent.trim() === '') {
        paragraph.classList.add(EMPTY_PARAGRAPH_CLASS);
    }

    return paragraph.classList.contains(EMPTY_PARAGRAPH_CLASS) ? paragraph : null;
}

/**
 * Создает ссылку для PhotoSwipe вокруг изображения.
 *
 * @param image Изображение галереи.
 * @returns HTMLElement.
 */
function ensureImageLink(image: HTMLImageElement): HTMLElement {
    if (image.parentElement?.tagName === 'A') {
        const existingLink = image.parentElement;
        existingLink.classList.add('image-link');
        existingLink.setAttribute('data-pswp-width', image.getAttribute('width') || '');
        existingLink.setAttribute('data-pswp-height', image.getAttribute('height') || '');

        return existingLink;
    }

    const link = document.createElement('a');
    link.href = image.src;
    link.className = 'image-link';
    link.target = '_blank';
    link.setAttribute('data-pswp-width', image.getAttribute('width') || '');
    link.setAttribute('data-pswp-height', image.getAttribute('height') || '');

    image.parentNode?.insertBefore(link, image);
    link.appendChild(image);

    return link;
}

/**
 * Создает figure для одного изображения.
 *
 * @param image Изображение галереи.
 * @returns HTMLElement.
 */
function buildGalleryFigure(image: HTMLImageElement): HTMLElement {
    const imageLink = ensureImageLink(image);
    const figure = document.createElement('figure');
    figure.classList.add('gallery-image');
    figure.style.setProperty('flex-grow', image.getAttribute('data-flex-grow') || '1');
    figure.style.setProperty('flex-basis', image.getAttribute('data-flex-basis') || '0');

    imageLink.parentElement?.insertBefore(figure, imageLink);
    figure.appendChild(imageLink);

    const escapedTitle = image.getAttribute('data-title-escaped');
    const caption = escapedTitle ? decodeHtmlEntities(escapedTitle) : image.getAttribute('alt');

    if (caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.innerHTML = caption;
        figure.appendChild(figcaption);
    }

    return figure;
}

/**
 * Группирует подряд идущие изображения в отдельные галереи.
 *
 * @param container Контейнер статьи.
 * @returns void.
 */
function groupAdjacentFigures(container: HTMLElement): void {
    const figures = Array.from(container.querySelectorAll(FIGURE_SELECTOR)) as HTMLElement[];
    let currentGroup: HTMLElement[] = [];

    for (const figure of figures) {
        if (currentGroup.length === 0 || figure.previousElementSibling === currentGroup[currentGroup.length - 1]) {
            currentGroup.push(figure);
            continue;
        }

        wrapFiguresIntoGallery(currentGroup);
        currentGroup = [figure];
    }

    wrapFiguresIntoGallery(currentGroup);
}

/**
 * Превращает markdown-изображения статьи в галереи.
 *
 * @param container Контейнер контента статьи.
 * @returns void.
 */
export default function setupArticleGallery(container: HTMLElement): void {
    const images = Array.from(container.querySelectorAll(GALLERY_IMAGE_SELECTOR)) as HTMLImageElement[];

    for (const image of images) {
        if (!getImageOnlyParagraph(image, container)) continue;

        buildGalleryFigure(image);
    }

    groupAdjacentFigures(container);
}
