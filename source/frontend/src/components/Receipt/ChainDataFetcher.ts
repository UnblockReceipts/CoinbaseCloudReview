
import { ethers } from 'ethers';
import { AddressTranslatorClass } from '../../AddressTranslator';
import type { AccountLabelSet } from '../../AddressTranslator';
import type { BlockTransaction, Transaction } from '../../ChainDataTypes';
import { EtherscanClass } from '../../Etherscan';
import { Formatters } from '../../Formatters';
import EthDater from 'ethereum-block-by-date';
import { MemosObject, ReceiptQuery, RelativeTimeOption } from '../../QueryParser';

type AccountBasedTransactionsSource = 'Etherscan' | 'none'; //being explicit about none to ensure it's not an accidental undefined

interface AccountBasedTransactionsMetaData {
  source: AccountBasedTransactionsSource;
}

interface BlockTransactionsWithSource {
  accountBasedTransactionsMetaData: AccountBasedTransactionsMetaData;
  blockTransactions: BlockTransaction[];
}

interface TxRowDataWithBlockTransactionsSource {
  accountBasedTransactionsMetaData: AccountBasedTransactionsMetaData;
	anyInputsWereENSNames: boolean;
  txRows: TxRowData[];
}

interface TimestampsPair {
	startBlockTimestamp ?: Date,
	endBlockTimestamp ?: Date,
}

// This type should always be found in an array,
// except when iterating over members:
export interface AccountLabel {
	// footnoteNumber: number not included b/c it should always be index + 1
	addressOrOnChainLabel: string,
	specifiedLabel: string
}

export interface LabelIndex {
	[index: string] : number; //key is case-as-memoed address or on-chain label; value is index in an AccountLabel array
}

export interface WrappedTxData {
  startBlockTimestamp?: Date;
  endBlockTimestamp?: Date;
	generatedAt: Date;
  accountBasedTransactionsMetaData: AccountBasedTransactionsMetaData;
  txRows: TxRowData[];
	txRowsFromAccts: string[];
	txRowsFromHashes: string[];
	sortedAcctLabels: AccountLabel[];
}

export interface TxRowData {
	txID: string;
	value: bigint;
	valueUSD: number;
	gasFeeETHwei: bigint;
	gasFeeUSD: number;
	timestamp: Date;
	from: AccountLabelSet;
	to: AccountLabelSet;
	memo?: string;
	errors: Error[];
	blockNumber: number;
	txNumberInBlock: number;
	functionName?: string;
}

export interface ProviderProvider {
	getProvider: () => ethers.JsonRpcApiProvider;
	name: string;
	likelyFailureReason?: string;
}

export class ChainDataFetcherClass {
	dater: EthDater;
	addressTranslator: AddressTranslatorClass;
	etherscan: EtherscanClass;
	providerProviders: ProviderProvider[] = [];
	txnData: {[index: string]: TxRowData | null} = {}; //index is lowercase txHash
	blockCache: {[index: number] : ethers.Block | null} = {};
	blockTimestampCache: {[index: number]: Date | null} = {}; //index is block number
	transactionCache: {[index: string]: ethers.TransactionResponse | null} = {}; //index is lowercase txHash
	receiptCache: {[index: string]: ethers.TransactionReceipt | null} = {}; //index is lowercase txHash
	ethPriceCache: {[index: number]: number} = {}; //index is blockTimestamp
	blockInfoByTimestampCache: {[index: number]: number} = {}; //index is valueOf Date, value is block number
	static GRAPH_DB_UNAVAILABLE : string = 'The Graph\'s database is currently unavailable for fetching price data.';
	static GRAPH_DB_MISC_ERROR : string = 'A miscellaneous error was encountered when try to read from The Graph.';

	constructor(providerProvider ?: ProviderProvider) {
		this.dater = new EthDater(
			//@ts-ignore EthDater typings not yet up to date with ethers v6.
			new ethers.CloudflareProvider()
		);
		this.addressTranslator = new AddressTranslatorClass();
		this.etherscan = new EtherscanClass();
		if(typeof providerProvider !== 'undefined') {
			this.providerProviders.push(providerProvider);
		}
		this.providerProviders.push(
			{
				getProvider: this.getInfuraProvider,
				name: 'Infura',
			},
			{
				getProvider: () => {return new ethers.CloudflareProvider()},
				name: 'Cloudflare',
			}
		);
	}

	// Caching should be handled in calling contexts.
	async getDataFromProvidersWithFallback<T>(
		fnToCallWithProvider: ((provider: ethers.JsonRpcApiProvider) => Promise<T>),
		fnCallDescriptionForLog: string,
		throwIfAborted: () => void,
		providerProviders: ProviderProvider[] = this.providerProviders,
		currentIndex: number = 0, //only specify on recursive calls; else leave default
	) : Promise<T> {
		const ChainDataFetcher = this;
		const providerProvider = providerProviders[currentIndex];
		const providerName = providerProvider.name;
		try {
			let provider = providerProvider.getProvider();
			throwIfAborted();
			let result = await fnToCallWithProvider(provider);
			return result;
		} catch (err: any) {
			if(err.message === 'Operation aborted') {
				throw(err); //without console warnings noted below.
			}
			let logMessage = 'Attempt to ' + fnCallDescriptionForLog + ' from '+ providerName +' failed' +
			(typeof providerProvider.likelyFailureReason === 'undefined' ? '' : ', likely because ' + providerProvider.likelyFailureReason + '') + ': ' +err.message + '.';
			const nextIndex = currentIndex + 1;
			const willTryAgain = (nextIndex < providerProviders.length);
			if(willTryAgain) {
				logMessage += ' Falling back to ' + providerProviders[nextIndex].name + '.';
			}
			console.warn(logMessage);
			if(willTryAgain) {
				return ChainDataFetcher.getDataFromProvidersWithFallback<T>(
					fnToCallWithProvider,
					fnCallDescriptionForLog,
					throwIfAborted,
					providerProviders,
					nextIndex,
				);
			} else {
				throw(err);
			}
		}
	}

