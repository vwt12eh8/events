import { Cancel } from "@vwt12eh8/cancel";
import { EventEmitter } from "events";
import { Deferred } from "ts-deferred";

export class EventDefine<T extends any[]> {
    public readonly emitter: EventEmitter;
    public readonly event: string | symbol;;

    public constructor(emitter: EventEmitter, event: string | symbol) {
        this.emitter = emitter;
        this.event = event;
    }

    public emit(...args: T) {
        this.emitter.emit(this.event, ...args);
    }

    public async listen<R = void>(listener: (deferred: Deferred<R>, ...args: T) => void, cancel?: Cancel) {
        const deferred = new Deferred<R>();
        const f = listener.bind(listener, deferred);
        try {
            cancel?.once(deferred.reject);
            this.on(f);
            return await deferred.promise;
        } finally {
            cancel?.off(deferred.reject);
            this.off(f);
        }
    }

    public off(listener: (...args: T) => void) {
        this.emitter.off(this.event, listener as any);
    }

    public on(listener: (...args: T) => void) {
        this.emitter.on(this.event, listener as any);
    }

    public once(listener: (...args: T) => void) {
        this.emitter.once(this.event, listener as any);
    }

    public async when(cancel?: Cancel) {
        const deferred = new Deferred<T>();
        const f = (...args: T) => deferred.resolve(args);
        try {
            cancel?.once(deferred.reject);
            this.once(f);
            return await deferred.promise;
        } finally {
            cancel?.off(deferred.reject);
            this.off(f);
        }
    }
}
