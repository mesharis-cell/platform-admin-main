export type ServiceCategory = "ASSEMBLY" | "EQUIPMENT" | "HANDLING" | "RESKIN" | "OTHER";

export interface ServiceType {
    id: string;
    platform_id: string;
    name: string;
    category: ServiceCategory;
    unit: string;
    default_rate: number | null;
    description: string | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface ServiceTypeResponse {
    success: boolean;
    message: string;
    data: ServiceType[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}
