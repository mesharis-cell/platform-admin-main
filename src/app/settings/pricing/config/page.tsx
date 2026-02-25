import { redirect } from "next/navigation";

export default function PricingConfigRedirectPage() {
    redirect("/settings/pricing/warehouse-opt-rates");
}
