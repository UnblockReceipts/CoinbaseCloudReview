import NoteAlt from '@mui/icons-material/NoteAltOutlined'; //NoteAdd could work too: page with plus
import { InlineActionButtonWithLeadingSpace } from '../ActionButtons/InlineActionButtonWithLeadingSpace';
import type { AsyncBooleanClickHandler } from '../ActionButtons/ActionButton';
export const TxIdLink = function(props: {
	txID: string;
	willShowMemo: boolean;
	isLocked: boolean;
	clickAddTxMemo: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler;
}) {
	return (<>
		<a
			className='txID'
			href={'https://etherscan.io/tx/' + props.txID}
			target='_blank'
			rel='noreferrer'
		>{props.txID}</a>
			{ (props.willShowMemo || props.isLocked) ? null :
				<InlineActionButtonWithLeadingSpace
					description = 'Add memo'
					wrapperClasses = 'addMemoButton'
					noLeadingSpace = {true}
					onClick = {props.clickAddTxMemo}
					//onClick will trigger onBlur of the text field
					//(though if there were no changes, it doesn't, hence the handler);
					//this is just a target outside the text field to help users figure out
					//to click outside the text field when finished editing.
				>
					<NoteAlt />
				</InlineActionButtonWithLeadingSpace>
			}
	</>);
}