	// Caches
	async getTxnDataCached(
		txHash: string,
		txMemo: string,
		filterToLowercaseAddresses: string[],
		completeProgressStep: ((stepsCompleted?: number) => void), //Called 6x/tx
		throwIfAborted: () => void,
		labelsAsOfTxTime ?: boolean,
	) : Promise<TxRowData | undefined> {
		const ChainDataFetcher = this;
		const cachedValue = ChainDataFetcher.txnData[txHash.toLowerCase()];
		throwIfAborted();
		if(typeof cachedValue === 'undefined') {
			const fetchedValue = await ChainDataFetcher.#getTxnData(
				txHash,
				txMemo,
				filterToLowercaseAddresses,
				completeProgressStep,
				throwIfAborted,
				labelsAsOfTxTime
			);
			ChainDataFetcher.txnData[txHash.toLowerCase()] = (typeof fetchedValue === 'undefined') ? null : fetchedValue;
			return fetchedValue;
		} else if(cachedValue === null) {
			completeProgressStep(6);
			return undefined;
		} else {
			completeProgressStep(6);
			return cachedValue;
		}
	}

	// Cached in getTxnDataCached
	// Should ONLY be called from getTxnDataCached().
	async #getTxnData(
		txHash: string,
		txMemo: string,
		filterToLowercaseAddresses: string[],
		completeProgressStep: ((stepsCompleted?: number) => void), //Called 6x/tx
		throwIfAborted: () => void,
		labelsAsOfTxTime ?: boolean,
	) : Promise<TxRowData | undefined> {
		const ChainDataFetcher = this;
		let txRow = await ChainDataFetcher.getDataFromProvidersWithFallback(
			function(provider: ethers.JsonRpcApiProvider) {
				return ChainDataFetcher.#getTxnDataFromProvider(
					txHash,
					txMemo,
					filterToLowercaseAddresses,
					provider,
					completeProgressStep,
					throwIfAborted,
					labelsAsOfTxTime
				);
			},
			'get data for tx ' + txHash,
			throwIfAborted,
		);
		if(typeof txRow?.from.address !== 'undefined') {
			txRow.functionName = await ChainDataFetcher.etherscan.getFunctionNameFromTxEtherscan(
				txRow.txID,
				txRow.from.address,
				txRow.blockNumber,
			); //Covered by caching
		}
		return txRow;
	}

	// Covered by caching
	async #getTxnDataFromProvider(
		txHash: string,
		txMemo: string,
		filterToLowercaseAddresses: string[],
		provider: ethers.JsonRpcApiProvider,
		completeProgressStep: ((stepsCompleted?: number) => void), //called 6x/tx; partial progress erased on error
		throwIfAborted: () => void,
		labelsAsOfTxTime ?: boolean,
	) : Promise<TxRowData | undefined> {
		const ChainDataFetcher = this;
		let stepsCompleted = 0;
		try {
			throwIfAborted();
			const receipt = await ChainDataFetcher.getReceiptCached(txHash, provider); // Caches
			throwIfAborted();
			stepsCompleted++; completeProgressStep();
			const txn = await ChainDataFetcher.getTransactionCached(txHash, provider); // Caches
			throwIfAborted();
			stepsCompleted++; completeProgressStep();
			if(receipt === null) {
				console.warn('Receipt for tx ' + txHash + ' came back null; will not show this tx.');
				throwIfAborted();
				completeProgressStep(4);
				return undefined;
			}
			if(txn === null) {
				console.warn('Transaction details for ' + txHash + ' came back null; will not show this tx.');
				throwIfAborted();
				completeProgressStep(4);
				return undefined;
			}
			if(filterToLowercaseAddresses.length > 0) {
				if(txn.to === null) {
					console.warn('Transaction has no "to" field; cannot determine if filter applies. Will show it to be on the safer side.', txn);
				} else if(!filterToLowercaseAddresses.includes(txn.to)) {
					console.warn('Specified transaction '+txHash+' does not meet "to" filter; not showing it.');
					throwIfAborted();
					completeProgressStep(4);
					return undefined;
				}
			}
			if(typeof receipt.blockNumber === 'undefined') {
				throw new Error ('Got undefined block number in receipt for tx '+txHash);
			}
			throwIfAborted();
			const block = await ChainDataFetcher.getBlockCached(receipt.blockNumber, provider); // Caches
			if(block === null) {
				throw new Error ('Got null block #' + receipt.blockNumber + 'cited in receipt for tx ' + txHash +'.');
			}
			throwIfAborted();
			stepsCompleted++; completeProgressStep();
			const {gasPrice, gasFeeETHwei} = ChainDataFetcher.computeGasFeeETHwei(txn, receipt);
			let errors : Error[] = [];
			let gasFeeUSD = NaN;
			let valueUSD = NaN;
			try {
				const ethPriceInUSD = await ChainDataFetcher.getEthPriceInUSD(block.timestamp); // Caches
				throwIfAborted();
				stepsCompleted++; completeProgressStep();
				gasFeeUSD = Formatters.convertWeiToDollars(gasFeeETHwei, ethPriceInUSD);
				valueUSD = Formatters.convertWeiToDollars(txn.value, ethPriceInUSD);
			} catch(err: any) {
				if(
					err.message === ChainDataFetcherClass.GRAPH_DB_UNAVAILABLE ||
					err.message === ChainDataFetcherClass.GRAPH_DB_MISC_ERROR
				) {
					errors.push(err);
					stepsCompleted++; completeProgressStep();
				} else {
					throw(err);
				}
			}
			const blockNumberForNameResolutionAsStringOrLatest = 'latest'; //When implementation available: (labelsAsOfTxTime ? receipt.blockNumber : 'latest');
			const to = await ChainDataFetcher.addressTranslator.getAccountLabelSet(receipt.to, blockNumberForNameResolutionAsStringOrLatest); // Covered by caching
			throwIfAborted();
			stepsCompleted++; completeProgressStep();
			const from = await ChainDataFetcher.addressTranslator.getAccountLabelSet(receipt.from, blockNumberForNameResolutionAsStringOrLatest); // Covered by caching
			throwIfAborted();
			stepsCompleted++; completeProgressStep();
			const txData = {
				txID: txHash,
				value: txn.value,
				valueUSD,
				gasUsed: receipt.gasUsed,
				//cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
				gasPriceString: (typeof gasPrice === 'undefined') ? '' : gasPrice.toString(),
				gasLimit: txn.gasLimit,
				gasFeeETHwei,
				gasFeeUSD,
				timestamp: new Date(block.timestamp*1000),
				to,
				from,
				memo: txMemo,
				blockNumber: receipt.blockNumber,
				txNumberInBlock: receipt.index,
				errors
			};
			return txData;
		} catch(err) {
			completeProgressStep(-1*stepsCompleted);
			throw(err);
		}
	}

	// Would make a more generic version to DRY up
	// getReceiptCached / getTransactionCached / getBlockCached
	// but getting the type annotations right is sufficiently hard to both read & write
	// that keeping the functions separate is fine for now & maybe better long-term.
	// Note: Doesn't distinguish between which provider the data came from.
	async getReceiptCached(
		txHash: string,
		provider: ethers.JsonRpcApiProvider,
	) : Promise<ethers.TransactionReceipt | null> {
		const ChainDataFetcher = this;
		const cacheIndex = txHash.toLowerCase();
		const cacheValue = ChainDataFetcher.receiptCache[cacheIndex];
		if(typeof cacheValue === 'undefined') {
			const fetchedValue = await provider.getTransactionReceipt(txHash);
			ChainDataFetcher.receiptCache[cacheIndex] = fetchedValue;
			return fetchedValue;
		} else {
			return cacheValue;
		}
	}

	// Note: Doesn't distinguish between which provider the data came from.
	async getTransactionCached(
		txHash: string,
		provider: ethers.JsonRpcApiProvider,
	) : Promise<ethers.TransactionResponse | null> {
		const ChainDataFetcher = this;
		const cacheIndex = txHash.toLowerCase();
		const cacheValue = ChainDataFetcher.transactionCache[cacheIndex];
		if(typeof cacheValue === 'undefined') {
			const fetchedValue = await provider.getTransaction(txHash);
			ChainDataFetcher.transactionCache[cacheIndex] = fetchedValue;
			return fetchedValue;
		} else {
			return cacheValue;
		}
	}

	// Note: Doesn't distinguish between which provider the data came from.
	async getBlockCached(
		blockNumber: number,
		provider: ethers.JsonRpcApiProvider,
	) : Promise<ethers.Block | null> {
		const ChainDataFetcher = this;
		const cacheValue = ChainDataFetcher.blockCache[blockNumber];
		if(typeof cacheValue === 'undefined') {
			const fetchedValue = await provider.getBlock(blockNumber);
			ChainDataFetcher.blockCache[blockNumber] = fetchedValue;
			return fetchedValue;
		} else {
			return cacheValue;
		}
	}

	/** Split out to cut cognitive complexity. */
	computeGasFeeETHwei(
		txn: ethers.TransactionResponse,
		receipt: ethers.TransactionReceipt,
	) {
		const ChainDataFetcher = this;
		const gasPrice = ChainDataFetcher.getGasPriceFromTxnAndReceipt(txn, receipt);
		const gasUsed = (typeof receipt.gasUsed === 'undefined') ? 0n : receipt.gasUsed;
		const gasFeeETHwei = (typeof gasPrice === 'undefined') ? 0n : gasUsed*(gasPrice);
		return {gasPrice, gasFeeETHwei};
	}

	/** Split out to cut cognitive complexity. */
	getGasPriceFromTxnAndReceipt (
		txn: ethers.TransactionResponse,
		receipt: ethers.TransactionReceipt,
	) : bigint {
		//@ts-ignore that effectiveGasPrice might be undefined - it's undocumented but sometimes there.
		return (typeof receipt.effectiveGasPrice === 'undefined') ? txn.gasPrice : receipt.effectiveGasPrice;
	}

	// Covered by caching
	async getTxnsData(
		receiptQuery: ReceiptQuery,
		resetProgressStep: ((currentStepDescription: string, numberOfSteps: number) => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		throwIfAborted: () => void,
	) : Promise<WrappedTxData | undefined> {
		const ChainDataFetcher = this;
		const txRows : TxRowData[] = [];
		let txRowsFromAccts = [];
		let txRowsFromHashes = [];
		let startBlockTimestamp: Date | undefined = undefined;
		let endBlockTimestamp: Date | undefined  = undefined;
		let accountBasedTransactionsMetaData: AccountBasedTransactionsMetaData = {source: 'none'};
		try {
			resetProgressStep('Resolving filter addresses (in parallel)', receiptQuery.filterTo.length);
			const resolutionForFilterTos = await ChainDataFetcher.addressTranslator.resolveENSsIfNecessary( // Covered by caching
				receiptQuery.filterTo,
				completeProgressStep,
				throwIfAborted,
				'latest' //Resolving incoming-specified addresses as latest
			);
			const filterToLowercaseAddresses = Formatters.lowercaseStringArray(resolutionForFilterTos.convertedAddresses);
			if(receiptQuery.addresses.length > 0) {
				throwIfAborted();
				resetProgressStep('Fetching search range information', 4);
				let {startBlock, endBlock} = await ChainDataFetcher.getBlockRange( // covered by caching
					receiptQuery,
					completeProgressStep, //called 2x
					throwIfAborted,
				);
				({startBlockTimestamp, endBlockTimestamp} = (await ChainDataFetcher.getBlockRangeTimestamps( // covered by caching
					completeProgressStep, //called 2x
					throwIfAborted,
					startBlock,
					endBlock,
				)));
				let txData = await ChainDataFetcher.getTxDataForAddresses({ // covered by caching
					addresses: receiptQuery.addresses,
					txMemos: receiptQuery.txMemos,
					resetProgressStep,
					completeProgressStep,
					throwIfAborted,
					blockStart: startBlock,
					blockEnd: endBlock,
					labelsAsOfTxTime: receiptQuery.labelsAsOfTxTime,
					includeIncoming: receiptQuery.includeIncoming,
					filterToLowercaseAddresses,
				});
				txData.anyInputsWereENSNames ||= resolutionForFilterTos.anyInputsWereENSNames;
				txRows.push(...txData.txRows);
				for(let txRow of txData.txRows) {
					txRowsFromAccts.push(txRow.txID);
				}
				accountBasedTransactionsMetaData = txData.accountBasedTransactionsMetaData;
			}
			if(Object.keys(receiptQuery.txMemos).length > 0){
				throwIfAborted();
				const txRowsWithUndefineds = await ChainDataFetcher.getDataForMissingSpecifiedTxns( // covered by caching
					txRows,
					receiptQuery.txMemos,
					filterToLowercaseAddresses,
					resetProgressStep,
					completeProgressStep,
					throwIfAborted,
					receiptQuery.labelsAsOfTxTime,
				);
				throwIfAborted();
				const txRowsWithoutUndefineds = ChainDataFetcher.getOnlyUndefinedTxRows(
					txRowsWithUndefineds,
					resetProgressStep,
					completeProgressStep,
					throwIfAborted,
				);
				txRows.push(...txRowsWithoutUndefineds);
				for(let txRowWithoutUndefined of txRowsWithoutUndefineds) {
					txRowsFromHashes.push(txRowWithoutUndefined.txID);
				}
			}
		} catch(err: any) {
			if(err.message !== 'Operation aborted') {
				throw(err);
			}
		}
		//modifies txRows:
		const {
			sortedAcctLabels,
			txRowsLabeled
		} = AddressTranslatorClass.setAccountLabels(
			txRows,
			receiptQuery.acctMemos
		);
		return {
			startBlockTimestamp,
			endBlockTimestamp,
			generatedAt: new Date(),
			txRows: txRowsLabeled,
			accountBasedTransactionsMetaData,
			txRowsFromAccts,
			txRowsFromHashes,
			sortedAcctLabels,
		};
	}

	getMostRecentEndOfTimePeriod(
		relativeTime: RelativeTimeOption,
		now: Date,
	) : Date {
		if(relativeTime.endsWith('Hour')) {
			return new Date(now.setHours(now.getHours(), 0, 0, -1));
		}
		if (relativeTime.endsWith('Day')) {
			return new Date(now.setHours(0, 0, 0, -1));
		}
		const sameTimeOnFirstOfMonth = new Date(now.setDate(1));
		if (relativeTime.endsWith('Month')) {
			return new Date(sameTimeOnFirstOfMonth.setHours(0, 0, 0, -1));
		}
		const sameTimeOnFirstOfYear = new Date(sameTimeOnFirstOfMonth.setMonth(0));
		if (relativeTime.endsWith('Year')) {
			return new Date(sameTimeOnFirstOfYear.setHours(0, 0, 0, -1));
		}
		console.error('Likely programming bug: Got unrecognized relative time unit '+ relativeTime + ' in getMostRecentEndOfTimePeriod(). Using now instead.');
		return new Date(); //avoids the transformations above
	}

	getStartOfRelativeTimePeriod(
		relativeTime: RelativeTimeOption,
		msEnd: Date | undefined,
		now: Date,
	) {
		let msStart = (typeof msEnd === 'undefined' ? now : new Date(msEnd));
		if(relativeTime.endsWith('Hour')) {
			msStart = new Date(msStart.setHours(msStart.getHours()-1));
		} else if (relativeTime.endsWith('Day')) {
			msStart = new Date(msStart.setDate(msStart.getDate()-1));
		} else if (relativeTime.endsWith('Month')) {
			msStart = new Date(msStart.setMonth(msStart.getMonth()-1));
		} else if (relativeTime.endsWith('Year')) {
			msStart = new Date(msStart.setFullYear(msStart.getFullYear()-1));
		}
		return msStart;
	}

	// Await calls are all to caching fns
	async getBlockRange(
		receiptQuery: ReceiptQuery,
		completeProgressStep: ((stepsCompleted?: number) => void), //called 2x
		throwIfAborted: () => void,
	) : Promise<{
		startBlock ?: number,
		endBlock ?: number,
	}> {
		const ChainDataFetcher = this;
		let msStart = receiptQuery.msStart;
		let msEnd = receiptQuery.msEnd;
		let now = new Date();
		if(receiptQuery.relativeTime?.startsWith('past')) {
			//Ending at receipt display time, so endBlock should stay undefined.
			msEnd = undefined;
		} else if (receiptQuery.relativeTime?.startsWith('last')) {
			//Modifications to 'now' here don't affect the below use which is
			//only used when msEnd is undefined (other branch of this conditional).
			msEnd = ChainDataFetcher.getMostRecentEndOfTimePeriod(receiptQuery.relativeTime, now);
		}
		if(
			receiptQuery.relativeTime?.startsWith('past') ||
			receiptQuery.relativeTime?.startsWith('last')
		) {
			msStart = ChainDataFetcher.getStartOfRelativeTimePeriod(
				receiptQuery.relativeTime,
				msEnd,
				now
			);
		}
		let startBlock = ((receiptQuery.relativeTime === 'specifiedBlocks') ? receiptQuery.blockStart : undefined);
		if(typeof startBlock === 'undefined' && typeof msStart !== 'undefined' && msStart !== null) {
			startBlock = await ChainDataFetcher.getBlockNumberJustBeforeTimestamp(msStart); // Caches
		}
		throwIfAborted();
		completeProgressStep();
		let endBlock = ((receiptQuery.relativeTime === 'specifiedBlocks') ? receiptQuery.blockEnd : undefined);
		if(typeof endBlock === 'undefined' && typeof msEnd !== 'undefined' && msEnd !== null) {
			endBlock = await ChainDataFetcher.getBlockNumberJustBeforeTimestamp(msEnd); // Caches
		}
		throwIfAborted();
		completeProgressStep();
		return {
			startBlock,
			endBlock
		}
	}

	// Covered by caching
	async getDataForMissingSpecifiedTxns(
		txRowsFromAccts: TxRowData[],
		txMemos: MemosObject,
		filterToLowercaseAddresses: string[],
		resetProgressStep: ((currentStepDescription: string, numberOfSteps: number) => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		throwIfAborted: () => void, //also call just before calling this
		labelsAsOfTxTime ?: boolean,
	) : Promise<(TxRowData | undefined)[]> {
		const ChainDataFetcher = this;
		resetProgressStep('Loading data about specified transactions (in parallel)', Object.keys(txMemos).length*6);
		const txDataPromises : Promise<TxRowData | undefined>[] = [];
		for(let txHash in txMemos) {
			throwIfAborted();
			if(!ChainDataFetcher.txRowsHasHash(txRowsFromAccts, txHash)) {
				txDataPromises.push(ChainDataFetcher.getTxnDataCached(
					txHash,
					txMemos[txHash], //don't need to use QueryParser.getMemoCaseInsensitiveSearch due to iteration over txMemos here
					filterToLowercaseAddresses,
					completeProgressStep,
					throwIfAborted,
					labelsAsOfTxTime
				));
			} else {
				completeProgressStep(6); //as getTxnData calls this 6x/tx
			}
		}
		return Promise.all(txDataPromises);
	}

	getOnlyUndefinedTxRows(
		txRowsWithUndefineds : (TxRowData | undefined)[],
		resetProgressStep: ((currentStepDescription: string, numberOfSteps: number) => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		throwIfAborted: () => void, //also call just before calling this
	) : TxRowData[] {
		let txRowsWithoutUndefineds: TxRowData[] = [];
		resetProgressStep('Checking for & weeding out errors in fetching data about specified transactions', txRowsWithUndefineds.length);
		for(let txRowOrUndefined of txRowsWithUndefineds) {
			if(typeof txRowOrUndefined !== 'undefined') {
				txRowsWithoutUndefineds.push(txRowOrUndefined);
			}
			throwIfAborted();
			completeProgressStep();
		}
		return txRowsWithoutUndefineds;
	}

	txRowsHasHash(
		txRows: TxRowData[],
		txHash: string
	) {
		for(let txRow of txRows) {
			if(txRow.txID === txHash) {
				return true;
			}
		}
		return false;
	}

	// Covered by caching
	async getTxDataForAddresses(params: {
		addresses: string[],
		txMemos: MemosObject,
		resetProgressStep: ((currentStepDescription: string, numberOfSteps: number) => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		throwIfAborted: () => void,
		blockStart?: number, // undefined = 'genesis',
		blockEnd?: number, // undefined = 'latest',
		labelsAsOfTxTime ?: boolean,
		includeIncoming ?: boolean, //default false
		filterToLowercaseAddresses: string[],
	}) : Promise<TxRowDataWithBlockTransactionsSource> {
		const ChainDataFetcher = this;
		let {
			addresses,
			txMemos,
			resetProgressStep,
			completeProgressStep,
			throwIfAborted,
			filterToLowercaseAddresses,
			// labelsAsOfTxTime, //unused because dependencies don't yet support an implementation
		} = params;
		let blockStart = typeof params.blockStart === 'undefined' ? undefined : params.blockStart; //undefined start means genesis
		let blockEnd = typeof params.blockStart === 'undefined' ? undefined : params.blockEnd; //undefined end means latest
		let includeIncoming = params.includeIncoming === true;
		throwIfAborted();
		resetProgressStep('Resolving specified addresses (in parallel)', addresses.length);
		const {
			convertedAddresses,
			anyInputsWereENSNames
		} = await ChainDataFetcher.addressTranslator.resolveENSsIfNecessary( // Covered by caching
			addresses,
			completeProgressStep,
			throwIfAborted,
			'latest' //Resolving incoming-specified addresses as latest
		);
		const blockTransactionsWithSource = await ChainDataFetcher.convertAddressesToTxList({ // Covered by caching
			addresses: convertedAddresses,
			resetProgressStep,
			completeProgressStep,
			throwIfAborted,
			includeIncoming,
			filterToLowercaseAddresses,
			blockStart,
			blockEnd
		});
		const blockTransactions = blockTransactionsWithSource.blockTransactions;
		const accountBasedTransactionsMetaData = blockTransactionsWithSource.accountBasedTransactionsMetaData;
		let txRows: TxRowData[] = [];
		throwIfAborted();
		resetProgressStep('Fetching exchange price & readable-name data', (blockTransactions.length)*3);
		for(let blockTransaction of blockTransactions) {
			//Not specifying a radix to parseInt will cause it to handle
			//both hex strings starting with 0x and decimal strings not starting with 0x appropriately.
			const timestampInt = parseInt(blockTransaction.blockTimestamp);
			const timestamp = new Date(timestampInt*1000);
			const blockForNameResolution = 'latest'; //When implementation available: (labelsAsOfTxTime ? blockTransaction.blockNumber : 'latest');
			for(let txn of blockTransaction.transactions) {
				throwIfAborted();
				txRows.push(await ChainDataFetcher.getDetailedTxRow( // Covered by caching
					completeProgressStep, //called 3x
					throwIfAborted,
					timestampInt,
					timestamp,
					txn,
					blockForNameResolution,
					txMemos[txn.transactionHash]
				));
			}
		}
		return {
			anyInputsWereENSNames,
			accountBasedTransactionsMetaData,
			txRows
		};
	}

	// Await calls are all to caching fns
	async getDetailedTxRow(
		completeProgressStep: (() => void), //called 3x
		throwIfAborted: () => void,
		timestampInt: number,
		timestamp: Date,
		txn: Transaction,
		//Next param can't be string type until historical resolution is implemented;
		//not currently provider-supported in ethers; see ensjs-v3#121
		blockNumberForNameResolutionAsStringOrLatest: 'latest', //Omitted for stricter typechecking: = 'latest',
		memo?: string,
	) : Promise<TxRowData> {
		const ChainDataFetcher = this;
		const value = BigInt(txn.value);
		const gasFeeETHwei = BigInt(txn.gasUsed)*BigInt(txn.gasPrice);
		let errors : Error[] = [];
		let gasFeeUSD = NaN;
		let valueUSD = NaN;
		try {
			const ethPriceInUSD = await ChainDataFetcher.getEthPriceInUSD(timestampInt); // Caches
			throwIfAborted();
			completeProgressStep();
			gasFeeUSD = Formatters.convertWeiToDollars(gasFeeETHwei, ethPriceInUSD);
			valueUSD = Formatters.convertWeiToDollars(BigInt(txn.value), ethPriceInUSD);
		} catch(err: any) {
			if(
				err.message === ChainDataFetcherClass.GRAPH_DB_UNAVAILABLE ||
				err.message === ChainDataFetcherClass.GRAPH_DB_MISC_ERROR
			) {
				errors.push(err);
				completeProgressStep();
			} else {
				throw(err);
			}
		}
		let txMemo = memo;
		throwIfAborted();
		const from = await ChainDataFetcher.addressTranslator.getAccountLabelSet(txn.from, blockNumberForNameResolutionAsStringOrLatest); // Covered by caching
		throwIfAborted();
		completeProgressStep();
		throwIfAborted();
		const to = await ChainDataFetcher.addressTranslator.getAccountLabelSet(txn.to, blockNumberForNameResolutionAsStringOrLatest); // Covered by caching
		throwIfAborted();
		completeProgressStep();
		return {
			txID: txn.transactionHash,
			value,
			valueUSD,
			gasFeeETHwei,
			gasFeeUSD,
			timestamp,
			from,
			to,
			memo: txMemo,
			blockNumber: parseInt(txn.blockNumber),
			txNumberInBlock: parseInt(txn.transactionIndex),
			functionName: txn.functionName,
			errors,
		}
	}

	// Caches inside etherscan instance
	async convertAddressesToTxList(params: {
		addresses: string[],
		resetProgressStep: ((currentStepDescription: string, numberOfSteps: number) => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		throwIfAborted: () => void,
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
		blockStart?: number, //undefined = 'genesis',
		blockEnd?: number, //undefined = 'latest',
	}) : Promise<BlockTransactionsWithSource> {
		const ChainDataFetcher = this;
		//This data requires an API and cannot be retrieved directly from a standard web3 provider.
		//See discussion here about adding a more direct feature to the provider:
		//https://github.com/ethereum/go-ethereum/issues/1897
		//https://github.com/ethereum/go-ethereum/issues/1749 (linked dupe)
		//https://github.com/ethereum/go-ethereum/issues/2104
		//https://github.com/ethereum/go-ethereum/issues/16081
		//https://github.com/emeraldpay/emerald-vault/issues/98
		//https://github.com/web3/web3.js/issues/580 (some good discussion on bloom filters)
		//https://github.com/ethereum/wiki/issues/501
		//https://ethereum.stackexchange.com/questions/2304/how-to-list-transactions-from-account-address
		//https://ethereum.stackexchange.com/questions/3655/how-can-all-transactions-sent-to-an-address-be-found
		//https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
		//https://github.com/ethereum/go-ethereum/commit/0fa04e0a505e4fc555ad475ae2b80e8a0e9c5c03 (Feb 2016 WIP)
		//On internal txs:
		//https://github.com/ethereum/go-ethereum/issues/2318
		//Logs can be obtained and might be a strategy for some settings:
		//https://docs.ethers.org/v6/api/providers/#Provider-getLogs
		//https://docs.infura.io/infura/networks/ethereum/json-rpc-methods/filter-methods/eth_getfilterlogs
		//This works to get a ceiling on how many txes are available in total for an account,
		//but this doesn't choose the subset for the filtered range and a transaction sequence number isn't enough
		//to compute the tx hash (that also relies on having the rest of the tx information, such as recipient, amount, data, etc.)
		//Refs for this fn:
		//https://docs.infura.io/infura/networks/ethereum/json-rpc-methods/eth_gettransactioncount
		//https://docs.ethers.org/v6/api/providers/#Provider-getTransactionCount
		//const totalTxesOnAccount = await infuraProvider.getTransactionCount(address);
		try {
			params.throwIfAborted();
			params.resetProgressStep('Fetching transactions for specified addresses', params.addresses.length);
			let blockTransactions = await ChainDataFetcher.etherscan.getAllTxDataAboutAddressesEtherscan(
				params.addresses,
				params.includeIncoming,
				params.filterToLowercaseAddresses,
				params.throwIfAborted,
				params.completeProgressStep,
				params.blockStart,
				params.blockEnd,
			)
			return {blockTransactions, accountBasedTransactionsMetaData: {source: 'Etherscan'}};
		} catch(err) {
			console.error('Error encountered in convertAddressesToTxList: ',err);
			throw (err);
		}
	}

	// Caches with reads in getBlockTimestampFromCache, writes in getBlockTimestamp
	async getBlockRangeTimestamps(
		completeProgressStep: (() => void),
		throwIfAborted: () => void,
		blockStartToFetch ?: number,
		blockEndToFetch ?: number,
	) : Promise<TimestampsPair> {
		const ChainDataFetcher = this;
		let partialResult : TimestampsPair = {};
		if(typeof blockStartToFetch !== 'undefined') {
			let cachedValue = ChainDataFetcher.getBlockTimestampFromCache(blockStartToFetch);
			if(typeof cachedValue !== 'undefined') {
				if(cachedValue !== null) {
					partialResult.startBlockTimestamp = cachedValue;
				}
				blockStartToFetch = undefined;
			}
		}
		if(typeof blockEndToFetch !== 'undefined') {
			let cachedValue = ChainDataFetcher.getBlockTimestampFromCache(blockEndToFetch);
			if(typeof cachedValue !== 'undefined') {
				if(cachedValue !== null) {
					partialResult.endBlockTimestamp = cachedValue;
				}
				blockEndToFetch = undefined;
			}
		}
		if(typeof blockStartToFetch !== 'undefined' || typeof blockEndToFetch !== 'undefined') {
			const fetchedRangeResult = ChainDataFetcher.getDataFromProvidersWithFallback(
				((provider: ethers.JsonRpcApiProvider) => {
					return ChainDataFetcher.getBlockRangeTimestampsWithProviderSpecified(
						completeProgressStep,
						throwIfAborted,
						provider,
						blockStartToFetch,
						blockEndToFetch
					);
				}),
				'get timestamp data for start & end blocks',
				throwIfAborted,
			);
			return Object.assign(partialResult, fetchedRangeResult);
		}
		return partialResult;
	}

	getBlockTimestampFromCache(
		blockNumber: number
	) : Date | null | undefined {
		const ChainDataFetcher = this;
		return ChainDataFetcher.blockTimestampCache[blockNumber];
		// TODO: Check in blockCache after appropriate conversion of block number if not found in blockTimestampCache
	}

	// Cache read in getBlockRangeTimestamps skips this on hits
	async getBlockRangeTimestampsWithProviderSpecified(
		completeProgressStep: (() => void),
		throwIfAborted: () => void,
		provider: ethers.JsonRpcApiProvider,
		startBlock ?: number,
		endBlock ?: number,
	) : Promise<TimestampsPair> {
		const ChainDataFetcher = this;
		let startBlockTimestamp: Date | undefined = undefined;
		let endBlockTimestamp: Date | undefined = undefined;
		if(typeof startBlock !== 'undefined') {
			startBlockTimestamp = await ChainDataFetcher.getBlockTimestamp(startBlock, provider);
		}
		throwIfAborted();
		completeProgressStep();
		if(typeof endBlock !== 'undefined') {
			endBlockTimestamp = await ChainDataFetcher.getBlockTimestamp(endBlock, provider);
		}
		throwIfAborted();
		completeProgressStep();
		return {startBlockTimestamp, endBlockTimestamp};
	}

	// Cache written here; read in getBlockTimestampFromCache
	async getBlockTimestamp (
		blockNumber: number,
		provider: ethers.JsonRpcApiProvider
	) : Promise<Date | undefined> {
		const ChainDataFetcher = this;
		const block = await provider.getBlock(blockNumber);
		if(block === null) {
			ChainDataFetcher.blockTimestampCache[blockNumber] = null;
			return undefined;
		} else {
			const result = new Date(block.timestamp*1000);
			ChainDataFetcher.blockTimestampCache[blockNumber] = result;
			return result;
		}
	}

	// Caches
	async getEthPriceInUSD(blockTimestamp : number | undefined ) : Promise<number> {
		const ChainDataFetcher = this;
		if(typeof blockTimestamp === 'undefined') {
			throw new Error('blockTimestamp should not be undefined for seeking exchange price.');
		}
		const cacheValue = ChainDataFetcher.ethPriceCache[blockTimestamp];
		if(typeof cacheValue === 'undefined') {
			const fetchedValue = await ChainDataFetcher.#fetchEthPriceInUSD(blockTimestamp);
			ChainDataFetcher.ethPriceCache[blockTimestamp] = fetchedValue;
			return fetchedValue;
		} else {
			return cacheValue;
		}
	}

	// Cached in getEthPriceInUSD
	#fetchEthPriceInUSD(blockTimestamp : number ) : Promise<number> {
		const ChainDataFetcher = this;
		let blockDateObj = new Date(blockTimestamp*1000); //ms will already be 0
		blockDateObj.setUTCHours(0);
		blockDateObj.setUTCMinutes(0);
		blockDateObj.setUTCSeconds(0);
		blockTimestamp = blockDateObj.valueOf()/1000;
		const graphql = JSON.stringify({
			query: 'query oneQuery($pricedate: Int!){\n  tokens(where: { id: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}){\n    id\n    name\n    dayData(where:{ date: $pricedate }){\n      priceUSD\n    }\n  }\n}',
			variables: {'pricedate':blockTimestamp}
		})
		return new Promise(function(resolve, reject) {
			const req = new XMLHttpRequest();
			req.onload = function() {
				let result = req.responseText;
				let parsedResult : any = {};
				try{
					parsedResult = JSON.parse(result);
				} catch(err) {
					console.error('Error parsing response data from The Graph. Response:', result);
				}
				if(typeof parsedResult.errors !== 'undefined') {
					console.error('The Graph reported ' + parsedResult.errors.length + ' error' + (parsedResult.errors.length === 1 ? '' : 's') +' when trying to getEthPriceInUSD for block ', blockTimestamp , ' : ', parsedResult.errors);
					const isDBUnavailableError = ChainDataFetcher.graphErrorsIncludesDatabaseUnavailableError(parsedResult.errors);
					if(isDBUnavailableError) {
						reject(new Error(ChainDataFetcherClass.GRAPH_DB_UNAVAILABLE));
					}
					reject(parsedResult.errors);
				} else {
					const ethPrice = parsedResult.data.tokens[0].dayData[0].priceUSD;
					resolve(ethPrice);
				}
			}
			req.onerror = function () {
				ChainDataFetcher.logAboutErrorInGraphRequest(req);
				reject(new Error(ChainDataFetcherClass.GRAPH_DB_MISC_ERROR));
			}
			req.onabort = function () {
				console.error('Request to fetch data from The Graph aborted.');
				reject(req.response);
			}
			//fetch allowed using redirect: 'follow' which seems like it requires more manual implementation with XHR.
			//However, fetch was completely quashing CORS errors and not allowing them to be displayed.
			req.open('POST', 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange');
			req.setRequestHeader('Content-Type', 'application/json'); //used in fetch
			req.send(graphql);
		});
	}

	graphErrorsIncludesDatabaseUnavailableError(
		errors: {message: string}[]
	) : boolean {
		for(let error of errors) {
			//Full message: "Store error: database unavailable"
			if(error.message.toLowerCase().includes('database unavailable')) {
				return true;
			}
		}
		return false;
	}

	logAboutErrorInGraphRequest(
		req: XMLHttpRequest
	) {
		//https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors includes this:
		//Note: For security reasons, specifics about what went wrong with a CORS request are not available to JavaScript code.
		//All the code knows is that an error occurred.
		//The only way to determine what specifically went wrong is to look at the browser's console for details.
		let statusComponent = '';
		if(req.status === 0 && req.readyState === 4) {
			statusComponent = 'Response completed with status 0.';
		} else {
			statusComponent = 'Response status is ' + req.status + '.'; //could be an HTTP status code (or 0 if readyState !== 4)
		}
		console.error('Error fetching data from the Graph. ' + statusComponent,req);
	}

	// Caches
	async getBlockNumberJustBeforeTimestamp(
		timestamp: Date
	) : Promise<number> {
		const ChainDataFetcher = this;
		const cacheIndex = timestamp.valueOf();
		const cacheValue = ChainDataFetcher.blockInfoByTimestampCache[cacheIndex];
		if(typeof cacheValue === 'undefined') {
			const fetchValue = (await ChainDataFetcher.#getBlockInfoJustBeforeTimestamp(timestamp)).block;
			ChainDataFetcher.blockInfoByTimestampCache[cacheIndex] = fetchValue;
			return fetchValue;
		} else {
			return cacheValue;
		}
	}

	// Cached in getHexBlockNumberJustBeforeTimestamp
	async #getBlockInfoJustBeforeTimestamp(
		timestamp: Date
	) : Promise<EthDater.BlockResult> {
		const ChainDataFetcher = this;
		return ChainDataFetcher.dater.getDate(timestamp, false, false);
	}

	getInfuraProvider() {
		return new ethers.InfuraProvider('mainnet', process.env.INFURA_API_KEY);
	}
}
