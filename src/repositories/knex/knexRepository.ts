import { AsyncLocalStorage } from "node:async_hooks";
import type { Knex } from "knex";
import type { TransactionRunner } from "../repository.ts";

type KnexTxStore = AsyncLocalStorage<Knex>;

type CreateKnexRepository<TRepository> = (store: KnexTxStore) => TRepository;

export type KnexRepoMethod<
    TRepository,
    K extends keyof TRepository,
> = TRepository[K] extends (request: infer Req) => infer Res
    ? (db: Knex, request: Req) => Res
    : never;

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
 * Creates a Knex repository factory. The implementation object's methods are
 * written as `(db, request) => ...` and are automatically wrapped so the
 * active Knex query builder is injected on every call, leaving the public
 * repository methods to expose only `(request) => ...`.
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
 * Runs a function within the transaction store context without opening a
 * database transaction. Repository calls resolve their query builder from the
 * store, but writes are not transactional here.
 */
export const createKnexContextRunner =
    (db: Knex, store: KnexTxStore): TransactionRunner =>
    <T>(fn: () => Promise<T>) =>
        store.run(db, fn);

export const createKnexTransactionRunner =
    (db: Knex, store: KnexTxStore): TransactionRunner =>
    <T>(fn: () => Promise<T>) =>
        db.transaction((trx) => store.run(trx, fn));
