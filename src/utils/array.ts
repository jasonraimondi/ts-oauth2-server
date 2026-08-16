/**
 * Returns the members of the first array that the second does not contain.
 *
 * @param arr1 - The array to take members from
 * @param arr2 - The array to subtract
 * @returns The members of `arr1` that are absent from `arr2`
 */
export const arrayDiff = <T = any>(arr1: T[], arr2: T[]): T[] => arr1.filter(x => !arr2.includes(x));
