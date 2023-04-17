import { Formatters } from './Formatters';

export type MemosObject = {
	[index: string] : string;
}

export interface MemosObjectDiff {
	keysInANotB: string[], //tx hashes, original casing
	keysInBNotA: string[], //tx hashes, original casing
	keysWithChangedValues: string[], //tx hashes, original casing
}

export type ViewOption = 'list' | undefined; // 'auto'; //default (undefined) is 'auto',
export type RelativeTimeUnitOption = typeof QueryParser.RELATIVE_TIME_UNITS_LOWERCASE[number];
export type RelativeTimeOption =
	`${'past' | 'last'}${Capitalize<RelativeTimeUnitOption>}` | //past = ending now; last = ending at most recently completed boundary
	'specifiedTimes' | 'specifiedBlocks'

//Update queriesHaveAnyDifference() if adding to this.
export interface ReceiptQuery {
	addresses: string[];
	filterTo: string[];
	txMemos: MemosObject;
	acctMemos: MemosObject;
	includeIncoming: boolean;
	downloadOnFirstLoad: boolean;
	lock: boolean;
	showHome: boolean;
	view?: ViewOption;
	labelsAsOfTxTime?: boolean;
	blockStart?: number;
	blockEnd?: number;
	msStart?: Date;
	msEnd?: Date;
	relativeTime?: RelativeTimeOption;
}

