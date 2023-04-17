import { QueryParser } from './QueryParser';
import type { MemosObject, ReceiptQuery } from './QueryParser';

export const ReceiptQueryObjectUpdater = {

	//Split out for cognitive complexity reduction
	copyWithRemovalAndPossibleCaseReplacement(
		searchIn: string[],
		whatToRemove: string,
		whatToAdd: string | undefined, //if undefined, don't add anything.
		caseSensitive: boolean, //if true, treats strings with different casing as different.
	) {
		let newList: string[] = [];
		let didRemoval = false;
		let didAddition = false;
		const whatToRemoveLowercase = whatToRemove.toLowerCase();
		for(let candidate of searchIn) {
			if(whatToRemoveLowercase === candidate.toLowerCase()) {
				if(!caseSensitive) {
					didRemoval = true;
				} else if(whatToRemove === candidate) {
					didRemoval = true;
					if(whatToRemove.toLowerCase() === whatToAdd?.toLowerCase()) {
						newList.push(whatToAdd);
						didAddition = true;
					}
				} else {
					newList.push(candidate);
				}
			} else {
				newList.push(candidate);
			}
		}
		return {
			newList,
			didRemoval,
			didAddition,
		}
	},

	copyWithOptionalSingleRemovalAndAddition(
		searchIn: string[],
		whatToRemove: string | undefined, //if undefined, don't remove anything.
		whatToAdd: string | undefined, //if undefined, don't add anything.
		caseSensitive: boolean, //if true, treats strings with different casing as different.
	) {
		let newList: string[] = [];
		let didRemoval = false;
		let didAddition = false;
		if(typeof whatToRemove !== 'undefined') {
			({
				newList,
				didRemoval,
				didAddition
			} = ReceiptQueryObjectUpdater.copyWithRemovalAndPossibleCaseReplacement(
				searchIn,
				whatToRemove,
				whatToAdd,
				caseSensitive
			));
		} else {
			newList.push(...searchIn);
		}
		if(typeof whatToAdd !== 'undefined' && !didAddition) {
			newList.push(whatToAdd);
			didAddition = true;
		}
		return {
			newList,
			didRemoval,
			didAddition,
		};
	},

	copyAndUpdateMemosObject(
		memosObject: MemosObject,
		keyToChange: string,
		allowEmptyValues: boolean,
		newValue: string | undefined, //not using ?: to avoid a default here & enhance typechecking; undefined will remove it from memosObject.
		replaceKeyCase: boolean = false,
	) : {newMemosObject: MemosObject, oldValue?: string} {
		let newMemosObject: MemosObject = {};
		let searchTarget = keyToChange.toLowerCase();
		let foundKey = false;
		let oldValue : string | undefined = undefined;
		for(let key of Object.keys(memosObject)) {
			if(key.toLowerCase() === searchTarget) {
				foundKey = true;
				oldValue = memosObject[key];
				if(typeof newValue !== 'undefined' && (allowEmptyValues || newValue.length > 0)) {
					newMemosObject[(replaceKeyCase ? keyToChange : key)] = newValue;
				} //else, newMemosObject won't have this key in it
			} else {
				newMemosObject[key] = memosObject[key];
			}
		}
		if(!foundKey && typeof newValue !== 'undefined' && (allowEmptyValues || newValue.length > 0)) {
			newMemosObject[keyToChange] = newValue;
		};
		return {newMemosObject, oldValue};
	},

	//See also similar primary structure in URLManipulator.setAndPossiblyRemoveTxMemosInURL
	updateAndPossiblyRemoveTxMemos(
		receiptQuery: ReceiptQuery,
		updateSets: {
			txHashToRemove: string | undefined, //undefined here means don't remove any
			txToAddOrUpdate: {hash: string, memoTrimmed: string} | undefined, //undefined here means don't add/update any
		}[],
		replaceKeyCase: boolean = false,
	) : ReceiptQuery {
		for(let updateSet of updateSets) {
			if(typeof updateSet.txHashToRemove !== 'undefined') {
				receiptQuery = ReceiptQueryObjectUpdater.updateTxMemoInReceiptQueryObject(
					receiptQuery,
					updateSet.txHashToRemove,
					undefined, //undefined removes it
					replaceKeyCase,
				);
			}
			if(typeof updateSet.txToAddOrUpdate !== 'undefined') {
				receiptQuery = ReceiptQueryObjectUpdater.updateTxMemoInReceiptQueryObject(
					receiptQuery,
					updateSet.txToAddOrUpdate.hash,
					updateSet.txToAddOrUpdate.memoTrimmed,
					replaceKeyCase,
				);
			}
		}
		return receiptQuery;
	},

	updateTxMemoInReceiptQueryObject(
		receiptQuery: ReceiptQuery,
		txHashToAddOrUpdate: string,
		newMemoTrimmed: string | undefined, //undefined removes it; not using ?: to avoid default undefined
		replaceKeyCase: boolean = false,
	) : ReceiptQuery {
		const copyAndUpdateResult = ReceiptQueryObjectUpdater.copyAndUpdateMemosObject(
			receiptQuery.txMemos,
			txHashToAddOrUpdate,
			true, //allowEmptyValues
			newMemoTrimmed,
			replaceKeyCase,
		);
		const newTxMemos = copyAndUpdateResult.newMemosObject;
		return {
			...receiptQuery,
			txMemos: newTxMemos,
		}
	},

	updateAcctLabel(
		receiptQuery: ReceiptQuery,
		addressOrOnChainLabel: string,
		newLabelTrimmed?: string,
		replaceKeyCase: boolean = false,
	) : ReceiptQuery {
		const copyAndUpdateResult = ReceiptQueryObjectUpdater.copyAndUpdateMemosObject(
			receiptQuery.acctMemos,
			addressOrOnChainLabel,
			false, //allowEmptyValues
			newLabelTrimmed,
			replaceKeyCase,
		);
		const newAcctMemos = copyAndUpdateResult.newMemosObject;
		return {
			...receiptQuery,
			acctMemos: newAcctMemos,
		}
	},

	addAndOrRemoveAccounts(
		receiptQuery: ReceiptQuery,
		updateSets: {
			addressOrOnChainLabelToRemove: string | undefined,
			addressOrOnChainLabelToAdd: string | undefined,
			labelOfAccountToAddTrimmed: string | undefined, //if undefined, don't check labels. If defined & different from current, override label
		}[],
		caseSensitive: boolean = true, //note that label will always be treated as case-sensitive.
	) {
		let updatedLabels: {
			addressOrOnChainLabelToAdd: string;
			labelOfAccountToAddTrimmed?: string;
		}[] = [];
		for(let updateSet of updateSets) {
			let resultFromSingleInstance = ReceiptQueryObjectUpdater.addAndOrRemoveAccount(
				receiptQuery,
				updateSet.addressOrOnChainLabelToRemove,
				updateSet.addressOrOnChainLabelToAdd,
				updateSet.labelOfAccountToAddTrimmed,
				caseSensitive,
			);
			receiptQuery = resultFromSingleInstance.newQuery;
			if(resultFromSingleInstance.setLabel) {
				if(typeof updateSet.addressOrOnChainLabelToAdd === 'undefined') {
					console.error('Programming bug: got setLabel back but addressOrOnChainLabelToAdd was unexpectedly undefined.');
				} else {
					updatedLabels.push({
						addressOrOnChainLabelToAdd: updateSet.addressOrOnChainLabelToAdd,
						labelOfAccountToAddTrimmed: updateSet.labelOfAccountToAddTrimmed,
					});
				}
			}
		}
		return {
			newQuery: receiptQuery,
			updatedLabels,
		}
	},

	addAndOrRemoveAccount(
		receiptQuery: ReceiptQuery,
		addressOrOnChainLabelToRemove: string | undefined,
		addressOrOnChainLabelToAdd: string | undefined,
		labelOfAccountToAddTrimmed: string | undefined, //if undefined, don't check labels. If defined & different from current, override label
		caseSensitive: boolean = true, //note that label will always be treated as case-sensitive.
	) : {
		newQuery: ReceiptQuery,
		setLabel: boolean,
	} {
		const resultOfCopyWithout = ReceiptQueryObjectUpdater.copyWithOptionalSingleRemovalAndAddition(
			receiptQuery.addresses,
			addressOrOnChainLabelToRemove,
			addressOrOnChainLabelToAdd,
			caseSensitive
		);
		let newQuery = {
				...receiptQuery,
				addresses: resultOfCopyWithout.newList,
		};
		let setLabel = false;
		if(typeof addressOrOnChainLabelToAdd !== 'undefined') {
			const currentLabel = QueryParser.getMemoCaseInsensitiveSearch(addressOrOnChainLabelToAdd, receiptQuery.acctMemos);
			if(currentLabel !== labelOfAccountToAddTrimmed) {
				setLabel = true;
				newQuery = ReceiptQueryObjectUpdater.updateAcctLabel(
					newQuery,
					addressOrOnChainLabelToAdd,
					labelOfAccountToAddTrimmed,
					caseSensitive,
				);
			}
		}
		return {
			newQuery,
			setLabel,
		}
	},

	addAccounts(
		receiptQuery: ReceiptQuery,
		addressesOrOnChainLabelsToAdd: string[],
		replaceCase: boolean,
	) : ReceiptQuery {
		//TODO: Efficiency improvement,
		//which will require repeating some code/implementation
		for(let addressOrOnChainLabelToAdd of addressesOrOnChainLabelsToAdd) {
			receiptQuery = ReceiptQueryObjectUpdater.addAndOrRemoveAccounts(
				receiptQuery,
				[{
					addressOrOnChainLabelToRemove: undefined,
					addressOrOnChainLabelToAdd,
					labelOfAccountToAddTrimmed: undefined, //not checking labels
				}],
				replaceCase
			).newQuery;
		}
		return receiptQuery;
	},

	replaceOneFilterToAddress(
		receiptQuery: ReceiptQuery,
		updateSets: {
			filterToToRemove: string | undefined, //undefined means adding newValue without replacing anything
			filterToToReplaceWith: string | undefined, //undefined means removing oldValue without replacing it with anything
		}[],
		caseSensitiveSearch: boolean // false seems like a fine default
	) : ReceiptQuery {
		for(let updateSet of updateSets) {
			receiptQuery = {
				...receiptQuery,
				filterTo: ReceiptQueryObjectUpdater.copyWithOptionalSingleRemovalAndAddition(
					receiptQuery.filterTo,
					updateSet.filterToToRemove,
					updateSet.filterToToReplaceWith,
					caseSensitiveSearch
				).newList,
			}
		}
		return receiptQuery;
	},

	updateFilterTo(
		receiptQuery: ReceiptQuery,
		addressOrOnChainLabels?: string[],
	) : ReceiptQuery {
		let newFilterTo: string[] = [];
		if(typeof addressOrOnChainLabels !== 'undefined') {
			newFilterTo.push(...addressOrOnChainLabels);
		}
		return {
			...receiptQuery,
			filterTo: newFilterTo,
		}
	},

	updateTimeBound(
		receiptQuery: ReceiptQuery,
		propertyName: 'msStart' | 'msEnd',
		newValue?: Date,
	) {
		let newQuery = ReceiptQueryObjectUpdater.updateValue(
			receiptQuery,
			propertyName,
			newValue
		);
		newQuery = ReceiptQueryObjectUpdater.updateValue(
			newQuery,
			'relativeTime',
			undefined, //default, no need to specify 'specifiedTimes'
		);
		return newQuery;
	},

	updateBlockBound(
		receiptQuery: ReceiptQuery,
		propertyName: 'blockStart' | 'blockEnd',
		newValue?: number,
	) {
		let newQuery = ReceiptQueryObjectUpdater.updateValue(
			receiptQuery,
			propertyName,
			newValue
		);
		newQuery = ReceiptQueryObjectUpdater.updateValue(
			newQuery,
			'relativeTime',
			'specifiedBlocks',
		);
		return newQuery;
	},

	updateValue<K extends keyof ReceiptQuery>(
		receiptQuery: ReceiptQuery,
		key: K,
		value: ReceiptQuery[K],
	) : ReceiptQuery {
		return {
			...receiptQuery,
			[key]: value,
		}
	},
};
