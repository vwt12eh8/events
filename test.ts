import { CancelledError, CancelSource } from "@vwt12eh8/cancel";
import assert = require("assert");
import { EventEmitter } from "events";
import { describe, it } from "mocha";
import { Deferred } from "ts-deferred";
import { EventDefine } from ".";

function toCallback(done: (error?: any) => void, f: (...args: any[]) => void | never, ...args: any[]) {
    try {
        f(...args);
        done();
    } catch (error) {
        done(error);
    }
}

describe("on", () => {
    it("multi args", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const values = [Symbol(), Symbol()];
        event.listener.on((...args) => {
            try {
                assert.strictEqual(values[0], args[0]);
                assert.strictEqual(values[1], args[1]);
                done();
            } catch (error) {
                done(error);
            }
        });
        event.emit(...values);
    });

    it("emit x2", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        let cnt = 0;
        event.listener.on(() => cnt++);
        event.emit();
        event.emit();
        setImmediate(() => {
            try {
                assert.strictEqual(2, cnt);
                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it("listener x2", async () => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const deferred = [new Deferred<any[]>(), new Deferred<any[]>()];
        event.listener.on(() => deferred[0].resolve());
        event.listener.on(() => deferred[1].resolve());
        event.emit();
        await Promise.all(deferred.map((i) => i.promise));
    });
});

describe("once", () => {
    it("multi args", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const values = [Symbol(), Symbol()];
        event.listener.once((...args) => {
            try {
                assert.strictEqual(values[0], args[0]);
                assert.strictEqual(values[1], args[1]);
                done();
            } catch (error) {
                done(error);
            }
        });
        event.emit(...values);
    });

    it("emit x2", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        let cnt = 0;
        event.listener.once(() => cnt++);
        event.emit();
        event.emit();
        setImmediate(() => {
            try {
                assert.strictEqual(1, cnt);
                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it("listener x2", async () => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const deferred = [new Deferred<any[]>(), new Deferred<any[]>()];
        event.listener.once(() => deferred[0].resolve());
        event.listener.once(() => deferred[1].resolve());
        event.emit();
        await Promise.all(deferred.map((i) => i.promise));
    });
});

describe("off", () => {
    it("on", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const f = () => toCallback(done, assert.fail);
        event.listener.on(f);
        event.listener.off(f);
        event.emit();
        setImmediate(done);
    });

    it("once", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const f = () => toCallback(done, assert.fail);
        event.listener.once(f);
        event.listener.off(f);
        event.emit();
        setImmediate(done);
    });
});

describe("listen", () => {
    it("listener", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        event.listener.listen(() => done()).catch(done);
        event.emit();
    });

    it("promise", async () => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const promise = event.listener.listen((deferred) => deferred.resolve());
        event.emit();
        await promise;
    });

    it("cancel", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const cancel = new CancelSource();
        event.listener.listen(() => { }, undefined, cancel).then(
            () => toCallback(done, assert.fail),
            (error) => toCallback(done, assert, error instanceof CancelledError),
        );
        cancel.cancel();
    });
});

describe("when", () => {
    it("multi args", async () => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const values = [Symbol(), Symbol()];
        const promise = event.listener.when();
        event.emit(...values);
        const result = await promise;
        assert.strictEqual(values[0], result[0]);
        assert.strictEqual(values[1], result[1]);
    });

    it("cancel", (done) => {
        const event = new EventDefine(new EventEmitter(), Symbol());
        const cancel = new CancelSource();
        event.listener.when(undefined, cancel).then(
            () => toCallback(done, assert.fail),
            (error) => toCallback(done, assert, error instanceof CancelledError),
        );
        cancel.cancel();
    });
});
