/**
 * DateTime Picker Component
 * Combines Calendar for date selection with time input
 */

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time', disabled, className }: DateTimePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
	const [time, setTime] = useState<string>(value ? format(value, 'HH:mm') : '09:00');

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			setSelectedDate(undefined);
			return;
		}

		setSelectedDate(date);
	};

	const handleTimeChange = (newTime: string) => {
		setTime(newTime);
	};

	const handleApply = () => {
		if (!selectedDate) {
			onChange(undefined);
			setIsOpen(false);
			return;
		}

		// Combine selected date with time
		const [hours, minutes] = time.split(':').map(Number);
		const newDate = new Date(selectedDate);
		newDate.setHours(hours, minutes, 0, 0);

		onChange(newDate);
		setIsOpen(false);
	};

	const handleClear = () => {
		setSelectedDate(undefined);
		setTime('09:00');
		onChange(undefined);
		setIsOpen(false);
	};

	// Format display text
	const displayText = value
		? `${format(value, 'MMM d, yyyy')} ${format(value, 'HH:mm')}`
		: placeholder;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn('w-full justify-start text-left font-mono text-sm h-10', !value && 'text-muted-foreground', className)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
					<span className="truncate">{displayText}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="p-4 space-y-4">
					<Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
					<div className="space-y-2 border-t pt-4">
						<Label className="text-xs font-mono text-muted-foreground uppercase">Time</Label>
						<Input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value)} className="font-mono" />
					</div>
					<div className="flex gap-2">
						{value && (
							<Button onClick={handleClear} variant="outline" className="flex-1 font-mono" size="sm">
								Clear
							</Button>
						)}
						<Button onClick={handleApply} className="flex-1 font-mono" size="sm">
							Apply
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
