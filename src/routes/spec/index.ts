import { type AssetServices, ingredientsSubpath } from "./asset.ts";
import {
    type AttachmentServices,
    imageSubpath,
    uploadDirectory,
} from "./attachment.ts";

import type { components, paths } from "./schema.d.ts";
import type { TagServices } from "./tag.ts";

type ToRoutes<T extends string> =
    T extends `${infer Head}{${infer Param}}${infer Tail}`
        ? `${Head}:${Param}${ToRoutes<Tail>}`
        : T;

type routes = ToRoutes<keyof paths>;

export type { paths, routes, components };

export const AssetEndpoint = {
    getPresetIngredients: `/${ingredientsSubpath}`,
} as const satisfies Record<keyof AssetServices, string>;

export const AttachmentEndpoint = {
    postImage: `/${imageSubpath}`,
    downloadImage: `/${uploadDirectory}`,
} as const satisfies Record<keyof AttachmentServices, string>;

export const TagEndpoint = {
    getTags: `/`,
} as const satisfies Record<keyof TagServices, string>;

export * from "./asset.ts";
export * from "./attachment.ts";
export * from "./tag.ts";
