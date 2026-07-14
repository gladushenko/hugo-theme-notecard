type ColorScheme = 'light' | 'dark' | 'auto';

const COLOR_STORAGE_KEY = 'NotecardColorScheme';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

class NotecardColorScheme {
    private currentScheme: ColorScheme;
    private systemScheme: ColorScheme;

    /**
     * Подключает переключатель темы и применяет сохраненную схему.
     *
     * @param toggleElement Кнопка переключения светлой/темной темы.
     */
    constructor(toggleElement: HTMLElement) {
        this.systemScheme = this.detectSystemScheme();
        this.currentScheme = this.readSavedScheme();

        this.bindSystemSchemeWatcher();
        this.emitSchemeChange(document.documentElement.dataset.scheme as ColorScheme);

        if (toggleElement) {
            this.bindToggle(toggleElement);
        }

        if (document.body.style.transition === '') {
            document.body.style.setProperty('transition', 'background-color .3s ease');
        }
    }

    /**
     * Определяет текущую системную цветовую схему.
     *
     * @returns Scheme.
     */
    private detectSystemScheme(): ColorScheme {
        return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
    }

    /**
     * Сохраняет выбранный режим темы в localStorage.
     *
     * @returns void.
     */
    private persistScheme(): void {
        localStorage.setItem(COLOR_STORAGE_KEY, this.currentScheme);
    }

    /**
     * Навешивает обработчик клика на переключатель темы.
     *
     * @param toggleElement Кнопка переключения темы.
     * @returns void.
     */
    private bindToggle(toggleElement: HTMLElement): void {
        toggleElement.addEventListener('click', () => {
            this.currentScheme = this.isDarkActive() ? 'light' : 'dark';
            this.applySchemeToDocument();

            if (this.currentScheme === this.systemScheme) {
                this.currentScheme = 'auto';
            }

            this.persistScheme();
        });
    }

    /**
     * Проверяет, должна ли сейчас быть включена темная тема.
     *
     * @returns boolean.
     */
    private isDarkActive(): boolean {
        return this.currentScheme === 'dark' || (this.currentScheme === 'auto' && this.systemScheme === 'dark');
    }

    /**
     * Оповещает остальные модули о смене цветовой схемы.
     *
     * @param scheme Новая активная схема.
     * @returns void.
     */
    private emitSchemeChange(scheme: ColorScheme): void {
        window.dispatchEvent(new CustomEvent('onColorSchemeChange', { detail: scheme }));
    }

    /**
     * Проставляет data-scheme на корневой html-элемент.
     *
     * @returns void.
     */
    private applySchemeToDocument(): void {
        document.documentElement.dataset.scheme = this.isDarkActive() ? 'dark' : 'light';
        this.emitSchemeChange(document.documentElement.dataset.scheme as ColorScheme);
    }

    /**
     * Читает сохраненную схему или возвращает auto.
     *
     * @returns ColorScheme.
     */
    private readSavedScheme(): ColorScheme {
        const savedScheme = localStorage.getItem(COLOR_STORAGE_KEY);
        if (savedScheme === 'light' || savedScheme === 'dark' || savedScheme === 'auto') return savedScheme;

        return 'auto';
    }

    /**
     * Следит за изменением системной темы.
     *
     * @returns void.
     */
    private bindSystemSchemeWatcher(): void {
        window.matchMedia(DARK_SCHEME_QUERY).addEventListener('change', (event) => {
            this.systemScheme = event.matches ? 'dark' : 'light';
            this.applySchemeToDocument();
        });
    }
}

export default NotecardColorScheme;
