import { EditableText } from './EditableText';

export const EditableMemo = function(props: {
	text ?: string; //default ''
	editMode : boolean; //default false
	updateIsEditing : (newIsEditing: boolean) => void;
	isLocked: boolean;
	onBlur : ((newText: string) => Promise<void>);
}) {
	return(
		<span className='memoInsideTD'>
			Memo:&nbsp;<EditableText
					{...props}
					placeholder = 'Add notes about this transaction...'
					editMode={props.editMode}
					updateIsEditing={props.updateIsEditing}
				/>
		</span>
	);
}
