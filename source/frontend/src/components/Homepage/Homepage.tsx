import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
// Vertical alignment not quite lining up right to use this, even with overrides:
//import TextField from '@mui/material/TextField';
import type { EIP1193Provider, WalletState } from '@web3-onboard/core';
import type { Account } from '@web3-onboard/core/dist/types';
import { OnboardWrapper } from './OnboardWrapper';
import { LogoBlock } from '../Header/LogoBlock';
import { QueryParser } from '../../QueryParser';
import type { MemosObject, ReceiptQuery, RelativeTimeOption } from '../../QueryParser';
import type { SpecialKeyForSettingInURL } from '../../App';
import { ExpandingLabeledInputSet } from './ExpandingLabeledInputSet';
import { ReceiptQueryObjectUpdater } from '../../ReceiptQueryObjectUpdater';
import TimeSelector from '../DatePicker/TimeSelector';

type StateHistoryEntry = {
	receiptQuery: ReceiptQuery;
}

export const Homepage = function(props: {
	receiptQuery: ReceiptQuery
	replaceReceiptQuery: ((newQuery: ReceiptQuery) => void);
	setValueInAppReceiptQueryAndURL: (<
		//The & condition doesn't have to be strict but it helps with verifying use only in
		//places where the fn is well adapted for use.
		K extends keyof ReceiptQuery & SpecialKeyForSettingInURL =
		keyof ReceiptQuery & SpecialKeyForSettingInURL
	>(
		key: K,
		value: ReceiptQuery[K],
	) => Promise<K>);
	onProviderChange: ((newProvider?: EIP1193Provider) => void),
	onNetworkChange: ((newChainId: string) => void),
	updateAndPossiblyRemoveTxMemosInReceiptQuery: (
		updateSets: {
			txHashToRemove: string | undefined, //undefined here means don't remove any
			txToAddOrUpdate: {hash: string, memoTrimmed: string} | undefined, //undefined here means don't add/update any
		}[],
		replaceKeyCase: boolean,
	) => Promise<MemosObject>;
	updateAcctLabelInReceiptQuery: (
		(
			addressOrOnChainLabel: string,
			newLabelTrimmed: string | undefined,
			replaceKeyCase: boolean,
		) => Promise<MemosObject>
	);
	setFilterToInReceiptQuery: (
		(
			addressOrOnChainLabels?: string[],
		) => Promise<string[]>
	);
	addAndOrRemoveAccountsFromReceiptQuery: (
		(
			updateSets: {
				addressOrOnChainLabelToRemove: string | undefined,
				addressOrOnChainLabelToAdd: string | undefined,
				labelOfAccountToAddTrimmed: string | undefined,
			}[],
			caseSensitive: boolean,
		) => void
	);
	addAccountsToReceiptQuery: (
		(
			addressesOrOnChainLabelsToAdd: string[],
			replaceCase: boolean,
		) => void
	);
	replaceOneFilterToAddressInReceiptQuery: (
		(
			updateSets: ({
				filterToToRemove: string | undefined,
				filterToToReplaceWith: string | undefined,
			})[],
			caseSensitive: boolean,
		) => void
	);
	updateRelativeTimeInReceiptQuery: (
		(
			newValue?: RelativeTimeOption,
		) => void
	);
	updateTimeBoundInReceiptQuery: (
		(
			propertyName: 'msStart' | 'msEnd',
			newValue?: Date,
		) => void
	);
	updateBlockBoundInReceiptQuery: (
		(
			propertyName: 'blockStart' | 'blockEnd',
			newValue?: number,
		) => void
	);
	goToDocs: (
		(
			ev: React.MouseEvent<HTMLAnchorElement>,
		) => void
	);
}) {
	const [connectedAddresses, setConnectedAddresses] = useState<string[] | undefined>();
	const getAddressOrOnChainLabelFromOnboardAccount = (account: Account) => {
		if(account.ens === null) {
			return account.address;
		} else {
			if(!QueryParser.caseInsensitiveIncludes(draftQuery.addresses, account.ens.name)) {
				return account.ens.name;
			}
		}
	}
	const getConnectedAddressesFromWallets = (wallets: WalletState[]) => {
		let newConnectedAddresses : string[] = [];
		for(let wallet of wallets) {
			for(let account of wallet.accounts) {
				//Note: MetaMask only gives one even if the user chose to connect more
				//See https://github.com/blocknative/web3-onboard/issues/1632
				if(!QueryParser.caseInsensitiveIncludes(draftQuery.addresses, account.address)) {
					const addressOrOnChainLabel = getAddressOrOnChainLabelFromOnboardAccount(account);
					if(typeof addressOrOnChainLabel !== 'undefined') {
						newConnectedAddresses.push(addressOrOnChainLabel);
					}
				}
			}
		}
		return newConnectedAddresses;
	}
	const connectWallet = async () => {
		try {
			const wallets = await OnboardWrapper.connectWallet();
			let newConnectedAddresses = getConnectedAddressesFromWallets(wallets);
			setConnectedAddresses(newConnectedAddresses);
			addAccounts(newConnectedAddresses);
			props.onNetworkChange(wallets[0]?.chains[0]?.id);
			props.onProviderChange(wallets[0]?.provider);
		} catch (error) {
			console.error(error);
		}
	};
	const getProvidedOrEmptyQuery = function() {
		if(typeof props.receiptQuery === 'undefined') {
			return QueryParser.getEmptyReceiptQuery();
		} else {
			return props.receiptQuery;
		}
	}
	//eslint-disable-next-line @typescript-eslint/no-unused-vars -- the state is read/used in the setter method
	const [_undoHistory, setUndoHistory] = useState<StateHistoryEntry[]>([]);
	//eslint-disable-next-line @typescript-eslint/no-unused-vars -- the state is read/used in the setter method
	const [_redoHistory, setRedoHistory] = useState<StateHistoryEntry[]>([]);
	const [draftQuery, setDraftQuery] = useState<ReceiptQuery>(getProvidedOrEmptyQuery);
	const setCurrentAndPushPastDraftQuery = function(queryOrCallback: React.SetStateAction<ReceiptQuery>) {
		setDraftQuery((currentQuery: ReceiptQuery) => {
			const newQuery = typeof queryOrCallback === 'function' ? queryOrCallback(currentQuery) : queryOrCallback;
			if(QueryParser.queriesHaveAnyDifference(currentQuery, newQuery)) {
				setUndoHistory((currentUndoHistory: StateHistoryEntry[]) => {
					currentUndoHistory.push({receiptQuery: currentQuery});
					return currentUndoHistory;
				});
			}
			return newQuery;
		});
	}
	useEffect(() => {
		//Not using setCurrentAndPushPastDraftQuery b/c if updating URI and parent query,
		//history will be changing and used for undo functionality.
		setDraftQuery(getProvidedOrEmptyQuery());
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.receiptQuery]);
	const regularlyUpdatingURLAndOverallQuery = (QueryParser.queryIsEmpty(props.receiptQuery));
	const handleUndo = function() {
		//TODO: Handle undo of wallet connection
		if(regularlyUpdatingURLAndOverallQuery) {
			//TODO: Add this simple version of undo/redo on the DataFetchingReceiptPage too
			//eslint-disable-next-line no-restricted-globals
			if(history.length <= 1) {
				console.warn('Can\'t undo any further; reached the end of URL-based undo history.');
			}
			//This will have no effect and raise no exceptions if there
			//isn't anywhere backward to go.
			//eslint-disable-next-line no-restricted-globals
			history.back();
		} else {
			setUndoHistory((currentUndoHistory: StateHistoryEntry[]) => {
				const stateHistoryEntry = currentUndoHistory.pop();
				if(typeof stateHistoryEntry !== 'undefined') {
					setDraftQuery((currentQuery: ReceiptQuery) => {
						setRedoHistory((currentRedoHistory: StateHistoryEntry[]) => {
							currentRedoHistory.push({receiptQuery: currentQuery});
							return currentRedoHistory;
						});
						return stateHistoryEntry.receiptQuery;
					});
				} else {
					console.log('Can\'t undo any further; reached the end of undo history.');
					//Should be blank form at this point; might be useful to
					//add some instrumentation to verify that and report back if not.
				}
				return currentUndoHistory;
			});
		}
	}
	const handleRedo = function() {
		//TODO: Log about redo of wallet connection if appropriate
		if(regularlyUpdatingURLAndOverallQuery) {
			//TODO: Add this simple version of undo/redo on the DataFetchingReceiptPage too
			//This will have no effect and raise no exceptions if there
			//isn't anywhere forward to go.
			//eslint-disable-next-line no-restricted-globals
			history.forward();
		} else {
			setRedoHistory((currentRedoHistory: StateHistoryEntry[]) => {
				const stateHistoryEntry = currentRedoHistory.pop();
				if(typeof stateHistoryEntry !== 'undefined') {
					setCurrentAndPushPastDraftQuery(stateHistoryEntry.receiptQuery);
					//TODO: Log about redo of wallet connection if appropriate
				} else {
					console.log('Can\'t redo any further; reached the end of redo history.');
				}
				return currentRedoHistory;
			});
		}
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
	useEffect(() => {
		//Use of keydown has the downside of continuing to fire when the key is held down,
		//even for relatively short periods, which could lead to quickly going further through the undo/redo stack than intended.
		window.addEventListener('keyup', checkKeyboardEventForUndoOrRedo);
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const updateQueryValues = function<
		//The & condition doesn't have to be strict but it helps with verifying use only in
		//places where the fn is well adapted for use.
		K extends keyof ReceiptQuery & SpecialKeyForSettingInURL =
		keyof ReceiptQuery & SpecialKeyForSettingInURL
	>(
		key: K,
		newValue: ReceiptQuery[K],
	) {
		if(regularlyUpdatingURLAndOverallQuery) {
			props.setValueInAppReceiptQueryAndURL(key, newValue);
			//draftQuery will be updated by useEffect as the incoming receiptQuery is changed,
			//avoiding duplication of state updates
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateValue(
					currentDraftQuery,
					key,
					newValue
				);
				return newQuery;
			});
		}
	}
	const setTimeRangeBound = function(
		propertyName: 'msStart' | 'msEnd',
		newValue?: Date,
	) {
		if(regularlyUpdatingURLAndOverallQuery) {
			props.updateTimeBoundInReceiptQuery(propertyName, newValue);
			//draftQuery will be updated by useEffect as the incoming receiptQuery is changed,
			//avoiding duplication of state updates
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				return ReceiptQueryObjectUpdater.updateTimeBound(
					currentDraftQuery,
					propertyName,
					newValue
				);
			});
		}
	}
	const setRangeStart = function(newValue?: Date) {
		return setTimeRangeBound('msStart', newValue);
	}
	const setRangeEnd = function(newValue?: Date) {
		return setTimeRangeBound('msEnd', newValue);
	}
	const setBlockRangeBound = function(
		propertyName: 'blockStart' | 'blockEnd',
		newValue?: number,
	) {
		if(regularlyUpdatingURLAndOverallQuery) {
			props.updateBlockBoundInReceiptQuery(propertyName, newValue);
			//draftQuery will be updated by useEffect as the incoming receiptQuery is changed,
			//avoiding duplication of state updates
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				return ReceiptQueryObjectUpdater.updateBlockBound(
					currentDraftQuery,
					propertyName,
					newValue
				);
			});
		}
	}
	const setBlockRangeStart = function(newValue?: number) {
		return setBlockRangeBound('blockStart', newValue);
	}
	const setBlockRangeEnd = function(newValue?: number) {
		return setBlockRangeBound('blockEnd', newValue);
	}
	const includeIncomingCheckboxChanged = function(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
		updateQueryValues('includeIncoming', checked);
	}
	const changeTimeOption = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
		//TODO: verify against value-land array instead of casting here?
		//Should generally be OK as the possible 'values' are generated by code
		//and if the user breaks that they shouldn't necessarily expect continued correctness of operation.
		const newValue = event.target.value as RelativeTimeOption;
		if(regularlyUpdatingURLAndOverallQuery) {
			props.updateRelativeTimeInReceiptQuery(newValue);
			//draftQuery will be updated by useEffect as the incoming receiptQuery is changed,
			//avoiding duplication of state updates
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				return ReceiptQueryObjectUpdater.updateValue(
					currentDraftQuery,
					'relativeTime',
					newValue,
				);
			});
		}
	}
	//Called on wallet connection/address addition;
	//multi-line parse is handled in sub-component with individual calls up.
	const addAccounts = function(
		addressesOrOnChainLabelsToAdd: string[],
		replaceCase: boolean = false,
	) {
		if(regularlyUpdatingURLAndOverallQuery) {
			props.addAccountsToReceiptQuery(
				addressesOrOnChainLabelsToAdd,
				replaceCase,
			); //local draftQuery updated when incoming receiptQuery changes
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.addAccounts(
					currentDraftQuery,
					addressesOrOnChainLabelsToAdd,
					replaceCase,
				);
				return newQuery;
			});
		}
	}
	const addAndOrRemoveAccts = function(updatedHomepageRows: {
		oldContent?: string,
		newContentTrimmed?: string,
		labelTrimmed?: string,
	}[]) {
		let updateSets: {
			addressOrOnChainLabelToRemove: string | undefined,
			addressOrOnChainLabelToAdd: string | undefined,
			labelOfAccountToAddTrimmed: string | undefined,
		}[] = [];
		for(let updatedHomepageRow of updatedHomepageRows) {
			updateSets.push(
				{
					addressOrOnChainLabelToRemove: updatedHomepageRow.oldContent,
					addressOrOnChainLabelToAdd: updatedHomepageRow.newContentTrimmed,
					labelOfAccountToAddTrimmed: updatedHomepageRow.labelTrimmed,
				},
			);
		}
		const caseSensitive = true;
		if(regularlyUpdatingURLAndOverallQuery) {
			props.addAndOrRemoveAccountsFromReceiptQuery(
				updateSets,
				caseSensitive,
			); //local draftQuery updated when incoming receiptQuery changes
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				let newQuery = ReceiptQueryObjectUpdater.addAndOrRemoveAccounts(
					currentDraftQuery,
					updateSets,
					caseSensitive,
				).newQuery;
				return newQuery;
			});
		}
	}
	const updateLabelForAcct = function(
		addressOrOnChainLabel: string,
		newLabelTrimmed?: string
	) {
		const caseSensitive = false;
		if(regularlyUpdatingURLAndOverallQuery) {
			props.updateAcctLabelInReceiptQuery(
				addressOrOnChainLabel,
				newLabelTrimmed,
				caseSensitive
			); //local draftQuery updated when incoming receiptQuery changes
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateAcctLabel(
					currentDraftQuery,
					addressOrOnChainLabel,
					newLabelTrimmed,
					caseSensitive,
				);
				return newQuery;
			});
		}
	}
	const replaceFilterToAddressesInHomepageRows = function(updatedHomepageRows: {
		oldContent?: string,
		newContentTrimmed?: string,
		labelTrimmed?: string,
	}[]) {
		const caseSensitiveSearch = true;
		let updateSets: {
			filterToToRemove: string | undefined, //undefined means adding next param without replacing anything
			filterToToReplaceWith: string | undefined, //undefined means removing first param without replacing it with anything
		}[] = [];
		for(let updatedHomepageRow of updatedHomepageRows) {
			if(typeof updatedHomepageRow.labelTrimmed !== 'undefined') {
				console.warn('Unexpectedly found label', updatedHomepageRow.labelTrimmed, 'for filterTo row', updatedHomepageRow.newContentTrimmed);
			}
			updateSets.push({
				filterToToRemove: updatedHomepageRow.oldContent,
				filterToToReplaceWith: updatedHomepageRow.newContentTrimmed,
			});
		}
		if(regularlyUpdatingURLAndOverallQuery) {
			props.replaceOneFilterToAddressInReceiptQuery(
				updateSets,
				caseSensitiveSearch,
			); //local draftQuery updated when incoming receiptQuery changes
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.replaceOneFilterToAddress(
					currentDraftQuery,
					updateSets,
					caseSensitiveSearch,
				);
				return newQuery;
			});
		}
	}
	const updateTxMemoFromHomepageRows = function(
		txID: string,
		memoTrimmed?: string,
	) {
		return updateTxesInState(
			true,
			[{
				txHashToRemove: undefined, //not removing one
				txIDToAddTrimmed: txID,
				memoTrimmed: memoTrimmed,
			}]
		);
	}
	const addOrRemoveTxns = function(updatedHomepageRows: {
		oldContent?: string,
		newContentTrimmed?: string,
		labelTrimmed?: string,
	}[]) {
		let updateSets: {
			txHashToRemove?: string,
			txIDToAddTrimmed?: string,
			memoTrimmed?: string,
		}[] = [];
		for(let updatedHomepageRow of updatedHomepageRows) {
			updateSets.push({
				txHashToRemove: updatedHomepageRow.oldContent,
				txIDToAddTrimmed: updatedHomepageRow.newContentTrimmed,
				memoTrimmed: updatedHomepageRow.labelTrimmed,
			});
		}
		updateTxesInState(
			true,
			updateSets,
		);
	}
	const updateTxesInState = function(
		replaceKeyCase: boolean,
		updateSets: {
			txHashToRemove?: string,
			txIDToAddTrimmed?: string,
			memoTrimmed?: string,
		}[],
	) {
		let updateSetsToPassOn: {
			txHashToRemove: string | undefined, //undefined here means don't remove any
			txToAddOrUpdate: {hash: string, memoTrimmed: string} | undefined, //undefined here means don't add/update any
		}[] = [];
		for(let updateSet of updateSets) {
			const memoTrimmedHeld = (typeof updateSet.memoTrimmed === 'undefined') ? '' : updateSet.memoTrimmed; //to avoid removing txn.
			const txToAddOrUpdate = (typeof updateSet.txIDToAddTrimmed === 'undefined' ? undefined : {
				hash: updateSet.txIDToAddTrimmed,
				memoTrimmed: memoTrimmedHeld
			});
			updateSetsToPassOn.push({
				txHashToRemove: updateSet.txHashToRemove,
				txToAddOrUpdate,
			});
		}
		if(regularlyUpdatingURLAndOverallQuery) {
			props.updateAndPossiblyRemoveTxMemosInReceiptQuery(
				updateSetsToPassOn,
				replaceKeyCase,
			); //local draftQuery updated when incoming receiptQuery changes
		} else {
			setCurrentAndPushPastDraftQuery(function(currentDraftQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateAndPossiblyRemoveTxMemos(
					currentDraftQuery,
					updateSetsToPassOn,
					replaceKeyCase
				);
				return newQuery;
			});
		}
	}
	const printErrorOnUpdateFilterToLabel = (
		content: string,
		newLabelTrimmed?: string
	) => {
		console.error('Error: Got update of label for filterTo value',content,'to',newLabelTrimmed);
	}
	const submitReceiptQuery = (ev: React.MouseEvent) => {
		if(QueryParser.querySpecifiesAccountOrTx(draftQuery)) {
			if(!regularlyUpdatingURLAndOverallQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateValue(
					draftQuery,
					'showHome',
					false,
				);
				props.replaceReceiptQuery(newQuery);
			} else {
				props.setValueInAppReceiptQueryAndURL('showHome', false);
			}
		} else {
			console.info('Not submitting query with no addresses or transactions specified.');
		}
	}
	return (
		<>
		<div className='App'>
			<div className='homepage'>
				<LogoBlock style={{marginBottom: '1em'}} />
				<div>
					<div className='homepageParagraph'>
						Welcome to UnblockReceipts!
					</div>
					<div className='homepageParagraph'>
						To get a receipt by searching for multiple transactions from an account,
						<br />
						<Button
							variant='contained'
							color='primary'
							onClick={connectWallet}
						>Click here to connect to accounts you control</Button> or specify one or more accounts:
						<br />
						<ExpandingLabeledInputSet
							inputPlaceholder = {'e.g. AnyENSName.eth or '+ (connectedAddresses?.[0] || '0x0dc58008C371b240bAEE63Cb9D514C99d5e96c9A')}
							labelPlaceholder = {'Optional label: e.g. "Sam\'s Main Account"'}
							idStarter = 'address'
							rowDescriptor = 'address to find transactions from'
							value = {draftQuery.addresses}
							memos = {draftQuery.acctMemos}
							onContentUpdate = {addAndOrRemoveAccts}
							onLabelUpdate = {updateLabelForAcct}
							className = 'addressInput'
						/>
						<FormControlLabel
							control = {<Switch
								id = 'includeIncoming'
								checked = {draftQuery.includeIncoming}
								color = 'default' //TODO: Pick another color with sufficient contrast that still looks good
								onChange = {includeIncomingCheckboxChanged}
							/>}
							label = 'Include incoming transactions (search by "to" in addition to "from")'
							componentsProps = {{typography: {sx: {
								fontSize: 'calc(10px + 2vmin)',
							}}}}
						/>
						<TimeSelector
							receiptQuery = {draftQuery}
							changeTimeOption = {changeTimeOption}
							setBlockRangeStart = {setBlockRangeStart}
							setBlockRangeEnd = {setBlockRangeEnd}
							setRangeStart = {setRangeStart}
							setRangeEnd = {setRangeEnd}
						/>
					</div>
					<div className='homepageParagraph'>
						Here, you can optionally add memos about individual transactions. <br />
						Any listed transactions will be added to any found when searching by account(s, if any are specified above). <br />
						You can also use just this part of the form to get a receipt for a specific single transaction.<br />
						<ExpandingLabeledInputSet
							inputPlaceholder = 'e.g. 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2'
							labelPlaceholder = 'Optional memo: Add notes about this transaction'
							value = {Object.keys(draftQuery.txMemos)}
							idStarter = 'txes'
							rowDescriptor = 'specified transaction'
							memos = {draftQuery.txMemos}
							onContentUpdate = {addOrRemoveTxns}
							onLabelUpdate = {updateTxMemoFromHomepageRows}
							className = 'txHashInput'
						/>
						<br />
						<label htmlFor='filterToInput'>
							Optional: Filter results from the above to show only transactions TO the following address(es):
							<br />
						</label>
						<ExpandingLabeledInputSet
							value = {draftQuery.filterTo}
							idStarter = 'filterTo'
							rowDescriptor = 'TO address to filter on'
							onContentUpdate = {replaceFilterToAddressesInHomepageRows}
							onLabelUpdate = {printErrorOnUpdateFilterToLabel}
							className = 'addressInput'
							inputPlaceholder = {'e.g. AnyENSName.eth or 0x0dc58008C371b240bAEE63Cb9D514C99d5e96c9A'}
						/>
						<br />
						<Button
							variant='contained'
							color='primary'
							onClick={submitReceiptQuery}
						>Get receipt!</Button>
					</div>
				</div>
				<div className='homepageDetail'>
					<p>
						Where multiple rows are allowed above,
						you can click in the first column and paste
						multiple rows separated by line breaks.
						<br />
						Within a line, you can use the tab character
						to advance to the next column on paste.
					</p>
					<p>
						For a more detailed guide on how to dynamically build links in this
						application, <a href='/docs' onClick={props.goToDocs}>click here</a>.
					</p>
				</div>
			</div>
		</div>
		</>
	);
}
