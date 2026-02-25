export interface CompanyDomain {
    id: string;
    platform_id: string;
    company_id: string;
    hostname: string;
    type: string;
    primary_color: string | null; // Site primary color - overrides platform primary_color
    is_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
