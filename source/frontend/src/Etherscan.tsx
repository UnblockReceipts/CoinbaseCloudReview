
import type {
  BlockTransaction,
  Transaction,
} from './ChainDataTypes';

interface EtherscanAccountTxListEntry {
	blockNumber: string // e.g. '15850149'
	timeStamp: string // e.g. '1667003387'
	hash: string // e.g. '0x1dd0817ae2c200d4b20ebf…2297d70ebc609395e960859'
	nonce: string // e.g. '5'
	blockHash: string // e.g. '0xe98168fa1e055b13173413…80e7dfd01fd3e9f84113231'
	transactionIndex: string // e.g. '82'
	from: string // e.g. '0x0dc58008c371b240baee63cb9d514c99d5e96c9a'
	to: string // e.g. '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41'
	value: string // e.g. '0', in wei
	gas: string // e.g. '160961'
	gasPrice: string // e.g. '10349169946'
	isError: string // e.g. '0'
	txreceipt_status: string // e.g. '1'
	input: string // e.g. '0xac9650d800000000000000…00000000000000000000000'
	contractAddress: string // e.g. '0xc5102fe9359fd9a28f877a67e36b0f050d81a3cc'
	cumulativeGasUsed: string // e.g. '8674033'
	gasUsed: string // e.g. '160961' //includes prior transactions in block
	confirmations: string // e.g. '921084'
	methodId: string // e.g. '0xac9650d8'
	functionName: string // e.g. 'multicall(bytes[] data)'
}

interface EtherscanAccountTxListResult {
	status: string; //representing integer, 1 for success
	message: string;
	result: EtherscanAccountTxListEntry[];
}

export class EtherscanClass {

	//Could probably actually use a more advanced cache library in this class;
	//e.g. see Axios or React Query
	httpResultCache : {[index: string] : EtherscanAccountTxListResult} = {}; //key is full URL, case sensitive (since URLs are)!

