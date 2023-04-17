import { ethers } from 'ethers';
import type {
	TxRowData,
} from './components/Receipt/ChainDataFetcher';
export const Formatters = {
	convertWeiToDollars(wei: bigint, ethPriceInUSD: number) : number {
		return parseFloat(ethers.formatUnits(wei, 'ether'))*(ethPriceInUSD);
	},

	convertToHex(stringNumIn: bigint | string | number) {
		return '0x'+BigInt(stringNumIn).toString(16);
	},

	sanitizeAndWrapForCSV(strIn ?: string) {
		if(typeof strIn === 'undefined') {
			return '';
		}
		return '"' + strIn.replaceAll('"', '""') + '"';
	},

	headersForCSV(
		labelsAsOfTxTime: boolean = false
	) {
		const asOfTime = labelsAsOfTxTime ? 'time of transaction' : 'receipt generation' ;
		return 'Transaction ID,' +
		'Memo,' +
		'From (specified label),' +
		'From (on-chain label as of ' + asOfTime + '),' +
		'From (address),' +
		'To (specified label),' +
		'To (on-chain label as of ' + asOfTime + '),' +
		'To (address),' +
		'Function called,' +
		'Date/Time,' +
		'ETH sent (ETH),' +
		'Tx fee (ETH),' +
		'ETH sent (USD),' +
		'Tx fee (USD)';
	},

	txRowForCSV(props: TxRowData) {
		return (
			props.txID + ',' +
			Formatters.sanitizeAndWrapForCSV(props.memo) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.from.specifiedLabel) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.from.chainLabel) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.from.address) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.to.specifiedLabel) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.to.chainLabel) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.to.address) + ',' +
			Formatters.sanitizeAndWrapForCSV(props.functionName) + ',' +
			Formatters.sanitizeAndWrapForCSV(Formatters.getFormattedDate(props.timestamp)) + ',' +
			ethers.formatUnits(props.value, 'ether') + ',' +
			ethers.formatUnits(props.gasFeeETHwei, 'ether') + ',' +
			Formatters.getFormattedDollarDigits(props.valueUSD) + ',' +
			Formatters.getFormattedDollarDigits(props.gasFeeUSD)
		);
	},

	getFormattedDollarDigits(amount: number) {
		return amount.toFixed(2);
	},

	getFormattedDate(dateToShow: Date) {
		return dateToShow.toString();
	},

	looksLikeTxHash(stringToTest: string) {
		return stringToTest.length === 66 && this.looksLikeHex(stringToTest);
	},

	looksLikeTxHashes(possiblyCommaSeparatedList: string) {
		const inputValueSplit = possiblyCommaSeparatedList.split(',');
		let countRightLength = 0;
		let countWrongLength = 0;
		for(let inputHash of inputValueSplit) {
			if(Formatters.looksLikeTxHash(inputHash.trim())) {
				countRightLength++;
			} else if (inputHash.trim().length > 0) {
				countWrongLength++;
			}
		}
		return (countRightLength > 0 && countWrongLength === 0);
	},

	looksLikeHexAddress(stringToTest: string) {
		return stringToTest.length === 42 && this.looksLikeHex(stringToTest);
	},

	looksLikeHex(stringToTest: string) {
		return (/^0x[\da-f]+$/i).test(stringToTest);
	},

	compareMultiLevel<T>(
		a: T,
		b: T,
		levels: (keyof T)[],
		currentLevel: number = 0, //only specify on recursive calls
	) : number {
		if (a[levels[currentLevel]] < b[levels[currentLevel]])  {
			return -1;
		} else if (a[levels[currentLevel]] > b[levels[currentLevel]]) {
			return 1;
		} else {
			const nextLevel = currentLevel + 1;
			if(nextLevel < levels.length) {
				return Formatters.compareMultiLevel(a, b, levels, nextLevel);
			} else {
				return 0;
			}
		}
	},

	lowercaseStringArray(stringsIn: string[]): string[] {
		let result: string[] = [];
		for(let st of stringsIn) {
			result.push(st.toLowerCase());
		}
		return result;
	},


	stringArraysHaveAnyDifference(
		a: string[],
		b: string[],
	): boolean {
		if(a.length !== b.length) {
			return true;
		}
		for(let i=0; i<a.length; i++) {
			if(a[i] !== b[i]) {
				return true;
			}
		}
		return false;
	},

	filterOutStringsThatTrimToNothing(
		stringsIn: string[]
	) : string[] {
		const newArray = [];
		for(let str of stringsIn) {
			const trimmed = str.trim();
			if(trimmed.length > 0) {
				newArray.push(trimmed);
			}
		}
		return newArray;
	},

	getInputElementByID(id: string) : HTMLInputElement {
		const candidate = document.getElementById(id);
		if(!(candidate instanceof HTMLInputElement)) {
			throw new Error('Likely programming bug: #' + id + ' element was not of the expected type - this should never happen.');
		}
		return candidate;
	},

	capitalizeFirstLetter<S extends string>(strIn: S) : Capitalize<S> {
		//TODO: Figure out why cast is needed here
		return strIn.substring(0, 1).toUpperCase() + strIn.substring(1) as Capitalize<S>;
	},
}

export const DisplayedDate = function(props: {dateToShow: Date}) {
	return (<span className='displayedDate'>{Formatters.getFormattedDate(props.dateToShow)}</span>);
}
