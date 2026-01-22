import type { Attachment } from "../database/definitions/attachment.ts";
import type { Content } from "../database/definitions/content.ts";
import type { ContentMember } from "../database/definitions/contentMember.ts";
import type { Planner } from "../database/definitions/planner.ts";
import type { Database, Meal, User } from "../database/index.ts";
import type { RepositoryBulkService, RepositoryService } from "./repository.ts";

type PlannerUserStatus = "O" | "A" | "M" | "P" | "B";
type PlannerColor = `variant${1 | 2 | 3 | 4 | 5}`;
type PlannerMealCourse = "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | "drink" | "component" | "side";

type VerifyPermissionsRequest = {
    userId: User["userId"];
    /**
     * Will return true of user is a member of a planner with the provided statuses
     */
    status: PlannerUserStatus | ReadonlyArray<PlannerUserStatus>;
    planners: ReadonlyArray<{
        plannerId: Planner["plannerId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    status: PlannerUserStatus | ReadonlyArray<PlannerUserStatus> | null;
    planners: ReadonlyArray<{
        plannerId: Planner["plannerId"];
        hasPermissions: boolean;
    }>;
};

type PlannerMealResponse = {
    mealId: Meal["mealId"];
    course: PlannerMealCourse;
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
    meals: ReadonlyArray<PlannerMealResponse>;
};

type CreatePlannerMealPayload = {
    year: Meal["year"];
    month: Meal["month"];
    dayOfMonth: Meal["dayOfMonth"];
    course: PlannerMealCourse;
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: string;
};

type CreateMealsRequest = {
    userId: User["userId"];
    plannerId: Planner["plannerId"];
    meals: ReadonlyArray<CreatePlannerMealPayload>;
};

type CreateMealsResponse = {
    meals: ReadonlyArray<PlannerMealResponse>;
};

type UpdatePlannerMealPayload = {
    year?: Meal["year"];
    month?: Meal["month"];
    dayOfMonth?: Meal["dayOfMonth"];
    course?: PlannerMealCourse;
    description?: Meal["description"];
    source?: Meal["source"];
    recipeId?: Meal["recipeId"];
    notes?: Meal["notes"];
    heroImage?: Attachment["attachmentId"] | null;
    mealId: Meal["mealId"];
};

type UpdateMealsRequest = {
    plannerId: Planner["plannerId"];
    meals: ReadonlyArray<UpdatePlannerMealPayload>;
};

type UpdateMealsResponse = {
    plannerId: Planner["plannerId"];
    meals: ReadonlyArray<PlannerMealResponse>;
};

type DeleteMealsRequest = {
    plannerId: Planner["plannerId"];
    meals: ReadonlyArray<{
        mealId: Meal["mealId"];
    }>;
};

type DeleteMealsResponse = {
    plannerId: Planner["plannerId"];
    count: number;
};

type MemberSaveItem = {
    userId: ContentMember["userId"];
    status?: PlannerUserStatus;
};
type MemberResponseItem = {
    userId: ContentMember["userId"];
    firstName: User["firstName"];
    status: PlannerUserStatus | null;
};

type BasePlannerResponse = {
    plannerId: Planner["plannerId"];
    name: Planner["name"];
    description: Planner["description"];
    color: PlannerColor;
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
    planners: ReadonlyArray<BasePlannerResponse>;
};

type ReadPlannersRequest = {
    userId: User["userId"];
    planners: ReadonlyArray<{
        plannerId: Planner["plannerId"];
    }>;
};

type ReadPlannersResponse = {
    userId: User["userId"];
    planners: ReadonlyArray<BasePlannerResponse>;
};

type CreatePlannersRequest = {
    userId: User["userId"];
    planners: ReadonlyArray<{
        name: Planner["name"];
        description?: Planner["description"];
        color?: string;
    }>;
};

type CreatePlannersResponse = ReadPlannersResponse;

type UpdatePlannersRequest = {
    userId: User["userId"];
    planners: ReadonlyArray<{
        plannerId: Planner["plannerId"];
        name?: Planner["name"];
        description?: Planner["description"];
        color?: string;
    }>;
};

type UpdatePlannersResponse = ReadPlannersResponse;

type DeletePlannersRequest = {
    planners: ReadonlyArray<{
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
    members: ReadonlyArray<
        MemberResponseItem & {
            lastName: User["lastName"];
        }
    >;
};

type SaveMembersRequest = {
    plannerId: Planner["plannerId"];
    members?: ReadonlyArray<MemberSaveItem>;
};

type SaveMembersResponse = {
    plannerId: Planner["plannerId"];
    members: ReadonlyArray<MemberResponseItem>;
};

type UpdateMembersRequest = {
    plannerId: Planner["plannerId"];
    members?: ReadonlyArray<MemberSaveItem>;
};

type UpdateMembersResponse = {
    plannerId: Planner["plannerId"];
    members: ReadonlyArray<MemberResponseItem>;
};

type RemoveMembersRequest = {
    plannerId: Planner["plannerId"];
    members: ReadonlyArray<{
        userId: ContentMember["userId"];
    }>;
};

type RemoveMembersResponse = {
    plannerId: Planner["plannerId"];
    count: number;
};

export interface PlannerRepository<TDatabase extends Database = Database> {
    create: RepositoryService<TDatabase, CreatePlannersRequest, CreatePlannersResponse>;
    createMeals: RepositoryService<TDatabase, CreateMealsRequest, CreateMealsResponse>;
    delete: RepositoryService<TDatabase, DeletePlannersRequest, DeletePlannersResponse>;
    deleteMeals: RepositoryService<TDatabase, DeleteMealsRequest, DeleteMealsResponse>;
    read: RepositoryService<TDatabase, ReadPlannersRequest, ReadPlannersResponse>;
    readAll: RepositoryService<TDatabase, ReadAllPlannersRequest, ReadAllPlannersResponse>;
    readAllMeals: RepositoryService<TDatabase, ReadAllMealsRequest, ReadAllMealsResponse>;
    readMembers: RepositoryBulkService<TDatabase, ReadMembersRequest, ReadMembersResponse>;
    removeMembers: RepositoryBulkService<TDatabase, RemoveMembersRequest, RemoveMembersResponse>;
    saveMembers: RepositoryBulkService<TDatabase, SaveMembersRequest, SaveMembersResponse>;
    update: RepositoryService<TDatabase, UpdatePlannersRequest, UpdatePlannersResponse>;
    updateMeals: RepositoryService<TDatabase, UpdateMealsRequest, UpdateMealsResponse>;
    updateMembers: RepositoryBulkService<TDatabase, UpdateMembersRequest, UpdateMembersResponse>;
    verifyPermissions: RepositoryService<TDatabase, VerifyPermissionsRequest, VerifyPermissionsResponse>;
}
