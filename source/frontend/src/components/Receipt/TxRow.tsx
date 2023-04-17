import { ethers } from 'ethers';
import { EditableMemo } from '../Memos/EditableMemo';
import type {
	TxRowData
} from './ChainDataFetcher';
import {
	DisplayedDate,
	Formatters
} from '../../Formatters';
import { TxIdLink } from './TxIdLink';
import { TableDisplayAddress } from './TableDisplayAddress';
import { AddressTranslatorClass } from '../../AddressTranslator';
import type { AsyncBooleanClickHandler } from '../ActionButtons/ActionButton';

export const TxRow = function(props: {
	rowData: TxRowData;
	isLocked: boolean;
	editingTxMemo: boolean;
	editingTxFrom: boolean;
	editingTxTo: boolean;
	setEditingTxMemo : (newIsEditing: boolean) => void;
	setEditingTxFrom : (newIsEditing: boolean) => void;
	setEditingTxTo : (newIsEditing: boolean) => void;
	onMemoChange: ((newMemoTrimmed: string) => Promise<void>);
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	useNarrowVersion?: boolean;
	queriedAddressesLowercase: string[];
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	const rowData = props.rowData;
	const clickAddTxMemo = function() {
		props.setEditingTxMemo(true);
		return Promise.resolve(undefined);
	}
	const onTxMemoChange = function(newMemoTrimmed: string) {
		props.setEditingTxMemo(false);
		if(typeof props.onMemoChange !== 'undefined') {
			return props.onMemoChange(newMemoTrimmed);
		} else {
			return Promise.resolve();
		}
	}
	const willShowMemo = ((typeof rowData.memo !== 'undefined' && rowData.memo.length > 0) || props.editingTxMemo);
	const fromAddressOrOnChainLabel = AddressTranslatorClass.getAddressOrOnChainLabelFromSet(rowData.from);
	const toAddressOrOnChainLabel = AddressTranslatorClass.getAddressOrOnChainLabelFromSet(rowData.to);
	const queryIncludesLimitedAccounts = AddressTranslatorClass.computeQueryIncludesLimitedAccounts(
		props.queriedAddressesLowercase.length,
		props.timeRangeConstraintType
	);
	// In practice, showAddOrRemoveFromAddressToReport will only be true when includeIncoming is also true,
	// but the check here (necessary anyway) covers that without requiring a new prop.
	// Adding the prop could help short-circuit the evaluation a bit assuming includeIncoming is rare.
	const showAddOrRemoveFromAddressToReport = AddressTranslatorClass.showAddOrRemoveAddressOnReport(
		queryIncludesLimitedAccounts,
		props.queriedAddressesLowercase,
		fromAddressOrOnChainLabel,
		props.anySpecifiedTxes
	);
	const showAddOrRemoveToAddressToReport = AddressTranslatorClass.showAddOrRemoveAddressOnReport(
		queryIncludesLimitedAccounts,
		props.queriedAddressesLowercase,
		toAddressOrOnChainLabel,
		props.anySpecifiedTxes
	);
	if(props.useNarrowVersion === true) {
		return (
			<TxRowNarrow
				rowData = {props.rowData}
				willShowMemo = {willShowMemo}
				isLocked = {props.isLocked}
				clickAddTxMemo = {clickAddTxMemo}
				onTxMemoChange = {onTxMemoChange}
				editingTxMemo = {props.editingTxMemo}
				editingTxFrom = {props.editingTxFrom}
				editingTxTo = {props.editingTxTo}
				setEditingTxMemo = {props.setEditingTxMemo}
				setEditingTxFrom = {props.setEditingTxFrom}
				setEditingTxTo = {props.setEditingTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {props.setFilterTo}
				showAddOrRemoveFromAddressToReport = {showAddOrRemoveFromAddressToReport}
				showAddOrRemoveToAddressToReport = {showAddOrRemoveToAddressToReport}
				fromAddressOrOnChainLabel = {fromAddressOrOnChainLabel}
				toAddressOrOnChainLabel = {toAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
			/>
		);
	} else {
		return (
			<TxRowWide
				rowData = {props.rowData}
				willShowMemo = {willShowMemo}
				isLocked = {props.isLocked}
				clickAddTxMemo = {clickAddTxMemo}
				onTxMemoChange = {onTxMemoChange}
				editingTxMemo = {props.editingTxMemo}
				editingTxFrom = {props.editingTxFrom}
				editingTxTo = {props.editingTxTo}
				setEditingTxMemo = {props.setEditingTxMemo}
				setEditingTxFrom = {props.setEditingTxFrom}
				setEditingTxTo = {props.setEditingTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {props.setFilterTo}
				showAddOrRemoveFromAddressToReport = {showAddOrRemoveFromAddressToReport}
				showAddOrRemoveToAddressToReport = {showAddOrRemoveToAddressToReport}
				fromAddressOrOnChainLabel = {fromAddressOrOnChainLabel}
				toAddressOrOnChainLabel = {toAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
			/>
		);
	}
}

const TxRowWide = function(props: {
	rowData: TxRowData;
	willShowMemo: boolean;
	isLocked: boolean;
	clickAddTxMemo: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler;
	onTxMemoChange: ((newMemoTrimmed: string) => Promise<void>);
	editingTxMemo: boolean;
	editingTxFrom: boolean;
	editingTxTo: boolean;
	setEditingTxMemo : (newIsEditing: boolean) => void;
	setEditingTxFrom : (newIsEditing: boolean) => void;
	setEditingTxTo : (newIsEditing: boolean) => void;
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	showAddOrRemoveFromAddressToReport?: boolean;
	showAddOrRemoveToAddressToReport?: boolean;
	fromAddressOrOnChainLabel: string;
	toAddressOrOnChainLabel: string;
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	const rowData = props.rowData;
	return (<>
		<tr className='singleTxReceipt' key={rowData.txID}>
			<td style={{maxWidth: '10em'}}><TxIdLink
				txID={rowData.txID}
				willShowMemo={props.willShowMemo}
				clickAddTxMemo={props.clickAddTxMemo}
				isLocked = {props.isLocked}
			/></td>
			<td style={{maxWidth: '10em'}}><TableDisplayAddress
				labelSet = {rowData.from}
				isLocked = {props.isLocked}
				isEditing = {props.editingTxFrom}
				setIsEditing = {props.setEditingTxFrom}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {undefined}
				addressOrOnChainLabel = {props.fromAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				showAddOrRemoveAddressToReport = {props.showAddOrRemoveFromAddressToReport}
			/></td>
			<td style={{maxWidth: '10em'}}><TableDisplayAddress
				labelSet = {rowData.to}
				isLocked = {props.isLocked}
				isEditing = {props.editingTxTo}
				setIsEditing = {props.setEditingTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {props.setFilterTo}
				addressOrOnChainLabel = {props.toAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				showAddOrRemoveAddressToReport = {props.showAddOrRemoveToAddressToReport}
			/></td>
			<td style={{maxWidth: '10em'}}><DisplayedDate dateToShow={rowData.timestamp}/></td>
			<td>{ethers.formatUnits(rowData.value, 'ether')}</td>
			<td>{ethers.formatUnits(rowData.gasFeeETHwei, 'ether')}</td>
			<td>${Formatters.getFormattedDollarDigits(rowData.valueUSD)}</td>
			<td>${Formatters.getFormattedDollarDigits(rowData.gasFeeUSD)}</td>
		</tr>
		{(typeof props.rowData.functionName === 'undefined' || props.rowData.functionName.length === 0) ? null :
			<tr className='memo' key={rowData.txID + 'FnName'}>
				<td colSpan={8}>
					Function called: {props.rowData.functionName}
				</td>
			</tr>
		}
		{ props.willShowMemo ?
			<tr className='memo' key={rowData.txID + 'Memo'}>
				<td colSpan={8}>
					<EditableMemo
						text = {rowData.memo} // will be defined due to willShowMemo guard
						onBlur = {props.onTxMemoChange}
						editMode = {props.editingTxMemo}
						updateIsEditing = {props.setEditingTxMemo}
						isLocked = {props.isLocked}
					/>
				</td>
			</tr>
		: null }
	</>);
}

const TxRowNarrow = function(props: {
	rowData: TxRowData;
	willShowMemo: boolean;
	isLocked: boolean;
	clickAddTxMemo: React.MouseEventHandler<HTMLButtonElement> & AsyncBooleanClickHandler;
	onTxMemoChange: ((newMemoTrimmed: string) => Promise<void>);
	editingTxMemo: boolean;
	editingTxFrom: boolean;
	editingTxTo: boolean;
	setEditingTxMemo : (newIsEditing: boolean) => void;
	setEditingTxFrom : (newIsEditing: boolean) => void;
	setEditingTxTo : (newIsEditing: boolean) => void;
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	showAddOrRemoveFromAddressToReport?: boolean;
	showAddOrRemoveToAddressToReport?: boolean;
	fromAddressOrOnChainLabel: string;
	toAddressOrOnChainLabel: string;
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	const rowData = props.rowData;
	return (
		<li className='singleTxReceipt' key={rowData.txID}>
			Transaction ID: <TxIdLink
				txID={rowData.txID}
				willShowMemo={props.willShowMemo}
				clickAddTxMemo={props.clickAddTxMemo}
				isLocked = {props.isLocked}
			/>
			<br />
			{ props.willShowMemo ?
				<EditableMemo
					text = {rowData.memo} // will be defined due to willShowMemo guard
					onBlur = {props.onTxMemoChange}
					editMode = {props.editingTxMemo}
					updateIsEditing = {props.setEditingTxMemo}
					isLocked = {props.isLocked}
				/>
			: null }
			From: <TableDisplayAddress
				labelSet = {rowData.from}
				isLocked = {props.isLocked}
				isEditing = {props.editingTxFrom}
				setIsEditing = {props.setEditingTxFrom}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {undefined}
				addressOrOnChainLabel = {props.fromAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				showAddOrRemoveAddressToReport = {props.showAddOrRemoveFromAddressToReport}
			/><br />
			To: <TableDisplayAddress
				labelSet = {rowData.to}
				isLocked = {props.isLocked}
				isEditing = {props.editingTxTo}
				setIsEditing = {props.setEditingTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				setFilterTo = {props.setFilterTo}
				addressOrOnChainLabel = {props.toAddressOrOnChainLabel}
				timeRangeConstraintType = {props.timeRangeConstraintType}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				showAddOrRemoveAddressToReport = {props.showAddOrRemoveToAddressToReport}
			/><br />
			{(typeof props.rowData.functionName === 'undefined' || props.rowData.functionName.length === 0) ? null : <>
				<span className='memo' key={rowData.txID + 'FnName'}>
					Function called: {props.rowData.functionName}
				</span><br />
				</>
			}
			<span title='This transaction took place on'>Date/Time: <DisplayedDate dateToShow={rowData.timestamp}/></span><br />
			ETH sent (ETH): {ethers.formatUnits(rowData.value, 'ether')}<br />
			Tx fee (ETH): {ethers.formatUnits(rowData.gasFeeETHwei, 'ether')}<br />
			<span title='Transaction-time USD value of native ETH sent, rounded to the penny.'>ETH sent (USD): ${Formatters.getFormattedDollarDigits(rowData.valueUSD)}</span><br />
			<span title='Transaction-time USD value of transaction fee, rounded to the penny.'>Tx fee (USD): ${Formatters.getFormattedDollarDigits(rowData.gasFeeUSD)}</span><br />
		</li>
	);
}
