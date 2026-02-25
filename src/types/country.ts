export interface Country {
    id: string;
    platform_id: string;
    name: string;
    created_at: string;
    cities: City[];
}

export interface City {
    id: string;
    platform_id: string;
    name: string;
    country_id: string;
    created_at: string;
    country: Country;
}

export interface Meta {
    page: number;
    limit: number;
    total: number;
}

export interface CountryResponse {
    success: boolean;
    message: string;
    meta: Meta;
    data: Country[];
}

export interface CityResponse {
    success: boolean;
    message: string;
    data: City[];
}
