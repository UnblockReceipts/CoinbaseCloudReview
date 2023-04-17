import { ActionButton } from './ActionButton';
import { PhotoLibrary } from '@mui/icons-material';

export const GalleryButton = function() {
	const draftEmail = async function() {
		const subject = 'Submission for the UnblockReceipts demonstration gallery';
		const fullURL = window.location.toString();
		const body = 'Dear Curator,\r\n\r\n'+
		'For reasons described more below, you may want to include the following link in the UnblockReceipts demonstration gallery: ' + fullURL + '\r\n' +
		'Here\'s why I found it interesting or useful for sharing publicly: ';
		const mailtoLink = document.createElement('a');
		let mailtoURL = 'mailto:gallery@unblockreceipts.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
		mailtoLink.setAttribute('href', mailtoURL);
		mailtoLink.click();
		return true;
	}
	return(
		<ActionButton
			description = 'Submit to the UnblockReceipts Demonstration Gallery'
			onClick={draftEmail}
		>
			<PhotoLibrary />
		</ActionButton>
	);
}
