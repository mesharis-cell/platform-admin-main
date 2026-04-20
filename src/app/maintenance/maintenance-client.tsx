"use client";

/**
 * Client-side recovery: polls /auth/context every 15s. When the API stops
 * returning maintenance_mode=true (or returns anything other than 503), we
 * reload to the root so the user lands back in the app. Pre-existing admin
 * behavior was a static page — users had to know to hit refresh themselves.
 */

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";

const POLL_INTERVAL_MS = 15_000;

export function MaintenanceClient({ message, until }: { message: string; until: string | null }) {
    const [checking, setChecking] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            if (cancelled) return;
            setChecking(true);
            try {
                const response = await apiClient.get("/auth/context");
                const maintenance = response.data?.data?.maintenance;
                const stillInMaintenance = Boolean(maintenance?.enabled);
                if (!cancelled && !stillInMaintenance) {
                    window.location.href = "/";
                    return;
                }
            } catch {
                // swallow — retry next tick
            } finally {
                if (!cancelled) {
                    setChecking(false);
                    setLastCheckedAt(new Date());
                }
            }
        };

        void check();
        const id = window.setInterval(check, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, []);

    const untilDate = until ? new Date(until) : null;
    const showUntil = untilDate && !Number.isNaN(untilDate.getTime());

    return (
        <main className="min-h-screen bg-[#f6f3ed] px-6 py-16 text-[#171717]">
            <div className="mx-auto max-w-2xl rounded-3xl border border-[#d9d1c3] bg-white p-8 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#6b665d]">
                    Kadence Maintenance
                </p>
                <h1 className="mt-4 text-3xl font-semibold">Platform temporarily unavailable</h1>
                <p className="mt-4 text-sm leading-7 text-[#5e584e]">{message}</p>
                {showUntil ? (
                    <p className="mt-4 text-sm text-[#5e584e]">
                        Expected availability: <strong>{untilDate!.toLocaleString()}</strong>
                    </p>
                ) : null}
                <p className="mt-6 text-xs text-[#8c857a]">
                    We&apos;ll check for you every {POLL_INTERVAL_MS / 1000}s and bring you back
                    automatically once maintenance ends.
                    {lastCheckedAt ? ` Last checked ${lastCheckedAt.toLocaleTimeString()}.` : ""}
                </p>
                <button
                    type="button"
                    disabled={checking}
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex h-10 items-center rounded-full bg-[#171717] px-5 text-sm font-medium text-white disabled:opacity-50"
                >
                    {checking ? "Checking…" : "Check now"}
                </button>
            </div>
        </main>
    );
}
