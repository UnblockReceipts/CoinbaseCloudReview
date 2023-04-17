import { ActionButton } from './ActionButton';
import { FileDownload } from '@mui/icons-material';

export const DownloadButton = function(props: {
	downloadCSV: () => Promise<boolean>;
}) {
	return(
		<ActionButton
			description = 'Download as CSV / spreadsheet'
			id='downloadButton'
			onClick={props.downloadCSV}
		>
			<FileDownload />
		</ActionButton>
	);
}
