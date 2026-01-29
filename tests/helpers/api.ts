import {
    type AttachmentServices,
    attachmentEndpoint,
    imageSubpath,
    type TagServices,
    tagEndpoint,
    uploadDirectory,
} from "../../src/routes/spec/index.ts";

const ServerURL = "";
const ApiVersion = "v1";
const ApiUrl = `${ServerURL}/${ApiVersion}` as const;

type Endpoint = string | ((...param: Array<any>) => string);

export const AttachmentEndpoint = {
    postImage: `${ApiUrl}${attachmentEndpoint}/${imageSubpath}` as const,
    downloadImage:
        `${ApiUrl}${attachmentEndpoint}/${uploadDirectory}/` as const,
} as const satisfies Record<keyof AttachmentServices, Endpoint>;

export const TagEndpoint = {
    getTags: `${ApiUrl}${tagEndpoint}`,
} as const satisfies Record<keyof TagServices, Endpoint>;
