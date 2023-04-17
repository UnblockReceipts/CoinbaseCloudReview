import { ActionButton } from './ActionButton';
import { BugReport } from '@mui/icons-material';

export const BugButton = function() {
	const draftEmail = async function() {
		const subject = 'UnblockReceipts Bug/Unexpected Behavior Report';
		const fullURL = window.location.toString();
		const body = 'Dear UnblockReceipts maintainers,\r\n\r\n'+
		'Thank you for your work on this project!\r\n' +
		'For reasons described more below, I think I\'ve found a bug or other unexpected behavior ' +
		'in UnblockReceipts while attempting to view the following URL: ' + fullURL + '\r\n' +
		'Here\'s what I expected: \r\n\r\n\r\n' +
		'Here\'s what it actually did instead: \r\n\r\n\r\n' +
		'I opened my Browser Console (CTRL+SHIFT+J, or CMD+SHIFT+J on a Mac) and found these messages: \r\n\r\n\r\n' +
		'I am using the following operating system (e.g. Windows, Mac, Ubuntu, other Linux, Android, iOS) and version: \r\n\r\n\r\n' +
		'I am using the following browser (e.g. Chrome, Firefox, Edge, Safari, Opera, Brave, Tor) and version: \r\n\r\n\r\n' +
		'Here\'s any additional information that might be useful in replicating or solving the problem: \r\n\r\n\r\n';
		const mailtoLink = document.createElement('a');
		let mailtoURL = 'mailto:Entomologist@unblockreceipts.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
		mailtoLink.setAttribute('href', mailtoURL);
		mailtoLink.click();
		return true;
	}
	return(
		<ActionButton
			description = 'Report a bug/unexpected behavior in UnblockReceipts'
			onClick={draftEmail}
		>
			<BugReport />
		</ActionButton>
	);
}
