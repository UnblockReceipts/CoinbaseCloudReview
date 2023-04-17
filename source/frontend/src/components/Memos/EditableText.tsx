import Edit from '@mui/icons-material/Edit';
import Check from '@mui/icons-material/Check';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import { Property } from 'csstype';
import { SpanWrapperWithHexAddressClassIfNecessary } from '../Receipt/SpanWrapperWithHexAddressClassIfNecessary';
import { InlineActionButtonWithLeadingSpace } from '../ActionButtons/InlineActionButtonWithLeadingSpace';

type TLength = (string & {}) | 0;
export type WidthValue = Property.Width<TLength> | undefined;

interface Fallback {
	shouldDisplay: (currentText: string) => boolean;
	value: string;
}

export const EditableText = function(props: {
	text ?: string; //default ''
	editMode : boolean; //default false
	updateIsEditing : (newIsEditing: boolean) => void;
	onBlur : ((newText: string) => Promise<void>);
	isLocked : boolean;
	placeholder ?: string;
	displayModeFallback ?: Fallback;
	width ?: WidthValue; //TODO: Figure out how to use this so that
	//esp. in the narrow-view acct labels the text boxes are wide enough and don't extend beyond full width in narrow screens.
}) {
	const [localValue, setLocalValue] = useState<string>(typeof props.text === 'undefined' ? '' : props.text.trim());
	useEffect(() => {
		setLocalValue(typeof props.text === 'undefined' ? '' : props.text.trim());
	}, [props.text]);
	const updateEditMode = function(shouldBeEditing: boolean) {
		if(typeof props.updateIsEditing !== 'undefined') {
			props.updateIsEditing(shouldBeEditing);
		}
	}
	const clickedEdit = function(clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		updateEditMode(true);
		return Promise.resolve(undefined); //no need to show success/failure here
	}
	const onBlur = function() {
		setLocalValue(function(localValue) { return localValue.trim() });
		updateEditMode(false);
		if(typeof props.onBlur !== 'undefined') {
			props.onBlur(localValue);
		}
	}
	const onChange = function(event: React.ChangeEvent<HTMLInputElement>) {
		setLocalValue(event.target.value);
	}
	const onKeyDown = function(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			//Using currentTarget instead of target because the HTMLInputElement type
			//does not flow through to target (only to currentTarget) due to
			//https://github.com/DefinitelyTyped/DefinitelyTyped/issues/11508#issuecomment-256045682
			const inputs = event.currentTarget.getElementsByTagName('input');
			if(inputs.length > 1) {
				console.warn('Found multiple inputs in Enter press in EditableText, unexpectedly. Blurring all of them.');
			}
			for(let input of inputs) {
				input.blur();
			}
		}
	}
	const isEditing = (props.editMode && !props.isLocked);
	return(
		isEditing ?
		<span className='editableTextInEditMode'>
			<span className='inputWrapper'>
				<TextField
					variant = 'outlined'
					placeholder = {props.placeholder}
					data-value = {localValue}
					value = {localValue}
					onChange = {onChange}
					onBlur = {onBlur}
					onKeyDown = {onKeyDown}
					size = 'small'
					fullWidth
					//fullWidth is really 100%, not allowing for leading 'memo' or trailing checkmark.
					sx = {{
						verticalAlign: 'middle',
						width: props.width
					}}
				/>
			</span>
			<span className='breakableUndisplayedSpace'> </span>
			<IconButton
				className = 'inlineActionButton'
				aria-label = 'Done'
				title = 'Done'
				size = 'small'
				onClick = {onBlur}
				//onClick will trigger onBlur of the text field
				//(though if there were no changes, it doesn't, hence the handler);
				//this is just a target outside the text field to help users figure out
				//to click outside the text field when finished editing.
			>
				<Check />
			</IconButton>
		</span>
		:
		<>
			<SpanWrapperWithHexAddressClassIfNecessary
				stringContent = {
					typeof props.displayModeFallback === 'undefined' ?
					localValue
					: (
						props.displayModeFallback.shouldDisplay(localValue) ?
						props.displayModeFallback.value : localValue
					)
				}/>{props.isLocked ? null : <InlineActionButtonWithLeadingSpace
					description = 'Edit'
					onClick = {clickedEdit}
					buttonClasses = 'editMemoButton'
				>
				<Edit />
			</InlineActionButtonWithLeadingSpace>}
		</>
	);
}