export const QueryParser = {

	RELATIVE_TIME_UNITS_LOWERCASE: ['hour', 'day', 'month', 'year'] as const,

	getEmptyReceiptQuery(): ReceiptQuery {
		return {
			addresses: [],
			filterTo: [],
			txMemos: {},
			acctMemos: {},
			showHome: false,
			includeIncoming: false,
			downloadOnFirstLoad: false,
			lock: false,
		}
	},

	querySpecifiesAccountOrTx(
		receiptQuery: ReceiptQuery
	) {
		for(let memoedHash of Object.keys(receiptQuery.txMemos)) {
			if(memoedHash.trim().length > 0) {
				return true;
			}
		}
		for(let addressOrOnChainLabel of receiptQuery.addresses) {
			if(addressOrOnChainLabel.trim().length > 0) {
				return true;
			}
		}
		return false;
	},

	queryIsEmpty(
		receiptQuery: ReceiptQuery,
	) {
		return QueryParser.queriesHaveAnyDifference(
			receiptQuery,
			QueryParser.getEmptyReceiptQuery(),
		)
	},

	queriesHaveAnyDifference(
		a: ReceiptQuery,
		b: ReceiptQuery,
	) : boolean {
		return (
			a.includeIncoming !== b.includeIncoming ||
			a.downloadOnFirstLoad !== b.downloadOnFirstLoad ||
			a.lock !== b.lock ||
			a.showHome !== b.showHome ||
			a.labelsAsOfTxTime !== b.labelsAsOfTxTime ||
			a.view !== b.view ||
			a.blockStart !== b.blockStart ||
			a.blockEnd !== b.blockEnd ||
			a.relativeTime !== b.relativeTime ||
			a.msStart?.valueOf() !== b.msStart?.valueOf() ||
			a.msEnd?.valueOf() !== b.msEnd?.valueOf() ||
			Formatters.stringArraysHaveAnyDifference(a.addresses, b.addresses) ||
			Formatters.stringArraysHaveAnyDifference(a.filterTo, b.filterTo) ||
			QueryParser.memosObjectsHaveAnyDifference(a.txMemos, b.txMemos) ||
			QueryParser.memosObjectsHaveAnyDifference(a.acctMemos, b.acctMemos)
		);
	},

	//TODO: DRY?
	caseInsensitiveIncludes(
		searchIn: string[],
		target: string,
	) {
		const lowercaseTarget = target.toLowerCase();
		for(let candidate of searchIn) {
			if(lowercaseTarget === candidate.toLowerCase()) {
				return true;
			}
		}
		return false;
	},

	targetQueryFilterMightShowMore(
		currentQueryFilterTo: string[],
		targetQueryFilterTo: string[],
	) : boolean {
		if(currentQueryFilterTo.length === 0) {
			//currently not filtering at all.
			//whether new state is filtering or not,
			//data reload should not be required.
			return false;
		}
		if(targetQueryFilterTo.length === 0) {
			//currently filtering and target doesn't
			return true;
		}
		if(targetQueryFilterTo.length > currentQueryFilterTo.length) {
			//currently filtering and in the new version,
			//you want to include transactions to MORE addresses.
			//That'll require reload.
			return true;
		}
		let currentQueryFilterToLowercase = Formatters.lowercaseStringArray(currentQueryFilterTo);
		let targetQueryFilterToLowercase = Formatters.lowercaseStringArray(targetQueryFilterTo);
		for(let toAddress of targetQueryFilterToLowercase) {
			if(!currentQueryFilterToLowercase.includes(toAddress)) {
				//In the target version, you want to show txns to toAddress,
				//but the current version doesn't include these, so a reload will be required.
				return true;
			}
		}
		return false;
	},

	bHasSomethingNotInACaseInsensitive(
		currentQueryArray: string[],
		targetQueryArray: string[],
	) : boolean {
		if(targetQueryArray.length > currentQueryArray.length) {
			return true;
		}
		let currentQueryArrayLowercase = Formatters.lowercaseStringArray(currentQueryArray);
		let targetQueryArrayLowercase = Formatters.lowercaseStringArray(targetQueryArray);
		for(let member of targetQueryArrayLowercase) {
			if(!currentQueryArrayLowercase.includes(member)) {
				return true;
			}
		}
		return false;
	},

	diffStringArraysCaseInsensitive(
		a: string[],
		b: string[],
	) : {
		valuesInANotB: string[], //original casing
		valuesInBNotA: string[], //original casing
	} {
		const valuesInANotB: string[] = [];
		const valuesInBNotA: string[] = [];
		const aLowercase = Formatters.lowercaseStringArray(a);
		const bLowercase = Formatters.lowercaseStringArray(b);
		for(let member of a) {
			if(!bLowercase.includes(member.toLowerCase())) {
				valuesInANotB.push(member); // original case
			}
		}
		for(let member of b) {
			if(!aLowercase.includes(member.toLowerCase())) {
				valuesInBNotA.push(member); // original case
			}
		}
		return {
			valuesInANotB,
			valuesInBNotA
		};
	},

	memosObjectsHaveAnyDifference(
		a: MemosObject,
		b: MemosObject,
	) : boolean {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		if(Formatters.stringArraysHaveAnyDifference(aKeys, bKeys)) {
			return true;
		}
		for(let i=0; i<aKeys.length; i++) {
			if(a[aKeys[i]] !== b[bKeys[i]]) {
				return true;
			}
		}
		return false;
	},

	diffMemosObject(
		a: MemosObject,
		b: MemosObject,
	) : MemosObjectDiff {
		//These three should be mutually exclusive:
		let keysInANotB: string[] = [];
		let keysInBNotA: string[] = [];
		let keysWithChangedValues: string[] = [];
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		const aLowercaseKeys = Formatters.lowercaseStringArray(aKeys);
		const bLowercaseKeys = Formatters.lowercaseStringArray(bKeys);
		for(let key of aKeys) {
			if(!bLowercaseKeys.includes(key.toLowerCase())) {
				keysInANotB.push(key); // original case
			} else { //a key in a which is also in b.
				//Keys in b which are not in a will go into keysInBNotA,
				//so the else clause here means no similar clause is needed in the loop below.
				const memoValueInB = QueryParser.getMemoCaseInsensitiveSearch(key, b);
				if(typeof memoValueInB === 'undefined') {
					console.warn('Unexpectedly could not find ' + key + ' in memos object', b);
				}
				if(a[key] !== memoValueInB) {
					keysWithChangedValues.push(key);
				}
			}
		}
		for(let member of bKeys) {
			if(!aLowercaseKeys.includes(member.toLowerCase())) {
				keysInBNotA.push(member); // original case
			}
		}
		return {
			keysInANotB,
			keysInBNotA,
			keysWithChangedValues,
		};
	},

	getMemoCaseInsensitiveSearch (
		key?: string,
		memosObject?: MemosObject,
	) {
		if(typeof key === 'undefined' || typeof memosObject === 'undefined') {return undefined}
		if(typeof memosObject[key] !== 'undefined') {return memosObject[key]}
		const lowercaseTarget = key.toLowerCase();
		const memoedKeys = Object.keys(memosObject);
		for(let memoedKey of memoedKeys) {
			if(lowercaseTarget === memoedKey.toLowerCase()) {
				return memosObject[memoedKey];
			}
		}
		return undefined;
	},
}
