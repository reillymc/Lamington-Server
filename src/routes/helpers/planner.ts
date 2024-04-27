import { v4 as Uuid } from "uuid";

import { PlannerActions, PlannerMemberActions } from "../../controllers";
import { PlannerMealService, PlannerService } from "../../controllers/spec";
import { ServiceParams } from "../../database";
import { BisectOnValidItems, EnsureArray, EnsureDefinedArray } from "../../utils";
import { Planner, PostPlannerMealRequestBody, PostPlannerRequestBody, UserStatus } from "../spec";
import { getStatus } from "./user";

export const validatePostPlannerBody = ({ data }: PostPlannerRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ plannerId = Uuid(), name, color, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<PlannerService, "Save"> = {
            plannerId,
            name,
            customisations: { color },
            createdBy: userId,
            ...item,
        };

        return validItem;
    });
};

export const validatePostPlannerMealBody = (
    { data }: PostPlannerMealRequestBody,
    userId: string,
    plannerId: string
) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ id = Uuid(), dayOfMonth, month, meal, year, ...item }) => {
        if (dayOfMonth == undefined || month == undefined || !meal || year == undefined) return;

        const validItem: ServiceParams<PlannerMealService, "Save"> = {
            id,
            meal,
            year,
            month,
            dayOfMonth,
            plannerId,
            createdBy: userId,
            recipeId: item.recipeId,
            description: item.description,
            source: item.source,
        };

        return validItem;
    });
};

type PlannerResponse = Awaited<ReturnType<PlannerService["Read"]>>[number];
type PlannerMealsResponse = Awaited<ReturnType<PlannerMealService["Read"]>>;
type MembersResponse = Awaited<ReturnType<PlannerMemberActions["read"]>>;

export const prepareGetPlannerResponseBody = (
    planner: PlannerResponse,
    userId: string,
    plannerMeals?: PlannerMealsResponse,
    members?: MembersResponse
): Planner => ({
    plannerId: planner.plannerId,
    name: planner.name,
    description: planner.description,
    ...planner.customisations,
    createdBy: { userId: planner.createdBy, firstName: planner.createdByName },
    meals: plannerMeals,
    members: members
        ? Object.fromEntries(
              members.map(({ userId, status, firstName, lastName }) => [
                  userId,
                  { userId, status: getStatus(status), firstName, lastName },
              ])
          )
        : undefined,
    status: getStatus(planner.status, planner.createdBy === userId),
});

type PlannerCustomisationsV1 = Pick<Planner, "color">;
export type PlannerCustomisations = PlannerCustomisationsV1;
const DefaultPlannerIcon = "variant1";

export const parsePlannerCustomisations = (customisations?: string): PlannerCustomisations => {
    try {
        const parsed = JSON.parse(customisations ?? "{}") as Partial<PlannerCustomisationsV1>;

        return { color: parsed.color ?? DefaultPlannerIcon };
    } catch {
        return { color: DefaultPlannerIcon };
    }
};

export const stringifyPlannerCustomisations = (customisations: Partial<PlannerCustomisations>): string => {
    const { color = DefaultPlannerIcon } = customisations;

    return JSON.stringify({ color });
};

interface ValidatedPermissions {
    permissionsValid: boolean;
    missingPlanners: string[];
}

export const validatePlannerPermissions = async (
    plannerIds: string | string[],
    userId: string,
    permissionLevel: UserStatus
): Promise<ValidatedPermissions> => {
    const plannerIdsArray = EnsureArray(plannerIds);

    const existingPlanners = await PlannerActions.ReadPermissions([
        ...EnsureArray(plannerIdsArray).map(plannerId => ({ plannerId, userId })),
    ]);

    const statuses = existingPlanners.map(planner => getStatus(planner.status, planner.createdBy === userId));
    const missingPlanners = plannerIdsArray.filter(
        plannerId => !existingPlanners.some(planner => planner.plannerId === plannerId)
    );

    if (statuses.some(status => status === undefined)) {
        return { permissionsValid: false, missingPlanners };
    }

    if (permissionLevel === UserStatus.Owner) {
        return { permissionsValid: statuses.every(status => status === UserStatus.Owner), missingPlanners };
    }

    if (permissionLevel === UserStatus.Administrator) {
        return {
            permissionsValid: statuses.every(status => [UserStatus.Owner, UserStatus.Administrator].includes(status!)),
            missingPlanners,
        };
    }

    if (permissionLevel === UserStatus.Member) {
        return {
            permissionsValid: statuses.every(status =>
                [UserStatus.Owner, UserStatus.Administrator, UserStatus.Member].includes(status!)
            ),
            missingPlanners,
        };
    }

    return {
        permissionsValid: statuses.every(status =>
            [UserStatus.Owner, UserStatus.Administrator, UserStatus.Member, UserStatus.Pending].includes(status!)
        ),
        missingPlanners,
    };
};
