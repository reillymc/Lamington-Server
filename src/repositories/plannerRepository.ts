import type { Attachment } from "../database/definitions/attachment.ts";
import type { Content } from "../database/definitions/content.ts";
import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Planner } from "../database/definitions/planner.ts";
import type { Database, Meal, User } from "../database/index.ts";
import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

type PlannerUserStatus = "O" | "A" | "M" | "P" | "B";

type VerifyPermissionsRequest = {
    userId: User["userId"];
    /**
     * Will return true of user is a member of a planner with the provided statuses
     */
    status?: PlannerUserStatus | Array<PlannerUserStatus>;
    planners: Array<{
        plannerId: Planner["plannerId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status: PlannerUserStatus | Array<PlannerUserStatus> | null;
    planners: Array<{
        plannerId: Planner["plannerId"];
        hasPermissions: boolean;
    }>;
};

type PlannerMealResponse = {
    mealId: Meal["mealId"];
    course: "breakfast" | "lunch" | "dinner";
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    plannerId: NonNullable<Meal["plannerId"]>;
    year: NonNullable<Meal["year"]>;
    month: NonNullable<Meal["month"]>;
    dayOfMonth: NonNullable<Meal["dayOfMonth"]>;
    description: Meal["description"] | null;
    source: Meal["source"] | null;
    recipeId: Meal["recipeId"] | null;
    notes: Meal["notes"] | null;
    heroImage: {
        attachmentId: string;
        uri: string;
    } | null;
};

type ReadFilters = {
    plannerId: Meal["plannerId"];
    year?: Meal["year"];
    month?: Meal["month"];
};

type ReadAllMealsRequest = {
    userId: User["userId"];
    filter: ReadFilters;
};

type ReadAllMealsResponse = {
    meals: Array<PlannerMealResponse>;
};

type CreatePlannerMealPayload = {
    plannerId: Meal["plannerId"];
    year: Meal["year"];
    month: Meal["month"];
    dayOfMonth: Meal["dayOfMonth"];
    course: "breakfast" | "lunch" | "dinner";
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: string;
};

type CreateMealsRequest = {
    userId: User["userId"];
    meals: Array<CreatePlannerMealPayload>;
};

type CreateMealsResponse = {
    meals: Array<PlannerMealResponse>;
};

type UpdatePlannerMealPayload = {
    year?: Meal["year"];
    month?: Meal["month"];
    dayOfMonth?: Meal["dayOfMonth"];
    course?: "breakfast" | "lunch" | "dinner";
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: Attachment["attachmentId"] | null;
    mealId: Meal["mealId"];
};

type UpdateMealsRequest = {
    // userId: User["userId"];
    meals: Array<UpdatePlannerMealPayload>;
};

type UpdateMealsResponse = {
    meals: Array<PlannerMealResponse>;
};

type DeleteMealsRequest = {
    meals: Array<{
        mealId: Meal["mealId"];
    }>;
};

type DeleteMealsResponse = {
    count: number;
};

type MemberSaveItem = {
    userId: ContentMember["userId"];
    status?: PlannerUserStatus;
};
type MemberResponseItem = {
    userId: ContentMember["userId"];
    firstName: User["firstName"];
    status?: PlannerUserStatus;
};

type BasePlannerResponse = {
    plannerId: Planner["plannerId"];
    name: Planner["name"];
    description: Planner["description"];
    color: string;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    };
    status?: PlannerUserStatus;
};

type ReadAllPlannersRequest = {
    userId: User["userId"];
    filter?: {
        owner?: Content["createdBy"];
    };
};

type ReadAllPlannersResponse = {
    userId: User["userId"];
    planners: Array<BasePlannerResponse>;
};

type ReadPlannersRequest = {
    userId: User["userId"];
    planners: Array<{
        plannerId: Planner["plannerId"];
    }>;
};

type ReadPlannersResponse = {
    userId: User["userId"];
    planners: Array<
        BasePlannerResponse & {
            members: Array<MemberResponseItem>;
        }
    >;
};

type CreatePlannersRequest = {
    userId: User["userId"];
    planners: Readonly<
        Array<{
            name: Planner["name"];
            description?: Planner["description"];
            color?: string;
            members?: Readonly<Array<MemberSaveItem>>;
        }>
    >;
};

type CreatePlannersResponse = ReadPlannersResponse;

type UpdatePlannersRequest = {
    userId: User["userId"];
    planners: Array<{
        plannerId: Planner["plannerId"];
        name?: Planner["name"];
        description?: Planner["description"];
        color?: string;
        members?: Readonly<Array<MemberSaveItem>>;
    }>;
};

type UpdatePlannersResponse = ReadPlannersResponse;

type DeletePlannersRequest = {
    planners: Array<{
        plannerId: Planner["plannerId"];
    }>;
};

type DeletePlannersResponse = {
    count: number;
};

type ReadMembersRequest = {
    plannerId: Planner["plannerId"];
};

type ReadMembersResponse = {
    plannerId: Planner["plannerId"];
    members: Array<
        MemberResponseItem & {
            firstName: User["firstName"];
            lastName: User["lastName"];
        }
    >;
};

type SaveMembersRequest = {
    plannerId: Planner["plannerId"];
    members?: Readonly<Array<MemberSaveItem>>;
};

type SaveMembersResponse = {
    plannerId: Planner["plannerId"];
    members: Array<MemberResponseItem>;
};

type UpdateMembersRequest = {
    plannerId: Planner["plannerId"];
    members?: Readonly<Array<MemberSaveItem>>;
};

type UpdateMembersResponse = {
    plannerId: Planner["plannerId"];
    members: Array<MemberResponseItem>;
};

type RemoveMembersRequest = {
    plannerId: Planner["plannerId"];
    members: Array<{
        userId: ContentMember["userId"];
    }>;
};

type RemoveMembersResponse = {
    plannerId: Planner["plannerId"];
    count: number;
};

export interface PlannerRepository<TDatabase extends Database = Database> {
    verifyPermissions: RepositoryService<TDatabase, VerifyPermissionsRequest, VerifyPermissionsResponse>;
    readAllMeals: RepositoryService<TDatabase, ReadAllMealsRequest, ReadAllMealsResponse>;
    createMeals: RepositoryService<TDatabase, CreateMealsRequest, CreateMealsResponse>;
    updateMeals: RepositoryService<TDatabase, UpdateMealsRequest, UpdateMealsResponse>;
    deleteMeals: RepositoryService<TDatabase, DeleteMealsRequest, DeleteMealsResponse>;

    read: RepositoryService<TDatabase, ReadPlannersRequest, ReadPlannersResponse>;
    readAll: RepositoryService<TDatabase, ReadAllPlannersRequest, ReadAllPlannersResponse>;
    create: RepositoryService<TDatabase, CreatePlannersRequest, CreatePlannersResponse>;
    update: RepositoryService<TDatabase, UpdatePlannersRequest, UpdatePlannersResponse>;
    delete: RepositoryService<TDatabase, DeletePlannersRequest, DeletePlannersResponse>;

    readMembers: RepositoryBulkService<TDatabase, ReadMembersRequest, ReadMembersResponse>;
    saveMembers: RepositoryBulkService<TDatabase, SaveMembersRequest, SaveMembersResponse>;
    updateMembers: RepositoryBulkService<TDatabase, UpdateMembersRequest, UpdateMembersResponse>;
    removeMembers: RepositoryBulkService<TDatabase, RemoveMembersRequest, RemoveMembersResponse>;
}
