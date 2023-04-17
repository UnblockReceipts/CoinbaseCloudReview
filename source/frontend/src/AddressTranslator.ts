import { ethers } from 'ethers';
import type {
	AccountLabel,
	LabelIndex,
	TxRowData
} from './components/Receipt/ChainDataFetcher';
import { Formatters } from './Formatters';
import type { MemosObject } from './QueryParser';

export interface AccountLabelSet {
	address ?: string;
	chainLabel ?: string;
	specifiedLabel ?: string;
	labelFootnote ?: number;
}

type StringCache = {[index: string]: //primary index:
	{[index: string]: //blockNumberString or 'latest'
		string | null //null notes that the fetch got an explicitly empty value; no need to check again
	}
}

type CacheName = keyof AddressTranslatorClass['caches'];

export class AddressTranslatorClass {
	caches: {
		names: StringCache; //primary key: lowercase hex address => name
		addresses: StringCache; //primary key: lowercase name or hex address (as specified by user) => hex address
	}
	constructor() {
		this.caches = {
			names: {},
			addresses: {},
		}
	}

	pickCache(
		cacheName: CacheName,
	) {
		const AddressTranslator = this;
		return (AddressTranslator.caches[cacheName as keyof typeof AddressTranslator.caches]) as StringCache;
	}

	readFromCache(
		cacheName : CacheName,
		cacheKey: string, //will handle lowercasing here
		blockNumberAsStringOrLatest: string, //Omitted for stricter typechecking: = 'latest',
	) {
		const AddressTranslator = this;
		const cache = AddressTranslator.pickCache(cacheName);
		return cache[blockNumberAsStringOrLatest]?.[cacheKey.toLowerCase()];
	}

	writeToCache(
		cacheName : CacheName,
		cacheKey: string, //will handle lowercasing here
		cacheValue: string | null, //could add | undefined if desiring to be able to clear an entry
		blockNumberAsStringOrLatest: string, //Omitted for stricter typechecking: = 'latest',
	) {
		const AddressTranslator = this;
		const cache = AddressTranslator.pickCache(cacheName);
		if(typeof cache[blockNumberAsStringOrLatest] === 'undefined') {
			cache[blockNumberAsStringOrLatest] = {};
		}
		cache[blockNumberAsStringOrLatest][cacheKey.toLowerCase()] = cacheValue;
	}

