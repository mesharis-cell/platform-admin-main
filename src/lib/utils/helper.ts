"use client";

import { OrderPricing } from "@/types/hybrid-pricing";

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

export const getOrderPrice = (orderPricing: Partial<OrderPricing> | null | undefined) => {
    const marginAmount = orderPricing?.margin?.percent ?? 0;

    const basePrice =
        Number(orderPricing?.base_ops_total ?? 0) +
        Number(orderPricing?.base_ops_total ?? 0) * (marginAmount / 100);
    const transportPrice =
        Number(orderPricing?.transport?.final_rate ?? 0) +
        Number(orderPricing?.transport?.final_rate ?? 0) * (marginAmount / 100);
    const catalogPrice =
        Number(orderPricing?.line_items?.catalog_total ?? 0) +
        Number(orderPricing?.line_items?.catalog_total ?? 0) * (marginAmount / 100);
    const customPrice = Number(orderPricing?.line_items?.custom_total ?? 0);

    const servicePrice = catalogPrice + customPrice;
    const total = basePrice + transportPrice + servicePrice;

    return {
        marginAmount,
        basePrice,
        transportPrice,
        catalogPrice,
        customPrice,
        servicePrice,
        total,
    };
};
