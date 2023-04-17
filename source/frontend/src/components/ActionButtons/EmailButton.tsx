import { ActionButton } from './ActionButton';
//Mail (closed envelope) or Send (overly stylized paper airplane)
//could also be used instead of Drafts (open envelope).
import { Drafts } from '@mui/icons-material';

export const EmailButton = function(props: {
	pluralRecords: boolean;
}) {
	const draftEmail = async function() {
		const optionallyPluralTx = 'blockchain transaction' + (props.pluralRecords ? 's' : '');
		const subject = 'Receipt for ' + optionallyPluralTx;
		const fullURL = window.location.toString();
		const body = '\r\nHere is a link to a receipt for my recent ' + optionallyPluralTx + ': ' + fullURL;
		const mailtoLink = document.createElement('a');
		let mailtoURL = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
		mailtoLink.setAttribute('href', mailtoURL);
		mailtoLink.click();
		return true;
	}
	return(
		<ActionButton
			description = 'E-mail a link to this receipt'
			onClick={draftEmail}
		>
			<Drafts />
		</ActionButton>
	);
}