	// Plural version of caching fn
	async resolveENSsIfNecessary(
		addressesIn: string[],
		completeProgressStep: (() => void), //called addressesIn.length times
		throwIfAborted: () => void,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	): Promise<{convertedAddresses: string[], anyInputsWereENSNames: boolean}> {
		const AddressTranslator = this;
		let promises : Promise<{hexAddress: string, wasResolvedName: boolean}>[] = [];
		for (let address of addressesIn) {
			throwIfAborted();
			promises.push(AddressTranslator.#resolveENSIfNecessaryCached(
				address,
				completeProgressStep,
				throwIfAborted,
				blockNumberAsStringOrLatest,
			));
		}
		let initialResults = await Promise.all(promises);
		let convertedAddresses : string[] = [];
		let anyInputsWereENSNames = false;
		for(let result of initialResults) {
			if(Formatters.looksLikeHexAddress(result.hexAddress)) {
				convertedAddresses.push(result.hexAddress);
				anyInputsWereENSNames ||= result.wasResolvedName;
			} else {
				//TODO: Show in UI
				console.error('Could not resolve apparent ENS name ' + result.hexAddress + '. Will not show results for this account. Please check your spelling.');
			}
		}
		return {
			convertedAddresses,
			anyInputsWereENSNames
		}
	}

	// Caches
	async #resolveENSIfNecessaryCached(
		addressIn: string,
		completeProgressStep: (() => void), //called 1x
		throwIfAborted: () => void,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	): Promise<{hexAddress: string, wasResolvedName: boolean}> {
		const AddressTranslator = this;
		const cachedValue = AddressTranslator.readFromCache(
			'addresses',
			addressIn, //case insensitive per https://ethereum.stackexchange.com/q/32083/
			blockNumberAsStringOrLatest
		);
		throwIfAborted();
		if(typeof cachedValue === 'undefined') {
			const fetchedValue = await AddressTranslator.#resolveENSIfNecessary(
				addressIn,
				completeProgressStep,
				throwIfAborted,
				blockNumberAsStringOrLatest
			);
			AddressTranslator.writeToCache(
				'addresses',
				addressIn, //case insensitive per https://ethereum.stackexchange.com/q/32083/
				fetchedValue,
				blockNumberAsStringOrLatest
			);
			return {
				hexAddress: (fetchedValue === null) ? addressIn : fetchedValue,
				wasResolvedName: (fetchedValue !== null),
			};
		} else {
			completeProgressStep();
			return {
				hexAddress: (cachedValue === null) ? addressIn : cachedValue,
				wasResolvedName: (cachedValue !== null),
			};
		}
	}

	// Cached in #resolveENSIfNecessaryCached
	async #resolveENSIfNecessary(
		addressIn: string,
		completeProgressStep: (() => void), //called 1x
		throwIfAborted: () => void,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	): Promise<string | null> {
		const AddressTranslator = this;
		const provider = new ethers.CloudflareProvider();
		const resolvedName = await provider.resolveName(addressIn);
		if(resolvedName !== null) {
			AddressTranslator.writeToCache(
				'names',
				resolvedName, //case insensitive per https://ethereum.stackexchange.com/q/32083/
				addressIn,
				blockNumberAsStringOrLatest
			);
		}
		throwIfAborted();
		completeProgressStep();
		return resolvedName;
	}

	// Caches
	async getENSNameForAddressCached(
		hexAddress: string,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	) : Promise<string | null> {
		const AddressTranslator = this;
		const cacheResult = AddressTranslator.readFromCache(
			'names',
			hexAddress, //case insensitive
			blockNumberAsStringOrLatest
		);
		if(typeof cacheResult !== 'undefined') {
			return cacheResult;
		} else {
			const fetchedValue = await AddressTranslator.#getENSNameForAddress(
				hexAddress,
				blockNumberAsStringOrLatest
			);
			AddressTranslator.writeToCache(
				'names',
				hexAddress, //case insensitive
				fetchedValue,
				blockNumberAsStringOrLatest
			);
			return fetchedValue;
		}
	}

	// Cached in getENSNameForAddressCached
	async #getENSNameForAddress(
		hexAddress: string,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	) : Promise<string | null> {
		const provider = new ethers.CloudflareProvider();
		const reverseLookup = await provider.lookupAddress(hexAddress); //could be null if no ENS name found
		//NOTE: Reverse resolution doesn't always work if the owner doesn't have it configured;
		//see https://docs.ens.domains/contract-api-reference/reverseregistrar
		return reverseLookup;
	}

	async getAccountLabelSet(
		hexAddress: string | null,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
	) : Promise<AccountLabelSet> {
		const AddressTranslator = this;
		if(hexAddress === null) {
			return {};
		}
		const chainLabel = await AddressTranslator.getENSNameForAddressCached(
			hexAddress,
			blockNumberAsStringOrLatest
		);
		return {
			address: hexAddress,
			chainLabel: (chainLabel === null ? undefined : chainLabel),
		}
	}

	static isEmptyLabel = function(
		possiblyEmptyLabel: string | null | undefined
		//The return type here is not completely accurate and hard to express in TypeScript,
		//but it could also mean the input is an all-whitespace string.
	) : possiblyEmptyLabel is (undefined | null | '') {
		return (
			typeof possiblyEmptyLabel === 'undefined' ||
			possiblyEmptyLabel === null ||
			possiblyEmptyLabel.trim().length === 0
		);
	}

	static getAddressOrOnChainLabelFromSet(set: AccountLabelSet) : string {
		let addressOrOnChainLabel = (AddressTranslatorClass.isEmptyLabel(set.chainLabel) ? set.address : set.chainLabel);
		if(typeof addressOrOnChainLabel === 'undefined') {
			throw new Error('Likely programming bug: missing address or chain label.');
		}
		return addressOrOnChainLabel;
	}

	// If this is updated, also update the accelerator computeHasAnyToValuesNotInAcctsList in DataFetchingReceiptPage.
	static showAddOrRemoveAddressOnReport(
		queryIncludesLimitedAccounts: boolean,
		queriedAddressesLowercase: string[],
		addressOrOnChainLabel: string,
		anySpecifiedTxes: boolean,
	) : boolean | undefined {
		if(queriedAddressesLowercase.includes(addressOrOnChainLabel.toLowerCase())) {
			if (AddressTranslatorClass.computeCanRemoveAnyAddressesFromReport(queriedAddressesLowercase.length, anySpecifiedTxes)) {
				return false;
			}
		} else { //address was not specified as part of the query.
			if(queryIncludesLimitedAccounts) {
				return true;
			}
		}
	}

	static computeCanRemoveAnyAddressesFromReport(
		queriedAddressesLength: number,
		anySpecifiedTxes: boolean,
	) {
		return (queriedAddressesLength > 1 || (queriedAddressesLength === 1 && anySpecifiedTxes));
	}

	static setAccountLabels(
		txRows: TxRowData[],
		acctMemos: MemosObject,
	) {
		const txRowsSorted = [...txRows].sort(AddressTranslatorClass.compareTxRows);
		let acctMemosLowerCaseKeyMap: MemosObject = {};
		let memoedAddresses = Object.keys(acctMemos);
		for(let memoedAddress of memoedAddresses) {
			acctMemosLowerCaseKeyMap[memoedAddress.toLowerCase()] = memoedAddress;
		}
		let lowercaseMemoedAddresses = Object.keys(acctMemosLowerCaseKeyMap);
		let sortedAcctLabels: AccountLabel[] = [];
		let txRowsLabeled : TxRowData[] = [];
		let labelIndex : LabelIndex = {}; //key is case-as-memoed address or on-chain label; value is index in sortedAcctLabels
		for(let txRow of txRowsSorted) {
			//doing 'from' first as it's shown in an earlier column
			({
				labelIndex,
				sortedAcctLabels,
				txRow
			} = AddressTranslatorClass.createOrApplyFootnoteForParty(
				lowercaseMemoedAddresses,
				acctMemos,
				acctMemosLowerCaseKeyMap,
				labelIndex, //gets changed & returned
				sortedAcctLabels, //gets changed & returned
				txRow, //gets changed & returned
				'from', //party
			));
			({
				labelIndex,
				sortedAcctLabels,
				txRow
			} = AddressTranslatorClass.createOrApplyFootnoteForParty(
				lowercaseMemoedAddresses,
				acctMemos,
				acctMemosLowerCaseKeyMap,
				labelIndex, //gets changed & returned
				sortedAcctLabels, //gets changed & returned
				txRow, //gets changed & returned
				'to', //party
			));
			txRowsLabeled.push(txRow);
		}
		return {
			sortedAcctLabels,
			txRowsLabeled,
		};
	}

	static createOrApplyFootnoteForParty(
		lowercaseMemoedAddresses: string[],
		acctMemos: MemosObject,
		acctMemosLowerCaseKeyMap: MemosObject,
		labelIndex: LabelIndex, //gets changed & returned
		sortedAcctLabels: AccountLabel[], //gets changed & returned
		txRow: TxRowData, //gets changed & returned
		party: 'to' | 'from',
	) {
		let addrResult = AddressTranslatorClass.createOrApplyFootnoteForPartyAndField(
			lowercaseMemoedAddresses,
			acctMemos,
			acctMemosLowerCaseKeyMap,
			labelIndex, //gets changed & returned
			sortedAcctLabels, //gets changed & returned
			txRow, //gets changed & returned
			party,
			'address',
		);
		if(addrResult.foundMemo) {
			return addrResult; //could pull out foundMemo to discard that
		} else {
			return AddressTranslatorClass.createOrApplyFootnoteForPartyAndField(
				lowercaseMemoedAddresses,
				acctMemos,
				acctMemosLowerCaseKeyMap,
				labelIndex, //gets changed & returned
				sortedAcctLabels, //gets changed & returned
				txRow, //gets changed & returned
				party,
				'chainLabel',
			);
		}
	}

	static createOrApplyFootnoteForPartyAndField(
		lowercaseMemoedAddresses: string[],
		acctMemos: MemosObject,
		acctMemosLowerCaseKeyMap: MemosObject,
		labelIndex: LabelIndex, //gets changed & returned
		sortedAcctLabels: AccountLabel[], //gets changed & returned
		txRow: TxRowData, //gets changed & returned
		party: 'to' | 'from',
		field: 'address' | 'chainLabel',
	) {
		const txFieldValue = txRow[party][field];
		if(typeof txFieldValue !== 'undefined' && lowercaseMemoedAddresses.includes(txFieldValue.toLowerCase())) {
			let lowercaseMemoedAddress = txFieldValue.toLowerCase();
			return Object.assign({foundMemo: true}, AddressTranslatorClass.createOrApplyFootnoteForAcctLabel(
				lowercaseMemoedAddress,
				acctMemos,
				acctMemosLowerCaseKeyMap,
				labelIndex, //gets changed & returned
				sortedAcctLabels, //gets changed & returned
				txRow, //gets changed & returned
				party
			));
		} else {
			//If it was previously defined, remove it:
			txRow[party].specifiedLabel = undefined;
			txRow[party].labelFootnote = undefined;
			return { //unchanged original params
				labelIndex,
				sortedAcctLabels,
				txRow,
				foundMemo: false,
			}
		}
	}

	static createOrApplyFootnoteForAcctLabel(
		lowercaseMemoedAddress: string,
		acctMemos: MemosObject,
		acctMemosLowerCaseKeyMap: MemosObject,
		labelIndex: LabelIndex, //gets changed & returned
		sortedAcctLabels: AccountLabel[], //gets changed & returned
		txRow: TxRowData, //gets changed & returned
		party: 'to' | 'from',
	) {
		let mixedCaseAddressAsMemoed = acctMemosLowerCaseKeyMap[lowercaseMemoedAddress];
		if(typeof labelIndex[mixedCaseAddressAsMemoed] === 'undefined') {
			const footnoteNumber = sortedAcctLabels.push({
				addressOrOnChainLabel: mixedCaseAddressAsMemoed,
				specifiedLabel: acctMemos[mixedCaseAddressAsMemoed],
			});
			//-1 is because push returns new length & labelIndex stores the index
			labelIndex[mixedCaseAddressAsMemoed] = footnoteNumber - 1;
			txRow[party].specifiedLabel = acctMemos[mixedCaseAddressAsMemoed];
			txRow[party].labelFootnote = footnoteNumber;
		} else {
			let indexPosition = labelIndex[mixedCaseAddressAsMemoed];
			if(lowercaseMemoedAddress !== sortedAcctLabels[indexPosition].addressOrOnChainLabel.toLowerCase()) {
				console.error('Programming bug: Label applicability check for ' + txRow.to.address + ' failed, so label will not be shown.');
			} else {
				txRow[party].specifiedLabel = sortedAcctLabels[indexPosition].specifiedLabel;
				txRow[party].labelFootnote = indexPosition + 1;
			}
		}
		return {
			labelIndex,
			sortedAcctLabels,
			txRow
		};
	}

	static compareTxRows(
		a: TxRowData,
		b: TxRowData
	) {
		return Formatters.compareMultiLevel<TxRowData>(
			a,
			b,
			[
				'blockNumber',
				'txNumberInBlock'
			]
		);
	}

	static computeQueryIncludesLimitedAccounts(
		queriedAddressesLength: number,
		timeRangeConstraintType?: 'time' | 'block',
	) {
		return (queriedAddressesLength > 0) &&
		(typeof timeRangeConstraintType !== 'undefined');
	}
}
