import { BaseRequest, BaseRequestBody, BaseRequestParams, BaseResponse } from ".";
import { User } from "./user";

export const plannerEndpoint = "/planners" as const;

export const plannerMemberSubpath = "members" as const;
export const mealSubpath = "meals" as const;

export const plannerIdParam = "plannerId" as const;
export const yearParam = "year" as const;
export const monthParam = "month" as const;
export const plannerMemberIdParam = "userId" as const;
export const mealIdParam = "mealId" as const;

/**
 * Planners
 */
export type Planners = {
    [plannerId: string]: Planner;
};

/**
 * Planner
 */
export type Planner = {
    plannerId: string;
    createdBy: Pick<User, "userId" | "firstName">;
    name: string;
    variant: string;
    description: string | undefined;
    accepted?: boolean;
    canEdit?: boolean;
    members?: {
        [userId: User["userId"]]: {
            userId: User["userId"];
            firstName?: User["firstName"];
            lastName?: User["lastName"];
            permissions?: string;
        };
    };
    meals?: PlannerMeal[];
};

/**
 * Planner recipe
 */
export type PlannerMeal = {
    id: string;
    plannerId: string;
    createdBy: string;
    year: number;
    month: number;
    dayOfMonth: number;
    meal: string;
    description?: string;
    recipeId?: string;
};

// Get user planners
export type GetPlannersRequestParams = BaseRequestParams;
export type GetPlannersRequestBody = BaseRequestBody;

export type GetPlannersRequest = BaseRequest<GetPlannersRequestBody & GetPlannersRequestParams>;
export type GetPlannersResponse = BaseResponse<Planners>;
export type GetPlannersService = (request: GetPlannersRequest) => GetPlannersResponse;

// Get planner
export type GetPlannerRequestParams = BaseRequestParams<{
    [plannerIdParam]: Planner["plannerId"];
    [yearParam]: string;
    [monthParam]: string;
}>;
export type GetPlannerRequestBody = BaseRequestBody;

export type GetPlannerRequest = BaseRequest<GetPlannerRequestParams & GetPlannerRequestBody>;
export type GetPlannerResponse = BaseResponse<Planner>;
export type GetPlannerService = (request: GetPlannerRequest) => GetPlannerResponse;

// Post planner
export type PostPlannerRequestParams = BaseRequestParams;
export type PostPlannerRequestBody = BaseRequestBody<{
    name?: Planner["name"];
    plannerId?: Planner["plannerId"];
    variant?: Planner["variant"];
    description?: Planner["description"];
    memberIds?: string[];
}>;

export type PostPlannerRequest = BaseRequest<PostPlannerRequestBody & PostPlannerRequestParams>;
export type PostPlannerResponse = BaseResponse;
export type PostPlannerService = (request: PostPlannerRequest) => PostPlannerResponse;

// Delete planner
export type DeletePlannerRequestParams = BaseRequestParams<{ [plannerIdParam]: Planner["plannerId"] }>;
export type DeletePlannerRequestBody = BaseRequestBody;

export type DeletePlannerRequest = BaseRequest<DeletePlannerRequestParams & DeletePlannerRequestBody>;
export type DeletePlannerResponse = BaseResponse;
export type DeletePlannerService = (request: DeletePlannerRequest) => DeletePlannerResponse;

// Post planner recipe
export type PostPlannerMealRequestParams = BaseRequestParams<{ [plannerIdParam]: Planner["plannerId"] }>;
export type PostPlannerMealRequestBody = BaseRequestBody<Omit<PlannerMeal, "plannerId">>;

export type PostPlannerMealRequest = BaseRequest<PostPlannerMealRequestParams & PostPlannerMealRequestBody>;
export type PostPlannerMealResponse = BaseResponse;
export type PostPlannerMealService = (request: PostPlannerMealRequest) => PostPlannerMealResponse;

// Delete planner recipe
export type DeletePlannerMealRequestParams = BaseRequestParams<{
    [plannerIdParam]: Planner["plannerId"];
    [mealIdParam]: PlannerMeal["id"];
}>;
export type DeletePlannerMealRequestBody = BaseRequestBody;

export type DeletePlannerMealRequest = BaseRequest<DeletePlannerMealRequestParams & DeletePlannerMealRequestBody>;
export type DeletePlannerMealResponse = BaseResponse;
export type DeletePlannerMealService = (request: DeletePlannerMealRequest) => DeletePlannerMealResponse;

// Post planner member
export type PostPlannerMemberRequestParams = BaseRequestParams<{
    [plannerIdParam]: Planner["plannerId"];
}>;
export type PostPlannerMemberRequestBody = BaseRequestBody<{
    accepted?: boolean;
}>;

export type PostPlannerMemberRequest = BaseRequest<PostPlannerMemberRequestParams & PostPlannerMemberRequestBody>;
export type PostPlannerMemberResponse = BaseResponse;
export type PostPlannerMemberService = (request: PostPlannerMemberRequest) => PostPlannerMemberResponse;

// Delete planner member
export type DeletePlannerMemberRequestParams = BaseRequestParams<{
    [plannerIdParam]: Planner["plannerId"];
    [plannerMemberIdParam]: User["userId"];
}>;
export type DeletePlannerMemberRequestBody = BaseRequestBody;

export type DeletePlannerMemberRequest = BaseRequest<DeletePlannerMemberRequestParams & DeletePlannerMemberRequestBody>;
export type DeletePlannerMemberResponse = BaseResponse;
export type DeletePlannerMemberService = (request: DeletePlannerMemberRequest) => DeletePlannerMemberResponse;

export interface PlannerServices {
    deletePlanner: DeletePlannerService;
    deletePlannerMeal: DeletePlannerMealService;
    deletePlannerMember: DeletePlannerMemberService;
    getPlanner: GetPlannerService;
    getPlanners: GetPlannersService;
    postPlanner: PostPlannerService;
    postPlannerMeal: PostPlannerMealService;
    postPlannerMember: PostPlannerMemberService;
}
