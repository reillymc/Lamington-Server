import { AttachmentActions } from "./controllers/attachment.ts";
import type { Database, KnexDatabase } from "./database/index.ts";
import type { AppRepositories } from "./repositories/index.ts";
import { KnexBookRepository } from "./repositories/knex/bookRepository.ts";
import { KnexRecipeRepository } from "./repositories/knex/recipeRepository.ts";
import { LocalAttachmentService, type AttachmentService } from "./services/attachment/index.ts";
import { createBookService } from "./services/bookService.ts";
import type { AppServices } from "./services/index.ts";
import { createRecipeService } from "./services/recipeService.ts";

export const DefaultAppRepositories: AppRepositories<KnexDatabase> = {
    recipeRepository: KnexRecipeRepository,
    bookRepository: KnexBookRepository,
};

export type ServiceDependencies<T extends Database = Database> = AppRepositories<T> & {
    database: Database;
};

export const DefaultAppServices = (database: Database): AppServices => ({
    recipeService: createRecipeService(database, DefaultAppRepositories as ServiceDependencies),
    bookService: createBookService(database, DefaultAppRepositories as ServiceDependencies),
});

export type AppDependencies<T extends Database = Database> = {
    services: AppServices;
    repositories: AppRepositories<T>;
    attachmentService: AttachmentService;
    attachmentActions: AttachmentActions;
    database: Database;
};

export const DefaultAppDependencies = (database: Database): AppDependencies => ({
    services: DefaultAppServices(database),
    repositories: DefaultAppRepositories as AppRepositories,
    attachmentService: LocalAttachmentService,
    attachmentActions: AttachmentActions,
    database,
});
