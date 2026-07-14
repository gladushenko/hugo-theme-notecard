interface CookieChoiceState {
    necessary: boolean;
    analytics: boolean;
    functional: boolean;
    timestamp: number;
}

type CookieCategory = keyof Omit<CookieChoiceState, 'timestamp'>;

const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_COOKIE_DAYS = 365;
const CONSENT_EVENT_NAME = 'onCookieConsentChange';
const BANNER_ID = 'cookie-consent-banner';
const SETTINGS_PANEL_ID = 'cookie-settings-panel';
const CATEGORY_INPUT_SELECTOR = 'input[data-cookie-category]';

class NotecardCookieConsent {
    private choice: CookieChoiceState | null = null;
    private banner: HTMLElement | null = null;
    private settingsPanel: HTMLElement | null = null;

    /**
     * Загружает сохраненный выбор и подключает кнопки cookie-баннера.
     */
    constructor() {
        this.banner = document.getElementById(BANNER_ID);
        this.settingsPanel = document.getElementById(SETTINGS_PANEL_ID);
        this.choice = this.readChoice();

        if (!this.choice && this.banner) {
            this.showBanner();
        }

        this.bindActionButtons();
        this.broadcastChoice();
    }

    /**
     * Читает сохраненное согласие из cookie.
     *
     * @returns CookieChoiceState | null.
     */
    private readChoice(): CookieChoiceState | null {
        const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

        if (!cookie) return null;

        try {
            return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        }
        catch {
            return null;
        }
    }

    /**
     * Сохраняет текущее согласие в cookie.
     *
     * @returns void.
     */
    private persistChoice(): void {
        if (!this.choice) return;

        const expires = new Date();
        expires.setDate(expires.getDate() + CONSENT_COOKIE_DAYS);

        document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(this.choice))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }

    /**
     * Показывает cookie-баннер.
     *
     * @returns void.
     */
    private showBanner(): void {
        this.banner?.removeAttribute('aria-hidden');
    }

    /**
     * Убирает фокус из элемента внутри панели перед скрытием.
     *
     * @param container Контейнер, который будет скрыт.
     * @returns void.
     */
    private blurInside(container: HTMLElement): void {
        const activeElement = document.activeElement as HTMLElement | null;

        if (activeElement && container.contains(activeElement)) {
            activeElement.blur();
        }
    }

    /**
     * Скрывает cookie-баннер и панель настроек.
     *
     * @returns void.
     */
    private hideBanner(): void {
        if (this.banner) {
            this.blurInside(this.banner);
            this.banner.setAttribute('aria-hidden', 'true');
        }

        this.hideSettings();
    }

    /**
     * Возвращает чекбоксы категорий в панели настроек.
     *
     * @param root Контейнер для поиска чекбоксов.
     * @returns HTMLInputElement[].
     */
    private getCategoryInputs(root: ParentNode = document): HTMLInputElement[] {
        return Array.from(root.querySelectorAll(CATEGORY_INPUT_SELECTOR)) as HTMLInputElement[];
    }

    /**
     * Показывает панель настроек и синхронизирует чекбоксы с текущим выбором.
     *
     * @returns void.
     */
    private showSettings(): void {
        if (!this.settingsPanel) return;

        this.settingsPanel.removeAttribute('aria-hidden');

        this.getCategoryInputs(this.settingsPanel).forEach((input) => {
            const category = input.dataset.cookieCategory as CookieCategory;
            input.checked = !!this.choice?.[category];
        });
    }

    /**
     * Скрывает панель настроек cookie.
     *
     * @returns void.
     */
    private hideSettings(): void {
        if (!this.settingsPanel) return;

        this.blurInside(this.settingsPanel);
        this.settingsPanel.setAttribute('aria-hidden', 'true');
    }

    /**
     * Подписывает документ на клики по кнопкам с data-cookie-action.
     *
     * @returns void.
     */
    private bindActionButtons(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const action = target.dataset.cookieAction;

            if (!action) return;

            switch (action) {
                case 'accept':
                    this.acceptAll();
                    break;
                case 'deny':
                    this.denyOptional();
                    break;
                case 'settings':
                    this.showSettings();
                    break;
                case 'save':
                    this.saveCustomChoice();
                    break;
                case 'cancel':
                    this.hideSettings();
                    break;
                case 'reopen':
                    this.showBanner();
                    break;
            }
        });
    }

    /**
     * Создает объект состояния согласия.
     *
     * @param analytics Разрешена ли аналитика.
     * @param functional Разрешены ли функциональные сторонние сервисы.
     * @returns CookieChoiceState.
     */
    private createChoice(analytics: boolean, functional: boolean): CookieChoiceState {
        return {
            necessary: true,
            analytics,
            functional,
            timestamp: Date.now(),
        };
    }

    /**
     * Принимает все категории cookie.
     *
     * @returns void.
     */
    private acceptAll(): void {
        this.choice = this.createChoice(true, true);
        this.persistAndClose();
    }

    /**
     * Отклоняет необязательные категории cookie.
     *
     * @returns void.
     */
    private denyOptional(): void {
        this.choice = this.createChoice(false, false);
        this.persistAndClose();
    }

    /**
     * Сохраняет выбор пользователя из панели настроек.
     *
     * @returns void.
     */
    private saveCustomChoice(): void {
        this.choice = this.createChoice(false, false);

        this.getCategoryInputs().forEach((input) => {
            const category = input.dataset.cookieCategory as CookieCategory;
            if (category in this.choice!) {
                this.choice![category] = input.checked;
            }
        });

        this.persistAndClose();
    }

    /**
     * Сохраняет состояние, скрывает баннер и отправляет событие.
     *
     * @returns void.
     */
    private persistAndClose(): void {
        this.persistChoice();
        this.hideBanner();
        this.broadcastChoice();
    }

    /**
     * Отправляет событие для модулей, которым нужно знать cookie-согласие.
     *
     * @returns void.
     */
    private broadcastChoice(): void {
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: this.choice }));

        if (this.choice) {
            document.documentElement.dataset.consentAnalytics = String(this.choice.analytics);
            document.documentElement.dataset.consentFunctional = String(this.choice.functional);
        }
    }

    /**
     * Проверяет согласие на конкретную категорию.
     *
     * @param category Категория cookie.
     * @returns boolean.
     */
    public hasConsent(category: CookieCategory): boolean {
        return this.choice?.[category] ?? false;
    }

    /**
     * Возвращает полное состояние cookie-согласия.
     *
     * @returns CookieChoiceState | null.
     */
    public getState(): CookieChoiceState | null {
        return this.choice;
    }

    /**
     * Повторно открывает cookie-баннер.
     *
     * @returns void.
     */
    public reopenBanner(): void {
        this.showBanner();
    }
}

declare global {
    interface Window {
        cookieConsent: NotecardCookieConsent;
    }
}

/**
 * Создает глобальный экземпляр cookie-согласия после готовности DOM.
 *
 * @returns void.
 */
function bootCookieConsent(): void {
    window.cookieConsent = new NotecardCookieConsent();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCookieConsent, { once: true });
}
else {
    bootCookieConsent();
}

export default NotecardCookieConsent;
