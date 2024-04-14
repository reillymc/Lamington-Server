import db, {
    CreateQuery,
    DeleteResponse,
    Lamington,
    LamingtonMemberTables,
    ReadQuery,
    ReadResponse,
    User,
    lamington,
    user,
} from "../../database";
import { UserStatus } from "../../routes/spec";
import { EnsureArray } from "../../utils";

export type EntityMember = {
    userId: User["userId"];
    status?: UserStatus;
};

export type SaveEntityMemberRequest<
    T extends keyof typeof LamingtonMemberTables,
    K extends keyof (typeof Lamington)[T]
> = Pick<(typeof Lamington)[T], K> & {
    members?: Array<EntityMember>;
};

interface CreateEntityMemberOptions {
    trimNotIn?: boolean;
}

const saveEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (saveRequests: CreateQuery<SaveEntityMemberRequest<T, K>>, options?: CreateEntityMemberOptions) => {
        for (const { members = [], [idField]: entityId } of EnsureArray(saveRequests)) {
            const data = members.map(({ status, userId }) => ({
                [idField]: entityId,
                userId,
                status,
            }));

            const entityIdField = idField as string;
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

            await db<EntityMember>(entity).insert(data).onConflict([entityIdField, "userId"]).merge(["status"]);
        }
    };

interface DeleteEntityMemberParams {
    entityId: string;
    userId: string;
}

const deleteEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (params: CreateQuery<DeleteEntityMemberParams>): DeleteResponse => {
        const entityMembers = EnsureArray(params);

        const entityIds = entityMembers.map(({ entityId }) => entityId);
        const userIds = entityMembers.map(({ userId }) => userId);

        const entityIdField = idField as string;

        return db<EntityMember>(entity).whereIn(entityIdField, entityIds).whereIn("userId", userIds).delete();
    };

interface GetEntityMembersParams {
    entityId: string;
}

type GetEntityMembersResponse<
    T extends keyof typeof LamingtonMemberTables,
    K extends keyof (typeof Lamington)[T]
> = Pick<EntityMember, "userId" | "status"> & Pick<User, "firstName" | "lastName"> & Pick<(typeof Lamington)[T], K>;

const readEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof (typeof Lamington)[T]>(entity: T, idField: K) =>
    async (params: ReadQuery<GetEntityMembersParams>): ReadResponse<GetEntityMembersResponse<T, K>> => {
        if (!Array.isArray(params)) {
            params = [params];
        }
        const entityIds = params.map(({ entityId }) => entityId);

        const entityIdField = idField as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];
        const statusField = LamingtonMemberTables[entity]["status"];

        const query = db<EntityMember>(entity)
            .select(entityIdField, memberIdField, statusField, user.firstName, user.lastName)
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
