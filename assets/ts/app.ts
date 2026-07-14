/*!
 * Notecard
 */
import initMobileMenu from './navigation-panel';
import createElement from './dom-factory';
import NotecardColorScheme from './theme-switcher';
import { setupScrollspy } from './toc-marker';
import { setupSmoothAnchors } from './anchor-motion';
import { setupPaginationJump } from './page-jumper';
import { setupCodeCopy } from './clipboard-code';

const ARTICLE_CONTENT_SELECTOR = '.article-content';
const THEME_TOGGLE_ID = 'dark-mode-toggle';

const NotecardApp = {
    /**
     * Запускает клиентские улучшения темы после загрузки страницы.
     *
     * @returns void.
     */
    init(): void {
        initMobileMenu();
        this.initArticleTools();
        setupPaginationJump();
        this.initColorScheme();
    },

    /**
     * Подключает функции, которые нужны только на страницах со статьей.
     *
     * @returns void.
     */
    initArticleTools(): void {
        const articleContent = document.querySelector(ARTICLE_CONTENT_SELECTOR);
        if (!articleContent) return;

        setupSmoothAnchors();
        setupScrollspy();
        setupCodeCopy();
    },

    /**
     * Подключает переключатель светлой и темной темы.
     *
     * @returns void.
     */
    initColorScheme(): void {
        const toggle = document.getElementById(THEME_TOGGLE_ID);
        if (toggle) {
            new NotecardColorScheme(toggle);
        }
    },
};

window.addEventListener('load', () => {
    setTimeout(() => NotecardApp.init(), 0);
});

declare global {
    interface Window {
        createElement: any;
        Notecard: typeof NotecardApp;
    }
}

window.Notecard = NotecardApp;
window.createElement = createElement;
