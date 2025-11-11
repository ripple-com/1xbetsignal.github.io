// =====================================================================================
// CUSTOM HELPER / UTILITY FUNCTIONS (Readable Names)
// =====================================================================================

const defineProperty = Object.defineProperty;
const defineProperties = Object.defineProperties;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
const pow = Math.pow;

/**
 * Safely set a property on an object.
 * If property doesn't exist → define it properly.
 * If it exists → assign directly.
 */
const safeSet = (obj, key, value) => {
    if (key in obj) {
        defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            writable: true,
            value
        });
    } else {
        obj[key] = value;
    }
};

/**
 * Shallow merge: Copy properties from `source` to `target`
 * Handles Symbol keys if supported.
 */
const merge = (target, source) => {
    source = source || {};
    for (let key in source) {
        if (hasOwnProperty.call(source, key)) {
            safeSet(target, key, source[key]);
        }
    }
    if (getOwnPropertySymbols) {
        for (let sym of getOwnPropertySymbols(source)) {
            if (propertyIsEnumerable.call(source, sym)) {
                safeSet(target, sym, source[sym]);
            }
        }
    }
    return target;
};

/**
 * Define all own properties from `source` onto `target`
 */
const defineAll = (target, source) => defineProperties(target, getOwnPropertyDescriptors(source));

/**
 * Create a new object with all properties EXCEPT those in `excludeList`
 */
const excludeProps = (obj, excludeList) => {
    const result = {};
    for (let key in obj) {
        if (hasOwnProperty.call(obj, key) && excludeList.indexOf(key) === -1) {
            result[key] = obj[key];
        }
    }
    if (obj != null && getOwnPropertySymbols) {
        for (let sym of getOwnPropertySymbols(obj)) {
            if (excludeList.indexOf(sym) === -1 && propertyIsEnumerable.call(obj, sym)) {
                result[sym] = obj[sym];
            }
        }
    }
    return result;
};

// =====================================================================================
// WEBPACK RUNTIME - CHUNK LOADING (Self-executing via push)
// =====================================================================================

