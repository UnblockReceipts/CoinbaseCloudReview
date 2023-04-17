import TextField from '@mui/material/TextField';
export const BlockNumberPicker = function(props: {
	description: string;
	min?: number;
	max?: number;
	value?: number;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
	return (
		<TextField
			placeholder = {props.description}
			title = {props.description}
			inputProps = {{
				type: 'number',
				max: props.max,
				min: props.min,
				step: 1,
			}}
			onChange = {props.onChange}
			value = {typeof props.value === 'undefined' ? '' : props.value}
			sx = {{
				backgroundColor: 'white',
			}}
		/>
	);
}
