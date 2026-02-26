"use client";

export const capitalizeFirstLetter = (str?: string): string => {
    return str?.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace("_", " ");
};

export const removeUnderScore = (str?: string): string => {
    return str?.replace("_", " ");
};

/**
 * Convert snake_case string to camelCase
 */
export const snakeToCamel = (str?: string): string => {
    return str?.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert object keys from snake_case to camelCase (shallow)
 */
export const mapSnakeToCamel = <T extends Record<string, unknown>>(obj: T): T => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
        result[snakeToCamel(key)] = obj[key];
    }
    return result as T;
};

/**
 * Map API response array from snake_case to camelCase
 */
export const mapArraySnakeToCamel = <T extends Record<string, unknown>>(arr: T[]): T[] => {
    return arr.map(mapSnakeToCamel);
};

/**
 * Convert camelCase string to snake_case
 */
export const camelToSnake = (str: string): string => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Convert object keys from camelCase to snake_case (shallow)
 */
export const mapCamelToSnake = <T extends object>(obj: T): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
        result[camelToSnake(key)] = (obj as Record<string, unknown>)[key];
    }
    return result;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const getOrderPrice = (orderPricing: any) => {
    const sellTotal = Number(orderPricing?.sell?.final_total || orderPricing?.final_total || 0);
    return { total: roundCurrency(sellTotal) };
};
