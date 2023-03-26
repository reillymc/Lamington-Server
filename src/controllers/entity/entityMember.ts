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

interface CreateEntityMemberParams {
    entityId: string;
    userId: string;
    accepted?: boolean;
}

const saveEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof typeof Lamington[T]>(entity: T, idField: K) =>
    async (entityMembers: CreateQuery<CreateEntityMemberParams>) => {
        if (!Array.isArray(entityMembers)) {
            entityMembers = [entityMembers];
        }

        const data = entityMembers.map(({ entityId, userId, accepted }) => ({
            [idField]: entityId,
            userId,
            canEdit: undefined,
            accepted: accepted ? 1 : 0,
        }));

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];

        return db.insert(data).into(entity).onConflict([entityIdField, memberIdField]).merge();
    };

interface DeleteEntityMemberParams {
    entityId: string;
    userId: string;
}

const deleteEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof typeof Lamington[T]>(entity: T, idField: K) =>
    async (entityMembers: CreateQuery<DeleteEntityMemberParams>): DeleteResponse => {
        if (!Array.isArray(entityMembers)) {
            entityMembers = [entityMembers];
        }

        const bookIds = entityMembers.map(({ entityId }) => entityId);
        const userIds = entityMembers.map(({ userId }) => userId);

        const entityIdField = Lamington[entity][idField] as string;
        const memberIdField = LamingtonMemberTables[entity]["userId"];

        return db(entity).whereIn(entityIdField, bookIds).whereIn(memberIdField, userIds).delete();
    };

interface GetEntityMembersParams {
    entityId: string;
}

type GetEntityMembersResponse = Pick<EntityMember, "userId" | "canEdit" | "accepted"> &
    Pick<User, "firstName" | "lastName">;

const readEntityMembers =
    <T extends keyof typeof LamingtonMemberTables, K extends keyof typeof Lamington[T]>(entity: T, idField: K) =>
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
    K extends keyof typeof Lamington[T]
>(
    entity: T,
    idField: K
) => ({
    delete: deleteEntityMembers(entity, idField),
    read: readEntityMembers(entity, idField),
    update: saveEntityMembers(entity, idField),
});
