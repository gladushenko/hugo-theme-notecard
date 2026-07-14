import * as params from '@params';

const CODE_BLOCK_SELECTOR = '.article-content div.highlight';
const CODE_CONTENT_SELECTOR = 'code[data-lang]';
const COPY_BUTTON_CLASS = 'copyCodeButton';
const COPY_RESET_DELAY_MS = 1000;

/**
 * Создает кнопку копирования для одного блока кода.
 *
 * @param highlight Контейнер подсвеченного кода.
 * @param idleText Текст кнопки до копирования.
 * @param successText Текст кнопки после успешного копирования.
 * @returns void.
 */
function mountCopyButton(highlight: Element, idleText: string, successText: string): void {
    const codeElement = highlight.querySelector(CODE_CONTENT_SELECTOR);
    if (!codeElement) return;

    const button = document.createElement('button');
    button.textContent = idleText;
    button.classList.add(COPY_BUTTON_CLASS);
    highlight.appendChild(button);

    button.addEventListener('click', () => {
        navigator.clipboard.writeText(codeElement.textContent || '')
            .then(() => {
                button.textContent = successText;

                setTimeout(() => {
                    button.textContent = idleText;
                }, COPY_RESET_DELAY_MS);
            })
            .catch((error) => {
                alert(error);
                console.log('Code copy failed', error);
            });
    });
}

/**
 * Добавляет кнопки копирования ко всем блокам кода в статье.
 *
 * @returns void.
 */
export function setupCodeCopy(): void {
    if (!navigator.clipboard) {
        console.warn('Clipboard API is not available. Code copy buttons were not mounted.');
        return;
    }

    const highlights = document.querySelectorAll(CODE_BLOCK_SELECTOR);
    const idleText = params.codeblock.copy;
    const successText = params.codeblock.copied;

    highlights.forEach((highlight) => mountCopyButton(highlight, idleText, successText));
}
