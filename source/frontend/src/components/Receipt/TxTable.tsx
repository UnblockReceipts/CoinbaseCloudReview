import { TxRowData } from "./ChainDataFetcher";
import { TxRow } from './TxRow';
import { useState } from 'react';

export const addOrRemoveElementFromArray = function<T extends string | number>(
	arraySetter: React.Dispatch<React.SetStateAction<T[]>>,
	target: T,
	shouldBeThere: boolean
) {
	arraySetter((arrayLowercase: T[]) => {
		const indexOfID = arrayLowercase.indexOf(target);
		if(indexOfID < 0 && shouldBeThere) {
			arrayLowercase.push(target);
		}
		if(indexOfID >= 0 && !shouldBeThere) {
			arrayLowercase.splice(indexOfID, 1);
		}
		//Have to make it a new array so React recognizes state change and re-renders.
		//See https://stackoverflow.com/a/56266640
		return [...arrayLowercase];
	});
};

export const TxTable = function(props: {
	txRows: TxRowData[];
	isLocked: boolean;
	updateTxMemo: ((txID: string, newMemoTrimmed: string) => Promise<void>);
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	useNarrowVersion: boolean;
	queriedAddressesLowercase: string[];
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	//Might be able to improve efficiency a tiny bit by using a sorted data structure,
	//but the array will usually be 0 or 1 elements long
	//so the overhead and complexity of doing so isn't likely worth it.
	const [txHashesWithMemosBeingEditedLowercase, setTxHashesWithMemosBeingEdited] = useState<string[]>([]);
	const [txHashesWithFromBeingEditedLowercase, setTxHashesWithFromBeingEdited] = useState<string[]>([]);
	const [txHashesWithToBeingEditedLowercase, setTxHashesWithToBeingEdited] = useState<string[]>([]);
	const updateEditingStatusOfTxFrom = function(
		txHash: string,
		newIsEditing: boolean
	) {
		addOrRemoveElementFromArray(
			setTxHashesWithFromBeingEdited,
			txHash.toLowerCase(),
			newIsEditing
		);
	};
	const updateEditingStatusOfTxTo = function(
		txHash: string,
		newIsEditing: boolean
	) {
		addOrRemoveElementFromArray(
			setTxHashesWithToBeingEdited,
			txHash.toLowerCase(),
			newIsEditing
		);
	};
	const updateEditingStatusOfTxMemo = function(
		txHash: string,
		newIsEditing: boolean
	) {
		addOrRemoveElementFromArray(
			setTxHashesWithMemosBeingEdited,
			txHash.toLowerCase(),
			newIsEditing
		);
	};
	if(props.useNarrowVersion === true) {
		return (
			<TxTableNarrow
				txRows = {props.txRows}
				isLocked = {props.isLocked}
				txHashesWithMemosBeingEditedLowercase = {txHashesWithMemosBeingEditedLowercase}
				txHashesWithFromBeingEditedLowercase = {txHashesWithFromBeingEditedLowercase}
				txHashesWithToBeingEditedLowercase = {txHashesWithToBeingEditedLowercase}
				updateEditingStatusOfTxMemo = {updateEditingStatusOfTxMemo}
				updateEditingStatusOfTxFrom = {updateEditingStatusOfTxFrom}
				updateEditingStatusOfTxTo = {updateEditingStatusOfTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				updateTxMemo = {props.updateTxMemo}
				setFilterTo = {props.setFilterTo}
				queriedAddressesLowercase = {props.queriedAddressesLowercase}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				timeRangeConstraintType = {props.timeRangeConstraintType}
			/>
		);
	} else {
		return (
			<TxTableWide
				txRows = {props.txRows}
				isLocked = {props.isLocked}
				txHashesWithMemosBeingEditedLowercase = {txHashesWithMemosBeingEditedLowercase}
				txHashesWithFromBeingEditedLowercase = {txHashesWithFromBeingEditedLowercase}
				txHashesWithToBeingEditedLowercase = {txHashesWithToBeingEditedLowercase}
				updateEditingStatusOfTxMemo = {updateEditingStatusOfTxMemo}
				updateEditingStatusOfTxFrom = {updateEditingStatusOfTxFrom}
				updateEditingStatusOfTxTo = {updateEditingStatusOfTxTo}
				updateAcctLabel = {props.updateAcctLabel}
				updateTxMemo = {props.updateTxMemo}
				setFilterTo = {props.setFilterTo}
				queriedAddressesLowercase = {props.queriedAddressesLowercase}
				anySpecifiedTxes = {props.anySpecifiedTxes}
				timeRangeConstraintType = {props.timeRangeConstraintType}
			/>
		);
	}
}

const TxTableWide = function(props: {
	txRows: TxRowData[];
	isLocked: boolean;
	txHashesWithMemosBeingEditedLowercase: string[];
	txHashesWithFromBeingEditedLowercase: string[];
	txHashesWithToBeingEditedLowercase: string[];
	updateEditingStatusOfTxMemo: (txID: string, newIsEditing: boolean) => void;
	updateEditingStatusOfTxFrom: (txID: string, newIsEditing: boolean) => void;
	updateEditingStatusOfTxTo: (txID: string, newIsEditing: boolean) => void;
	updateTxMemo: ((txID: string, newMemoTrimmed: string) => Promise<void>);
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	queriedAddressesLowercase: string[];
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	return (
			<table className='txReceiptsTable'>
				<thead>
					<tr>
						<td>
							Transaction ID
						</td>
						<td>
							From
						</td>
						<td>
							To
						</td>
						<td title='This transaction took place on'>
							Date/Time
						</td>
						<td>
							ETH sent<br />(ETH)
						</td>
						<td>
							Tx fee<br />(ETH)
						</td>
						<td title='Transaction-time USD value of native ETH sent, rounded to the penny.'>
							ETH sent<br />(USD)
						</td>
						<td title='Transaction-time USD value of transaction fee, rounded to the penny.'>
							Tx fee<br />(USD)
						</td>
					</tr>
				</thead>
				<tbody>
					{
						props.txRows.map((txRow) => <TxRow
							key = {txRow.txID + 'Wrapper'}
							isLocked = {props.isLocked}
							editingTxMemo = {props.txHashesWithMemosBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
							editingTxFrom = {props.txHashesWithFromBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
							editingTxTo = {props.txHashesWithToBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
							setEditingTxMemo = {function(newIsEditing: boolean) {
								props.updateEditingStatusOfTxMemo(txRow.txID, newIsEditing);
							}}
							setEditingTxFrom = {function(newIsEditing: boolean) {
								props.updateEditingStatusOfTxFrom(txRow.txID, newIsEditing);
							}}
							setEditingTxTo = {function(newIsEditing: boolean) {
								props.updateEditingStatusOfTxTo(txRow.txID, newIsEditing);
							}}
							rowData = {txRow}
							onMemoChange = {function(newMemoTrimmed: string) {
								return props.updateTxMemo(txRow.txID, newMemoTrimmed);
							}}
							useNarrowVersion = {false}
							updateAcctLabel = {props.updateAcctLabel}
							setFilterTo = {props.setFilterTo}
							queriedAddressesLowercase = {props.queriedAddressesLowercase}
							anySpecifiedTxes = {props.anySpecifiedTxes}
							timeRangeConstraintType = {props.timeRangeConstraintType}
						/>)
					}
				</tbody>
			</table>
	);
}

const TxTableNarrow = function(props: {
	txRows: TxRowData[];
	isLocked: boolean;
	txHashesWithMemosBeingEditedLowercase: string[];
	txHashesWithFromBeingEditedLowercase: string[];
	txHashesWithToBeingEditedLowercase: string[];
	updateEditingStatusOfTxMemo: (txID: string, newIsEditing: boolean) => void;
	updateEditingStatusOfTxFrom: (txID: string, newIsEditing: boolean) => void;
	updateEditingStatusOfTxTo: (txID: string, newIsEditing: boolean) => void;
	updateTxMemo: ((txID: string, newMemoTrimmed: string) => Promise<void>);
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	queriedAddressesLowercase: string[];
	anySpecifiedTxes: boolean;
	timeRangeConstraintType?: 'time' | 'block';
}) {
	return (
		<ul className='txReceiptsList'>
				{
					props.txRows.map((txRow) => <TxRow
						key = {txRow.txID + 'Wrapper'}
						isLocked = {props.isLocked}
						editingTxMemo = {props.txHashesWithMemosBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
						editingTxFrom = {props.txHashesWithFromBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
						editingTxTo = {props.txHashesWithToBeingEditedLowercase.includes(txRow.txID.toLowerCase())}
						setEditingTxMemo = {function(newIsEditing: boolean) {
							props.updateEditingStatusOfTxMemo(txRow.txID, newIsEditing);
						}}
						setEditingTxFrom = {function(newIsEditing: boolean) {
							props.updateEditingStatusOfTxFrom(txRow.txID, newIsEditing);
						}}
						setEditingTxTo = {function(newIsEditing: boolean) {
							props.updateEditingStatusOfTxTo(txRow.txID, newIsEditing);
						}}
						rowData = {txRow}
						onMemoChange = {function(newMemoTrimmed: string) {
							return props.updateTxMemo(txRow.txID, newMemoTrimmed);
						}}
						useNarrowVersion = {true}
						updateAcctLabel = {props.updateAcctLabel}
						setFilterTo = {props.setFilterTo}
						queriedAddressesLowercase = {props.queriedAddressesLowercase}
						anySpecifiedTxes = {props.anySpecifiedTxes}
						timeRangeConstraintType = {props.timeRangeConstraintType}
					/>)
				}
		</ul>
	);
}
