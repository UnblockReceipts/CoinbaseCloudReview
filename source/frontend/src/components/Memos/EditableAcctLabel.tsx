import { AddressTranslatorClass } from '../../AddressTranslator';
import { EditableText, WidthValue } from './EditableText';

export const EditableAcctLabel = function(props: {
	addressOrOnChainLabel : string;
	specifiedLabel ?: string; //default ''
	editMode : boolean;
	updateIsEditing : (newIsEditing: boolean) => void;
	onBlur : ((newText: string) => Promise<void>);
	isLocked : boolean;
	width ?: WidthValue;
}) {
	const displayModeFallback = {
		shouldDisplay: AddressTranslatorClass.isEmptyLabel,
		value: props.addressOrOnChainLabel,
	}
	return(
		<span className='editableAcctLabel'>
			{
				<EditableText
					placeholder = {'Label ' + props.addressOrOnChainLabel + '…'}
					text = {props.specifiedLabel}
					editMode = {props.editMode}
					updateIsEditing = {props.updateIsEditing}
					isLocked = {props.isLocked}
					onBlur = {props.onBlur}
					width = {props.width}
					displayModeFallback = {displayModeFallback}
				/>
			}
		</span>
	);
}
