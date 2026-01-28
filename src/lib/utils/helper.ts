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
