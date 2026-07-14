type SlideDirection = 'open' | 'close';

const MENU_TOGGLE_ID = 'toggle-menu';
const MAIN_MENU_ID = 'main-menu';
const MENU_ANIMATION_MS = 300;
const SLIDE_PROPERTIES = 'height, margin, padding';

/**
 * Очищает inline-стили, которые нужны только на время анимации.
 *
 * @param panel Элемент выпадающего меню.
 * @returns void.
 */
function clearSlideStyles(panel: HTMLElement): void {
    panel.style.removeProperty('height');
    panel.style.removeProperty('padding-top');
    panel.style.removeProperty('padding-bottom');
    panel.style.removeProperty('margin-top');
    panel.style.removeProperty('margin-bottom');
    panel.style.removeProperty('overflow');
    panel.style.removeProperty('transition-duration');
    panel.style.removeProperty('transition-property');
    panel.classList.remove('transiting');
}

/**
 * Запускает вертикальную анимацию открытия или закрытия меню.
 *
 * @param panel Элемент меню, который нужно анимировать.
 * @param direction Направление анимации.
 * @param duration Длительность анимации в миллисекундах.
 * @returns void.
 */
function animateMenuPanel(panel: HTMLElement, direction: SlideDirection, duration = MENU_ANIMATION_MS): void {
    panel.classList.add('transiting');
    panel.style.overflow = 'hidden';

    const targetHeight = direction === 'open' ? panel.offsetHeight : 0;

    if (direction === 'open') {
        panel.classList.add('show');
        panel.style.height = '0';
        panel.style.paddingTop = '0';
        panel.style.paddingBottom = '0';
        panel.style.marginTop = '0';
        panel.style.marginBottom = '0';
        panel.offsetHeight;
    }
    else {
        panel.style.height = `${panel.offsetHeight}px`;
        panel.offsetHeight;
    }

    panel.style.transitionProperty = SLIDE_PROPERTIES;
    panel.style.transitionDuration = `${duration}ms`;
    panel.style.height = direction === 'open' ? `${targetHeight}px` : '0';

    if (direction === 'open') {
        panel.style.removeProperty('padding-top');
        panel.style.removeProperty('padding-bottom');
        panel.style.removeProperty('margin-top');
        panel.style.removeProperty('margin-bottom');
    }
    else {
        panel.style.paddingTop = '0';
        panel.style.paddingBottom = '0';
        panel.style.marginTop = '0';
        panel.style.marginBottom = '0';
    }

    window.setTimeout(() => {
        if (direction === 'close') {
            panel.classList.remove('show');
        }

        clearSlideStyles(panel);
    }, duration);
}

/**
 * Переключает видимость мобильного меню.
 *
 * @param panel Элемент основного меню.
 * @returns void.
 */
function toggleMenuPanel(panel: HTMLElement): void {
    const isCollapsed = window.getComputedStyle(panel).display === 'none';
    animateMenuPanel(panel, isCollapsed ? 'open' : 'close');
}

/**
 * Инициализирует кнопку мобильного меню.
 *
 * @returns void.
 */
export default function initMobileMenu(): void {
    const toggleButton = document.getElementById(MENU_TOGGLE_ID);
    const menuPanel = document.getElementById(MAIN_MENU_ID);

    if (!toggleButton || !menuPanel) return;

    toggleButton.addEventListener('click', () => {
        if (menuPanel.classList.contains('transiting')) return;

        document.body.classList.toggle('show-menu');
        toggleMenuPanel(menuPanel);
        toggleButton.classList.toggle('is-active');
    });
}
