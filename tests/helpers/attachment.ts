import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import {
    attachment,
    lamington,
} from "../../src/repositories/knex/spec/index.ts";

export const readAllAttachments = (database: KnexDatabase) =>
    database(lamington.attachment).select(attachment.attachmentId);
