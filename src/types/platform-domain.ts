import { CompanyDomain } from "./company-domains";

export interface PlatformDomain {
            id: string;
            config: {
                currency: string;
                logo_url: string;
                primary_color: string;
                support_email: string;
                secondary_color: string;
                logistics_partner_name: string;
            },
    }