import { attachment } from "../../src/database/definitions/attachment.ts";
import { type KnexDatabase, lamington } from "../../src/database/index.ts";

export const readAllAttachments = (database: KnexDatabase) =>
    database(lamington.attachment).select(attachment.attachmentId);
