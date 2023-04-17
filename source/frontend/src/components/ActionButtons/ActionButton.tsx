import IconButton from '@mui/material/IconButton';
import type { IconButtonTypeMap } from '@mui/material/IconButton';
import React, { useState } from 'react';
import { CheckOrX } from './CheckOrX';

export type AsyncBooleanClickHandler = ((arg0: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<boolean | undefined>);
interface ActionButtonProps {
	description: string;
	onClick: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler;
	id ?: string;
	className ?: string;
	size ?: 'small' | 'medium' | 'large';
}
export const ActionButton = function(props: React.PropsWithChildren<ActionButtonProps>) {
	const [recentAttemptSucceeded, setRecentAttemptSucceeded] = useState<boolean | undefined>();
	const showRecentAttemptOutcome = function(outcome: boolean | undefined) {
		//Pass a boolean true/false in here to change the button to a check/x momentarily;
		//pass undefined to have no visible effect.
		setRecentAttemptSucceeded(outcome);
		//TODO: show button in green/red
		if(typeof outcome !== 'undefined') {
			setTimeout(() => {
				setRecentAttemptSucceeded(undefined);
			}, 2000);
		}
	}
	const takeAction = async function(clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		try {
			let propsClickHandler = props.onClick as AsyncBooleanClickHandler;
			let outcome = (await propsClickHandler(clickEvent));
			showRecentAttemptOutcome(outcome);
		} catch(err) {
			console.error('Error when attempting to ' + props.description.charAt(0).toLocaleLowerCase() + props.description.substring(1) + ': ',err);
			showRecentAttemptOutcome(false);
		}
	}
	let classes = 'actionButton';
	if(typeof props.className !== 'undefined') {
		classes += ' ' + props.className;
	}
	let color : IconButtonTypeMap['props']['color'] = undefined;
	if(typeof recentAttemptSucceeded !== 'undefined') {
		classes += ' ' + ((recentAttemptSucceeded) ? 'actionButtonSuccess' : 'actionButtonFailure');
		color = ((recentAttemptSucceeded) ? 'success' : 'error');
	}
	//Using Button <variant='contained'...> is more emphasis (incl. elevation/shadow) than needed.
	//The disableElevation property can get rid of that aspect, but the styling also makes buttons
	//short and wide, not readily circularized even with styled().
	return(
		<IconButton
			className = {classes}
			aria-label = {props.description}
			title = {props.description}
			onClick = {takeAction}
			color = {color}
			id = {props.id}
			size = {props.size}
		>
			{typeof recentAttemptSucceeded === 'undefined' ?
				props.children :
				<CheckOrX boolToShow = { recentAttemptSucceeded } />
			}
		</IconButton>
	);
}
