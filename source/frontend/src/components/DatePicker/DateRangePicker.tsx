//TODO: Replace once https://github.com/mui/mui-x/issues/4547 lands (Q2 2023 planned)
import Picker from './Picker';
import { useState } from 'react';
interface RangeProps {
	rangeStart?: Date,
	rangeEnd?: Date,
	onRangeStartChange?: (newRangeStartValue?: Date) => void
	onRangeEndChange?: (newRangeEndValue?: Date) => void
}
export default function DateRangePicker(RangeProps: RangeProps) {
	//Using Date instead of DateTime due to https://github.com/mui/mui-x/issues/5175
	//(and not using the moment method to ease move away from that deprecated package)
	let now = new Date(); //TODO: Live-update instead of fossilizing page load time?
	const [rangeStartMax, setRangeStartMax] = useState<Date | undefined>(now);
	const [rangeEndMin, setRangeEndMin] = useState<Date | undefined>();
	const [rangeStart, setRangeStart] = useState<Date | undefined>(RangeProps.rangeStart);
	const [rangeEnd, setRangeEnd] = useState<Date | undefined>(RangeProps.rangeEnd);
	let onRangeStartChange = (newRangeStartValue?: Date) => {
		setRangeStart(newRangeStartValue);
		setRangeEndMin(newRangeStartValue);
		const parentOnChange = RangeProps.onRangeStartChange;
		if(typeof parentOnChange !== 'undefined') {
			parentOnChange(newRangeStartValue);
		}
	}
	let onRangeEndChange = (newRangeEndValue?: Date) => {
		setRangeEnd(newRangeEndValue);
		setRangeStartMax(newRangeEndValue);
		const parentOnChange = RangeProps.onRangeEndChange;
		if(typeof parentOnChange !== 'undefined') {
			parentOnChange(newRangeEndValue);
		}
	}
	return (
		<span className='dateRangePicker'>
			<Picker
				labelText='Filter by date/time start'
				maxDateTime = {rangeStartMax}
				onChange = {onRangeStartChange}
				value = {rangeStart}
			/>
			{' - '}
			<Picker
				labelText='Filter by date/time end'
				minDateTime = {rangeEndMin}
				maxDateTime = {now}
				onChange = {onRangeEndChange}
				value = {rangeEnd}
			/>
		</span>
	);
};
