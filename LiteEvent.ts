interface LiteEventItem<T extends readonly any[]> extends LiteEventOptions {
    listener(...args: T): void;
    onabort(): void;
}

export interface LiteEventOptions {
    readonly hidden?: boolean;
    readonly once?: boolean;
    readonly signal?: AbortSignal;
}

export class LiteEventSource<T extends readonly any[] = []> {
    public readonly target: LiteEventTarget<T>;
    readonly #items = new Set<LiteEventItem<T>>();

    public constructor(onActiveChanged?: (active: boolean) => void) {
        this.target = new LiteEventTarget(this.#items, onActiveChanged);
    }

    public dispatchEvent(...args: T) {
        for (const item of Array.from(this.#items)) {
            if (item.signal?.aborted) continue;
            if (item.once) {
                item.onabort();
            }
            try {
                item.listener.call(undefined, ...args);
            } catch (error) {
                queueMicrotask(() => { throw error; });
            }
        }
    }
}

export class LiteEventTarget<T extends readonly any[] = []> {
    readonly #items: Set<LiteEventItem<T>>;
    readonly #onActiveChanged?: (active: boolean) => void;

    public constructor(items: Set<LiteEventItem<T>>, onActiveChanged?: (active: boolean) => void) {
        this.#items = items;
        this.#onActiveChanged = onActiveChanged;
    }

    public addEventListener(listener: (...args: T) => void, options?: LiteEventOptions) {
        const { hidden, once, signal } = options || {};
        if (signal?.aborted) return;
        const items = this.#items;
        const onActiveChanged = this.#onActiveChanged;
        const onabort = function () {
            items.delete(item);
            signal?.removeEventListener("abort", onabort);
            if (!hidden) {
                checkActive(items, onActiveChanged, 0);
            }
        };
        const item = { hidden, listener, onabort, once, signal };
        items.add(item);
        signal?.addEventListener("abort", onabort);
        if (!hidden) {
            checkActive(items, onActiveChanged, 1);
        }
    }
}

export interface LiteEventTargetLike<T extends readonly any[] = []> {
    addEventListener(listener: (...args: T) => void, options?: LiteEventOptions): void;
}

function checkActive<T extends readonly any[]>(items: ReadonlySet<LiteEventItem<T>>, onActiveChanged: ((active: boolean) => void) | undefined, target: 0 | 1) {
    let cnt = 0;
    for (const item of items) {
        if (!item.hidden) {
            if (target === 0) return;
            cnt++;
            if (cnt > 1) return;
        }
    }
    if (cnt !== target) return;
    try {
        onActiveChanged?.(!!target);
    } catch (error) {
        queueMicrotask(() => { throw error; });
    }
}
