interface SearchIndexEntry {
    title: string;
    date: string;
    permalink: string;
    content: string;
    image?: string;
}

interface SearchCardData extends SearchIndexEntry {
    excerpt: string;
    score: number;
}

interface TextRange {
    from: number;
    to: number;
}

interface SearchViewElements {
    form: HTMLFormElement;
    input: HTMLInputElement;
    resultsList: HTMLDivElement;
    resultsTitle: HTMLHeadingElement;
    titleTemplate: string;
}

const SEARCH_QUERY_PARAM = 'keyword';
const EXCERPT_LIMIT = 140;
const EXCERPT_PADDING = 20;

const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '…': '&hellip;',
};

/**
 * Экранирует HTML-символы перед вставкой строки через innerHTML.
 *
 * @param text Исходная строка.
 * @returns string.
 */
function encodeHtml(text: string): string {
    return text.replace(/[&<>"]/g, (symbol) => htmlEntities[symbol] || symbol);
}

/**
 * Экранирует пользовательский текст для безопасной вставки в RegExp.
 *
 * @param value Часть поискового запроса.
 * @returns string.
 */
function escapeRegexToken(value: string): string {
    return value.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Разбивает поисковую фразу на отдельные непустые слова.
 *
 * @param phrase Строка из поля поиска.
 * @returns string[].
 */
function splitSearchPhrase(phrase: string): string[] {
    return phrase
        .split(' ')
        .map((part) => part.trim())
        .filter(Boolean);
}

/**
 * Создает регулярное выражение для поиска любого из введенных слов.
 *
 * @param tokens Подготовленные части поискового запроса.
 * @returns RegExp | null.
 */
function createSearchPattern(tokens: string[]): RegExp | null {
    const preparedTokens = tokens.map(escapeRegexToken).filter(Boolean);
    if (preparedTokens.length === 0) return null;

    return new RegExp(preparedTokens.join('|'), 'gi');
}

/**
 * Находит позиции всех совпадений в переданном тексте.
 *
 * @param text Текст, по которому идет поиск.
 * @param pattern Регулярное выражение поискового запроса.
 * @returns TextRange[].
 */
function findTextRanges(text: string, pattern: RegExp): TextRange[] {
    const ranges: TextRange[] = [];

    for (const match of text.matchAll(pattern)) {
        const from = match.index ?? 0;
        ranges.push({
            from,
            to: from + match[0].length,
        });
    }

    return ranges;
}

/**
 * Собирает HTML-фрагмент с подсвеченными совпадениями.
 * Для превью вокруг найденного слова оставляем небольшой контекст,
 * а далекие куски текста заменяем на многоточие.
 *
 * @param source Исходный текст.
 * @param ranges Диапазоны совпадений внутри исходного текста.
 * @param compact Нужно ли сокращать текст вокруг совпадений.
 * @param limit Примерный лимит видимой длины превью.
 * @param padding Количество символов контекста рядом с совпадением.
 * @returns string.
 */
function highlightRanges(
    source: string,
    ranges: TextRange[],
    compact = true,
    limit = EXCERPT_LIMIT,
    padding = EXCERPT_PADDING
): string {
    const sortedRanges = [...ranges].sort((left, right) => left.from - right.from);
    const parts: string[] = [];

    let rangeIndex = 0;
    let cursor = 0;
    let visibleLength = 0;

    while (rangeIndex < sortedRanges.length) {
        const range = sortedRanges[rangeIndex];

        if (compact && range.from - padding > cursor) {
            parts.push(`${encodeHtml(source.substring(cursor, cursor + padding))} [...] `);
            parts.push(encodeHtml(source.substring(range.from - padding, range.from)));
            visibleLength += padding * 2;
        }
        else {
            parts.push(encodeHtml(source.substring(cursor, range.from)));
            visibleLength += range.from - cursor;
        }

        // Склеиваем пересекающиеся совпадения, чтобы не получить вложенные <mark>.
        let nextRangeIndex = rangeIndex + 1;
        let rangeEnd = range.to;

        while (nextRangeIndex < sortedRanges.length && sortedRanges[nextRangeIndex].from <= rangeEnd) {
            rangeEnd = Math.max(sortedRanges[nextRangeIndex].to, rangeEnd);
            nextRangeIndex++;
        }

        parts.push(`<mark>${encodeHtml(source.substring(range.from, rangeEnd))}</mark>`);
        visibleLength += rangeEnd - range.from;

        rangeIndex = nextRangeIndex;
        cursor = rangeEnd;

        if (compact && visibleLength > limit) break;
    }

    if (cursor < source.length) {
        const tailEnd = compact ? Math.min(source.length, cursor + padding) : source.length;
        parts.push(encodeHtml(source.substring(cursor, tailEnd)));

        if (compact && tailEnd !== source.length) {
            parts.push(' [...]');
        }
    }

    return parts.join('');
}

/**
 * Превращает HTML из поискового индекса Hugo в обычный текст.
 *
 * @param html HTML-строка из JSON-индекса.
 * @param parser DOMParser, переиспользуемый для всех записей.
 * @returns string.
 */
function plainTextFromHtml(html: string, parser: DOMParser): string {
    return parser.parseFromString(html, 'text/html').body.innerText;
}

/**
 * Достает поисковый запрос из текущего URL.
 *
 * @returns string.
 */
function readKeywordFromUrl(): string {
    return new URL(window.location.toString()).searchParams.get(SEARCH_QUERY_PARAM) || '';
}

/**
 * Синхронизирует поле поиска с query-параметром в адресной строке.
 *
 * @param keyword Текущий поисковый запрос.
 * @returns void.
 */
function saveKeywordToUrl(keyword: string): void {
    const pageUrl = new URL(window.location.toString());

    if (keyword === '') {
        pageUrl.searchParams.delete(SEARCH_QUERY_PARAM);
    }
    else {
        pageUrl.searchParams.set(SEARCH_QUERY_PARAM, keyword);
    }

    window.history.replaceState('', '', pageUrl.toString());
}

class NotecardSearch {
    private cachedIndex?: SearchIndexEntry[];
    private previousKeyword = '';
    private form: HTMLFormElement;
    private input: HTMLInputElement;
    private resultsList: HTMLDivElement;
    private resultsTitle: HTMLHeadingElement;
    private resultsPanel: HTMLDivElement;
    private titleTemplate: string;

    /**
     * Инициализирует клиентский поиск и привязывает обработчики UI.
     *
     * @param form Форма поиска.
     * @param input Поле ввода запроса.
     * @param resultsList Контейнер для карточек результатов.
     * @param resultsTitle Заголовок с количеством результатов.
     * @param titleTemplate Шаблон текста результата из i18n.
     */
    constructor({ form, input, resultsList, resultsTitle, titleTemplate }: SearchViewElements) {
        this.form = form;
        this.input = input;
        this.resultsList = resultsList;
        this.resultsTitle = resultsTitle;
        this.titleTemplate = titleTemplate;
        this.resultsPanel = resultsList.parentElement as HTMLDivElement;

        this.restoreInitialQuery();
        this.bindInputEvents();
        this.bindHistoryEvents();
    }

    /**
     * Восстанавливает стартовый запрос из поля ввода или URL.
     *
     * @returns void.
     */
    private restoreInitialQuery(): void {
        const initialKeyword = this.input.value.trim() || readKeywordFromUrl();
        this.input.value = initialKeyword;

        if (initialKeyword) {
            this.runSearch(initialKeyword);
        }
        else {
            this.hideResults();
        }
    }

    /**
     * Подписывает поле ввода на изменения поискового запроса.
     *
     * @returns void.
     */
    private bindInputEvents(): void {
        const onInputChange = (event: Event) => {
            event.preventDefault();

            const keyword = this.input.value.trim();
            saveKeywordToUrl(keyword);

            if (keyword === '') {
                this.previousKeyword = '';
                this.hideResults();
                return;
            }

            if (keyword === this.previousKeyword) return;

            this.previousKeyword = keyword;
            this.runSearch(keyword);
        };

        this.input.addEventListener('input', onInputChange);
        this.input.addEventListener('compositionend', onInputChange);
    }

    /**
     * Синхронизирует поиск с навигацией браузера назад/вперед.
     *
     * @returns void.
     */
    private bindHistoryEvents(): void {
        window.addEventListener('popstate', () => {
            const keyword = readKeywordFromUrl();
            this.input.value = keyword;

            if (keyword) {
                this.runSearch(keyword);
            }
            else {
                this.hideResults();
            }
        });
    }

    /**
     * Загружает JSON-индекс Hugo и кеширует его в памяти.
     *
     * @returns Promise<SearchIndexEntry[]>.
     */
    private async loadIndex(): Promise<SearchIndexEntry[]> {
        if (this.cachedIndex) return this.cachedIndex;

        const indexUrl = this.form.dataset.json as string;
        const parser = new DOMParser();
        const rawIndex = await fetch(indexUrl).then((response) => response.json()) as SearchIndexEntry[];

        // Hugo отдает content как HTML. Для поиска удобнее один раз превратить его в чистый текст.
        this.cachedIndex = rawIndex.map((entry) => ({
            ...entry,
            content: plainTextFromHtml(entry.content, parser),
        }));

        return this.cachedIndex;
    }

    /**
     * Ищет запрос в заголовках и тексте страниц.
     *
     * @param keyword Полная строка поискового запроса.
     * @returns Promise<SearchCardData[]>.
     */
    private async collectResults(keyword: string): Promise<SearchCardData[]> {
        const tokens = splitSearchPhrase(keyword);
        const pattern = createSearchPattern(tokens);
        if (!pattern) return [];

        const index = await this.loadIndex();
        const cards: SearchCardData[] = [];

        for (const entry of index) {
            const titleRanges = findTextRanges(entry.title, pattern);
            const contentRanges = findTextRanges(entry.content, pattern);
            const score = titleRanges.length + contentRanges.length;

            if (score === 0) continue;

            cards.push({
                ...entry,
                title: titleRanges.length > 0 ? highlightRanges(entry.title, titleRanges, false) : entry.title,
                excerpt: contentRanges.length > 0
                    ? highlightRanges(entry.content, contentRanges)
                    : encodeHtml(entry.content.substring(0, EXCERPT_LIMIT)),
                score,
            });
        }

        // Чем больше совпадений, тем выше результат в списке.
        return cards.sort((left, right) => right.score - left.score);
    }

    /**
     * Выполняет поиск и обновляет DOM на странице.
     *
     * @param keyword Полная строка поискового запроса.
     * @returns void.
     */
    private async runSearch(keyword: string): Promise<void> {
        const startTime = performance.now();
        const results = await this.collectResults(keyword);
        const elapsedSeconds = ((performance.now() - startTime) / 1000).toPrecision(1);

        this.resultsList.innerHTML = '';

        for (const result of results) {
            this.resultsList.append(NotecardSearch.renderResultCard(result));
        }

        this.resultsTitle.innerText = this.formatResultsTitle(results.length, elapsedSeconds);
        this.resultsPanel.classList.remove('hidden');
    }

    /**
     * Подставляет количество результатов и время поиска в i18n-шаблон.
     *
     * @param total Количество найденных страниц.
     * @param seconds Время выполнения поиска в секундах.
     * @returns string.
     */
    private formatResultsTitle(total: number, seconds: string): string {
        return this.titleTemplate
            .replace('#PAGES_COUNT', total.toString())
            .replace('#TIME_SECONDS', seconds);
    }

    /**
     * Очищает и скрывает блок результатов.
     *
     * @returns void.
     */
    private hideResults(): void {
        this.resultsList.innerHTML = '';
        this.resultsTitle.innerText = '';
        this.resultsPanel.classList.add('hidden');
    }

    /**
     * Рендерит одну карточку найденной страницы.
     *
     * @param item Данные найденной страницы.
     * @returns HTMLElement.
     */
    private static renderResultCard(item: SearchCardData) {
        return (
            <article>
                <a href={item.permalink}>
                    <div class="article-details">
                        <h2 class="article-title" dangerouslySetInnerHTML={{ __html: item.title }}></h2>
                        <section class="article-preview" dangerouslySetInnerHTML={{ __html: item.excerpt }}></section>
                    </div>
                    {item.image &&
                        <div class="article-image">
                            <img src={item.image} loading="lazy" />
                        </div>
                    }
                </a>
            </article>
        );
    }
}

declare global {
    interface Window {
        searchResultTitleTemplate: string;
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const form = document.querySelector('.nc-search') as HTMLFormElement;
        const input = form?.querySelector('input') as HTMLInputElement;
        const resultsList = document.querySelector('.nc-search-output__list') as HTMLDivElement;
        const resultsTitle = document.querySelector('.nc-search-output__title') as HTMLHeadingElement;

        if (!form || !input || !resultsList || !resultsTitle) return;

        new NotecardSearch({
            form,
            input,
            resultsList,
            resultsTitle,
            titleTemplate: window.searchResultTitleTemplate,
        });
    }, 0);
});

export default NotecardSearch;
