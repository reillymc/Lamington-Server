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
import { EnsureArray } from "../../utils";

export type SaveEntityMemberRequest<
    T extends keyof typeof LamingtonMemberTables,
    K extends keyof (typeof Lamington)[T]
> = Pick<(typeof Lamington)[T], K> & {
    members: Array<{
        userId: string;
        allowEditing?: boolean;
        accepted?: boolean;
    }>;
};

interface CreateEntityMemberOptions {
    preserveAccepted?: boolean;
    trimNotIn?: boolean;
}

const saveEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (saveRequests: CreateQuery<SaveEntityMemberRequest<T, K>>, options?: CreateEntityMemberOptions) => {
        for (const { members, [idField]: entityId } of EnsureArray(saveRequests)) {
            const data = members.map(({ allowEditing, accepted, userId }) => ({
                [idField]: entityId,
                userId,
                canEdit: allowEditing ? 1 : 0,
                accepted: accepted ? 1 : 0,
            }));

            const entityIdField = Lamington[entity][idField] as string;
            const memberIdField = LamingtonMemberTables[entity]["userId"];

            if (options?.trimNotIn) {
                const res = await db(entity)
                    .where(entityIdField, entityId as string)
                    .whereNotIn(
                        memberIdField,
                        data.map(({ userId }) => userId)
                    )
                    .delete();
            }

            if (!data.length) return;

            await db
                .insert(data)
                .into(entity)
                .onConflict([entityIdField, memberIdField])
                .merge(options?.preserveAccepted ? ["canEdit"] : undefined); // Knex seems to disallow columns prefixed with table name
        }
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

type GetEntityMembersResponse<
    T extends keyof typeof LamingtonMemberTables,
    K extends keyof (typeof Lamington)[T]
> = Pick<EntityMember, "userId" | "accepted"> &
    Pick<User, "firstName" | "lastName"> & { canEdit: number } & Pick<(typeof Lamington)[T], K>;

const readEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (params: ReadQuery<GetEntityMembersParams>): ReadResponse<GetEntityMembersResponse<T, K>> => {
        if (!Array.isArray(params)) {
            params = [params];
        }
        const entityIds = params.map(({ entityId }) => entityId);

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];
        const canEditField = LamingtonMemberTables[entity]["canEdit"];
        const acceptedField = LamingtonMemberTables[entity]["accepted"];

        const query = db(entity)
            .select(entityIdField, memberIdField, canEditField, acceptedField, user.firstName, user.lastName)
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
    save: saveEntityMembers(entity, idField),
});
