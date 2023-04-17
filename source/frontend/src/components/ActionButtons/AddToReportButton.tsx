import { InlineActionButtonWithLeadingSpace } from './InlineActionButtonWithLeadingSpace';
import Icon from '@mui/icons-material/AddCircle';
import type { AsyncBooleanClickHandler } from './ActionButton';
import { URLManipulator } from '../../URLManipulator';
export const AddToReportButton = function(props:{
	addressOrOnChainLabel: string;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	let description = 'Add transactions from this address ';
	if(typeof props.timeRangeConstraintType !== 'undefined') {
		description += 'for the same ' + props.timeRangeConstraintType + ' range ';
	}
	description += 'to this view.';
	const onClick: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler = function() {
		return URLManipulator.addAccountToURLAndGo(props.addressOrOnChainLabel);
	}
	return(
		<InlineActionButtonWithLeadingSpace
			description = {description}
			onClick = {onClick}
		>
			<Icon />
		</InlineActionButtonWithLeadingSpace>
	);
}
