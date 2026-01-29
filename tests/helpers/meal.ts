import type { components } from "../../src/routes/spec/schema.ts";

export const randomCourse = (): components["schemas"]["Course"] => {
    const courses = [
        "breakfast",
        "lunch",
        "dinner",
    ] as const satisfies components["schemas"]["Course"][];
    return courses[
        Math.floor(Math.random() * courses.length)
    ] as components["schemas"]["Course"];
};
