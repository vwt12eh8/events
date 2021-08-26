import { LiteEventOptions, LiteEventTargetLike } from "./LiteEvent";

interface ValueEventData<T> {
    readonly items: Set<ValueEventItem<T>>;
    value: T;
}

interface ValueEventItem<T> extends LiteEventOptions {
    listener(value: T): void;
    onabort(): void;
}

export class ValueEventSource<T> {
    public readonly target: ValueEventTarget<T>;
    readonly #data: ValueEventData<T>;

    public constructor(value: T, onActiveChanged?: (active: boolean) => void) {
        this.#data = {
            items: new Set(),
            value,
        };
        this.target = new ValueEventTarget(this.#data, onActiveChanged);
    }

    public get value() {
        return this.#data.value;
    }

    public set value(value: T) {
        if (this.#data.value === value) return;
        this.#data.value = value;
        for (const item of Array.from(this.#data.items)) {
            if (item.signal?.aborted) continue;
            if (item.once) {
                item.onabort();
            }
            try {
                item.listener.call(undefined, value);
            } catch (error) {
                queueMicrotask(() => { throw error; });
            }
        }
    }
}

export class ValueEventTarget<T> implements LiteEventTargetLike<[T]> {
    readonly #data: ValueEventData<T>;
    readonly #onActiveChanged?: (active: boolean) => void;

    public constructor(data: ValueEventData<T>, onActiveChanged?: (active: boolean) => void) {
        this.#data = data;
        this.#onActiveChanged = onActiveChanged;
    }

    public addEventListener(listener: (value: T) => void, options?: LiteEventOptions) {
        const { hidden, once, signal } = options || {};
        if (signal?.aborted) return;
        const items = this.#data.items;
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

    public get value() {
        return this.#data.value;
    }
}

function checkActive<T>(items: ReadonlySet<ValueEventItem<T>>, onActiveChanged: ((active: boolean) => void) | undefined, target: 0 | 1) {
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
