import { AuthenticatedBody } from "../../middleware";
import { itemIdParam, itemSubpath, listIdParam, ListServices, memberIdParam, memberSubpath } from "./list";

export type BaseRequest<T = null> = T extends null ? {} : T;

export type BaseRequestParams<T = null> = T extends null ? never : T;

export type BaseRequestBody<T = null> = AuthenticatedBody<T>;

interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory / remove
    code?: string;
    message?: string;
}

export type BaseResponse<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T };

export const ListEndpoints = {
    deleteList: `/:${listIdParam}`,
    deleteListItem: `/:${listIdParam}/${itemSubpath}/:${itemIdParam}`,
    deleteListMember: `/:${listIdParam}/${memberSubpath}/:${memberIdParam}`,
    getList: `/:${listIdParam}`,
    getLists: `/`,
    postList: `/`,
    postListItem: `/:${listIdParam}/${itemSubpath}`,
} as const satisfies Record<keyof ListServices, string>;

export * from "./list";
export * from "./user";