(self.webpackChunkng_aviator = self.webpackChunkng_aviator || []).push([
    [179], 
    {
        // Module ID: 6613
        6613: (exports, module, __webpack_require__) => {

            // Mark as ES Module
            __webpack_require__.r(exports);

            // Named exports (from PIXI.js or framework)
            __webpack_require__.d(exports, {
                BaseTextureCache: () => BaseTextureCache,
                BoundingBox: () => BoundingBox,
                CanvasRenderTarget: () => CanvasRenderTarget,
                DATA_URI: () => DATA_URI,
                EventEmitter: () => EventEmitter,
                url: () => urlHelper,
                // ... many more PIXI exports
            });

            // Internal module exports container
            const pixiExports = {};

            // Re-export everything under `utils`
            __webpack_require__.r(pixiExports);
            __webpack_require__.d(pixiExports, {
                ALPHA_MODES: () => ALPHA_MODES,
                AbstractMultiResource: () => AbstractMultiResource,
                AccessibilityManager: () => AccessibilityManager,
                AlphaFilter: () => AlphaFilter,
                utils: () => exports
            });

            // =====================================================================================
            // RXJS CORE IMPLEMENTATION (Observable, Subscription, etc.)
            // =====================================================================================

            /**
             * Check if value is a function
             */
            function isFunction(value) {
                return typeof value === 'function';
            }

            /**
             * Create a custom Error class with stack trace capture
             */
            function createErrorClass(createImpl) {
                const errorClass = createImpl(function (error) {
                    Error.call(error);
                    error.stack = (new Error()).stack;
                });
                errorClass.prototype = Object.create(Error.prototype);
                errorClass.prototype.constructor = errorClass;
                return errorClass;
            }

            // UnsubscriptionError: When multiple teardown errors occur
            const UnsubscriptionError = createErrorClass(_super => function (errors) {
                _super(this);
                this.message = errors
                    ? `${errors.length} errors occurred during unsubscription:\n${errors.map((e, i) => `${i + 1}) ${e.toString()}`).join('\n  ')}`
                    : '';
                this.name = 'UnsubscriptionError';
                this.errors = errors;
            });

            /**
             * Remove item from array (used in subscription cleanup)
             */
            function removeFromArray(array, item) {
                if (array) {
                    const index = array.indexOf(item);
                    if (index >= 0) array.splice(index, 1);
                }
            }

            // =====================================================================================
            // Subscription Class (Disposable Resource)
            // =====================================================================================

            class Subscription {
                constructor(initialTeardown) {
                    this.initialTeardown = initialTeardown;
                    this.closed = false;
                    this._parentage = null;     // parent subscriptions
                    this._finalizers = null;    // child subscriptions / teardown functions
                }

                unsubscribe() {
                    if (this.closed) return;

                    let errors = null;
                    this.closed = true;

                    // Remove from parents
                    const { _parentage } = this;
                    if (_parentage) {
                        this._parentage = null;
                        if (Array.isArray(_parentage)) {
                            for (const parent of _parentage) parent.remove(this);
                        } else {
                            _parentage.remove(this);
                        }
                    }

                    // Run initial teardown
                    const { initialTeardown } = this;
                    if (isFunction(initialTeardown)) {
                        try { initialTeardown(); }
                        catch (err) { errors = err instanceof UnsubscriptionError ? err.errors : [err]; }
                    }

                    // Run all finalizers
                    const { _finalizers } = this;
                    if (_finalizers) {
                        this._finalizers = null;
                        for (const teardown of _finalizers) {
                            try { executeTeardown(teardown); }
                            catch (err) {
                                errors = errors || [];
                                if (err instanceof UnsubscriptionError) {
                                    errors.push(...err.errors);
                                } else {
                                    errors.push(err);
                                }
                            }
                        }
                    }

                    if (errors) throw new UnsubscriptionError(errors);
                }

                add(teardown) {
                    if (!teardown || teardown === this) return;

                    if (this.closed) {
                        executeTeardown(teardown);
                        return;
                    }

                    if (teardown instanceof Subscription) {
                        if (teardown.closed || teardown._hasParent(this)) return;
                        teardown._addParent(this);
                    }

                    (this._finalizers = this._finalizers ?? []).push(teardown);
                }

                _hasParent(parent) {
                    const { _parentage } = this;
                    return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
                }

                _addParent(parent) {
                    const { _parentage } = this;
                    this._parentage = _parentage
                        ? (Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : [_parentage, parent])
                        : parent;
                }

                _removeParent(parent) {
                    const { _parentage } = this;
                    if (_parentage === parent) {
                        this._parentage = null;
                    } else if (Array.isArray(_parentage)) {
                        removeFromArray(_parentage, parent);
                    }
                }

                remove(child) {
                    const { _finalizers } = this;
                    _finalizers && removeFromArray(_finalizers, child);
                    if (child instanceof Subscription) child._removeParent(this);
                }
            }

            // Empty closed subscription
            Subscription.EMPTY = (() => {
                const empty = new Subscription();
                empty.closed = true;
                return empty;
            })();

            const EMPTY_SUBSCRIPTION = Subscription.EMPTY;

            function isSubscription(obj) {
                return obj instanceof Subscription ||
                    (obj && 'closed' in obj && isFunction(obj.remove) && isFunction(obj.add) && isFunction(obj.unsubscribe));
            }

            function executeTeardown(teardown) {
                isFunction(teardown) ? teardown() : teardown.unsubscribe();
            }

            // =====================================================================================
            // RxJS Global Configuration & Scheduler
            // =====================================================================================

            const config = {
                onUnhandledError: null,
                onStoppedNotification: null,
                Promise: undefined,
                useDeprecatedSynchronousErrorHandling: false,
                useDeprecatedNextContext: false
            };

            const timeoutScheduler = {
                setTimeout(handler, delay, ...args) {
                    const { delegate } = timeoutScheduler;
                    return (delegate?.setTimeout || setTimeout)(handler, delay, ...args);
                },
                clearTimeout(id) {
                    const { delegate } = timeoutScheduler;
                    return (delegate?.clearTimeout || clearTimeout)(id);
                },
                delegate: undefined
            };

            function reportError(err) {
                timeoutScheduler.setTimeout(() => {
                    const { onUnhandledError } = config;
                    if (onUnhandledError) {
                        onUnhandledError(err);
                    } else {
                        throw err;
                    }
                });
            }

            function noop() {}

            // Notification kinds
            function createNotification(kind, value, error) {
                return { kind, value, error };
            }
            const COMPLETE_NOTIFICATION = createNotification('C', undefined, undefined);

            // Deprecated sync error handling zone
            let syncErrorZone = null;

            function runInZone(fn) {
                if (config. useDeprecatedSynchronousErrorHandling) {
                    const hadZone = !syncErrorZone;
                    if (hadZone) {
                        syncErrorZone = { errorThrown: false, error: null };
                    }
                    fn();
                    if (hadZone) {
                        const { errorThrown, error } = syncErrorZone;
                        syncErrorZone = null;
                        if (errorThrown) throw error;
                    }
                } else {
                    fn();
                }
            }

            // =====================================================================================
            // Subscriber Class
            // =====================================================================================

            class Subscriber extends Subscription {
                constructor(observer) {
                    super();
                    this.isStopped = false;
                    if (observer) {
                        this.destination = observer;
                        if (isSubscription(observer)) observer.add(this);
                    } else {
                        this.destination = NOOP_OBSERVER;
                    }
                }

                static create(next, error, complete) {
                    return new SafeSubscriber(next, error, complete);
                }

                next(value) {
                    if (this.isStopped) {
                        handleStoppedNotification(createNotification('N', value), this);
                    } else {
                        this._next(value);
                    }
                }

                error(err) {
                    if (this.isStopped) {
                        handleStoppedNotification(createNotification('E', undefined, err), this);
                    } else {
                        this.isStopped = true;
                        this._error(err);
                    }
                }

                complete() {
                    if (this.isStopped) {
                        handleStoppedNotification(COMPLETE_NOTIFICATION, this);
                    } else {
                        this.isStopped = true;
                        this._complete();
                    }
                }

                unsubscribe() {
                    if (this.closed) return;
                    this.isStopped = true;
                    super.unsubscribe();
                    this.destination = null;
                }

                _next(value) { this.destination.next(value); }
                _error(err) {
                    try { this.destination.error(err); }
                    finally { this.unsubscribe(); }
                }
                _complete() {
                    try { this.destination.complete(); }
                    finally { this.unsubscribe(); }
                }
            }

            // Safe observer wrapper
            class SafeObserver {
                constructor(observer) { this.observer = observer; }
                next(v) { try { this.observer.next?.(v); } catch (e) { handleError(e); } }
                error(e) { try { this.observer.error?.(e); } catch (ex) { handleError(ex); } finally { handleError(e); } }
                complete() { try { this.observer.complete?.(); } catch (e) { handleError(e); } }
            }

            class SafeSubscriber extends Subscriber {
                constructor(next, error, complete) {
                    super();
                    let observer;
                    if (isFunction(next) || !next) {
                        observer = { next: next ?? undefined, error: error ?? undefined, complete: complete ?? undefined };
                    } else {
                        // Legacy context binding
                        if (this && config.useDeprecatedNextContext) {
                            const context = Object.create(next);
                            context.unsubscribe = () => this.unsubscribe();
                            observer = {
                                next: next.next && next.next.bind(context),
                                error: next.error && next.error.bind(context),
                                complete: next.complete && next.complete.bind(context)
                            };
                        } else {
                            observer = next;
                        }
                    }
                    this.destination = new SafeObserver(observer);
                }
            }

            function handleError(err) {
                if (config.useDeprecatedSynchronousErrorHandling) {
                    if (syncErrorZone) {
                        syncErrorZone.errorThrown = true;
                        syncErrorZone.error = err;
                    }
                } else {
                    reportError(err);
                }
            }

            function handleStoppedNotification(notification, subscriber) {
                const { onStoppedNotification } = config;
                onStoppedNotification && timeoutScheduler.setTimeout(() => onStoppedNotification(notification, subscriber));
            }

            const NOOP_OBSERVER = {
                closed: true,
                next: noop,
                error: err => { throw err; },
                complete: noop
            };

            const observableSymbol = typeof Symbol === 'function' && Symbol.observable || '@@observable';

            function identity(x) { return x; }

            // =====================================================================================
            // Observable Base Class
            // =====================================================================================

            class Observable {
                constructor(subscribe) {
                    if (subscribe) this._subscribe = subscribe;
                }

                lift(operator) {
                    const result = new Observable();
                    result.source = this;
                    result.operator = operator;
                    return result;
                }

                subscribe(observerOrNext, error, complete) {
                    const subscriber = isSubscriber(observerOrNext)
                        ? observerOrNext
                        : new SafeSubscriber(observerOrNext, error, complete);

                    runInZone(() => {
                        const { operator, source } = this;
                        subscriber.add(
                            operator
                                ? operator.call(subscriber, source)
                                : source
                                    ? this._subscribe(subscriber)
                                    : this._trySubscribe(subscriber)
                        );
                    });

                    return subscriber;
                }

                _trySubscribe(subscriber) {
                    try {
                        return this._subscribe(subscriber);
                    } catch (err) {
                        subscriber.error(err);
                    }
                }

                _subscribe(subscriber) {
                    return this.source?.subscribe(subscriber);
                }

                [observableSymbol]() { return this; }

                pipe(...operators) {
                    return operators.length === 0 ? identity
                        : operators.length === 1 ? operators[0]
                        : source => operators.reduce((prev, op) => op(prev), source)(this);
                }

                // ... forEach, toPromise, etc.
            }

            function isSubscriber(obj) {
                return obj && obj instanceof Subscriber ||
                    (isObserverLike(obj) && isSubscription(obj));
            }

            function isObserverLike(obj) {
                return obj && isFunction(obj.next) && isFunction(obj.error) && isFunction(obj.complete);
            }

            // =====================================================================================
            // Subject & OperatorSubscriber
            // =====================================================================================

            class Subject extends Observable {
                constructor() {
                    super();
                    this.closed = false;
                    this.observers = [];
                    this.currentObservers = null;
                    this.isStopped = false;
                    this.hasError = false;
                    this.thrownError = null;
                }

                next(value) {
                    runInZone(() => {
                        this._throwIfClosed();
                        if (!this.isStopped) {
                            this.currentObservers = this.observers.slice();
                            for (const obs of this.currentObservers) obs.next(value);
                        }
                    });
                }

                // ... error, complete, subscribe logic
            }

            // Operator function helper
            function operate(liftFn) {
                return source => {
                    if (hasLift(source)) {
                        return source.lift(function (subscriber) {
                            try { return liftFn(subscriber, this); }
                            catch (err) { subscriber.error(err); }
                        });
                    }
                    throw new TypeError('Unable to lift unknown Observable');
                };
            }

            function hasLift(source) { return isFunction(source?.lift); }

            // Example operator: map
            function map(project, thisArg) {
                return operate((source, subscriber) => {
                    let index = 0;
                    source.subscribe(new OperatorSubscriber(
                        subscriber,
                        value => subscriber.next(project.call(thisArg, value, index++))
                    ));
                });
            }

            // =====================================================================================
            // END OF DEOBFUSCATED CODE (Truncated for clarity)
            // =====================================================================================

            // The rest includes Angular DI, Components, Modules, HTTP, etc.
            // This is a large bundle combining RxJS + Angular + PIXI.js + Webpack runtime.
        }
    }
]);