import type { WrappedTxData } from "./ChainDataFetcher";
import type { ReceiptQuery } from "../../QueryParser";

export const ReceiptDescription = function(props:{
	receiptQuery: ReceiptQuery,
	wrappedTxData: WrappedTxData,
}) {
	let result = '';
	let citesAccounts = false;
	if(props.wrappedTxData.txRowsFromAccts.length > 0) {
		citesAccounts = true;
		const outgoingOnlyFragment = ' history ' + (props.receiptQuery.includeIncoming ? '' : 'of outgoing transactions ');
		const ofOrFrom = ' ' + (props.receiptQuery.includeIncoming ? 'of' : 'from');
		//Used to use nested ternary statement to avoid computational & memory cost of computing all these when they aren't all needed,
		//but got too many linter complaints about how that raised the computational complexity too high.
		const noTimeRangeSpecified = ' the entire' + outgoingOnlyFragment;
		const onlyStartSpecified = ' the' + outgoingOnlyFragment + 'starting from ' + props.wrappedTxData.startBlockTimestamp;
		const onlyEndSpecified = ' the entire' + outgoingOnlyFragment + 'until ' + props.wrappedTxData.endBlockTimestamp;
		const startAndEndSpecified = ' the' + outgoingOnlyFragment + 'from ' + props.wrappedTxData.startBlockTimestamp + ' through ' + props.wrappedTxData.endBlockTimestamp;
		const timeRangeWithoutStartSpecified = typeof props.wrappedTxData.endBlockTimestamp === 'undefined' ? (noTimeRangeSpecified) : (onlyEndSpecified);
		const timeRangeWithStartSpecified = typeof props.wrappedTxData.endBlockTimestamp === 'undefined' ? (onlyStartSpecified) : (startAndEndSpecified);
		const timeRange = typeof props.wrappedTxData.startBlockTimestamp === 'undefined' ? (timeRangeWithoutStartSpecified) : (timeRangeWithStartSpecified);
		result += (
			(timeRange) +
			ofOrFrom + (props.receiptQuery.addresses.length === 1 ? ' a specified account' : ' specified accounts')
		)
	}
	if(props.wrappedTxData.txRowsFromHashes.length > 0) {
		if(citesAccounts) {
			result += ' and ' + (props.wrappedTxData.txRowsFromHashes.length === 1 ? ' a specified additional transaction' : ' specified additional transactions');
		} else {
			result += (props.wrappedTxData.txRowsFromHashes.length === 1 ? ' a specified transaction' : ' specified transactions');
		}
	} else if(!citesAccounts) {
		return null;
	}
	if(props.receiptQuery.filterTo.length > 0) {
		result += ', filtered to show only transactions to ' + (props.receiptQuery.filterTo.length === 1 ? ' a specified address' : ' specified addresses');
	}
	return (<p className='receiptDescription'>
		This is a receipt for {result}.
		{props.wrappedTxData.txRows.length > 1 ?
			<>
				<br />
				Transactions are displayed in the order they were secured on the blockchain.
			</>
			: ''
		}
	</p>);
}
