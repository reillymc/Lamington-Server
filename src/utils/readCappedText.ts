export class ResponseTooLargeError extends Error {
    constructor() {
        super("Response exceeded the size limit");
    }
}

export const readCappedBody = async (
    response: Response,
    maxBytes: number,
): Promise<Buffer> => {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        await response.body?.cancel().catch(() => undefined);
        throw new ResponseTooLargeError();
    }

    if (!response.body) return Buffer.alloc(0);

    const reader = response.body.getReader();
    const chunks: Array<Uint8Array> = [];
    let total = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel().catch(() => undefined);
                throw new ResponseTooLargeError();
            }
            chunks.push(value);
        }
    }

    return Buffer.concat(chunks);
};

export const readCappedText = async (
    response: Response,
    maxBytes: number,
): Promise<string> =>
    (await readCappedBody(response, maxBytes)).toString("utf8");
