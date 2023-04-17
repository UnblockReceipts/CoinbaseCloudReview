import { ActionButton } from './ActionButton';
import { Link } from '@mui/icons-material';

const copyURLToClipboard = async function(clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
	clickEvent.preventDefault();
	//preventDefault above should prevent the click from propagating to the wrapping <a> element,
	//but having that wrapper is useful for hover + e.g. right-click & Copy Link Address that some people might use.
	const fullURL = window.location.toString();
	await navigator.clipboard.writeText(fullURL);
	console.log('Copied URL to clipboard!');
	return true;
}

export const CopyLinkButton = function() {
	return(
		<a href={window.location.toString()}>
			<ActionButton
				description = 'Copy link to clipboard'
				onClick={copyURLToClipboard}
			>
				<Link />
			</ActionButton>
		</a>
	);
}
