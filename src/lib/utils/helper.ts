export const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace("_", " ");
};

export const removeUnderScore = (str: string): string => {
    return str.replace("_", " ");
};
