import type { RelativeTimeOption } from '../../QueryParser';
import { TimeFilterOption } from './TimeFilterOption';
export const TimeFilterOptionSet = function(props: {
	pastOrLast: 'past' | 'last' | 'custom';
	selectedRelativeTime?: RelativeTimeOption;
	onChange: ((event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void);
}) {
	return(<>
		<TimeFilterOption
			pastOrLast = {props.pastOrLast}
			timeUnit = 'Hour'
			onChange = {props.onChange}
			selectedRelativeTime = {props.selectedRelativeTime}
		/>
		<TimeFilterOption
			pastOrLast = {props.pastOrLast}
			timeUnit = 'Day'
			onChange = {props.onChange}
			selectedRelativeTime = {props.selectedRelativeTime}
		/>
		<TimeFilterOption
			pastOrLast = {props.pastOrLast}
			timeUnit = 'Month'
			onChange = {props.onChange}
			selectedRelativeTime = {props.selectedRelativeTime}
		/>
		<TimeFilterOption
			pastOrLast = {props.pastOrLast}
			timeUnit = 'Year'
			onChange = {props.onChange}
			selectedRelativeTime = {props.selectedRelativeTime}
			controlLabelSX = {{marginRight: '0'}}
		/>
		<span
			className = 'alignWithRadioLabels'
		>
			{props.pastOrLast === 'past' ? 'ending at receipt display time' : 'which most recently finished'}
		</span>
		<br />
	</>);
}
