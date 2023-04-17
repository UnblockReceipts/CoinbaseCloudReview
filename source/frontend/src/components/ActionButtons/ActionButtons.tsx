import { BugButton } from './BugButton';
import { CopyLinkButton } from './CopyLinkButton';
import { DownloadButton } from './DownloadButton';
import { EmailButton } from './EmailButton';
import { GalleryButton } from './GalleryButton';
import { PrintButton } from './PrintButton';
import { LockButton } from './LockButton';
import { PreferredViewButton } from './PreferredViewButton';
import type { WrappedTxData } from '../Receipt/ChainDataFetcher';
import type { ViewOption } from '../../QueryParser';

export const ActionButtons = function(props: {
	wrappedTxData: WrappedTxData;
	isLocked: boolean;
	setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	canEditScope: boolean;
	downloadCSV: () => Promise<boolean>;
	screenIsNarrow: boolean;
	preferListView: boolean;
	setPreferredView: React.Dispatch<React.SetStateAction<ViewOption>>;
}) {
	return(
		<div className='actionButtons notForPrinting'>
			<LockButton
				isLocked={props.isLocked}
				setIsLocked={props.setIsLocked}
				canEditScope={props.canEditScope}
			/>
			<PreferredViewButton
				screenIsNarrow={props.screenIsNarrow}
				preferListView={props.preferListView}
				setPreferredView={props.setPreferredView}
			/>
			<PrintButton />
			<EmailButton pluralRecords={props.wrappedTxData.txRows.length !== 1} />
			<CopyLinkButton />
			<DownloadButton
				downloadCSV={props.downloadCSV}
			/>
			<GalleryButton />
			<BugButton />
		</div>
	);
}
