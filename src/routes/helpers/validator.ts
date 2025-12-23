import type { Request } from "express";
import { z } from "zod";
import { AppError } from "../../services/logging.ts";

export const validateRequest = <
    TBody extends z.ZodTypeAny | undefined = undefined,
    TParams extends z.ZodTypeAny | undefined = undefined,
    TQuery extends z.ZodTypeAny | undefined = undefined
>(
    req: Request,
    {
        body,
        params,
        query,
    }: {
        body?: TBody;
        params?: TParams;
        query?: TQuery;
    }
) => {
    try {
        return {
            body: (body ? body.parse(req.body) : undefined) as TBody extends z.ZodTypeAny ? z.infer<TBody> : never,
            params: (params ? params.parse(req.params) : undefined) as TParams extends z.ZodTypeAny
                ? z.infer<TParams>
                : never,
            query: (query ? query.parse(req.query) : undefined) as TQuery extends z.ZodTypeAny
                ? z.infer<TQuery>
                : never,
        };
    } catch (e) {
        if (e instanceof z.ZodError) {
            throw new AppError({
                code: "BAD_REQUEST",
                message: e.message,
                status: 400,
            });
        }

        throw e;
    }
};
