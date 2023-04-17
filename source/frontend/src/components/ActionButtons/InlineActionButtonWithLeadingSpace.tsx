import { ActionButton, } from './ActionButton';
import type { AsyncBooleanClickHandler } from './ActionButton';
export const InlineActionButtonWithLeadingSpace = function(props:React.PropsWithChildren<{
	onClick: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler;
	description: string;
	noLeadingSpace ?: boolean;
	id ?: string;
	buttonClasses ?: string;
	wrapperClasses ?: string;
}>) {
	let classes = 'inlineActionButton'; //TODO: probably don't actually need this
	if(typeof props.buttonClasses !== 'undefined') {
		classes += ' ' + props.buttonClasses;
	}
	let wrapperClasses = 'inlineActionButtonWrapper';
	if(typeof props.wrapperClasses !== 'undefined') {
		wrapperClasses += ' ' + props.wrapperClasses;
	}
	return(
		<span className={wrapperClasses}>{props.noLeadingSpace ? null : ' '}<ActionButton
			description = {props.description}
			onClick = {props.onClick}
			id = {props.id}
			className = {classes}
			size = 'small'
		>{props.children}</ActionButton></span>
	);
}
