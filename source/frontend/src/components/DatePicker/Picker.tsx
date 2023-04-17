import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { TextField, TextFieldProps } from '@mui/material';
import { useState } from 'react';

interface PickerOptions {
	labelText?: string,
	value?: Date,
	maxDateTime?: Date,
	minDateTime?: Date,
	onChange?: (value?: Date) => void,
}
export default function Picker(pickerOptions: PickerOptions) {
	const [value, setValue] = useState<Date | undefined | null>(pickerOptions.value);
	return (
		<LocalizationProvider dateAdapter={AdapterMoment} className = 'dateRangePicker'>
			<DateTimePicker
				renderInput={(props: TextFieldProps) => {
					props.className = 'dateRangePicker';
					return <TextField {...props} />
				}}
				label={pickerOptions.labelText}
				value={value || null}
				onChange={(newValue: any) => {
					setValue(newValue || null);
					const parentOnChange = pickerOptions.onChange;
					if(typeof parentOnChange !== 'undefined') {
						parentOnChange(newValue);
					}
				}}
				className = 'dateRangePicker'
				maxDateTime = {pickerOptions.maxDateTime}
				minDateTime = {pickerOptions.minDateTime}
			/>
		</LocalizationProvider>
	);
}
