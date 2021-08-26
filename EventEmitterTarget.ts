import EventEmitter from "events";
import { LiteEventOptions, LiteEventTargetLike } from "./LiteEvent";

interface EventEmitterItem<T extends readonly any[]> extends LiteEventOptions {
    listener(...args: T): void;
    onabort(): void;
}

export class EventEmitterTarget<T extends readonly any[]> implements LiteEventTargetLike<T> {
    private readonly _items = new Set<EventEmitterItem<T>>();
    private readonly _listener: (...args: any[]) => void;

    public constructor(private readonly emitter: EventEmitter, private readonly event: string | symbol, convert: (...args: any[]) => T | undefined) {
        this._listener = (...args) => {
            const args2 = convert(...args);
            if (!args2) return;
            for (const item of Array.from(this._items)) {
                if (item.signal?.aborted) continue;
                if (item.once) {
                    item.onabort();
                }
                try {
                    item.listener.call(undefined, ...args2);
                } catch (error) {
                    queueMicrotask(() => { throw error; });
                }
            }
        };
    }

    public addEventListener(listener: (...args: T) => void, options?: LiteEventOptions) {
        const { hidden, once, signal } = options || {};
        if (signal?.aborted) return;
        const items = this._items;
        const onabort = () => {
            items.delete(item);
            signal?.removeEventListener("abort", onabort);
            if (!hidden) {
                this._checkActive(0);
            }
        };
        const item = { hidden, listener, onabort, once, signal };
        items.add(item);
        signal?.addEventListener("abort", onabort);
        if (!hidden) {
            this._checkActive(1);
        }
    }

    private _checkActive(target: 0 | 1) {
        let cnt = 0;
        for (const item of this._items) {
            if (!item.hidden) {
                if (target === 0) return;
                cnt++;
                if (cnt > 1) return;
            }
        }
        if (cnt !== target) return;
        if (cnt) {
            this.emitter.on(this.event, this._listener);
        } else {
            this.emitter.off(this.event, this._listener);
        }
    }
}
