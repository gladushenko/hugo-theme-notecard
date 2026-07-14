declare const mermaid: {
    initialize(config: Record<string, any>): void;
    run(options: { nodes: HTMLElement[] }): Promise<void>;
};

interface MermaidConfig {
    transparentBackground?: boolean;
    lightTheme?: string;
    darkTheme?: string;
    lightThemeVariables?: Record<string, any>;
    darkThemeVariables?: Record<string, any>;
    securityLevel?: string;
    look?: string;
    htmlLabels?: boolean;
    maxTextSize?: number;
    maxEdges?: number;
    fontSize?: number;
    fontFamily?: string;
    curve?: string;
    logLevel?: number;
}

type Scheme = 'light' | 'dark';
type ThemePair = Record<Scheme, ReturnType<typeof makeSchemeTheme>>;

const PANZOOM_CDN = 'https://cdn.jsdelivr.net/npm/panzoom@9.4.3/+esm';
const MERMAID_SELECTOR = '.mermaid';
const TRANSPARENT_DIRECTIVE = /%%\s*transparent\s*%%/i;

/**
 * Возвращает активную цветовую схему страницы.
 *
 * @returns Scheme.
 */
function readActiveScheme(): Scheme {
    return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

/**
 * Собирает Mermaid-настройки для конкретной цветовой схемы.
 *
 * @param config Конфиг из Hugo.
 * @param scheme Цветовая схема.
 * @returns object.
 */
function makeSchemeTheme(config: MermaidConfig, scheme: Scheme) {
    const isLight = scheme === 'light';
    const theme = isLight ? (config.lightTheme ?? 'default') : (config.darkTheme ?? 'dark');
    const themeVariables = isLight ? (config.lightThemeVariables ?? {}) : (config.darkThemeVariables ?? {});

    return {
        theme,
        themeVariables: {
            ...themeVariables,
            ...(config.transparentBackground ? { background: 'transparent' } : {}),
        },
    };
}

/**
 * Собирает базовый Mermaid-конфиг, не зависящий от темы.
 *
 * @param config Конфиг из Hugo.
 * @returns Record<string, any>.
 */
function makeBaseMermaidConfig(config: MermaidConfig): Record<string, any> {
    const baseConfig: Record<string, any> = {
        startOnLoad: false,
        securityLevel: config.securityLevel ?? 'strict',
        look: config.look ?? 'classic',
        flowchart: { htmlLabels: config.htmlLabels ?? true, useMaxWidth: true },
        gantt: { useWidth: 800 },
    };

    const optionalKeys: (keyof MermaidConfig)[] = ['maxTextSize', 'maxEdges', 'fontSize', 'fontFamily', 'curve', 'logLevel'];
    for (const key of optionalKeys) {
        if (config[key] != null) {
            baseConfig[key] = config[key];
        }
    }

    return baseConfig;
}

/**
 * Применяет Mermaid-конфиг для выбранной схемы.
 *
 * @param scheme Активная схема.
 * @param themes Конфиги светлой и темной темы.
 * @param baseConfig Общий Mermaid-конфиг.
 * @returns void.
 */
function configureMermaid(scheme: Scheme, themes: ThemePair, baseConfig: Record<string, any>): void {
    const { theme, themeVariables } = themes[scheme];

    mermaid.initialize({
        ...baseConfig,
        theme,
        ...(Object.keys(themeVariables).length && { themeVariables }),
    });
}

/**
 * Рендерит диаграммы во временном скрытом контейнере.
 *
 * @param sources Исходный Mermaid-код диаграмм.
 * @returns Promise<string[]>.
 */
async function renderDiagramsOffscreen(sources: string[]): Promise<string[]> {
    const container = document.createElement('div');
    container.className = 'mermaid-offscreen';
    document.body.appendChild(container);

    const nodes = sources.map((source) => {
        const node = document.createElement('pre');
        node.innerHTML = source;
        container.appendChild(node);

        return node;
    });

    await mermaid.run({ nodes });

    const rendered = nodes.map((node) => node.innerHTML);
    container.remove();

    return rendered;
}

/**
 * Добавляет toolbar и wrapper вокруг каждой Mermaid-диаграммы.
 *
 * @param diagrams Mermaid-элементы на странице.
 * @returns void.
 */
function mountDiagramWrappers(diagrams: NodeListOf<HTMLElement>): void {
    diagrams.forEach((diagram, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-wrapper';
        diagram.parentNode?.insertBefore(wrapper, diagram);
        wrapper.appendChild(diagram);
        wrapper.insertAdjacentHTML(
            'beforeend',
            `<div class="mermaid-toolbar"><button data-idx="${index}" title="Open fullscreen with pan/zoom">⛶ Expand</button></div>`,
        );
    });
}

/**
 * Считывает размеры SVG из viewBox или bounding box.
 *
 * @param svg SVG Mermaid-диаграммы.
 * @returns [number, number].
 */
function readSvgSize(svg: SVGElement): [number, number] {
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
        return viewBox.split(/[\s,]+/).slice(2).map(Number) as [number, number];
    }

    const rect = svg.getBoundingClientRect();
    return [rect.width || 800, rect.height || 600];
}

