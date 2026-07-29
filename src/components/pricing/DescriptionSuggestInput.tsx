"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterDescriptionPresets } from "@/lib/line-item-descriptions";

interface DescriptionSuggestInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    id?: string;
    disabled?: boolean;
    className?: string;
    /** Passed through so the modal's Enter-to-submit handler still works. */
    "aria-invalid"?: boolean;
}

/**
 * DescriptionSuggestInput — an EDITABLE combobox for the line-item description
 * field. It is a plain text input (its value flows to the payload exactly like
 * `<Input>` did) with a filtered dropdown of preset descriptions:
 *
 *   • the dropdown opens on an explicit CLICK on the input (or ArrowDown) —
 *     NEVER on focus, so the modals' autofocus does not pop it open on mount.
 *   • once open it shows presets matching the current text (case-insensitive
 *     substring); with empty text that is the full preset list.
 *   • clicking / Enter on a suggestion fills the input with that text, closes the
 *     dropdown, and keeps focus — the text stays freely editable.
 *   • free text is never restricted: anything the admin types is the value.
 *   • keyboard: ArrowDown/ArrowUp move the highlight, Enter picks the highlighted
 *     preset (Escape / Enter with nothing highlighted fall through so the modal's
 *     own Enter-to-submit + Dialog Escape still work).
 *
 * Controlled via value/onChange so it drops straight into the existing
 * description state — no behaviour change to submit, validation, or the payload.
 */
export function DescriptionSuggestInput({
    value,
    onChange,
    placeholder,
    maxLength,
    id,
    disabled,
    className,
    "aria-invalid": ariaInvalid,
}: DescriptionSuggestInputProps) {
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listId = React.useId();

    const matches = React.useMemo(() => filterDescriptionPresets(value), [value]);

    const hasMatches = matches.length > 0;
    const showList = open && hasMatches;

    const closeList = () => {
        setOpen(false);
        setActiveIndex(-1);
    };

    const selectPreset = (preset: string) => {
        onChange(preset);
        closeList();
        // Keep focus so the picked text stays editable.
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            if (!hasMatches) return;
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => (i + 1 >= matches.length ? 0 : i + 1));
            return;
        }
        if (e.key === "ArrowUp") {
            if (!hasMatches) return;
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
            return;
        }
        if (e.key === "Enter") {
            // Only intercept Enter when a suggestion is highlighted; otherwise let
            // it bubble to the modal's Enter-to-submit handler.
            if (showList && activeIndex >= 0 && activeIndex < matches.length) {
                e.preventDefault();
                e.stopPropagation();
                selectPreset(matches[activeIndex]);
            }
            return;
        }
        if (e.key === "Escape") {
            // Close only the dropdown when it's open; keep the Dialog open.
            if (open) {
                e.preventDefault();
                e.stopPropagation();
                closeList();
            }
            return;
        }
    };

    return (
        <div className="relative">
            <Input
                id={id}
                ref={inputRef}
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
                className={className}
                autoComplete="off"
                role="combobox"
                aria-expanded={showList}
                aria-controls={showList ? listId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={
                    showList && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
                }
                aria-invalid={ariaInvalid}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                    setActiveIndex(-1);
                }}
                // Open on an explicit CLICK only — NOT on focus. The Add Custom /
                // Add % modals autofocus this field on open, and opening the list
                // from focus made the dropdown appear the instant the modal did.
                // `onClick` fires after mousedown/mouseup so text selection and
                // caret placement are untouched; keyboard users still get the list
                // via ArrowDown, and typing keeps filtering it.
                onClick={() => setOpen(true)}
                onBlur={closeList}
                onKeyDown={handleKeyDown}
            />
            {showList && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
                >
                    {matches.map((preset, index) => (
                        <li
                            key={preset}
                            id={`${listId}-opt-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            // preventDefault on mousedown keeps the input focused so
                            // the click's onBlur doesn't close the list before select.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                selectPreset(preset);
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                                "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                                index === activeIndex
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground"
                            )}
                        >
                            {preset}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
