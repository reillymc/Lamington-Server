import { AsyncLocalStorage } from "node:async_hooks";
import type { Knex } from "knex";
import type { TransactionRunner } from "../repository.ts";

type KnexTxStore = AsyncLocalStorage<Knex>;

type CreateKnexRepository<TRepository> = (store: KnexTxStore) => TRepository;

/**
 * Extracts the implementation signature for a specific repository method.
 * Maps the public `(request) => Res` to the implementation `(db, request) => Res`.
 * Used for module-level helper type annotations.
 */
export type KnexRepoMethod<
    TRepository,
    K extends keyof TRepository,
> = TRepository[K] extends (request: infer Req) => infer Res
    ? (db: Knex, request: Req) => Res
    : never;

/**
 * Creates the `AsyncLocalStorage` instance that carries the active Knex
 * handle throughout a request lifecycle.
 */
export const createKnexTxStore = (): KnexTxStore => new AsyncLocalStorage();

const requireDb = (store: KnexTxStore): Knex => {
    const db = store.getStore();
    if (!db) {
        throw new Error("Knex repository called outside a transaction context");
    }
    return db;
};

type KnexRepoImpl<TRepository> = {
    [K in keyof TRepository]: TRepository[K] extends (
        request: infer Req,
    ) => infer Res
        ? (db: Knex, request: Req) => Res
        : never;
};

/**
 * Wraps a repository implementation object so each method auto-resolves the
 * active Knex query builder from `AsyncLocalStorage`. Implementation methods
 * receive `(db, request)`; the public repository exposes only `(request)`.
 */
export const knexRepository =
    <TRepository>(
        impl: KnexRepoImpl<TRepository>,
    ): CreateKnexRepository<TRepository> =>
    (store) => {
        const wrapped = {} as KnexRepoImpl<TRepository>;
        for (const key of Object.keys(impl) as (keyof TRepository)[]) {
            const fn = impl[key] as (db: Knex, request: never) => unknown;
            wrapped[key] = ((request: never) =>
                fn(requireDb(store), request)) as never;
        }
        return wrapped as TRepository;
    };

/**
 * Creates a `TransactionRunner` that opens a real database transaction and
 * populates the store. In production, `db` is the Knex instance; in tests, it
 * is a test transaction so service calls create savepoints within it.
 */
export const createKnexTransactionRunner =
    (db: Knex, store: KnexTxStore): TransactionRunner =>
    <T>(fn: () => Promise<T>) =>
        db.transaction((trx) => store.run(trx, fn));
