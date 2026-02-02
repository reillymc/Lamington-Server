import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import {
    AttachmentTable,
    lamington,
} from "../../src/repositories/knex/spec/index.ts";

export const readAllAttachments = (database: KnexDatabase) =>
    database(lamington.attachment).select(AttachmentTable.attachmentId);
