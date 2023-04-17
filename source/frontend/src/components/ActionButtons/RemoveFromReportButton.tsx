import { InlineActionButtonWithLeadingSpace } from './InlineActionButtonWithLeadingSpace';
import Icon from '@mui/icons-material/RemoveCircle';
import type { AsyncBooleanClickHandler } from './ActionButton';
import { URLManipulator } from '../../URLManipulator';
export const RemoveFromReportButton = function(props:{
	addressOrOnChainLabel: string;
	anySpecifiedTxes: boolean;
}) {
	let description = 'Remove ' + (props.anySpecifiedTxes ? 'non-specified ' : '') + 'transactions from this address from this view.';
	const onClick: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler = function() {
		return URLManipulator.removeAccountFromURLAndGo(props.addressOrOnChainLabel);
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
