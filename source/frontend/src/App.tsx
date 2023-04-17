import { useState, useEffect } from 'react';
import './App.css';
import { QueryParser } from './QueryParser';
import type {
	MemosObject,
	ReceiptQuery,
	RelativeTimeOption,
	ViewOption,
} from './QueryParser';
import { Homepage } from './components/Homepage/Homepage';
import { DataFetchingReceiptPage } from './components/Receipt/DataFetchingReceiptPage';
import type { EIP1193Provider } from '@web3-onboard/core';
import { ReceiptQueryObjectUpdater } from './ReceiptQueryObjectUpdater';
import { URLManipulator } from './URLManipulator';
import { URLParser } from './URLParser';
import { DocsPage } from './DocsPage';

export type SpecialKeyForSettingInURL =
	'includeIncoming' |
	'showHome' |
	'lock' |
	'view' |
	'addresses' |
	'filterTo' |
	'txMemos'
;

function App() {
	const [receiptQuery, setReceiptQuery] = useState<ReceiptQuery>(URLParser.getReceiptQueryFromURL());
	const [provider, setProvider] = useState<EIP1193Provider | undefined>();
	const [chainId, setChainId] = useState<string | undefined>();
	const onProviderChange = function(newProvider?: EIP1193Provider) {
		setProvider(newProvider);
	}
	const onNetworkChange = function(newChainId: string) {
		setChainId(newChainId);
	}
	const handlePopState = function(ev: PopStateEvent) {
		setReceiptQuery(URLParser.getReceiptQueryFromURL());
	}
	useEffect(() => {
		window.addEventListener('popstate', handlePopState);
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const replaceReceiptQuery = function(newQuery: ReceiptQuery) {
		setReceiptQuery(newQuery);
		const urlObj = URLManipulator.makeURLFromReceiptQueryAndCurrentPath(newQuery);
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
	}
	const updateTxMemoInReceiptQuery = function(
		txHashToAddOrUpdate: string,
		newMemoTrimmed: string | undefined, //undefined removes it; not using ?: to avoid default undefined
		replaceKeyCase: boolean = false,
	) {
		if(typeof newMemoTrimmed === 'undefined') {
			return updateAndPossiblyRemoveTxMemosInReceiptQuery(
				[{
					txHashToRemove: txHashToAddOrUpdate,
					txToAddOrUpdate: undefined,
				}],
				replaceKeyCase,
			);
		} else {
			return updateAndPossiblyRemoveTxMemosInReceiptQuery(
				[{
					txHashToRemove: undefined,
					txToAddOrUpdate: {hash: txHashToAddOrUpdate, memoTrimmed: newMemoTrimmed},
				}],
				replaceKeyCase,
			);
		}
	}

	const updateAndPossiblyRemoveTxMemosInReceiptQuery = function(
		updateSets: {
			txHashToRemove: string | undefined, //undefined here means don't remove any
			txToAddOrUpdate: {hash: string, memoTrimmed: string} | undefined, //undefined here means don't add/update any
		}[],
		replaceKeyCase: boolean = false,
	) {
		return new Promise<MemosObject>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery: ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateAndPossiblyRemoveTxMemos(
					receiptQuery,
					updateSets,
					replaceKeyCase,
				);
				URLManipulator.setAndPossiblyRemoveTxMemosInURL(
					updateSets,
					replaceKeyCase,
				);
				resolve(newQuery.txMemos);
				return newQuery;
			});
		});
	}

	const updateAcctLabelInReceiptQuery = function(
		addressOrOnChainLabel: string,
		newLabelTrimmed?: string,
		replaceKeyCase: boolean = false,
	) {
		return new Promise<MemosObject>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateAcctLabel(
					receiptQuery,
					addressOrOnChainLabel,
					newLabelTrimmed,
					replaceKeyCase,
				);
				URLManipulator.setAcctLabelInURL(
					addressOrOnChainLabel,
					newLabelTrimmed
				);
				resolve(newQuery.acctMemos);
				return newQuery;
			});
		});
	}

	const updateRelativeTimeInReceiptQuery = function(
		newValue?: RelativeTimeOption,
	) {
		return new Promise<RelativeTimeOption | undefined>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				let newQuery = ReceiptQueryObjectUpdater.updateValue(
					receiptQuery,
					'relativeTime',
					newValue,
				);
				URLManipulator.setRelativeTimeInURL(
					newValue
				);
				resolve(newQuery.relativeTime);
				return newQuery;
			});
		});
	}

	const updateTimeBoundInReceiptQuery = function(
		propertyName: 'msStart' | 'msEnd',
		newValue?: Date,
	) {
		return new Promise<Date | undefined>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				let newQuery = ReceiptQueryObjectUpdater.updateTimeBound(
					receiptQuery,
					propertyName,
					newValue,
				);
				URLManipulator.setTimeBoundInURL(
					propertyName,
					newValue
				);
				resolve(newQuery[propertyName]);
				return newQuery;
			});
		});
	}

	const updateBlockBoundInReceiptQuery = function(
		propertyName: 'blockStart' | 'blockEnd',
		newValue?: number,
	) {
		return new Promise<number | undefined>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				let newQuery = ReceiptQueryObjectUpdater.updateBlockBound(
					receiptQuery,
					propertyName,
					newValue,
				);
				URLManipulator.setBlockBoundInURL(
					propertyName,
					newValue
				);
				resolve(newQuery[propertyName]);
				return newQuery;
			});
		});
	}

	const updateLock = function(updateCallback: boolean | ((isCurrentlyLocked: boolean) => boolean)) {
		return new Promise<boolean>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const shouldBeLocked = (typeof updateCallback === 'function' ? updateCallback(receiptQuery.lock) : updateCallback);
				const newQuery = ReceiptQueryObjectUpdater.updateValue(
					receiptQuery,
					'lock',
					shouldBeLocked,
				);
				setSpecialValueInURL('lock', shouldBeLocked);
				resolve(shouldBeLocked);
				return newQuery;
			});
		});
	}

	const updatePreferredView = function(updateCallback: ViewOption | ((currentPreferredView: ViewOption) => ViewOption)) {
		return new Promise<ViewOption>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newPreferredView = (typeof updateCallback === 'function' ? updateCallback(receiptQuery.view) : updateCallback);
				const newQuery = ReceiptQueryObjectUpdater.updateValue(
					receiptQuery,
					'view',
					newPreferredView,
				);
				setSpecialValueInURL('view', newPreferredView);
				resolve(newPreferredView);
				return newQuery;
			});
		});
	}

	const setValueInAppReceiptQueryAndURL = function<
		//The & condition doesn't have to be strict but it helps with verifying use only in
		//places where the fn is well adapted for use.
		K extends keyof ReceiptQuery & SpecialKeyForSettingInURL =
		keyof ReceiptQuery & SpecialKeyForSettingInURL
	>(
		key: K,
		value: ReceiptQuery[K],
	) {
		return new Promise<ReceiptQuery[K]>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateValue(
					receiptQuery,
					key,
					value
				);
				setSpecialValueInURL(key, value);
				resolve(value);
				return newQuery;
			});
		});
	}

	const setSpecialValueInURL = function<
		//The & condition doesn't have to be strict but it helps with verifying use only in
		//places where the fn is well adapted for use.
		K extends keyof ReceiptQuery & SpecialKeyForSettingInURL =
		keyof ReceiptQuery & SpecialKeyForSettingInURL
	>(
		key: K,
		value: ReceiptQuery[K],
	) {
		if (key === 'includeIncoming') {
			URLManipulator.setValueInURL('includeIncoming', value ? 'true' : undefined);
		} else if (key === 'showHome') {
			URLManipulator.setValueInURL('home', value ? 'true' : undefined); //false is the default
		} else if (key === 'lock') {
			URLManipulator.setValueInURL('lock', value ? 'start' : undefined); //'start' could be 'true'; assuming false is the default
		} else if (key === 'view') {
			//TODO: figure out why this cast is necessary
			URLManipulator.setValueInURL('view', URLManipulator.getViewURLParamValue(value as ViewOption)); //auto/undefined is the default
		} else if (key === 'addresses') {
			//TODO: figure out why this cast is necessary
			URLManipulator.setAddressesInURL(value as string[]);
		} else if (key === 'filterTo') {
			const valueCast = value as string[]; //TODO: figure out why this cast is necessary
			URLManipulator.setValueInURL('filterTo', URLManipulator.getFilterToURLParamValue(valueCast));
		} else if(key === 'txMemos') {
			//TODO: figure out why this cast is necessary
			URLManipulator.setTxMemosInURL(value as MemosObject);
		} else {
			console.error('Likely programming bug: Unrecognized key',key,'in setSpecialValueInURL().');
			URLManipulator.setValueInURL(key, value?.toString());
		}
	}

	const setFilterToInReceiptQuery = function(
		addressOrOnChainLabels?: string[],
	) {
		return new Promise<string[]>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.updateFilterTo(
					receiptQuery,
					addressOrOnChainLabels
				);
				URLManipulator.setFilterInURL(newQuery.filterTo);
				resolve(newQuery.filterTo);
				return newQuery;
			});
		});
	}

	const addAndOrRemoveAccountsFromReceiptQuery = function(
		updateSets: {
			addressOrOnChainLabelToRemove: string | undefined,
			addressOrOnChainLabelToAdd: string | undefined,
			labelOfAccountToAddTrimmed: string | undefined,
		}[],
		caseSensitive: boolean = true,
	) {
		return new Promise<string[]>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const queryUpdateResult = ReceiptQueryObjectUpdater.addAndOrRemoveAccounts(
					receiptQuery,
					updateSets,
					caseSensitive
				);
				let urlObj = URLManipulator.setAddressesInCurrentURLReturnObj(queryUpdateResult.newQuery.addresses);
				for(let updatedLabel of queryUpdateResult.updatedLabels) {
					URLManipulator.setAcctLabelInURLObj(
						urlObj,
						updatedLabel.addressOrOnChainLabelToAdd,
						updatedLabel.labelOfAccountToAddTrimmed,
					)
				}
				//eslint-disable-next-line no-restricted-globals
				history.pushState(undefined, '',urlObj.toString());
				resolve(queryUpdateResult.newQuery.addresses);
				return queryUpdateResult.newQuery;
			});
		});
	}

	const addAccountsToReceiptQuery = function(
		addressesOrOnChainLabelsToAdd: string[],
		replaceCase: boolean = false,
	) {
		return new Promise<string[]>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.addAccounts(
					receiptQuery,
					addressesOrOnChainLabelsToAdd,
					replaceCase
				);
				URLManipulator.setAddressesInURL(newQuery.addresses);
				resolve(newQuery.addresses);
				return newQuery;
			});
		});
	}

	const replaceOneFilterToAddressInReceiptQuery = function(
		updateSets: {
			filterToToRemove: string | undefined, //undefined means adding next param without replacing anything
			filterToToReplaceWith: string | undefined, //undefined means removing first param without replacing it with anything
		}[],
		caseSensitiveSearch: boolean = true,
	) {
		return new Promise<string[]>(function(resolve, reject) {
			setReceiptQuery(function(receiptQuery : ReceiptQuery) {
				const newQuery = ReceiptQueryObjectUpdater.replaceOneFilterToAddress(
					receiptQuery,
					updateSets,
					caseSensitiveSearch
				);
				URLManipulator.setFilterInURL(newQuery.filterTo);
				resolve(newQuery.filterTo);
				return newQuery;
			});
		});
	}

	const [viewDocs, setViewDocs] = useState<boolean>(window.location.pathname.startsWith('/docs'));
	const goToDocs = function(ev: React.MouseEvent<HTMLAnchorElement>) {
		ev.preventDefault();
		let urlObj = URLManipulator.getCurrentURL();
		const newPathname = new URL(ev.currentTarget.href).pathname;
		urlObj.pathname = newPathname;
		//eslint-disable-next-line no-restricted-globals
		history.pushState(undefined, '',urlObj.toString());
		setViewDocs(newPathname.startsWith('/docs'));
	}
	if(viewDocs) {
		return(
			<DocsPage
				logoClick={goToDocs}
			/>
		)
	}

	if(
		receiptQuery.showHome ||
		!QueryParser.querySpecifiesAccountOrTx(receiptQuery)
	) {
		return (<Homepage
			receiptQuery = {receiptQuery}
			replaceReceiptQuery = {replaceReceiptQuery}
			//@ts-ignore hard-to-specify fn type with generics: TODO revisit for better typing.
			setValueInAppReceiptQueryAndURL = {setValueInAppReceiptQueryAndURL}
			onProviderChange = {onProviderChange}
			onNetworkChange = {onNetworkChange}
			updateAndPossiblyRemoveTxMemosInReceiptQuery = {updateAndPossiblyRemoveTxMemosInReceiptQuery}
			updateAcctLabelInReceiptQuery = {updateAcctLabelInReceiptQuery}
			setFilterToInReceiptQuery = {setFilterToInReceiptQuery}
			addAndOrRemoveAccountsFromReceiptQuery = {addAndOrRemoveAccountsFromReceiptQuery}
			addAccountsToReceiptQuery = {addAccountsToReceiptQuery}
			replaceOneFilterToAddressInReceiptQuery = {replaceOneFilterToAddressInReceiptQuery}
			updateRelativeTimeInReceiptQuery = {updateRelativeTimeInReceiptQuery}
			updateTimeBoundInReceiptQuery = {updateTimeBoundInReceiptQuery}
			updateBlockBoundInReceiptQuery = {updateBlockBoundInReceiptQuery}
			goToDocs = {goToDocs}
		/>);
	} else {
		return (<DataFetchingReceiptPage
			provider = {provider}
			chainId = {chainId}
			receiptQuery = {receiptQuery}
			updateTxMemoInReceiptQuery = {updateTxMemoInReceiptQuery}
			updateAcctLabelInReceiptQuery = {updateAcctLabelInReceiptQuery}
			updateLock = {updateLock}
			updatePreferredView = {updatePreferredView}
			setFilterToInReceiptQuery = {setFilterToInReceiptQuery}
			showHome = {function() {return setValueInAppReceiptQueryAndURL('showHome', true)}}
		/>);
	}
}

export default App;
