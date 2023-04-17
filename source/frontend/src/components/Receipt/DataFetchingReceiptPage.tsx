
import type {
	ProviderProvider,
	TxRowData,
	WrappedTxData
} from './ChainDataFetcher';
import type {
	MemosObject,
	MemosObjectDiff,
	ReceiptQuery,
	ViewOption
} from '../../QueryParser';
import { QueryParser } from '../../QueryParser';
import type { EIP1193Provider } from '@web3-onboard/core';
import { ethers } from 'ethers';
import type {ProgressProps} from '../Progress/Progress';
import { useEffect, useState } from 'react';
import { ChainDataFetcherClass } from './ChainDataFetcher';
import {
	Formatters
} from '../../Formatters';
import { AddressTranslatorClass } from '../../AddressTranslator';
import type { AccountLabelSet } from '../../AddressTranslator';
import { ReceiptPage } from './ReceiptPage';

const wait = (ms: number) => new Promise((r, j)=>setTimeout(r, ms));

const isScreenNarrow = function() {
	return window.innerWidth < 1020;
}

const computeHasMultipleUniqueToValues = function(
	txRows: TxRowData[],
) {
	if(txRows.length === 0) {
		return false;
	}
	const firstToLowercase = AddressTranslatorClass.getAddressOrOnChainLabelFromSet(txRows[0].to).toLowerCase();
	for(let i=1; i<txRows.length; i++) {
		const compareToLowercase = AddressTranslatorClass.getAddressOrOnChainLabelFromSet(txRows[i].to).toLowerCase();
		if(firstToLowercase !== compareToLowercase) {
			return true;
		}
	}
	return false;
}

// This should be a faster way of seeing if AddressTranslator.showAddOrRemoveAddressOnReport() will ever return true
// when ANDed with queryIncludesLimitedAccounts
const computeHasAnyToValuesNotInAcctsList = function(
	lowercaseFromAccountsList: string[],
	txRows: TxRowData[],
) {
	for(let txRow of txRows) {
		const compareToLowercase = AddressTranslatorClass.getAddressOrOnChainLabelFromSet(txRow.to).toLowerCase();
		if(!lowercaseFromAccountsList.includes(compareToLowercase)) {
			return true;
		}
	}
	return false;
}

//Removes txRowData for any tx that is not
//TO one of the specified accounts.
//If filterTo is empty, returns input txData unchanged.
const applyFilterToWrappedTxData = function(
	currentTxData: WrappedTxData,
	newFilterTo: string[],
) {
	if(newFilterTo.length === 0) {return currentTxData};
	const filterToLowercase = Formatters.lowercaseStringArray(newFilterTo);
	let filteredTxRows: TxRowData[] = [];
	const filteredTxRowsFromAccts: string[] = [];
	const filteredTxRowsFromHashes: string[] = [];
	const lowercaseTxRowsFromAccts = Formatters.lowercaseStringArray(currentTxData.txRowsFromAccts);
	const lowercaseTxRowsFromHashes = Formatters.lowercaseStringArray(currentTxData.txRowsFromHashes);
	for(let txRow of currentTxData.txRows) {
		if (partyIsInArray(txRow.to, filterToLowercase)) {
			filteredTxRows.push(txRow);
			const lowercaseTxID = txRow.txID;
			if(lowercaseTxRowsFromAccts.includes(lowercaseTxID)) {
				filteredTxRowsFromAccts.push(txRow.txID);
			} //Adding else here should be just a performance improvement, but not doing that for defensive programming on correctness
			if(lowercaseTxRowsFromHashes.includes(lowercaseTxID)) {
				filteredTxRowsFromHashes.push(txRow.txID);
			}
		}
	}
	return {
		...currentTxData,
		txRows: filteredTxRows,
		txRowsFromAccts: filteredTxRowsFromAccts,
		txRowsFromHashes: filteredTxRowsFromHashes,
	};
}
const partyIsInArray = function(
	party: AccountLabelSet,
	lowercaseAddressesOrChainLabels: string[],
) {
	return(
		(typeof party.address !== 'undefined' && lowercaseAddressesOrChainLabels.includes(party.address.toLowerCase())) ||
		(typeof party.chainLabel !== 'undefined' && lowercaseAddressesOrChainLabels.includes(party.chainLabel.toLowerCase()))
	)
}

