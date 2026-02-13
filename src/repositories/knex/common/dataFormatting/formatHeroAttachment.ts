export const formatHeroAttachment = (
    attachmentId: string | null | undefined,
    uri: string | null | undefined,
) => {
    if (attachmentId && uri) {
        return {
            attachmentId,
            uri,
        };
    }
    return undefined;
};
