export const randomYear = () => Math.floor(Math.random() * 200) + 2000;
export const randomMonth = () => Math.floor(Math.random() * 12);
export const randomDay = () => Math.floor(Math.random() * 31) + 1;

export const randomCount = Math.floor(Math.random() * 10) + 1;
export const randomNumber = (max = 10, min = 1) => Math.floor(Math.random() * (max - min + 1) + min);
export const randomBoolean = () => Math.random() > 0.5;

export const TEST_ITEM_COUNT = 25;