export const DataFetchingReceiptPage = function(props: {
		receiptQuery: ReceiptQuery,
		updateTxMemoInReceiptQuery: (
			txHash: string,
			newMemoTrimmed: string | undefined
		) => Promise<MemosObject>;
		updateAcctLabelInReceiptQuery: (
			(
				addressOrOnChainLabel: string,
				newLabelTrimmed: string
			) => Promise<MemosObject>
		);
		updateLock: React.Dispatch<React.SetStateAction<boolean>>;
		updatePreferredView: React.Dispatch<React.SetStateAction<ViewOption>>;
		setFilterToInReceiptQuery: (
			(
				addressOrOnChainLabels?: string[]
			) => Promise<string[]>
		);
		showHome: (() => Promise<boolean | void>);
		provider?: EIP1193Provider,
		chainId?: string,
}) {
	const [wrappedTxData, setTxData] = useState<WrappedTxData>(generateEmptyWrappedTxData);
	const [currentQuery, setCurrentQuery] = useState<ReceiptQuery>(QueryParser.getEmptyReceiptQuery);
	const [screenIsNarrow, setScreenIsNarrow] = useState<boolean>(isScreenNarrow);
	const [progressProps, setProgressProps] = useState<ProgressProps>(function() {
		return {
			numerator: 0,
			denominator: 100,
			allDone: true,
		}
	});
	const resetProgressStep = function(
		currentStepDescription: string,
		numberOfSteps: number
	) {
		// Helps in debugging: console.log(currentStepDescription + '.');
		setProgressProps({
			currentStepDescription,
			numerator: 0,
			denominator: numberOfSteps,
			allDone: false,
		});
	}
	const completeProgressStep = function(stepsCompleted: number = 1) {
		setProgressProps(function(progressProps) {
			return {...progressProps, numerator: progressProps.numerator + stepsCompleted};
		});
	}
	const finishProgress = function() {
		setProgressProps(function(progressProps) {
			return {...progressProps, allDone: true};
		});
	}
	const showHome = function(ev: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
		ev.preventDefault();
		props.showHome();
	}
	const updateTxMemo = function(
		txHash: string,
		newMemoTrimmed: string | undefined
	) {
		return new Promise<void>(async function(resolve, reject) {
			await props.updateTxMemoInReceiptQuery(
				txHash,
				newMemoTrimmed
			);
			setTxData(function(txData: WrappedTxData) {
				const newTxData = updateTxMemoInTxData(
					txData,
					txHash,
					newMemoTrimmed
				);
				resolve(undefined);
				return newTxData;
			});
		});
	}
	//Removes txRowData for any tx that is not
	//either FROM one of the specified newAddresses
	//or having a hash which is a key of newTxMemos.
	const removeIncomingTxns = function(
		txData: WrappedTxData,
		newTxMemos: MemosObject,
		newFromAccountsOrChainLabels: string[],
	) : WrappedTxData {
		const lowercaseFromAccountsOrChainLabels = Formatters.lowercaseStringArray(newFromAccountsOrChainLabels);
		const txIDsLowercase = Formatters.lowercaseStringArray(Object.keys(newTxMemos));
		let newTxRows : TxRowData[] = [];
		let newTxRowsFromAccts: string[] = [];
		let newTxRowsFromHashes: string[] = [];
		for(let txRow of txData.txRows) {
			if(partyIsInArray(txRow.from, lowercaseFromAccountsOrChainLabels)) {
				newTxRows.push(txRow);
				newTxRowsFromAccts.push(txRow.txID);
			} else if (txIDsLowercase.includes(txRow.txID.toLowerCase())) {
				newTxRows.push(txRow);
				newTxRowsFromHashes.push(txRow.txID);
			}
		}
		return {
			...txData,
			txRows: newTxRows,
			txRowsFromAccts: newTxRowsFromAccts,
			txRowsFromHashes: newTxRowsFromHashes,
		}
	}
	const updateTxDataBasedOnTxMemosDiff = function(
		txData: WrappedTxData,
		txMemoDiffResult: MemosObjectDiff,
		newTxMemos: MemosObject,
	) : WrappedTxData {
		//NOTE: This function does not yet handle the case where a new tx is being added.
		//In the sole calling context for this function, that's handled by a full data reload instead of this call.
		for(let addedMemoTxHash of txMemoDiffResult.keysInBNotA) {
			//If this is a new tx to be added, already triggered reload above,
			//so here, treat the same as a changed memo.
			txData = updateTxMemoInTxData(txData, addedMemoTxHash, newTxMemos[addedMemoTxHash]);
		}
		for(let changedMemoTxHash of txMemoDiffResult.keysWithChangedValues) {
			txData = updateTxMemoInTxData(txData, changedMemoTxHash, newTxMemos[changedMemoTxHash]);
		}
		for(let removedMemoTxHash of txMemoDiffResult.keysInANotB) {
			//Removes whole transaction if it's not there due to an account selection.
			txData = removeTxMemoInTxData(txData, removedMemoTxHash);
		}
		return txData;
	}
	//eslint-disable-next-line @typescript-eslint/no-unused-vars
	const updateOrRemoveTxMemoInTxData = function( //NOSONAR
		txData: WrappedTxData,
		txHash: string,
		newMemoTrimmed: string | undefined
	) : WrappedTxData {
		if(typeof newMemoTrimmed === 'undefined') {
			return removeTxMemoInTxData(txData, txHash);
		} else {
			return updateTxMemoInTxData(txData, txHash, newMemoTrimmed);
		}
	}
	const removeTxMemoInTxData = function(
		txData: WrappedTxData,
		removedMemoTxHash: string
	) : WrappedTxData {
		if (QueryParser.caseInsensitiveIncludes(txData.txRowsFromHashes, removedMemoTxHash)) {
			return removeTxFromRowsInTxData(txData, removedMemoTxHash);
		} else {
			return updateTxMemoInTxData(txData, removedMemoTxHash, undefined);
		}
	}
	const updateTxMemoInTxData = function(
		txData: WrappedTxData,
		txHash: string,
		newMemoTrimmed: string | undefined
	) : WrappedTxData {
		const newTxRows : TxRowData[] = [];
		for(let txRow of txData.txRows) {
			if(txRow.txID.toLowerCase() === txHash.toLowerCase()) {
				newTxRows.push({...txRow, memo: newMemoTrimmed});
			} else {
				newTxRows.push(txRow);
			}
		}
		return {...txData, txRows: newTxRows};
	}
	const removeTxFromRowsInTxData = function(
		txData: WrappedTxData,
		txHash: string
	) : WrappedTxData {
		const newTxRows : TxRowData[] = [];
		for(let txRow of txData.txRows) {
			if(txRow.txID.toLowerCase() !== txHash.toLowerCase()) {
				newTxRows.push(txRow);
			}
		}
		return {...txData, txRows: newTxRows};
	}
	const updateAcctLabel = function(
		addressOrOnChainLabel: string,
		newLabelTrimmed: string
	) {
		return new Promise<void>(async function(resolve, reject) {
			let newAcctMemos = await props.updateAcctLabelInReceiptQuery(
				addressOrOnChainLabel,
				newLabelTrimmed
			);
			setTxData(function(txData: WrappedTxData) {
				const newTxData = updateAcctLabelInTxData(txData, newAcctMemos);
				resolve(undefined);
				return newTxData;
			});
		});
	}
	const updateAcctLabelInTxData = function (
		txData: WrappedTxData,
		newAcctMemos: MemosObject,
	) : WrappedTxData {
		const {
			sortedAcctLabels,
			txRowsLabeled
		} = AddressTranslatorClass.setAccountLabels(
			txData.txRows,
			newAcctMemos
		);
		return {
			...txData,
			txRows: txRowsLabeled,
			sortedAcctLabels
		};
	}
	const getProviderProviderFromProps = function() : ProviderProvider | undefined {
		const heldProvider = props.provider;
		return (typeof heldProvider === 'undefined') ? undefined : {
			getProvider: () => {
				return new ethers.BrowserProvider(heldProvider);
			},
			name: 'Wallet-provided provider',
		};
	}
	const downloadCSV = async function(wrappedTxDataParam ?: WrappedTxData) {
		const wrappedTxDataLocal = (typeof wrappedTxDataParam === 'undefined' ? wrappedTxData : wrappedTxDataParam);
		let csvRows : string[] = [Formatters.headersForCSV(currentQuery.labelsAsOfTxTime)];
		for(let row of wrappedTxDataLocal.txRows) {
			csvRows.push(Formatters.txRowForCSV(row));
		}
		const content = csvRows.join('\r\n')+'\r\n';
		const downloadLink = document.createElement('a');
		const file = new File([content], 'receipt.csv', {type: 'text/csv'});
		const downloadLinkURL = URL.createObjectURL(file); //TODO
		downloadLink.setAttribute('href', downloadLinkURL);
		downloadLink.setAttribute('download', 'receipt.csv');
		downloadLink.setAttribute('target', '_blank'); //needed?
		downloadLink.click();
		return true;
	}
	const onresize = function() {
		setScreenIsNarrow(isScreenNarrow);
	}
	const scrollToAnchor = function() {
		const target = window.location.hash;
		if(target.length <= 1) { //'#' doesn't count
			return;
		}
		const targetElement = document.getElementById(target.substring(1));
		if(targetElement===null) {
			console.warn('Could not scroll to ' + target);
		} else {
			targetElement.scrollIntoView();
		}
	}
	const scrollToAnchorOnDelay = async function(ms: number = 100) {
		await wait(ms);
		scrollToAnchor();
	}
	const getTxRowWithHashCaseInsensitive = function(
		hashToSearchFor : string,
		txRows : TxRowData[],
	) : TxRowData | undefined {
		const hashToSearchForLowercase = hashToSearchFor.toLowerCase();
		for(let txRow of txRows) {
			if(txRow.txID.toLowerCase() === hashToSearchForLowercase) {
				return txRow;
			}
		}
		return undefined;
	}
	const needsFullReload = function(
		currentQuery: ReceiptQuery,
		targetQuery: ReceiptQuery,
		txMemoDiffResult: MemosObjectDiff,
	) : boolean {
		if(
			(typeof currentQuery === 'undefined') || //note: if new ReceiptQuery is undefined, homepage gets shown instead, not this page.
			//TODO: Could probably make adjustments for some of these,
			//especially if the range is narrowing, without full reload, but more members of Wrapped TxData are affected; it's not trivial.
			(currentQuery.blockStart !== targetQuery.blockStart) ||
			(currentQuery.blockEnd !== targetQuery.blockEnd) ||
			(currentQuery.msStart !== targetQuery.msStart) ||
			(currentQuery.msEnd !== targetQuery.msEnd) ||
			(currentQuery.labelsAsOfTxTime !== targetQuery.labelsAsOfTxTime) ||
			(QueryParser.targetQueryFilterMightShowMore(currentQuery.filterTo, targetQuery.filterTo)) ||
			//TODO: fn for piecewise addition of addresses, including updates to other affected variables; pass on to add button
			(QueryParser.bHasSomethingNotInACaseInsensitive(currentQuery.addresses, targetQuery.addresses)) ||
			//TODO: fn for piecewise removal of addresses, including updates to other affected variables; pass on to remove button
			(QueryParser.bHasSomethingNotInACaseInsensitive(targetQuery.addresses, currentQuery.addresses)) ||
			(!currentQuery.includeIncoming && targetQuery.includeIncoming)
		) {
			return true;
		}
		for(let addedMemoTxHash of txMemoDiffResult.keysInBNotA) {
			if(typeof getTxRowWithHashCaseInsensitive(addedMemoTxHash, wrappedTxData.txRows) === 'undefined') {
				return true; //TODO: fn to Add single tx more elegantly without requiring full reload, incl. updates to other affected vars
			}
		}
		return false;
	}
	const handleUndo = function() {
		//eslint-disable-next-line no-restricted-globals
		if(history.length <= 1) {
			console.warn('Can\'t undo any further; reached the end of URL-based undo history.');
		}
		//This will have no effect and raise no exceptions if there
		//isn't anywhere backward to go.
		//eslint-disable-next-line no-restricted-globals
		history.back();
	}
	const handleRedo = function() {
		//eslint-disable-next-line no-restricted-globals
		history.forward();
	}
	const checkKeyboardEventForUndoOrRedo = function(this: Window, eventObj: KeyboardEvent) {
		if(eventObj.ctrlKey) {
			//Case-insensitive mainly because shortcuts are often written with capital letters.
			if(eventObj.key.toLowerCase() === 'z') {
				eventObj.preventDefault();
				handleUndo();
			} else if(eventObj.key.toLowerCase() === 'y') {
				eventObj.preventDefault();
				handleRedo();
			}
		}
	}
	const LOAD_ABORT_ERROR_MESSAGE = 'Operation aborted';
	useEffect(() => {
		//Use of keydown has the downside of continuing to fire when the key is held down,
		//even for relatively short periods, which could lead to quickly going further through the undo/redo stack than intended.
		window.addEventListener('keyup', checkKeyboardEventForUndoOrRedo);
		window.addEventListener('resize', onresize);
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const getAndDisplayTxnsData = async function(
		receiptQuery: ReceiptQuery,
		throwIfAborted: () => void,
		runDownloadOnLoad: boolean,
	) {
		try {
			const providerProvider = getProviderProviderFromProps();
			const chainDataFetcher = new ChainDataFetcherClass(providerProvider);
			const wrappedTxData = await chainDataFetcher.getTxnsData(
				receiptQuery,
				resetProgressStep,
				completeProgressStep,
				throwIfAborted,
			);
			if(typeof wrappedTxData !== 'undefined') {
				throwIfAborted();
				resetProgressStep('Rendering data for display', 1);
				throwIfAborted();
				setTxData(wrappedTxData);
				setCurrentQuery(receiptQuery);
				throwIfAborted();
				completeProgressStep();
				throwIfAborted();
				finishProgress();
				if(runDownloadOnLoad) {
					await downloadCSV(wrappedTxData);
				}
				scrollToAnchorOnDelay(100); //TODO: don't rely on timing, but actual completion of state update
			}
			return wrappedTxData;
		} catch(err: any) {
			if(err.message !== LOAD_ABORT_ERROR_MESSAGE) {
				console.error ('Caught error in getAndDisplayTxnsData:',err);
			}
			//not rethrowing
		}
	}
	const respondToQueryUpdate = async function( //shouldn't throw.
		targetQuery: ReceiptQuery,
		throwIfAborted: () => void,
	) {
		//figure out if receiptQuery is the same or different from last time this query was run,
		//and apply any differences.
		const txMemoDiffResult = QueryParser.diffMemosObject(currentQuery.txMemos, targetQuery.txMemos);
		if(needsFullReload(
			currentQuery,
			targetQuery,
			txMemoDiffResult
		)) {
			getAndDisplayTxnsData(
				{...targetQuery, downloadOnFirstLoad: false},
				throwIfAborted,
				(!currentQuery.downloadOnFirstLoad && targetQuery.downloadOnFirstLoad),
			);
		} else { //Didn't do a full reload; should just update relevant parts here. TODO.
			doPartialUpdate(
				targetQuery,
				txMemoDiffResult,
			);
		}
	}
	const doPartialUpdate = function(
		targetQuery: ReceiptQuery,
		txMemoDiffResult: MemosObjectDiff,
	) {
		setTxData(function(txData: WrappedTxData) {
			try {
				//'lock' and 'view' aren't used when computing wrappedTxData, so no modifications of wrappedTxData are needed when these change.
				//Similar for 'showHome' but you don't even get here if that's true in the new value.
				txData = updateTxDataBasedOnTxMemosDiff(txData, txMemoDiffResult, targetQuery.txMemos);
				if(currentQuery.includeIncoming && !targetQuery.includeIncoming) {
					txData = removeIncomingTxns(txData, targetQuery.txMemos, targetQuery.addresses);
				}
				txData = applyFilterToWrappedTxData(txData, targetQuery.filterTo);
				txData = updateAcctLabelInTxData(txData, targetQuery.acctMemos);
				//do this one last:
				if(!currentQuery.downloadOnFirstLoad && targetQuery.downloadOnFirstLoad) {
					//Note: Changes in the opposite direction (to false) require no action.
						downloadCSV(txData); //not using await b/c not in async context
				}
				setCurrentQuery({...targetQuery, downloadOnFirstLoad: false});
				return txData;
			} catch (err: any) {
				if(err.message === LOAD_ABORT_ERROR_MESSAGE) {
					//not changing the query stored in state so that subsequent run will detect changes
					return txData;
				} else {
					console.error('Error loading data:',err);
					return txData;
				}
			}
		});
	}
	useEffect(() => {
		//The code in this function is the 'setup' code referenced [in the comment] below;
		//the function this code returns is the 'cleanup' code referenced below.
		//See https://beta.reactjs.org/reference/react/useEffect#my-effect-runs-twice-when-the-component-mounts
		//When Strict Mode is on, in development, React runs setup and cleanup one extra time before the actual setup.
		//Next line: see https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data
		let isAborted = false;
		const throwIfAborted = function() {
			if(isAborted) {
				throw new Error(LOAD_ABORT_ERROR_MESSAGE);
			}
		}
		respondToQueryUpdate(props.receiptQuery, throwIfAborted);
		return() => {
			// Aborting on-mount data fetch.
			// In dev, this is because React fires effect setup-cleanup-setup on purpose.
			// In prod, it suggests component dismounting e.g. to tweak parameters.
			isAborted = true;
		}
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ props.receiptQuery ]); //https://stackoverflow.com/a/71434389/
	let timeRangeConstraintType : 'block' | 'time' | undefined = undefined;
	if(currentQuery.relativeTime === 'specifiedBlocks') {
		timeRangeConstraintType = 'block';
	} else if(typeof currentQuery.relativeTime !== 'undefined') {
		timeRangeConstraintType = 'time';
	}
	const anySpecifiedTxes = wrappedTxData.txRowsFromHashes.length > 0;
	const queriedAddressesLowercase = Formatters.lowercaseStringArray(currentQuery.addresses);
	const canRemoveAnyAddressesFromReport = AddressTranslatorClass.computeCanRemoveAnyAddressesFromReport(
		currentQuery.addresses.length,
		anySpecifiedTxes,
	)
	const queryIncludesLimitedAccounts = AddressTranslatorClass.computeQueryIncludesLimitedAccounts(
		currentQuery.addresses.length,
		timeRangeConstraintType
	);
	let canAddAnyAddressesToReport = queryIncludesLimitedAccounts;
	if(queryIncludesLimitedAccounts) {
		canAddAnyAddressesToReport &&= computeHasAnyToValuesNotInAcctsList(
			queriedAddressesLowercase,
			wrappedTxData.txRows,
		);
	}
	const hasMultipleUniqueToValues = computeHasMultipleUniqueToValues(wrappedTxData.txRows);
	const setFilterTo = hasMultipleUniqueToValues ? async function(addressOrOnChainLabel?: string) {
		const newFilterTo = await props.setFilterToInReceiptQuery(
			(typeof addressOrOnChainLabel === 'undefined') ?
			[] :
			[addressOrOnChainLabel]
		);
		setTxData(function(currentTxData: WrappedTxData) {
			return applyFilterToWrappedTxData(currentTxData, newFilterTo);
		});
		return newFilterTo;
	} : undefined;
	const canEditScope = (
		canRemoveAnyAddressesFromReport ||
		canAddAnyAddressesToReport ||
		hasMultipleUniqueToValues //can filter to one of the 'to' addresses in this condition
	);
	return (<ReceiptPage
		wrappedTxData={wrappedTxData}
		//Not passing a wrappedTxData param here, and not letting the click event count as it:
		downloadCSV={() => {return downloadCSV()}}
		isLocked={currentQuery.lock}
		setIsLocked={props.updateLock}
		canEditScope={canEditScope}
		progressProps={progressProps}
		currentQuery={currentQuery}
		updateTxMemo = {updateTxMemo}
		updateAcctLabel = {updateAcctLabel}
		setFilterTo = {setFilterTo}
		screenIsNarrow = {screenIsNarrow}
		preferListView = {currentQuery.view === 'list'}
		setPreferredView = {props.updatePreferredView}
		showHome = {showHome}
		queriedAddressesLowercase = {queriedAddressesLowercase}
		anySpecifiedTxes = {anySpecifiedTxes}
		timeRangeConstraintType = {timeRangeConstraintType}
	/>);
}

function generateEmptyWrappedTxData() : WrappedTxData {
	return {
		txRows: [],
		startBlockTimestamp: undefined,
		endBlockTimestamp: undefined,
		accountBasedTransactionsMetaData: {source: 'none'},
		generatedAt: new Date(),
		txRowsFromAccts: [],
		txRowsFromHashes: [],
		sortedAcctLabels: [],
	};
}
