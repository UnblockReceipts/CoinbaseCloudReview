import type {
	MemosObject,
	ReceiptQuery,
	RelativeTimeOption,
	ViewOption
} from './QueryParser';
import { ReceiptQueryObjectUpdater } from './ReceiptQueryObjectUpdater';
import { URLParser } from './URLParser';

export const URLManipulator = {

	getCurrentURL() : URL {
		return new URL(window.location.toString());
	},

	setValueInURL(
		urlKey: string,
		value: string | undefined, //no default to support better typechecking; undefined removes it
	) {
		let urlObj = URLManipulator.getCurrentURL();
		urlObj = URLManipulator.setValueInURLObj(
			urlObj,
			urlKey,
			value
		)
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setValueInURLObj (
		urlObj: URL,
		urlKey: string,
		value: string | undefined, //no default to support better typechecking; undefined removes it
	) {
		if(typeof value === 'undefined') {
			urlObj.searchParams.delete(urlKey);
		} else {
			urlObj.searchParams.set(urlKey, value);
		}
		return urlObj;
	},

	setTxMemosInURLObj(
		urlObj: URL,
		txMemos: MemosObject,
	) : URL {
		//TODO: URIencode variable params to searchParams.set() calls below?
		let unMemoedTxes = [];
		for(let memoedHash of Object.keys(txMemos)) {
			const trimmedHash = memoedHash.trim();
			const trimmedMemo = txMemos[memoedHash].trim();
			if(trimmedHash.length > 0) {
				if(trimmedMemo.length === 0) {
					unMemoedTxes.push(memoedHash);
				} else { //TODO: Prior validation w/reflection to user that this looks like a tx hash, w/looksLikeTxHashes
					urlObj.searchParams.set(memoedHash, trimmedMemo);
				}
			}
		}
		if(urlObj.pathname.startsWith(URLParser.SINGLE_TX_START)) {
			//Removal of the /tx/ syntax if no txes are specified there
			//is not found in URLManipulator.updatePathnameIfAppropriateToSetTxMemo,
			//so not removing it here for consistency.
			urlObj.pathname = URLManipulator.setPathPortionEndingAtOptionalSlash(urlObj.pathname, URLParser.SINGLE_TX_START.length, unMemoedTxes.join(','));
		} else if(unMemoedTxes.length > 0) {
			urlObj.searchParams.set('tx', unMemoedTxes.join(','));
		}
		return urlObj;
	},

	setAddressesInURLObj(
		urlObj: URL,
		addressesOrOnChainLabels: string[],
	) : URL {
		//TODO: URIencode variable params to searchParams.set() call below?
		const newAddressListJoined = addressesOrOnChainLabels.join(',');
		if(urlObj.pathname.startsWith(URLParser.ADDRESS_START)) {
			urlObj.pathname = URLManipulator.setPathPortionEndingAtOptionalSlash(urlObj.pathname, URLParser.ADDRESS_START.length, newAddressListJoined);
		} else if(addressesOrOnChainLabels.length > 0) {
			urlObj.searchParams.set('acct', newAddressListJoined);
		}
		return urlObj;
	},

	makeURLFromReceiptQueryAndCurrentPath(
		receiptQuery : ReceiptQuery,
	) : URL {
		let urlObj = URLManipulator.getCurrentURL();
		//Clear out existing search params:
		for(let key of urlObj.searchParams.keys()) {
			urlObj.searchParams.delete(key);
		}
		//TODO: URIencode variable params to searchParams.set() calls below?
		urlObj = URLManipulator.setTxMemosInURLObj(
			urlObj,
			receiptQuery.txMemos,
		);
		urlObj = URLManipulator.setAddressesInURLObj(
			urlObj,
			receiptQuery.addresses,
		);
		urlObj = URLManipulator.setRelativeTimeInURLObj(
			urlObj,
			receiptQuery.relativeTime,
		)
		if(receiptQuery.filterTo.length > 0) {
			urlObj.searchParams.set('filterTo', receiptQuery.filterTo.join(','));
		}
		if(typeof receiptQuery.blockStart !== 'undefined') { //TODO: Add && !empty check?
			urlObj.searchParams.set('blockStart', receiptQuery.blockStart.toString());
		}
		if(typeof receiptQuery.blockEnd !== 'undefined') { //TODO: Add && !empty check?
			urlObj.searchParams.set('blockEnd', receiptQuery.blockEnd.toString());
		}
		if(typeof receiptQuery.msStart !== 'undefined') { //TODO: Add && !empty check?
			urlObj.searchParams.set('start', receiptQuery.msStart.valueOf().toString());
		}
		if(typeof receiptQuery.msEnd !== 'undefined') { //TODO: Add && !empty check?
			urlObj.searchParams.set('end', receiptQuery.msEnd.valueOf().toString());
		}
		if(receiptQuery.labelsAsOfTxTime) {
			urlObj.searchParams.set('chainLabels', 'then');
		}
		if(receiptQuery.includeIncoming) {
			urlObj.searchParams.set('includeIncoming', 'true');
		}
		if(receiptQuery.downloadOnFirstLoad) {
			urlObj.searchParams.set('downloadOnFirstLoad', 'true');
		}
		if(receiptQuery.lock) {
			urlObj.searchParams.set('lock', 'true');
		}
		if(receiptQuery.showHome) {
			urlObj.searchParams.set('home', 'true');
		}
		if(receiptQuery.view === 'list') {
			urlObj.searchParams.set('view', 'list');
		}
		return urlObj;
	},

	setAddressesInCurrentURLReturnObj(
		addressesOrOnChainLabels: string[],
	) {
		let urlObj = URLManipulator.getCurrentURL();
		urlObj.searchParams.delete('acct'); //clear any existing value out first
		urlObj = URLManipulator.setAddressesInURLObj(
			urlObj,
			addressesOrOnChainLabels,
		);
		return urlObj;
	},

	setAddressesInURL(
		addressesOrOnChainLabels: string[],
	) {
		const urlObj = URLManipulator.setAddressesInCurrentURLReturnObj(addressesOrOnChainLabels);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setTxMemosInURL(
		txMemos: MemosObject,
	) {
		let urlObj = URLManipulator.getCurrentURL();
		urlObj.searchParams.delete('tx'); //clear any existing value out first
		urlObj = URLManipulator.setTxMemosInURLObj(
			urlObj,
			txMemos,
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setMemoInURLObj(
		urlObj: URL,
		txHash: string,
		newMemoTrimmed: string | undefined, //undefined removes it from URL; not using ?: to avoid default undefined
		replaceKeyCase: boolean = false,
	) {
		let lowercaseTxHash = txHash.toLowerCase();
		let {
			pathname,
			setInPathnameParam
		} = URLManipulator.updatePathnameIfAppropriateToSetTxMemo(
			urlObj.pathname,
			newMemoTrimmed,
			txHash,
			lowercaseTxHash,
			replaceKeyCase,
		);
		urlObj.pathname = pathname;
		let matchingMemoParamFound = false;
		let setAsMemoParam = false;
		for(const key of urlObj.searchParams.keys()) {
			if(key.toLowerCase() === lowercaseTxHash) {
				matchingMemoParamFound = true;
				if(setInPathnameParam || typeof newMemoTrimmed === 'undefined') {
					urlObj.searchParams.delete(key);
				} else {
					if(newMemoTrimmed.length > 0) {
					urlObj.searchParams.set((replaceKeyCase ? txHash : key), newMemoTrimmed);
						setAsMemoParam = true;
					}
				}
			}
		}
		if(
			!matchingMemoParamFound &&
			!setInPathnameParam
		) {
			if(typeof newMemoTrimmed !== 'undefined' && newMemoTrimmed.length > 0) {
				urlObj.searchParams.set(txHash, newMemoTrimmed);
				setAsMemoParam = true;
			}
		}
		let matchFoundInTxParam = false;
		let setInTxParam = false;
		let joinedTxList = urlObj.searchParams.get('tx');
		if(joinedTxList !== null) {
			let newTxParamEntries: string[] = [];
			const txesFromParam = URLParser.splitToMultipleIDs(joinedTxList);
			for(let txInParam of txesFromParam) {
				if(txInParam.toLowerCase() === lowercaseTxHash) {
					matchFoundInTxParam = true;
					if(
						!setInPathnameParam &&
						!setAsMemoParam &&
						typeof newMemoTrimmed !== 'undefined' &&
						newMemoTrimmed.length === 0
					) {
						newTxParamEntries.push((replaceKeyCase ? txHash : txInParam));
						setInTxParam = true;
					}
				} else {
					newTxParamEntries.push(txInParam);
				}
			}
			if(
				!setInPathnameParam &&
				!setAsMemoParam &&
				!matchFoundInTxParam &&
				typeof newMemoTrimmed !== 'undefined' &&
				newMemoTrimmed.length === 0
			) {
				newTxParamEntries.push(txHash);
				setInTxParam = true;
			}
			if(newTxParamEntries.length === 0) {
				urlObj.searchParams.delete('tx');
			} else {
				urlObj.searchParams.set('tx', newTxParamEntries.join(','));
			}
		} else if(
			!setInPathnameParam &&
			!setAsMemoParam &&
			!matchFoundInTxParam &&
			typeof newMemoTrimmed !== 'undefined' &&
			newMemoTrimmed.length === 0
		) {
			urlObj.searchParams.set('tx', txHash);
			setInTxParam = true;
		}
		if(typeof newMemoTrimmed !== 'undefined' ) {
			if(!setInPathnameParam && !setAsMemoParam && !setInTxParam) {
				console.warn('Likely programming bug: did not correctly set txMemo', newMemoTrimmed, 'for', txHash, 'in URL.');
			}
		} else {
			if(setInPathnameParam || setAsMemoParam || setInTxParam) {
				console.warn('Likely programming bug: incorrectly set '+txHash+' in URL.');
			}
		}
		return urlObj;
	},

	//See also similar primary structure in ReceiptQueryObjectUpdater.updateAndPossiblyRemoveTxMemos
	setAndPossiblyRemoveTxMemosInURL(
		updateSets: {
			txHashToRemove: string | undefined, //undefined here means don't remove any
			txToAddOrUpdate: {hash: string, memoTrimmed: string} | undefined, //undefined here means don't add/update any
		}[],
		replaceKeyCase: boolean = false,
	) {
		let urlObj = URLManipulator.getCurrentURL();
		for(let updateSet of updateSets) {
			if(typeof updateSet.txHashToRemove !== 'undefined') {
				urlObj = URLManipulator.setMemoInURLObj(
					urlObj,
					updateSet.txHashToRemove,
					undefined, //removes it
					replaceKeyCase,
				);
			}
			if(typeof updateSet.txToAddOrUpdate !== 'undefined') {
				urlObj = URLManipulator.setMemoInURLObj(
					urlObj,
					updateSet.txToAddOrUpdate.hash,
					updateSet.txToAddOrUpdate.memoTrimmed,
					replaceKeyCase,
				);
			}
		}
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	//Appears unused:
	setMemoInURL(
		txHash: string,
		newMemoTrimmed: string | undefined, //undefined removes it from URL; not using ?: to avoid default undefined
		replaceKeyCase: boolean = false,
	){
		let urlObj = URLManipulator.getCurrentURL();
		urlObj = URLManipulator.setMemoInURLObj(
			urlObj,
			txHash,
			newMemoTrimmed,
			replaceKeyCase,
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	addAccountToURLAndGo(
		addressOrOnChainLabelToAdd: string,
		caseSensitive: boolean = false,
	) {
		let {
			urlObj,
			didAddition
		} = URLManipulator.addAndOrRemoveSingleAccountFromCurrentURL(
			undefined,
			addressOrOnChainLabelToAdd,
			caseSensitive
		);
		if(didAddition) {
			window.location.assign(urlObj);
		}
		return Promise.resolve(undefined); // undefined doesn't show success/failure on button
	},

	addAndOrRemoveSingleAccountFromCurrentURL(
		addressOrOnChainLabelToRemove: string | undefined,
		addressOrOnChainLabelToAdd: string | undefined,
		caseSensitive: boolean = false,
	) : {
		urlObj: URL,
		didRemoval: boolean,
		didAddition: boolean,
	} {
		let urlObj = URLManipulator.getCurrentURL();
		let currentAddressList = URLParser.getAcctListFromURL(urlObj);
		const resultOfCopyWithChange = ReceiptQueryObjectUpdater.copyWithOptionalSingleRemovalAndAddition(
			currentAddressList,
			addressOrOnChainLabelToRemove,
			addressOrOnChainLabelToAdd,
			caseSensitive,
		);
		if(resultOfCopyWithChange.didRemoval) {
			urlObj = URLManipulator.setAddressesInURLObj(urlObj, resultOfCopyWithChange.newList);
		}
		return {
			urlObj,
			didRemoval: resultOfCopyWithChange.didRemoval,
			didAddition: resultOfCopyWithChange.didAddition,
		};
	},

	removeAccountFromURLAndGo(
		addressOrOnChainLabel: string,
		caseSensitive: boolean = false,
	) {
		let {
			urlObj,
			didRemoval
		} = URLManipulator.addAndOrRemoveSingleAccountFromCurrentURL(
			addressOrOnChainLabel,
			undefined,
			caseSensitive
		);
		if(didRemoval) {
			window.location.assign(urlObj);
		}
		return Promise.resolve(undefined); // undefined doesn't show success/failure on button
	},

	setFilterInURL(
		filterToShowOnlyTxnsTo?: string[]
	){
		let urlObj = URLManipulator.getCurrentURL();
		if(typeof filterToShowOnlyTxnsTo === 'undefined' || filterToShowOnlyTxnsTo.length === 0) {
			urlObj.searchParams.delete('filterTo');
		} else {
			urlObj.searchParams.set('filterTo', filterToShowOnlyTxnsTo.join(',')); //URIEncode?
		}
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setAcctLabelInURLObj(
		urlObj: URL,
		addressOrOnChainLabel: string,
		newLabelTrimmed?: string
	){
		let lowercaseWhatToLabel = addressOrOnChainLabel.toLowerCase();
		let matchingMemoParamFound = false;
		for(const key of urlObj.searchParams.keys()) {
			if(key.toLowerCase() === lowercaseWhatToLabel) {
				matchingMemoParamFound = true;
				if(typeof newLabelTrimmed !== 'undefined' && newLabelTrimmed.length > 0) {
					urlObj.searchParams.set(key, newLabelTrimmed); //keep whatever case was specified
				} else {
					urlObj.searchParams.delete(key);
				}
			}
		}
		if(!matchingMemoParamFound && typeof newLabelTrimmed !== 'undefined' && newLabelTrimmed.length > 0) {
			urlObj.searchParams.set(addressOrOnChainLabel, newLabelTrimmed);
		}
		return urlObj;
	},

	setRelativeTimeInURL(
		newValue: RelativeTimeOption | undefined,
	) {
		let urlObj = URLManipulator.setRelativeTimeInURLObj(
			URLManipulator.getCurrentURL(),
			newValue,
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	//Keep in sync with URLParser.parseRelativeTime
	setRelativeTimeInURLObj(
		urlObj: URL,
		newValue: RelativeTimeOption | undefined,
	) {
		if(
			typeof newValue === 'undefined' || //specifiedTimes is the default
			newValue === 'specifiedTimes'
		) {
			//delete those that take priority:
			urlObj.searchParams.delete('last');
			urlObj.searchParams.delete('past');
			urlObj.searchParams.delete('blockStart');
			urlObj.searchParams.delete('blockEnd');
		} else if(newValue === 'specifiedBlocks') {
			//delete those that take priority
			urlObj.searchParams.delete('last');
			urlObj.searchParams.delete('past');
			//ensure that there's something which will trigger specifiedBlocks
			if(
				urlObj.searchParams.get('blockStart') === null &&
				urlObj.searchParams.get('blockEnd') === null
			) {
				urlObj.searchParams.set('blockStart', '');
			}
		} else if (newValue.startsWith('last')) {
			urlObj.searchParams.delete('past');
			urlObj.searchParams.set('last', newValue.substring(4).toLowerCase());
		} else if(newValue.startsWith('past')) {
			urlObj.searchParams.delete('last');
			urlObj.searchParams.set('past', newValue.substring(4).toLowerCase());
		}
		return urlObj;
	},

	setTimeBoundInURL(
		receiptQueryKey: 'msStart' | 'msEnd',
		newValue: Date | undefined,
	) {
		let urlObj = URLManipulator.getCurrentURL();
		if(receiptQueryKey === 'msStart') {
			urlObj = URLManipulator.setValueInURLObj(
				urlObj,
				'start',
				newValue?.valueOf().toString()
			);
		} else if (receiptQueryKey === 'msEnd') {
			urlObj = URLManipulator.setValueInURLObj(
				urlObj,
				'end',
				newValue?.valueOf().toString()
			);
		}
		urlObj = URLManipulator.setRelativeTimeInURLObj(
			urlObj,
			'specifiedTimes'
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setBlockBoundInURL(
		receiptQueryKey: 'blockStart' | 'blockEnd',
		newValue?: number,
	) {
		let urlObj = URLManipulator.getCurrentURL();
		if(receiptQueryKey === 'blockStart') {
			urlObj = URLManipulator.setValueInURLObj(
				urlObj,
				'blockStart',
				newValue?.valueOf().toString()
			);
		} else if (receiptQueryKey === 'blockEnd') {
			urlObj = URLManipulator.setValueInURLObj(
				urlObj,
				'blockEnd',
				newValue?.valueOf().toString()
			);
		}
		urlObj = URLManipulator.setRelativeTimeInURLObj(
			urlObj,
			'specifiedBlocks'
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	setAcctLabelInURL(
		addressOrOnChainLabel: string,
		newLabelTrimmed?: string
	){
		const urlObj = URLManipulator.setAcctLabelInURLObj(
			URLManipulator.getCurrentURL(),
			addressOrOnChainLabel,
			newLabelTrimmed
		);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	},

	updatePathnameIfAppropriateToSetTxMemo(
		pathname: string,
		newMemoTrimmed: string | undefined, //undefined removes it from URL; not using ?: to avoid default undefined
		txHash: string,
		lowercaseTxHash: string = txHash.toLowerCase(), //param for pre-computation option
		replaceKeyCase: boolean = false,
	) {
		let setInPathnameParam = false;
		if (pathname.startsWith(URLParser.SINGLE_TX_START)) {
			//Remove duplicate specification of tx in URL.
			let txIdsFromPath = URLParser.splitToMultipleIDs(URLParser.getPathPortionEndingAtOptionalSlash(pathname, URLParser.SINGLE_TX_START.length));
			let matchingTxEntryFound = false;
			for(let txIdIndex = 0; txIdIndex < txIdsFromPath.length; txIdIndex++) {
				if(txIdsFromPath[txIdIndex].toLowerCase() === lowercaseTxHash) {
					matchingTxEntryFound = true;
					if(typeof newMemoTrimmed === 'undefined' || newMemoTrimmed.length > 0) {
						//Either this tx is being removed or moving out to its own parameter; delete it from here.
						txIdsFromPath.splice(txIdIndex, 1);
					} else { //newMemoTrimmed is defined and of length 0
						if(replaceKeyCase && (txIdsFromPath[txIdIndex] !== txHash)) {
							//need to replace casing of hash:
							txIdsFromPath.splice(txIdIndex, 1, txHash);
						} //else, don't need to do anything but the tx is still in this pathname param.
						setInPathnameParam = true;
					}
					break;
				}
			}
			if(!matchingTxEntryFound && typeof newMemoTrimmed !== 'undefined' && newMemoTrimmed.length === 0) {
				txIdsFromPath.push(txHash);
				setInPathnameParam = true;
			}
			pathname = URLManipulator.setPathPortionEndingAtOptionalSlash(pathname, URLParser.SINGLE_TX_START.length, txIdsFromPath.join(','));
		}
		return {pathname, setInPathnameParam}
	},

	setPathPortionEndingAtOptionalSlash(strIn: string, startPos: number, newValue: string) {
		let txHashEndsBefore = URLParser.getEndOfPathPortion(strIn, startPos);
		return strIn.substring(0, startPos) + newValue + strIn.substring(txHashEndsBefore, strIn.length);
	},

	getViewURLParamValue(
		value: ViewOption
	) {
		return value === 'list' ? value : undefined;
	},

	getFilterToURLParamValue(
		valueCast: string[],
	) {
		return valueCast.length === 0 ? undefined : valueCast.join(',');
	},

};
