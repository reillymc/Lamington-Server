export const randomCount = Math.floor(Math.random() * 10) + 1;
export const randomNumber = (max = 10, min = 1) => Math.floor(Math.random() * (max - min + 1) + min);
export const randomBoolean = () => Math.random() > 0.5;
export const randomBit = () => Math.round(Math.random());

export const TEST_ITEM_COUNT = 25;
