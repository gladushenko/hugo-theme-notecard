const JUMP_TRIGGER_SELECTOR = '.pagination-jump-trigger';
const PAGINATION_SELECTOR = '.pagination';
const JUMP_DIALOG_ID = 'pagination-jump-dialog';
const JUMP_INPUT_ID = 'pagination-jump-input';
const JUMP_FORM_SELECTOR = '.pagination-jump-form';

/**
 * Проверяет поддержку HTMLDialogElement в текущем браузере.
 *
 * @param dialog Диалог перехода по страницам.
 * @returns boolean.
 */
function canUseDialog(dialog: HTMLDialogElement): boolean {
    return typeof dialog.showModal === 'function' && typeof dialog.close === 'function';
}

/**
 * Проверяет, находится ли клик внутри видимой области диалога.
 *
 * @param dialog Диалог.
 * @param event Событие клика.
 * @returns boolean.
 */
function isClickInsideDialog(dialog: HTMLDialogElement, event: MouseEvent): boolean {
    const rect = dialog.getBoundingClientRect();

    return rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
}

/**
 * Собирает URL страницы по номеру из data-атрибутов пагинации.
 *
 * @param navigation Контейнер пагинации.
 * @param pageNumber Номер страницы.
 * @returns string.
 */
function buildPageUrl(navigation: HTMLElement, pageNumber: number): string {
    const firstUrl = navigation.dataset.firstUrl || '';
    const formatUrl = navigation.dataset.formatUrl || '';

    if (pageNumber === 1) return firstUrl;

    return formatUrl.replace(/2([^\d]*)$/, `${pageNumber}$1`);
}

/**
 * Инициализирует диалог быстрого перехода к странице пагинации.
 *
 * @returns void.
 */
export function setupPaginationJump(): void {
    const triggers = document.querySelectorAll<HTMLButtonElement>(JUMP_TRIGGER_SELECTOR);
    const dialog = document.getElementById(JUMP_DIALOG_ID) as HTMLDialogElement | null;

    if (!dialog || triggers.length === 0 || !canUseDialog(dialog)) return;

    const navigation = document.querySelector(PAGINATION_SELECTOR) as HTMLElement | null;
    const input = document.getElementById(JUMP_INPUT_ID) as HTMLInputElement | null;
    const form = dialog.querySelector(JUMP_FORM_SELECTOR) as HTMLFormElement | null;
    let lastFocusedElement: HTMLElement | null = null;

    if (!navigation || !input || !form) return;

    /**
     * Закрывает диалог после CSS-анимации.
     *
     * @returns void.
     */
    const closeDialog = (): void => {
        if (dialog.classList.contains('closing')) return;

        dialog.classList.add('closing');
        dialog.addEventListener('animationend', () => {
            dialog.classList.remove('closing');
            dialog.close();
            lastFocusedElement?.isConnected && lastFocusedElement.focus();
        }, { once: true });
    };

    triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const activeElement = document.activeElement;
            lastFocusedElement = activeElement instanceof HTMLElement ? activeElement : trigger;
            dialog.showModal();
            input.value = '';
            input.focus();
        });
    });

    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeDialog();
    });

    dialog.addEventListener('click', (event) => {
        if (!isClickInsideDialog(dialog, event)) {
            closeDialog();
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        if (form.reportValidity()) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const targetPage = parseInt(input.value);
        const totalPages = parseInt(navigation.dataset.total || '0');

        if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) return;

        const targetUrl = buildPageUrl(navigation, targetPage);
        if (targetUrl) {
            window.location.href = targetUrl;
        }

        closeDialog();
    });
}
