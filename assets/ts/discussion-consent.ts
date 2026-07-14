interface CommentsConsentState {
    necessary?: boolean;
    analytics?: boolean;
    functional?: boolean;
    timestamp?: number;
}

interface DeferredCommentScript {
    placeholder: Comment;
    script: HTMLScriptElement;
}

const COMMENTS_PLACEHOLDER_ID = 'comments-consent-placeholder';
const COMMENTS_CONTAINER_ID = 'comments-container';
const COMMENTS_TEMPLATE_ID = 'comments-template';
const CONSENT_EVENT_NAME = 'onCookieConsentChange';

/**
 * Проверяет, разрешены ли функциональные cookie для комментариев.
 *
 * @param consentDetail Состояние из события cookie-согласия.
 * @returns boolean.
 */
function canRenderComments(consentDetail?: CommentsConsentState | null): boolean {
    const cookieConsent = (window as Window & {
        cookieConsent?: {
            hasConsent?: (category: 'necessary' | 'analytics' | 'functional') => boolean;
        };
    }).cookieConsent;

    return (
        consentDetail?.functional ??
        cookieConsent?.hasConsent?.('functional') ??
        document.documentElement.dataset.consentFunctional === 'true'
    );
}

/**
 * Заменяет script-теги в шаблоне на comment-placeholder.
 *
 * @param fragment Клонированный template комментариев.
 * @returns DeferredCommentScript[].
 */
function collectDeferredScripts(fragment: DocumentFragment): DeferredCommentScript[] {
    return Array.from(fragment.querySelectorAll('script')).map((script) => {
        const placeholder = document.createComment('comments-script-placeholder');
        script.replaceWith(placeholder);

        return { placeholder, script };
    });
}

/**
 * Создает новый script с теми же атрибутами и содержимым.
 *
 * @param original Исходный script из template.
 * @returns HTMLScriptElement.
 */
function cloneScriptForExecution(original: HTMLScriptElement): HTMLScriptElement {
    const script = document.createElement('script');

    Array.from(original.attributes).forEach((attribute) => {
        script.setAttribute(attribute.name, attribute.value);
    });

    if (original.textContent) {
        script.text = original.textContent;
    }

    return script;
}

/**
 * Вставляет скрипты комментариев последовательно, сохраняя порядок выполнения.
 *
 * @param scripts Скрипты, отложенные при разборе template.
 * @returns Promise<void>.
 */
async function runDeferredScripts(scripts: DeferredCommentScript[]): Promise<void> {
    for (const { placeholder, script } of scripts) {
        if (!placeholder.parentNode) continue;

        const executableScript = cloneScriptForExecution(script);
        let scriptReady: Promise<void> = Promise.resolve();

        if (executableScript.src) {
            scriptReady = new Promise<void>((resolve) => {
                executableScript.onload = executableScript.onerror = () => resolve();
            });
        }

        placeholder.replaceWith(executableScript);
        await scriptReady;
    }
}

/**
 * Инициализирует отложенную загрузку комментариев по cookie-согласию.
 *
 * @returns void.
 */
function initCommentsConsent(): void {
    const placeholder = document.getElementById(COMMENTS_PLACEHOLDER_ID) as HTMLElement | null;
    const container = document.getElementById(COMMENTS_CONTAINER_ID) as HTMLElement | null;
    const template = document.getElementById(COMMENTS_TEMPLATE_ID) as HTMLTemplateElement | null;

    if (!placeholder || !container || !template) return;

    let loaded = false;
    let loading = false;

    /**
     * Показывает контейнер и один раз гидрирует template комментариев.
     *
     * @returns Promise<void>.
     */
    const showComments = async (): Promise<void> => {
        placeholder.style.display = 'none';
        container.style.display = 'block';

        if (loaded || loading) return;

        loading = true;

        try {
            const clone = template.content.cloneNode(true) as DocumentFragment;
            const scripts = collectDeferredScripts(clone);

            container.appendChild(clone);
            await runDeferredScripts(scripts);
            loaded = true;
        }
        finally {
            loading = false;
        }
    };

    /**
     * Скрывает контейнер комментариев и показывает заглушку.
     *
     * @returns void.
     */
    const hideComments = (): void => {
        placeholder.style.display = 'block';
        container.style.display = 'none';
    };

    window.addEventListener(CONSENT_EVENT_NAME, (event: Event) => {
        const consentEvent = event as CustomEvent<CommentsConsentState | null>;
        canRenderComments(consentEvent.detail) ? showComments() : hideComments();
    });

    canRenderComments() ? showComments() : hideComments();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommentsConsent, { once: true });
}
else {
    initCommentsConsent();
}
