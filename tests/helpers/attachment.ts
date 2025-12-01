import { attachment } from "../../src/database/definitions/attachment.ts";
import { lamington, type KnexDatabase } from "../../src/database/index.ts";

export const readAllAttachments = (database: KnexDatabase) =>
    database(lamington.attachment).select(attachment.attachmentId);
