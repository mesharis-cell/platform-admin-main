import { redirect } from "next/navigation";

export default function FeatureFlagsRedirectPage() {
    redirect("/settings/platform");
}
