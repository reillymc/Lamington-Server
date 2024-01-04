import { v4 as Uuid } from "uuid";

import { PlannerActions, PlannerMealActions, PlannerMemberActions } from "../../controllers";
import { ServiceParams } from "../../database";
import { BisectOnValidItems, EnsureDefinedArray } from "../../utils";
import { Planner, PostPlannerMealRequestBody, PostPlannerRequestBody } from "../spec";

export const validatePostPlannerBody = ({ data }: PostPlannerRequestBody, userId: string) => {
    const filteredData = EnsureDefinedArray(data);

    return BisectOnValidItems(filteredData, ({ plannerId = Uuid(), name, ...item }) => {
        if (!name) return;

        const validItem: ServiceParams<PlannerActions, "save"> = {
            plannerId,
            name,
            description: item.description,
            customisations: stringifyPlannerCustomisations({ color: item.color }),
            members: item.members,
            createdBy: userId,
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

        const validItem: ServiceParams<PlannerMealActions, "save"> = {
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

type PlannerResponse = Awaited<ReturnType<PlannerActions["read"]>>[number];
type PlannerMealsResponse = Awaited<ReturnType<PlannerMealActions["read"]>>;
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
    ...parsePlannerCustomisations(planner.customisations),
    createdBy: { userId: planner.createdBy, firstName: planner.createdByName },
    meals: plannerMeals,
    members: members
        ? Object.fromEntries(
              members.map(({ userId, canEdit, firstName, lastName }) => [
                  userId,
                  { userId, allowEditing: !!canEdit, firstName, lastName },
              ])
          )
        : undefined,
    accepted: planner.createdBy === userId ? true : !!planner.accepted,
    canEdit: planner.createdBy === userId ? true : !!planner.canEdit,
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
