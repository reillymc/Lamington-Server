import db, {
    ReadResponse,
    lamington,
    ReadQuery,
    CreateQuery,
    user,
    DeleteResponse,
    User,
    LamingtonMemberTables,
    Lamington,
} from "../../database";
import { EntityMember } from "../../database/definitions/entity";

export interface CreateEntityMemberParams {
    entityId: string;
    userId: string;
    allowEditing?: boolean;
    accepted?: boolean;
}

export interface CreateEntityMemberOptions {
    preserveAccepted?: boolean;
    trimNotIn?: boolean;
}

const saveEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (entityMembers: CreateQuery<CreateEntityMemberParams>, options?: CreateEntityMemberOptions) => {
        if (!Array.isArray(entityMembers)) {
            entityMembers = [entityMembers];
        }

        const data = entityMembers.map(({ entityId, userId, allowEditing, accepted }) => ({
            [idField]: entityId,
            userId,
            canEdit: allowEditing ? 1 : 0,
            accepted: accepted ? 1 : 0,
        }));

        const entityIds = data.map(({ [idField]: entityId }) => entityId) as string[];

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];

        if (options?.trimNotIn) {
            await db(entity)
                .whereIn(entityIdField, entityIds)
                .whereNotIn(
                    memberIdField,
                    data.map(({ userId }) => userId)
                )
                .delete();
        }

        return db
            .insert(data)
            .into(entity)
            .onConflict([entityIdField, memberIdField])
            .merge(options?.preserveAccepted ? ["canEdit"] : undefined); // Knex seems to disallow columns prefixed with table name
    };

interface DeleteEntityMemberParams {
    entityId: string;
    userId: string;
}

const deleteEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (entityMembers: CreateQuery<DeleteEntityMemberParams>): DeleteResponse => {
        if (!Array.isArray(entityMembers)) {
            entityMembers = [entityMembers];
        }

        const entityIds = entityMembers.map(({ entityId }) => entityId);
        const userIds = entityMembers.map(({ userId }) => userId);

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];

        return db(entity).whereIn(entityIdField, entityIds).whereIn(memberIdField, userIds).delete();
    };

interface GetEntityMembersParams {
    entityId: string;
}

type GetEntityMembersResponse = Pick<EntityMember, "userId" | "accepted"> &
    Pick<User, "firstName" | "lastName"> & { canEdit: number };

const readEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (params: ReadQuery<GetEntityMembersParams>): ReadResponse<GetEntityMembersResponse> => {
        if (!Array.isArray(params)) {
            params = [params];
        }
        const entityIds = params.map(({ entityId }) => entityId);

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];
        const canEditField = LamingtonMemberTables[entity]["canEdit"];
        const acceptedField = LamingtonMemberTables[entity]["accepted"];

        const query = db(entity)
            .select(memberIdField, canEditField, acceptedField, user.firstName, user.lastName)
            .whereIn(entityIdField, entityIds)
            .leftJoin(lamington.user, memberIdField, user.userId);
        return query;
    };

export const CreateEntityMemberActions = <
    T extends keyof typeof LamingtonMemberTables,
    K extends keyof (typeof Lamington)[T]
>(
    entity: T,
    idField: K
) => ({
    delete: deleteEntityMembers(entity, idField),
    read: readEntityMembers(entity, idField),
    update: saveEntityMembers(entity, idField),
});
