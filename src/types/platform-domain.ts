import { CompanyDomain } from "./company-domains";

export interface PlatformDomain {
        company_domains: CompanyDomain[],
        platforms: {
            id: string;
            name: string;
            domain: string;
            config: {
                currency: string;
                logo_url: string;
                primary_color: string;
                support_email: string;
                secondary_color: string;
                logistics_partner_name: string;
            },
            features: {
                api_access: boolean;
                bulk_import: boolean;
                collections: boolean;
                advanced_reporting: boolean;
            },
            is_active: boolean,
            created_at: string;
            updated_at: string;
        }
    }