import type {
	WrappedTxData
} from './ChainDataFetcher';
import type {
	ReceiptQuery,
	ViewOption
} from '../../QueryParser';
import Progress from '../Progress/Progress';
import type { ProgressProps } from '../Progress/Progress';
import { ActionButtons } from '../ActionButtons/ActionButtons';
import {
	DisplayedDate,
} from '../../Formatters';
import { EtherscanCredit } from '../../Etherscan';
import { TxTable } from './TxTable';
import { ReceiptErrors } from './ReceiptErrors';
import { LogoBlock } from '../Header/LogoBlock';
import { AcctLabelTable } from './AcctLabelTable';
import { ReceiptDescription } from './ReceiptDescription';
export const ReceiptPage = function(props: {
	wrappedTxData: WrappedTxData;
	downloadCSV: () => Promise<boolean>;
	isLocked: boolean;
	setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	canEditScope: boolean;
	progressProps: ProgressProps;
	currentQuery: ReceiptQuery;
	updateTxMemo: ((txID: string, newMemoTrimmed: string) => Promise<void>);
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	screenIsNarrow: boolean;
	preferListView: boolean;
	setPreferredView: React.Dispatch<React.SetStateAction<ViewOption>>;
	showHome: React.MouseEventHandler<HTMLAnchorElement>;
	queriedAddressesLowercase: string[];
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	const useNarrowVersion = props.screenIsNarrow || props.preferListView;
	return (<>
		<LogoBlock
			onClick = {props.showHome}
		/>
		{props.wrappedTxData.txRows.length === 0 ? null :
			<ActionButtons
				wrappedTxData={props.wrappedTxData}
				downloadCSV={props.downloadCSV}
				isLocked={props.isLocked}
				setIsLocked={props.setIsLocked}
				canEditScope={props.canEditScope}
				screenIsNarrow={props.screenIsNarrow}
				preferListView={props.preferListView}
				setPreferredView={props.setPreferredView}
			/>
		}
		<h1 style={{textAlign: 'center' }}>
			Transaction receipt
		</h1>
		<div className='receiptAndExplanationWrapper'>
			<Progress {...props.progressProps} />
			<ReceiptDescription
				receiptQuery = {props.currentQuery}
				wrappedTxData = {props.wrappedTxData}
			/>
			<ReceiptErrors txRows = {props.wrappedTxData.txRows} />
			<TxTable
				txRows = {props.wrappedTxData.txRows}
				isLocked = {props.currentQuery.lock}
				updateTxMemo = {props.updateTxMemo}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {props.setFilterTo}
				useNarrowVersion = {useNarrowVersion}
				queriedAddressesLowercase = {props.queriedAddressesLowercase}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				timeRangeConstraintType = {props.timeRangeConstraintType}
			/>
			<AcctLabelTable
				sortedAcctLabels = {props.wrappedTxData.sortedAcctLabels}
				useNarrowVersion = {useNarrowVersion}
				onChangeToAcctLabel = {props.updateAcctLabel}
				isLocked = {props.currentQuery.lock}
			/>
			<p className='explanation'>
				At the moment, this tool only generates receipts for transactions on the main Ethereum network.
			</p>
			<p className='explanation'>
				On this decentralized network, the "transaction fee" (abbreviated "Tx fee") incentivizes network participants to
				do the work needed to include this transaction in the ledger.
			</p>
			<p className='explanation'>
				The time zone displayed above is based on viewer system settings, and does not necessarily reflect the time zone the
				person who initiated this transaction may have been in.
			</p>
			<p className='explanation'>
				{props.wrappedTxData.accountBasedTransactionsMetaData.source === 'Etherscan' ?
					<EtherscanCredit txRowsFromAccts = {props.wrappedTxData.txRowsFromAccts.length} />
					: null
				}
				Conversion rates are drawn from <a href='https://thegraph.com/' target='_blank' rel='noreferrer'>The Graph's</a> subgraph/index of
				SushiSwap market pricing as of the date of each transaction listed above.
				On-chain address labels interpreted in input and/or shown above come from the Ethereum Name Service (ENS) registry data as of
				approximately when this receipt was generated (<DisplayedDate dateToShow={props.wrappedTxData.generatedAt}/>).
				Fungible/nonfungible token information used to be available through Coinbase Node, which was quietly discontinued in Feb. 2023;
				no substitute has been integrated yet.
			</p>
		</div>
	</>);
}
