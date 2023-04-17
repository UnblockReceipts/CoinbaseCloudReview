import type { DisplayRow } from './ExpandingLabeledInputSet';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/AddCircle';
import { ControlledTextBox } from "./ControlledTextBox";
import { InlineActionButtonWithLeadingSpace } from '../ActionButtons/InlineActionButtonWithLeadingSpace';

export const LabeledInputRow = function(props: React.PropsWithChildren<{
	index: number;
	inputPlaceholder: string;
	labelPlaceholder?: string; //undefined to not show label column; empty string for blank
	displayRow: DisplayRow;
	removeRow: ((index: number) => Promise<boolean | undefined>);
	addEmptyRowAfter: ((index: number) => Promise<boolean | undefined>);
	handleUpdateInField: ((
		index: number,
		fieldUpdated: Exclude<keyof DisplayRow, 'key'>,
		newValueTrimmed: string,
	) => void);
	handleMultiLinePaste:((
		fieldUpdated: Exclude<keyof DisplayRow, 'key'>,
		newValuesTrimmed: string[][]
	) => void);
	rowDescriptor: string;
	className?: string;
}>) {
	return (<>
		<ControlledTextBox
			className = {props.className}
			inputPlaceholder = {props.inputPlaceholder}
			value = {props.displayRow.content || ''}
			onBlur = {function(newValueTrimmed: string) {props.handleUpdateInField(props.index, 'content', newValueTrimmed)}}
			onMultiLinePaste = {(
				newValuesTrimmed: string[][]
			) => {
				return props.handleMultiLinePaste('content', newValuesTrimmed)
			}}
		/>{typeof props.labelPlaceholder !== 'undefined' ? <>{' '}<ControlledTextBox
			className = {props.className}
			inputPlaceholder = {props.labelPlaceholder}
			value = {props.displayRow.label || ''}
			onBlur = {function(newValueTrimmed: string) {props.handleUpdateInField(props.index, 'label', newValueTrimmed)}}
		/></>: null}<InlineActionButtonWithLeadingSpace
			onClick = {function(clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
				return props.removeRow(props.index);
			}}
			description = {'Remove this ' + props.rowDescriptor}
		>
		<DeleteIcon />
		</InlineActionButtonWithLeadingSpace><InlineActionButtonWithLeadingSpace
				onClick = {(clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => (props.addEmptyRowAfter(props.index))}
				description = {'Add another ' + props.rowDescriptor}
			>
			<AddIcon />
			</InlineActionButtonWithLeadingSpace>
		<br />
	</>);
}
