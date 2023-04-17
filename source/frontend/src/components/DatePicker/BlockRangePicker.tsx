
import { ChangeEvent, useState } from 'react';
import { BlockNumberPicker } from './BlockNumberPicker';
interface RangeProps {
	rangeStart?: number,
	rangeEnd?: number,
	onRangeStartChange?: (newRangeStartValue?: number) => void
	onRangeEndChange?: (newRangeEndValue?: number) => void
}
export default function BlockRangePicker(props: RangeProps) {
	const [rangeStartMax, setRangeStartMax] = useState<number | undefined>();
	const [rangeEndMin, setRangeEndMin] = useState<number | undefined>(0);
	const [rangeStart, setRangeStart] = useState<number | undefined>(props.rangeStart);
	const [rangeEnd, setRangeEnd] = useState<number | undefined>(props.rangeEnd);
	let onRangeStartChange = (ev: ChangeEvent<HTMLInputElement>) => {
		let newRangeStartValue: number | undefined = parseInt(ev.target.value);
		if(isNaN(newRangeStartValue)) {
			newRangeStartValue = undefined;
		}
		setRangeStart(newRangeStartValue);
		setRangeEndMin(newRangeStartValue);
		const parentOnChange = props.onRangeStartChange;
		if(typeof parentOnChange !== 'undefined') {
			parentOnChange(newRangeStartValue);
		}
	}
	let onRangeEndChange = (ev: ChangeEvent<HTMLInputElement>) => {
		let newRangeEndValue: number | undefined  = parseInt(ev.target.value);
		if(isNaN(newRangeEndValue)) {
			newRangeEndValue = undefined;
		}
		setRangeEnd(newRangeEndValue);
		setRangeStartMax(newRangeEndValue);
		const parentOnChange = props.onRangeEndChange;
		if(typeof parentOnChange !== 'undefined') {
			parentOnChange(newRangeEndValue);
		}
	}
	return (
		<span className='blockRangePicker'>
			<BlockNumberPicker
				description = 'Filter by block start'
				max = {rangeStartMax}
				min = {0}
				value = {rangeStart}
				onChange = {onRangeStartChange}
			/>
			{' - '}
			<BlockNumberPicker
				description = 'Filter by block end' // (blank for latest)'
				min = {typeof rangeEndMin === 'undefined' ? 0 : rangeEndMin}
				value = {rangeEnd}
				onChange = {onRangeEndChange}
			/>
		</span>
	);
};
