/* global globalThis */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const runtimeGlobal =
            typeof globalThis !== "undefined"
                ? (globalThis as unknown as Record<string, unknown>)
                : undefined;
        const browserWindow = runtimeGlobal?.["window"] as Window | undefined;
        if (!browserWindow) return;

        const mql = browserWindow.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(browserWindow.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener("change", onChange);
        setIsMobile(browserWindow.innerWidth < MOBILE_BREAKPOINT);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return !!isMobile;
}