	async getEtherscanAccountTxListEntrySetsParallel(
		addresses: string[],
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
		throwIfAborted: (() => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		blockStart?: number,
		blockEnd?: number,
	) : Promise<EtherscanAccountTxListEntry[][]> {
		const Etherscan = this;
		let promises : Promise<EtherscanAccountTxListEntry[]>[] = [];
		throwIfAborted();
		for(let address of addresses) {
			promises.push(Etherscan.getAllTxDataAboutAddressEtherscan(
				address,
				includeIncoming,
				filterToLowercaseAddresses,
				//Not using Formatters.lowercaseStringArray(addresses), to avoid duplicate display of txns
				//where both the to and from parties are on the list of addresses to report transactions from.
				[address.toLowerCase()],
				completeProgressStep,
				blockStart,
				blockEnd,
			));
		}
		return Promise.all(promises);
	}

	/** Serial version: Less efficient overall, but
	 * better for client-side use as it is less likely
	 * to trigger short-term API rate limits.
	 */
	async getEtherscanAccountTxListEntrySetsSerial(
		addresses: string[],
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
		throwIfAborted: (() => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		blockStart?: number,
		blockEnd?: number,
	) : Promise<EtherscanAccountTxListEntry[][]> {
		const Etherscan = this;
		let promiseResults : EtherscanAccountTxListEntry[][] = [];
		for(let address of addresses) {
			throwIfAborted();
			promiseResults.push(await Etherscan.getAllTxDataAboutAddressEtherscan(
				address,
				includeIncoming,
				filterToLowercaseAddresses,
				//Not using Formatters.lowercaseStringArray(addresses), to avoid duplicate display of txns
				//where both the to and from parties are on the list of addresses to report transactions from.
				[address.toLowerCase()],
				completeProgressStep,
				blockStart,
				blockEnd,
			));
		}
		return promiseResults;
	}

	async getAllTxDataAboutAddressesEtherscan(
		addresses: string[],
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
		throwIfAborted: (() => void),
		completeProgressStep: ((stepsCompleted?: number) => void),
		blockStart?: number,
		blockEnd?: number,
	) : Promise<BlockTransaction[]> {
		const Etherscan = this;
		const promiseResults = await Etherscan.getEtherscanAccountTxListEntrySetsSerial(
			addresses,
			includeIncoming,
			filterToLowercaseAddresses,
			throwIfAborted,
			completeProgressStep,
			blockStart,
			blockEnd,
		)
		let filteredEtherscanAcctTxListEntries : EtherscanAccountTxListEntry[] = [];
		for(let promiseResult of promiseResults) {
			filteredEtherscanAcctTxListEntries.push(...promiseResult);
		}
		return Etherscan.convertEtherScanAccountTxListEntriesToBlockTransactions(filteredEtherscanAcctTxListEntries);
	}

	async getFunctionNameFromTxEtherscan(
		txHash: string,
		fromAddress: string,
		blockNumber: number,
	) {
		const Etherscan = this;
		//Workaround for the lack of a more direct endpoint for accessing this data per-transaction:
		let params = new URLSearchParams();
		params.set('module', 'account');
		params.set('action', 'txlist');
		params.set('address', fromAddress);
		params.set('sort', 'asc');
		params.set('startblock' , blockNumber.toString());
		params.set('endblock' , blockNumber.toString());
		let etherScanResult = await Etherscan.makeHTTPRequestToEtherscan(params); //caches
		//== is used in case Etherscan changes interface and a number comes back
		if(etherScanResult.status == '1') { // eslint-disable-line eqeqeq
			const selectedTxnFromEtherscan = Etherscan.pickTxnByHashFromEtherScanResult(
				etherScanResult.result,
				txHash
			)
			return selectedTxnFromEtherscan?.functionName;
		} else {
			console.error('Error fetching function-name data from Etherscan for transaction', txHash, '. Will not show this on receipt. Result: ', etherScanResult);
			return undefined;
		}
	}

	pickTxnByHashFromEtherScanResult(
		etherScanResult: EtherscanAccountTxListEntry[],
		soughtHashLowerCase: string,
	) {
		for(let etherScanTx of etherScanResult) {
			if(etherScanTx.hash.toLowerCase() === soughtHashLowerCase) {
				return etherScanTx;
			}
		}
		console.error('Could not find txn hash', soughtHashLowerCase, 'in etherScan result', etherScanResult);
	}

	async getAllTxDataAboutAddressEtherscan(
		address: string,
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
		lowercaseFromAccountsList: string[],
		completeProgressStep: ((stepsCompleted?: number) => void),
		blockStart?: number,
		blockEnd?: number,
	) : Promise<EtherscanAccountTxListEntry[]> {
		const Etherscan = this;
		if(address.length === 0) {
			throw new Error('In getAllTxDataAboutAddressEtherscan with empty address.');
		}
		//Endpoint: This will return max of 10K records only.
		//Returns the list of transactions performed by an address, with optional pagination.
		let params = new URLSearchParams();
		params.set('module', 'account');
		params.set('action', 'txlist'); //txlistinternal returns the list of internal transactions performed by an address, also w/optional pagination.
		//Some Etherscan documentation suggested this endpoint could take addresses.join(',') for the address parameter
		//to show results from multiple accounts with one API call, but that does not seem to work.
		params.set('address', address);
		//If pagination is desired, uncomment the following:
		//params.set('page', '1'); //if pagination is enabled
		//params.set('offset', '10'); //# of transactions per page
		params.set('sort', 'asc');
		if(typeof blockStart !== 'undefined') { // && blockStart !== 'genesis' removed when converting blockStart to number
			params.set('startblock' , blockStart.toString());
		}
		if(typeof blockEnd !== 'undefined') { // && blockEnd !== 'latest' removed when converting blockEnd to number
			params.set('endblock' , blockEnd.toString());
		}
		let etherScanResult = await Etherscan.makeHTTPRequestToEtherscan(params);
		//== is used in case Etherscan changes interface and a number comes back
		if(etherScanResult.status == '1') { // eslint-disable-line eqeqeq
			const filteredResults = Etherscan.filterAcctBasedTxns(
				etherScanResult.result,
				lowercaseFromAccountsList,
				includeIncoming,
				filterToLowercaseAddresses,
			);
			completeProgressStep();
			return filteredResults;
		} else {
			console.error('Error fetching account-based data from Etherscan. Result: ', etherScanResult);
			completeProgressStep();
			return [];
		}
	}

	convertEtherScanAccountTxListEntriesToBlockTransactions(
		filteredEtherscanAcctTxListEntries: EtherscanAccountTxListEntry[]
	) : BlockTransaction[] {
		const Etherscan = this;
			let result : BlockTransaction[] = [];
			let blockGroupedTxs = Etherscan.blockGroupTxns(filteredEtherscanAcctTxListEntries);
			for(let etherscanTxBlock of Object.keys(blockGroupedTxs)) {
				result.push(Etherscan.convertToBlockTransaction(blockGroupedTxs[etherscanTxBlock]))
			}
			return result;
	}

	filterAcctBasedTxns(
		etherScanResults: EtherscanAccountTxListEntry[],
		lowercaseFromAccountsList: string[],
		includeIncoming: boolean,
		filterToLowercaseAddresses: string[],
	) : EtherscanAccountTxListEntry[] {
		let txList : EtherscanAccountTxListEntry[] = [];
		for(let etherscanTx of etherScanResults) {
			if(
				(filterToLowercaseAddresses.length === 0 || filterToLowercaseAddresses.includes(etherscanTx.to.toLowerCase())) &&
				(includeIncoming || lowercaseFromAccountsList.includes(etherscanTx.from.toLowerCase()))
			) {
				txList.push(etherscanTx);
			}
		}
		return txList;
	}

	//Split out to cut cognitive complexity:
	blockGroupTxns(
		filteredEtherscanAcctTxListEntries: EtherscanAccountTxListEntry[],
	) {
		let blockGroupedTxs : {[index: string]: EtherscanAccountTxListEntry[]} = {};
		for(let etherscanTx of filteredEtherscanAcctTxListEntries) {
			if(typeof blockGroupedTxs[etherscanTx.blockNumber] === 'undefined') {
				blockGroupedTxs[etherscanTx.blockNumber] = [];
			} else {
				if(blockGroupedTxs[etherscanTx.blockNumber][0]?.blockHash !== etherscanTx.blockHash) {
					throw new Error('Etherscan reported different hashes (' + blockGroupedTxs[etherscanTx.blockNumber][0]?.blockHash + ' vs. ' + etherscanTx.blockHash + ') for block # ' + etherscanTx.blockNumber + ' in different transactions.');
				}
				if(blockGroupedTxs[etherscanTx.blockNumber][0]?.timeStamp !== etherscanTx.timeStamp) {
					throw new Error('Etherscan reported different timeStamps (' + blockGroupedTxs[etherscanTx.blockNumber][0]?.timeStamp + ' vs. ' + etherscanTx.timeStamp + ') for block # ' + etherscanTx.blockNumber + ' in different transactions.');
				}
			}
			blockGroupedTxs[etherscanTx.blockNumber].push(etherscanTx);
		}
		return blockGroupedTxs;
	}

	convertToBlockTransaction(
		etherScanTxes: EtherscanAccountTxListEntry[], //non-empty array where blockHash, blockNumber, timeStamp members are constants
	): BlockTransaction {
		const Etherscan = this;
		const txInBlock = etherScanTxes[0];
		if(typeof txInBlock === 'undefined') {
			//check here b/c TS doesn't have an easy way to specify non-empty array type for parameter
			throw new Error('Programming bug: In convertToBlockTransaction() with empty array of etherScan txes; cannot get block data & should not need it.');
		}
		let transactions : Transaction[] = [];
		for(let tx of etherScanTxes) {
			transactions.push(Etherscan.convertToTransactionInBlock(tx));
		}
		return {
			blockHash: txInBlock.blockHash,
			blockNumber: txInBlock.blockNumber,
			blockTimestamp: txInBlock.timeStamp,
			transactions,
		};
	}

	convertToTransactionInBlock(
		etherScanTx: EtherscanAccountTxListEntry,
	): Transaction {
		return {
			transactionHash: etherScanTx.hash,
			transactionIndex: etherScanTx.transactionIndex,
			from: etherScanTx.from,
			to: etherScanTx.to,
			value: etherScanTx.value,
			gasLimit: etherScanTx.gas,
			gasPrice: etherScanTx.gasPrice,
			gasUsed: etherScanTx.gasUsed,
			cumulativeGasUsed: etherScanTx.cumulativeGasUsed,
			status: etherScanTx.txreceipt_status,
			input: etherScanTx.input,
			nonce: etherScanTx.nonce,
			blockHash: etherScanTx.blockHash,
			blockNumber: etherScanTx.blockNumber,
			blockTimestamp: etherScanTx.timeStamp,
			functionName: etherScanTx.functionName,
		};
	}

	async makeHTTPRequestToEtherscan(
		params: URLSearchParams,
		network: 'mainnet' | 'goerli' | 'sepolia' = 'mainnet',
	) : Promise<EtherscanAccountTxListResult> {
		const Etherscan = this;
		let endpoint = 'https://api.etherscan.io/api';
		if(network !== 'mainnet') {
			endpoint = 'https://api-' + network + '.etherscan.io/api';
		}
		try {
			let result = await Etherscan.#makeCachedHTTPRequestToEtherscan(endpoint, params, true);
			//check result for rate limit - or does that show up as an error?
			return result;
		} catch(err) {
			console.error ('Caught error in makeHTTPRequestToEtherscan: ', err, '; better handling of API rate-limiting & retry w/out key not yet implemented.');
			const resultWithNoAPIKey = await Etherscan.#makeCachedHTTPRequestToEtherscan(endpoint, params, false);
			//Could still be rate limited - check that here & throw error if so
			return resultWithNoAPIKey;
		}
	}

	async #makeCachedHTTPRequestToEtherscan(
		baseURL: string,
		params: URLSearchParams,
		useKey: boolean = true,
	) : Promise<EtherscanAccountTxListResult> {
		const Etherscan = this;
		if(useKey) {
			if(typeof process.env.REACT_APP_ETHERSCAN_API_KEY === 'undefined') {
				console.warn('No Etherscan API key present in .env file; requests may be blocked or tightly rate-limited!');
			} else {
				params.set('apikey', process.env.REACT_APP_ETHERSCAN_API_KEY);
			}
		}
		const fullURL = baseURL + '?' + params.toString();
		let cacheValue = Etherscan.httpResultCache[fullURL];
		if(typeof cacheValue === 'undefined') {
			const fetchValue = await Etherscan.#sendHTTPRequestToEtherscan(fullURL);
			Etherscan.httpResultCache[fullURL] = fetchValue;
			return fetchValue;
		} else {
			return cacheValue;
		}
	}

	#sendHTTPRequestToEtherscan(
		fullURL: string,
	) : Promise<EtherscanAccountTxListResult> {
		return new Promise(function(resolve, reject) {
			const req = new XMLHttpRequest();
			req.onload = function () {
				const response = req.response;
				if(response?.error) {
					//Copied from Coinbase implementation as defensive programming:
					console.error('Error response from XMLHttpRequest to Etherscan:', response); //might still be an HTTP 200!
				}
				resolve(response);
			}
			req.onerror = function () {
				reject(req.response);
			}
			req.onabort = function () {
				reject(req.response);
			}
			req.responseType = 'json';
			req.open('GET', fullURL);
			req.send();
		});
	}

}
export const EtherscanCredit = function(props: {txRowsFromAccts: number}) {
	return (<>
		<span className='etherscanAttribution'>Listing of account-associated transactions is powered by Etherscan.io APIs. </span>
		{ props.txRowsFromAccts > 9999 ? <>
			<span className='etherscanLimit'>NOTE: This listing was limited to 10,000 transactions.</span>
			{' '}
			<span className='etherscanLimitWorkaround'>If you need more completeness,
			limit the start and end times of the range requested for any specific receipt/report.</span>
		</> : null}
	</>);
}
