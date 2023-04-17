import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import type { RelativeTimeOption } from '../../QueryParser';
import type { SxProps, Theme } from '@mui/material';

export const TimeFilterOption = function(props: {
	pastOrLast: 'past' | 'last' | 'custom';
	timeUnit: 'Hour' | 'Day' | 'Month' | 'Year';
	selectedRelativeTime?: RelativeTimeOption;
	onChange: ((event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void);
	controlLabelSX?: SxProps<Theme>
}) {
	const value = props.pastOrLast + props.timeUnit;
	const title = props.timeUnit + (props.pastOrLast === 'past' ? ' ending at receipt display time' : ' which most recently finished');
	return(<>
		<FormControlLabel
			control = {<Radio
				name = 'timeFilterOption'
				value = {value}
				checked = {props.selectedRelativeTime === value}
				onChange = {props.onChange}
				title = {title}
				inputProps = {{ 'aria-label': title }}
				sx = {{
					color: 'white',
					'&.Mui-checked': {
						color: 'white',
					},
				}}
			/>}
			label = {props.timeUnit.toLowerCase()}
			sx = {props.controlLabelSX}
			componentsProps = {{typography: {sx: {
				fontSize: 'calc(10px + 2vmin)',
			}}}}
		/>
	</>);
}
