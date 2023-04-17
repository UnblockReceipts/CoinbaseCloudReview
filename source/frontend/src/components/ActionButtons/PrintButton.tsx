import { ActionButton } from './ActionButton';
import PrintIcon from '@mui/icons-material/Print';

const printPage = function() {
	window.print();
	//resolving to undefined to not show green check after success
	return Promise.resolve(undefined);
}

export const PrintButton = function() {
	return(
		<ActionButton
			description = 'Print to paper or PDF'
			onClick={printPage}
		>
			<PrintIcon />
		</ActionButton>
	);
}
