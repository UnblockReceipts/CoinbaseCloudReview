import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { TimeFilterOptionSet } from './TimeFilterOptionSet';
import DateRangePicker from '../DatePicker/DateRangePicker';
import BlockRangePicker from '../DatePicker/BlockRangePicker';
import type { ReceiptQuery } from '../../QueryParser';

export default function TimeSelector(props: {
	receiptQuery: ReceiptQuery;
	changeTimeOption: (
		(
			event: React.ChangeEvent<HTMLInputElement>,
			checked: boolean
		) => void
	);
	setBlockRangeStart: (
		(
			newRangeStartValue?: number | undefined
		) => void
	);
	setBlockRangeEnd: (
		(
			newRangeEndValue?: number | undefined
		) => void
	);
	setRangeStart: (
		(
			newRangeStartValue?: Date | undefined
		) => void
	);
	setRangeEnd: (
		(
			newRangeEndValue?: Date | undefined
		) => void
	);

}) {
	return (<>
	<br />
			Recommended: limit account-based search to the
			<br />
			<TimeFilterOptionSet
				pastOrLast = 'past'
				onChange = {props.changeTimeOption}
				selectedRelativeTime = {props.receiptQuery.relativeTime}
			/>
			<TimeFilterOptionSet
				pastOrLast = 'last'
				onChange = {props.changeTimeOption}
				selectedRelativeTime = {props.receiptQuery.relativeTime}
			/>
			<span
				className = 'alignWithRadioLabels'>optionally specified
			</span>
			<FormControlLabel
				control = {<Radio
					name = 'timeFilterOption'
					value = 'specifiedTimes'
					checked = {props.receiptQuery.relativeTime === 'specifiedTimes' || typeof props.receiptQuery.relativeTime === 'undefined'}
					onChange = {props.changeTimeOption}
					title = 'Specify start and/or end of range by date & time'
					inputProps = {{ 'aria-label': 'Specify start and/or end of range by date & time' }}
					sx = {{
						color: 'white',
						'&.Mui-checked': {
							color: 'white',
						},
					}}
				/>}
				label = 'time'
				componentsProps = {{typography: {sx: {
					fontSize: 'calc(10px + 2vmin)',
				}}}}
			/>
			<FormControlLabel
				control = {<Radio
					name = 'timeFilterOption'
					value = 'specifiedBlocks'
					checked = {props.receiptQuery.relativeTime === 'specifiedBlocks'}
					onChange = {props.changeTimeOption}
					title = 'Specify start and/or end of range by block numbers'
					inputProps = {{ 'aria-label': 'Specify start and/or end of range by block numbers' }}
					sx = {{
						color: 'white',
						'&.Mui-checked': {
							color: 'white',
						},
					}}
				/>}
				label = 'block number'
				sx = {{marginRight: '0'}}
				componentsProps = {{typography: {sx: {
					fontSize: 'calc(10px + 2vmin)',
				}}}}
			/><span className = 'alignWithRadioLabels'>
				range:
			</span>
			{props.receiptQuery.relativeTime === 'specifiedBlocks' ?
				<BlockRangePicker
					rangeStart={typeof props.receiptQuery.blockStart === 'undefined' ? undefined : props.receiptQuery.blockStart}
					rangeEnd={typeof props.receiptQuery.blockEnd === 'undefined' ? undefined : props.receiptQuery.blockEnd}
					onRangeStartChange={props.setBlockRangeStart}
					onRangeEndChange={props.setBlockRangeEnd}
				/>
			:
				<DateRangePicker
					rangeStart={props.receiptQuery.msStart}
					rangeEnd={props.receiptQuery.msEnd}
					onRangeStartChange={props.setRangeStart}
					onRangeEndChange={props.setRangeEnd}
				/>
			}
	</>);
}
