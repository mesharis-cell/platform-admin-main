"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

const themes = [
	{
		key: "system",
		icon: Monitor,
		label: "System theme",
	},
	{
		key: "light",
		icon: Sun,
		label: "Light theme",
	},
	{
		key: "dark",
		icon: Moon,
		label: "Dark theme",
	},
];

export type ThemeSwitcherProps = {
	value?: "light" | "dark" | "system";
	onChange?: (theme: "light" | "dark" | "system") => void;
	defaultValue?: "light" | "dark" | "system";
	className?: string;
	duration?: number;
};

export const ThemeSwitcher = ({
	value,
	onChange,
	defaultValue = "system",
	className,
	duration = 400,
}: ThemeSwitcherProps) => {
	const [theme, setTheme] = useControllableState({
		defaultProp: defaultValue,
		prop: value,
		onChange,
	});
	const [mounted, setMounted] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const activeButtonRef = useRef<HTMLButtonElement>(null);

	const handleThemeClick = useCallback(
		async (themeKey: "light" | "dark" | "system", event: React.MouseEvent<HTMLButtonElement>) => {
			const button = event.currentTarget;

			// Check if View Transitions API is supported
			if (!document.startViewTransition || !button) {
				setTheme(themeKey);
				return;
			}

			await document.startViewTransition(() => {
				flushSync(() => {
					setTheme(themeKey);
				});
			}).ready;

			const { top, left, width, height } = button.getBoundingClientRect();
			const x = left + width / 2;
			const y = top + height / 2;
			const maxRadius = Math.hypot(
				Math.max(left, window.innerWidth - left),
				Math.max(top, window.innerHeight - top)
			);

			document.documentElement.animate(
				{
					clipPath: [
						`circle(0px at ${x}px ${y}px)`,
						`circle(${maxRadius}px at ${x}px ${y}px)`,
					],
				},
				{
					duration,
					easing: "ease-in-out",
					pseudoElement: "::view-transition-new(root)",
				}
			);
		},
		[setTheme, duration]
	);

	// Prevent hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<div
			className={cn(
				"relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border",
				className
			)}
		>
			{themes.map(({ key, icon: Icon, label }) => {
				const isActive = theme === key;

				return (
					<button
						aria-label={label}
						className="relative h-6 w-6 rounded-full"
						key={key}
						onClick={(e) => handleThemeClick(key as "light" | "dark" | "system", e)}
						type="button"
					>
						{isActive && (
							<motion.div
								className="absolute inset-0 rounded-full bg-secondary"
								layoutId="activeTheme"
								transition={{ type: "spring", duration: 0.5 }}
							/>
						)}
						<Icon
							className={cn(
								"relative z-10 m-auto h-4 w-4",
								isActive ? "text-foreground" : "text-muted-foreground"
							)}
						/>
					</button>
				);
			})}
		</div>
	);
};
