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
    const until = params.until ? new Date(params.until) : null;

    return (
        <main className="min-h-screen bg-[#f6f3ed] px-6 py-16 text-[#171717]">
            <div className="mx-auto max-w-2xl rounded-3xl border border-[#d9d1c3] bg-white p-8 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#6b665d]">
                    Kadence Maintenance
                </p>
                <h1 className="mt-4 text-3xl font-semibold">Platform temporarily unavailable</h1>
                <p className="mt-4 text-sm leading-7 text-[#5e584e]">{message}</p>
                {until ? (
                    <p className="mt-4 text-sm text-[#5e584e]">
                        Expected availability: <strong>{until.toLocaleString()}</strong>
                    </p>
                ) : null}
            </div>
        </main>
    );
}