/**
 * Создает DOM-контейнер для panzoom-модалки.
 *
 * @param svg Mermaid SVG.
 * @returns HTMLElement.
 */
function createPanzoomContent(svg: SVGElement): HTMLElement {
    const [width, height] = readSvgSize(svg);
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-panzoom-container';
    wrapper.dataset.nativeWidth = String(width);
    wrapper.dataset.nativeHeight = String(height);
    wrapper.appendChild(clone);

    return wrapper;
}

/**
 * Подключает fullscreen-модалку с pan/zoom для Mermaid.
 *
 * @param diagrams Mermaid-диаграммы на странице.
 * @returns void.
 */
function mountMermaidModal(diagrams: NodeListOf<HTMLElement>): void {
    const modal = document.getElementById('mermaid-modal');
    const modalBody = document.getElementById('mermaid-modal-body');
    const modalContent = document.getElementById('mermaid-modal-content');
    const closeButton = document.getElementById('mermaid-modal-close');

    if (!modal || !modalBody || !modalContent || !closeButton) return;

    let panzoomFactory: any = null;
    let panzoomInstance: any = null;

    /**
     * Лениво загружает panzoom только при первом открытии модалки.
     *
     * @returns Promise<any>.
     */
    const loadPanzoom = async () => {
        if (!panzoomFactory) {
            panzoomFactory = (await import(PANZOOM_CDN)).default;
        }

        return panzoomFactory;
    };

    /**
     * Вписывает диаграмму в размеры модалки.
     *
     * @returns void.
     */
    const fitDiagramToModal = (): void => {
        const wrapper = modalContent.querySelector('.mermaid-panzoom-container') as HTMLElement | null;
        if (!panzoomInstance || !wrapper) return;

        const width = +(wrapper.dataset.nativeWidth ?? 0);
        const height = +(wrapper.dataset.nativeHeight ?? 0);
        const rect = modalContent.getBoundingClientRect();
        const scale = Math.min((rect.width - 60) / width, (rect.height - 60) / height);

        panzoomInstance.zoomAbs(0, 0, scale);
        panzoomInstance.moveTo((rect.width - width * scale) / 2, (rect.height - height * scale) / 2);
    };

    /**
     * Закрывает модалку и уничтожает panzoom-инстанс.
     *
     * @returns void.
     */
    const closeModal = (): void => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        panzoomInstance?.dispose();
        panzoomInstance = null;
        modalContent.innerHTML = '';
    };

    /**
     * Открывает диаграмму по индексу в полноэкранной модалке.
     *
     * @param index Индекс диаграммы на странице.
     * @returns Promise<void>.
     */
    const openModal = async (index: number): Promise<void> => {
        const svg = diagrams[index]?.querySelector('svg');
        if (!svg) return;

        const wrapper = createPanzoomContent(svg);
        modalContent.innerHTML = '';
        modalContent.appendChild(wrapper);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const panzoom = await loadPanzoom();
        setTimeout(() => {
            panzoomInstance = panzoom(wrapper, { maxZoom: 10, minZoom: 0.05, bounds: false });
            fitDiagramToModal();
            wrapper.classList.add('ready');
        }, 50);
    };

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const toolbarButton = target.closest('.mermaid-toolbar button') as HTMLElement | null;

        if (toolbarButton) {
            openModal(+(toolbarButton.dataset.idx || 0));
            return;
        }

        const zoomButton = target.closest('.mermaid-modal-controls button') as HTMLElement | null;
        if (!zoomButton || !panzoomInstance) return;

        const zoomAction = zoomButton.dataset.zoom;
        const rect = modalBody.getBoundingClientRect();

        if (zoomAction === 'fit') {
            fitDiagramToModal();
        }
        else if (zoomAction === '0') {
            panzoomInstance.moveTo(0, 0);
            panzoomInstance.zoomAbs(0, 0, 1);
        }
        else {
            panzoomInstance.smoothZoom(rect.width / 2, rect.height / 2, zoomAction === '1' ? 1.5 : 0.67);
        }
    });

    closeButton.addEventListener('click', closeModal);
    modalBody.addEventListener('click', (event) => {
        if (event.target === modalBody) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

/**
 * Применяет прозрачный фон к диаграмме, если в исходнике есть директива.
 *
 * @param diagram Mermaid-элемент.
 * @param shouldBeTransparent true, если диаграмма должна быть прозрачной.
 * @returns void.
 */
function applyTransparentBackground(diagram: HTMLElement, shouldBeTransparent: boolean): void {
    if (shouldBeTransparent) {
        diagram.querySelector('svg')?.style.setProperty('background', 'transparent');
    }
}

/**
 * Инициализирует Mermaid-диаграммы на странице.
 *
 * @param config Mermaid-конфиг, переданный из Hugo.
 * @returns Promise<void>.
 */
export async function initMermaidPage(config: MermaidConfig): Promise<void> {
    const diagrams = document.querySelectorAll(MERMAID_SELECTOR) as NodeListOf<HTMLElement>;
    if (diagrams.length === 0) return;

    const sources = Array.from(diagrams).map((diagram) => diagram.innerHTML);
    const transparentMap = sources.map((source) => TRANSPARENT_DIRECTIVE.test(source));
    const renderCache: Record<Scheme, string[]> = { light: [], dark: [] };
    const themes: ThemePair = {
        light: makeSchemeTheme(config, 'light'),
        dark: makeSchemeTheme(config, 'dark'),
    };
    const baseConfig = makeBaseMermaidConfig(config);

    mountDiagramWrappers(diagrams);
    mountMermaidModal(diagrams);

    const initialScheme = readActiveScheme();
    configureMermaid(initialScheme, themes, baseConfig);
    await mermaid.run({ nodes: Array.from(diagrams) });

    diagrams.forEach((diagram, index) => {
        diagram.style.visibility = '';
        renderCache[initialScheme][index] = diagram.innerHTML;
        applyTransparentBackground(diagram, transparentMap[index]);
    });

    const alternativeScheme: Scheme = initialScheme === 'dark' ? 'light' : 'dark';
    const requestIdle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => setTimeout(callback, 1000));

    requestIdle(() => {
        if (renderCache[alternativeScheme].length) return;

        configureMermaid(alternativeScheme, themes, baseConfig);
        renderDiagramsOffscreen(sources).then((results) => {
            renderCache[alternativeScheme] = results;
        });
    });

    window.addEventListener('onColorSchemeChange', async () => {
        const nextScheme = readActiveScheme();

        if (!renderCache[nextScheme].length) {
            configureMermaid(nextScheme, themes, baseConfig);
            renderCache[nextScheme] = await renderDiagramsOffscreen(sources);
        }

        diagrams.forEach((diagram, index) => {
            diagram.innerHTML = renderCache[nextScheme][index];
            applyTransparentBackground(diagram, transparentMap[index]);
        });
    });
}
