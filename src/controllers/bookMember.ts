import db, {
    ReadResponse,
    lamington,
    ReadQuery,
    CreateQuery,
    bookMember,
    user,
    BookMember,
    DeleteResponse,
    User,
} from "../database";

interface CreateBookMemberParams {
    bookId: string;
    userId: string;
    accepted?: boolean;
}

const saveBookMembers = async (bookMembers: CreateQuery<CreateBookMemberParams>) => {
    if (!Array.isArray(bookMembers)) {
        bookMembers = [bookMembers];
    }

    const data: BookMember[] = bookMembers.map(({ bookId, userId, accepted }) => ({
        bookId,
        userId,
        canEdit: undefined,
        accepted: accepted ? 1 : 0,
    }));

    return db.insert(data).into(lamington.bookMember).onConflict([bookMember.bookId, bookMember.userId]).merge();
};

interface DeleteBookMemberParams {
    bookId: string;
    userId: string;
}

/**
 * Creates a new book from params
 * @returns the newly created books
 */
const deleteBookMembers = async (bookMembers: CreateQuery<DeleteBookMemberParams>): DeleteResponse => {
    if (!Array.isArray(bookMembers)) {
        bookMembers = [bookMembers];
    }

    const bookIds = bookMembers.map(({ bookId }) => bookId);
    const userIds = bookMembers.map(({ userId }) => userId);

    return db(lamington.bookMember).whereIn(bookMember.bookId, bookIds).whereIn(bookMember.userId, userIds).delete();
};

interface GetBookMembersParams {
    bookId: string;
}

interface GetBookMembersResponse
    extends Pick<BookMember, "userId" | "canEdit" | "accepted">,
        Pick<User, "firstName" | "lastName"> {}

/**
 * Get books by id or ids
 * @returns an array of books matching given ids
 */
const readBookMembers = async (params: ReadQuery<GetBookMembersParams>): ReadResponse<GetBookMembersResponse> => {
    if (!Array.isArray(params)) {
        params = [params];
    }
    const bookIds = params.map(({ bookId }) => bookId);

    const query = db(lamington.bookMember)
        .select(bookMember.userId, bookMember.canEdit, bookMember.accepted, user.firstName, user.lastName)
        .whereIn(bookMember.bookId, bookIds)
        .leftJoin(lamington.user, bookMember.userId, user.userId);
    return query;
};

export const BookMemberActions = {
    delete: deleteBookMembers,
    read: readBookMembers,
    update: saveBookMembers,
};
