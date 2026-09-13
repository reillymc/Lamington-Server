import { toUndefined } from "./toUndefined.ts";

export const formatHeroAttachment = (
    attachmentId: string | null | undefined,
    preview: string | null | undefined,
) => {
    if (attachmentId) {
        return {
            attachmentId,
            preview: toUndefined(preview),
        };
    }
    return undefined;
};
