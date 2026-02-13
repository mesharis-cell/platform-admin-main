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

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const applyMargin = (baseValue: number, marginPercent: number) =>
    roundCurrency(baseValue * (1 + marginPercent / 100));

export const getOrderPrice = (
    orderPricing: Partial<OrderPricing> | null | undefined,
    overrideMarginPercent?: number
) => {
    const marginPercent = Number(overrideMarginPercent ?? orderPricing?.margin?.percent ?? 0);
    const baseBase = Number(orderPricing?.base_ops_total ?? 0);
    const transportBase = Number(orderPricing?.transport?.final_rate ?? 0);
    const catalogBase = Number(orderPricing?.line_items?.catalog_total ?? 0);
    const customBase = Number(orderPricing?.line_items?.custom_total ?? 0);

    const basePrice = applyMargin(baseBase, marginPercent);
    const transportPrice = applyMargin(transportBase, marginPercent);
    const catalogPrice = applyMargin(catalogBase, marginPercent);
    const customPrice = applyMargin(customBase, marginPercent);
    const servicePrice = roundCurrency(catalogPrice + customPrice);
    const baseSubtotal = roundCurrency(baseBase + transportBase + catalogBase + customBase);
    const total = roundCurrency(basePrice + transportPrice + servicePrice);
    const marginAmount = roundCurrency(total - baseSubtotal);

    return {
        marginPercent,
        marginAmount,
        basePrice,
        transportPrice,
        catalogPrice,
        customPrice,
        servicePrice,
        total,
    };
};
