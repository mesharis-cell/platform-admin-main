import { MaintenanceClient } from "./maintenance-client";

type MaintenancePageProps = {
    searchParams?: Promise<{
        message?: string;
        until?: string;
    }>;
};

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
    const params = (await searchParams) || {};
    const message =
        params.message ||
        "This platform is temporarily unavailable while maintenance is in progress.";
    const until = params.until || null;

    return <MaintenanceClient message={message} until={until} />;
}
