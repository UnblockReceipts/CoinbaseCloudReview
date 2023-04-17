import { ChainDataFetcherClass } from "./ChainDataFetcher";
import type { TxRowData } from "./ChainDataFetcher";

export const ReceiptErrors = function(props: {
	txRows: TxRowData[];
}) {
	let anyErrors = false;
	let chainDBUnavailable = 0;
	let chainDBMiscErrors  = 0;
	for(let row of props.txRows) {
		for(let error of row.errors) {
			anyErrors = true;
			if(error.message === ChainDataFetcherClass.GRAPH_DB_UNAVAILABLE) {
				chainDBUnavailable++;
			}
			if(error.message === ChainDataFetcherClass.GRAPH_DB_MISC_ERROR) {
				chainDBMiscErrors++;
			}
		}
	}
	if(!anyErrors) {
		return null;
	} else {
		return (
			<p className='errors'>
				Error: {chainDBUnavailable === 0 ? null : <>
					The Graph's database is currently unavailable for fetching price data.
					<br />
					Price equivalencies will NOT be shown for {chainDBUnavailable} transactions below. Please try again later.
				</>}
				{chainDBMiscErrors === 0 ? null : <>
					Miscellaneous errors were encountered when trying to fetch price data from The Graph.
					The browser console (CTRL or CMD + SHIFT + J) might have more information.
					<br />
					Price equivalencies will NOT be shown for {chainDBMiscErrors} transactions below. Please try again later.
				</>}
			</p>
		);
	}
}
