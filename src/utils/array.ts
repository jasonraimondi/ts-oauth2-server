export const arrayDiff = <T = any>(arr1: T[], arr2: T[]): T[] => arr1.filter(x => !arr2.includes(x));
