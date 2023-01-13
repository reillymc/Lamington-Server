import db, {
    ReadResponse,
    lamington,
    ReadQuery,
    CreateQuery,
    listMember,
    user,
    ListItem,
    ListMember,
    DeleteResponse,
    User,
} from "../database";

interface CreateListMemberParams {
    listId: string;
    userId: string;
    accepted?: boolean;
}

const saveListMembers = async (listMembers: CreateQuery<CreateListMemberParams>) => {
    if (!Array.isArray(listMembers)) {
        listMembers = [listMembers];
    }

    const data: ListMember[] = listMembers.map(({ listId, userId, accepted }) => ({
        listId,
        userId,
        canEdit: undefined,
        accepted: accepted ? 1 : 0,
    }));

    return db.insert(data).into(lamington.listMember).onConflict([listMember.listId, listMember.userId]).merge();
};

interface DeleteListMemberParams {
    listId: string;
    userId: string;
}

/**
 * Creates a new list from params
 * @returns the newly created lists
 */
const deleteListMembers = async (listMembers: CreateQuery<DeleteListMemberParams>): DeleteResponse => {
    if (!Array.isArray(listMembers)) {
        listMembers = [listMembers];
    }

    const listIds = listMembers.map(({ listId }) => listId);
    const userIds = listMembers.map(({ userId }) => userId);

    return db(lamington.listMember).whereIn(listMember.listId, listIds).whereIn(listMember.userId, userIds).delete();
};

interface GetListMembersParams {
    listId: string;
}

interface GetListMembersResponse
    extends Pick<ListMember, "userId" | "canEdit" | "accepted">,
        Pick<User, "firstName" | "lastName"> {}

/**
 * Get lists by id or ids
 * @returns an array of lists matching given ids
 */
const readListMembers = async (params: ReadQuery<GetListMembersParams>): ReadResponse<GetListMembersResponse> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const listIds = params.map(({ listId }) => listId);

    const query = db(lamington.listMember)
        .select(listMember.userId, listMember.canEdit, listMember.accepted, user.firstName, user.lastName)
        .whereIn(listMember.listId, listIds)
        .leftJoin(lamington.user, listMember.userId, user.userId);
    return query;
};

export const ListMemberActions = {
    delete: deleteListMembers,
    read: readListMembers,
    update: saveListMembers,
};
