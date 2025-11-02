export type QueryParam = undefined | string | string[];

export type BaseRequest<T = null> = T extends null ? {} : T;

export type BaseRequestParams<T = null> = T extends null ? {} : { [P in keyof T]: string };

type LamingtonQueryParams = { page?: QueryParam; sort?: QueryParam; search?: QueryParam; order?: QueryParam };

export type BasePaginatedRequestQuery<T = null> = T extends null ? LamingtonQueryParams : T & LamingtonQueryParams;

export type BaseSimpleRequestBody<T = null> = T extends null ? {} : Partial<T> | undefined;

export type BaseRequestBody<T = null> = T extends null ? {} : { data: Partial<T> | null | Array<Partial<T> | null> };

export type RequestValidator<T extends BaseRequestBody<unknown>> = (
    body: T,
    userId: string
) => readonly [Array<Exclude<T["data"], any[] | null> extends Partial<infer R> ? R : never>, Array<unknown>];

interface ResponseBodyBase {
    error: boolean;
    code?: string;
    message?: string;
}

export type BaseResponse<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };
export type BasePaginatedResponse<T = null> = BaseResponse<T> & { page?: number; nextPage?: number };
