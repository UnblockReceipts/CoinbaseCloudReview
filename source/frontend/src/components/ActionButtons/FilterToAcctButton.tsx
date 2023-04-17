import { InlineActionButtonWithLeadingSpace } from './InlineActionButtonWithLeadingSpace';
import Icon from '@mui/icons-material/FilterAlt';
import type { AsyncBooleanClickHandler } from './ActionButton';
export const FilterToAcctButton = function(props:{
	addressOrOnChainLabel: string;
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
}) {
	if(typeof props.setFilterTo === 'undefined') {
		return null;
	}
	const heldSetFilterTo = props.setFilterTo;
	const onClick: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler = async function() {
		const newFilterTo = await heldSetFilterTo(props.addressOrOnChainLabel);
		return Promise.resolve(
			newFilterTo.length === 1 &&
			newFilterTo[0].toLowerCase === props.addressOrOnChainLabel.toLowerCase
		);
	}
	return(
		<InlineActionButtonWithLeadingSpace
			description = {'Filter to show ONLY transactions TO this address.'}
			onClick = {onClick}
		>
			<Icon />
		</InlineActionButtonWithLeadingSpace>
	);
}
