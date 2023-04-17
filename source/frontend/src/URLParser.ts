import { Formatters } from './Formatters';
import {
	QueryParser,
} from './QueryParser';
import type {
	MemosObject,
	ReceiptQuery,
	RelativeTimeOption,
	RelativeTimeUnitOption,
	ViewOption,
} from './QueryParser';

export const URLParser = {

	SINGLE_TX_START: '/tx/' as const,
	ADDRESS_START: '/acct/' as const,

	getReceiptQueryFromURL(): ReceiptQuery {
		//TODO: This currently ignores addresses if any transactions are defined;
		//they could technically coexist.
		//txMemos can coexist with account addresses but just for adding memos.
		const pathname = window.location.pathname;
		const urlSearchParams = new URLSearchParams(window.location.search);
		const specialParamKeys = [
			'tx',
			'acct',
			'filterTo',
			'blockStart',
			'blockEnd',
			'start',
			'end',
			'past',
			'last',
			'chainLabels',
			'includeIncoming',
			'downloadOnFirstLoad',
			'lock',
			'view',
			'home'
		]
		const urlSearchParamsTx = urlSearchParams.get('tx');
		const urlSearchParamsAddr = urlSearchParams.get('acct');
		const urlSearchParamsFilterTo = urlSearchParams.get('filterTo');
		const urlSearchParamsBlockStart = urlSearchParams.get('blockStart');
		const urlSearchParamsBlockEnd = urlSearchParams.get('blockEnd');
		const urlSearchParamsMsStart = urlSearchParams.get('start');
		const urlSearchParamsMsEnd = urlSearchParams.get('end');
		const urlSearchParamsChainLabels = urlSearchParams.get('chainLabels');
		const urlSearchParamsView = urlSearchParams.get('view');
		const includeIncoming =
			urlSearchParams.has('includeIncoming') &&
			urlSearchParams.get('includeIncoming') != 'false';  // eslint-disable-line eqeqeq
		const downloadOnFirstLoad =
			urlSearchParams.has('downloadOnFirstLoad') &&
			urlSearchParams.get('downloadOnFirstLoad') != 'false';  // eslint-disable-line eqeqeq
		const lock =
			urlSearchParams.has('lock') &&
			urlSearchParams.get('lock') != 'false';  // eslint-disable-line eqeqeq
		const showHome =
			urlSearchParams.has('home') &&
			urlSearchParams.get('home') != 'false';  // eslint-disable-line eqeqeq
		const {txMemos, acctMemos} = URLParser.getMemos(urlSearchParams, specialParamKeys);
		const filterTo = (urlSearchParamsFilterTo === null) ? [] : URLParser.splitToMultipleIDs(urlSearchParamsFilterTo);
		let partialResult: Partial<ReceiptQuery> & {
			filterTo: string[];
			acctMemos: MemosObject;
			includeIncoming: boolean;
			downloadOnFirstLoad: boolean;
			lock: boolean;
			showHome: boolean;
			view?: ViewOption;
			relativeTime?: RelativeTimeOption;
		} = {
			filterTo,
			acctMemos,
			includeIncoming,
			downloadOnFirstLoad,
			lock,
			showHome,
			view: (urlSearchParamsView === 'list' ? urlSearchParamsView : undefined),
			blockStart: URLParser.parseBlockNumber(urlSearchParamsBlockStart),
			blockEnd: URLParser.parseBlockNumber(urlSearchParamsBlockEnd),
			relativeTime: URLParser.parseRelativeTime(urlSearchParams),
		};
		if(urlSearchParamsChainLabels !== null) {
			partialResult.labelsAsOfTxTime = false //After option is implementable: (urlSearchParamsChainLabels.toLowerCase() === 'then');
		}
		if(urlSearchParamsMsStart !== null) {
			partialResult.msStart = new Date(parseInt(urlSearchParamsMsStart));
		}
		if(urlSearchParamsMsEnd !== null) {
			partialResult.msEnd = new Date(parseInt(urlSearchParamsMsEnd));
		}
		let txMemosAndAddresses = URLParser.getAddressesAndTxMemos(
			pathname,
			urlSearchParamsTx,
			urlSearchParamsAddr,
			txMemos,
		);
		return Object.assign(txMemosAndAddresses, partialResult);
	},

	parseBlockNumber(urlSearchParamValue : string | null) : number | undefined {
		if(urlSearchParamValue === null) {
			return undefined;
		} else {
			//parseInt covers conversion from hex if needed
			const candidateValue = parseInt(urlSearchParamValue);
			return isNaN(candidateValue) ? undefined : candidateValue;
		}
	},

	isRecognizedRelativeTimeUnit(
		lowercaseStringIn?: string,
	) : lowercaseStringIn is RelativeTimeUnitOption {
		if(typeof lowercaseStringIn === 'undefined') {
			return false;
		}
		//TODO: Figure out why TypeScript can't handle this without a cast
		return (QueryParser.RELATIVE_TIME_UNITS_LOWERCASE as readonly string[]).includes(lowercaseStringIn);
	},

	parseRelativeTimeUnitParam(
		urlSearchParams: URLSearchParams,
		urlParamName: 'past' | 'last',
	): RelativeTimeOption | undefined {
		if(urlSearchParams.has(urlParamName)) {
			const unitCandidate = urlSearchParams.get(urlParamName)?.toLowerCase();
			if(URLParser.isRecognizedRelativeTimeUnit(unitCandidate)) {
				//TODO: Figure out why TypeScript can't handle this without a cast
				return ((urlParamName + Formatters.capitalizeFirstLetter(unitCandidate)) as `${typeof urlParamName}${Capitalize<RelativeTimeUnitOption>}`);
			}
		}
	},

	//Keep in sync with URLManipulator.setRelativeTimeInURLObj
	parseRelativeTime(
		urlSearchParams: URLSearchParams
	) : RelativeTimeOption | undefined {
		let pastValue = URLParser.parseRelativeTimeUnitParam(urlSearchParams, 'past');
		if(typeof pastValue !== 'undefined') {
			//ending @ receipt display time: takes priority if last & past both present
			//b/c it's faster to compute.
			return pastValue;
		}
		let lastValue = URLParser.parseRelativeTimeUnitParam(urlSearchParams, 'last');
		if(typeof lastValue !== 'undefined') {
			return lastValue;
		}
		if(urlSearchParams.has('blockStart') || urlSearchParams.has('blockEnd')) {
			//Having this take lower priority supports saving the values for easier editing
			//even when a different time-filter option is selected.
			return 'specifiedBlocks';
		} else if(urlSearchParams.has('start') || urlSearchParams.has('end')) {
			//Default option, takes lowest priority, see also comment on 'specifiedBlocks'
			return 'specifiedTimes';
		}
		// else return undefined, which works like specifiedTimes
	},

	getAddressesAndTxMemos(
		pathname: string,
		urlSearchParamsTx: string | null,
		urlSearchParamsAddr: string | null,
		txMemos: MemosObject
	) {
		let joinedTxList = '';
		if (pathname.startsWith(URLParser.SINGLE_TX_START)) {
			joinedTxList = URLParser.getPathPortionEndingAtOptionalSlash(pathname, URLParser.SINGLE_TX_START.length);
		} else if(urlSearchParamsTx !== null) {
			joinedTxList = urlSearchParamsTx;
		}
		let emptyTxMemos = URLParser.makeEmptyMemos(URLParser.splitToMultipleIDs(joinedTxList));
		const txMemosWithEmptiesOverridden = Object.assign(emptyTxMemos, txMemos);
		const addresses = URLParser.getAcctList(pathname, urlSearchParamsAddr);
		return {
			txMemos: txMemosWithEmptiesOverridden,
			addresses,
		};
	},

	getAcctListFromURL(url: URL) {
		return URLParser.getAcctList(
			window.location.pathname,
			new URLSearchParams(window.location.search).get('acct'),
		);
	},

	getAcctList(
		pathname: string,
		urlSearchParamsAddr: string | null,
	) {
		let joinedAcctList = '';
		if(pathname.startsWith(URLParser.ADDRESS_START)) {
			joinedAcctList = URLParser.getPathPortionEndingAtOptionalSlash(pathname, URLParser.ADDRESS_START.length);
		} else if(urlSearchParamsAddr !== null) {
			joinedAcctList = urlSearchParamsAddr;
		}
		return URLParser.splitToMultipleIDs(joinedAcctList);
	},

	makeEmptyMemos(hashes: string[], objToAddTo: MemosObject = {}) {
		for(let hash of hashes) {
			Object.assign(objToAddTo, {[hash]: ''});
		}
		return objToAddTo;
	},

	getMemos(
		urlSearchParams: URLSearchParams,
		paramNamesToIgnore: string[]
	): {txMemos: MemosObject, acctMemos: MemosObject} {
		let txMemos : MemosObject = {};
		let acctMemos : MemosObject = {};
		for(const [key, value] of urlSearchParams.entries()) {
			if(!paramNamesToIgnore.includes(key)) {
				//These are not surefire ways of identifying their category,
				//but it's probably the most useful way to parse such parameters if provided.
				if(Formatters.looksLikeTxHash(key)) {
					txMemos[key] = value;
				} else { //could be account address or ENS/domain-format addresses.
					acctMemos[key] = value;
				}
			}
		};
		return {txMemos, acctMemos};
	},

	splitToMultipleIDs(strIn: string): string[] {
		if(strIn.length === 0) {
			return []; //split otherwise gives ['']
		}
		let components = strIn.split(',');
		return components.map(function(component) {return decodeURIComponent(component).trim();});
	},

	getEndOfPathPortion(strIn: string, startPos: number) {
		let txHashEndSlash = strIn.indexOf('/', startPos);
		let txHashEndsBefore = strIn.length;
		if (txHashEndSlash >= 0) {
			txHashEndsBefore = txHashEndSlash;
		}
		return txHashEndsBefore;
	},

	getPathPortionEndingAtOptionalSlash(strIn: string, startPos: number) {
		let txHashEndsBefore = URLParser.getEndOfPathPortion(strIn, startPos);
		return strIn.substring(startPos, txHashEndsBefore);
	},

};
