import React, { useEffect, useState } from 'react';
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";
import unblockReceiptLogoTight from "./images/unblockReceiptLogoTight.png";
import './App.css';
import { ethers } from 'ethers';
import EthDater from 'ethereum-block-by-date';
import DateRangePicker from './components/DatePicker/DateRangePicker';
import Onboard, { EIP1193Provider } from "@web3-onboard/core";
import coinbaseWalletModule from "@web3-onboard/coinbase";
import walletConnectModule from "@web3-onboard/walletconnect";
import injectedModule from "@web3-onboard/injected-wallets";

const coinbaseWalletSdk = coinbaseWalletModule();
const walletConnect = walletConnectModule();
const injected = injectedModule();

//TODO: Use Coinbase Node for RPC if needed
const MAINNET_RPC_URL = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`;
const GOERLI_RPC_URL = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`;
const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`;

const onboard = Onboard({
  wallets: [coinbaseWalletSdk, walletConnect, injected],
  chains: [
    {
      id: "0x1", // chain ID must be in hex
      token: "ETH",
      namespace: "evm",
      label: "Ethereum Mainnet",
      rpcUrl: MAINNET_RPC_URL
    },
    {
      id: "0x5",
      token: "ETH",
      namespace: "evm",
      label: "Ethereum Goerli Testnet",
      rpcUrl: GOERLI_RPC_URL
    },
    {
      id: "0xaa36a7",
      token: "ETH",
      namespace: "evm",
      label: "Ethereum Sepolia Testnet",
      rpcUrl: SEPOLIA_RPC_URL
    }
  ],
  appMetadata: {
    name: "Unblock Receipts",
    icon: "./icon-logo.png",
    logo: "./tight-black.png", //should be wider format
    description: "Receipts for web3 transactions",
    recommendedInjectedWallets: [
      { name: "Coinbase", url: "https://wallet.coinbase.com/" },
      { name: "MetaMask", url: "https://metamask.io" }
    ]
  },
  connect: {
    autoConnectLastWallet: true,
  }
});

type MODE = 'tx' | 'acct';

interface DataForDisplay {
  mode: MODE;
  TxRows: TxRowData[];
}

interface WrappedTxData {
  startBlockTimestamp?: Date,
  endBlockTimestamp?: Date,
  txData: TxRowData[]
}
type MemosObject = {
  [index: string] : string;
}
interface ReceiptQuery {
  addresses: string[];
  txMemos: MemosObject;
  blockStart?: string;
  blockEnd?: string;
  msStart?: Date;
  msEnd?: Date;
}

interface TokenTransfer {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#tokentransfer
  tokenAddress: string;
  tokenType: "erc20" | "erc721";
  from: string;
  to: string;
  value: string; // For ERC-20, gives quantity of tokens transferred. For ERC-721, gives list of token IDs of the token transferred
  transactionHash: string;
  transactionIndex: string;
}

interface InternalTransaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#internaltransaction
  traceType: string; //Type of internal transaction, e.g. CREATE, CALL, CALLCODE, DELEGATECALL, SUICIDE
  from: string;
  to: string;
  value: string; //The value in native blockchain currency.
  gasLimit?: string
}
interface Transaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#transaction
  transactionHash:	string;
  transactionIndex:	string;
  from:	string; //The origin address.
  to:	string; //The destination address.
  value:	string; //The value in native blockchain currency.
  gasLimit:	string; //The maximum gas limit of a transaction.
  gasPrice:	string; //Transaction's cost per unit of gas in native blockchain currency.
  gasUsed:	string; //Amount of gas actually used in transaction.
  cumulativeGasUsed:	string;	//Total amount of gas used in the block of the transaction.
  status:	string; //"1": Success, "0": Fail, Other return codes: Unknown.
  input:	string;
  nonce:	string;
  blockHash:	string;
  blockNumber:	string;
  blockTimestamp:	string;
  internalTransactions?:	InternalTransaction[];
  tokenTransfers?:	TokenTransfer[];
}
interface BlockTransaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#blocktransaction
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  transactions:	Transaction[];
}
interface TransactionsByAddress {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#transactionsbyaddress
  blockStart: string;
  blockEnd: string;
  blocks: BlockTransaction[];
}

interface TransactionsByAddressResult {
  id: number;
  jsonrpc: string;
  result: TransactionsByAddress;
}
interface paramsForTxByAddress {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#coinbasecloud_gettransactionsbyaddress
  "address": string; //"0x3cd751e6b0078be393132286c442345e5dc49699",
  "blockStart": string; //e.g. "0xdc3500",
  "blockEnd"?: string; //e.g. "0xdc3501", //see pagination
  "addressFilter"?: "SENDER_ONLY" | "SENDER_OR_RECEIVER" | "RECEIVER_ONLY";
  "blockchain"?: "Ethereum"; //currently the only option; "Polygon" and "Optimism" and "Arbitrum" to be added.
  "network"?: "Mainnet" | "Goerli";
}

interface TxRowData {
  txID: string;
  value: ethers.BigNumber;
  valueUSD: number;
  gasFeeETHwei: ethers.BigNumber;
  gasFeeUSD: number;
  timestamp: Date;
  from: string | undefined;
  to: string | undefined;
  memo: string;
}

const dater = new EthDater(new ethers.providers.CloudflareProvider());
const cachedENSResolutions : {[index: string]: string}= {}; //hex address => name
function App() {
  const receiptQuery = getReceiptQueryFromURL();
  const [provider, setProvider] = useState<EIP1193Provider | undefined>();
  const [address, setAddress] = useState<string>(); //example used account; prior code used address
  const [chainId, setChainId] = useState<string>(); //assuming this is intended instead of network from the example at
  const [wrappedTxData, setTxData] = useState(function generateEmptyTxData() {
    return {txData: [] as TxRowData[],
      startBlockTimestamp: undefined,
      endBlockTimestamp: undefined} as WrappedTxData
  });
  const connectWallet = async () => {
    try {
      const wallets = await onboard.connectWallet();
      setAddress(wallets[0]?.accounts[0]?.address || '');
      setChainId(wallets[0]?.chains[0]?.id);
      setProvider(wallets[0]?.provider);
    } catch (error) {
      console.error(error);
    }
  };
  const getTxnData = async function(
    txHash: string,
    txMemo: string,
  ) : Promise<TxRowData> {
    try {
      const coinbaseProvider = getCoinbaseNodeProvider();
      let result = await getTxnDataFromProvider(txHash, txMemo, coinbaseProvider);
      return result;
    } catch (err) {
      try {
        console.warn('Attempt to get data for tx ' + txHash + ' from Coinbase Node failed, likely because Coinbase Node is now deprecated. Falling back to Infura.');
        const infuraProvider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_API_KEY);
        let result = await getTxnDataFromProvider(txHash, txMemo, infuraProvider);
        return result;
      } catch(err) {
        throw (err);
      }
    }
  }
  const getTxnDataFromProvider = async function(
    txHash: string,
    txMemo: string,
    provider: ethers.providers.JsonRpcProvider
  ) : Promise<TxRowData> {
    const receipt = await provider.getTransactionReceipt(txHash);
    const txn = await provider.getTransaction(txHash);
    if(typeof receipt.blockNumber === 'undefined') {
      throw new Error ('Got undefined block number in receipt for tx '+txHash);
    }
    const block = await provider.getBlock(receipt.blockNumber);
    const ethPriceInUSD = await getEthPriceInUSD(block.timestamp);
    //@ts-ignore that effectiveGasPrice might be undefined - it's undocumented but sometimes there.
    const gasPrice = (typeof receipt.effectiveGasPrice === 'undefined') ? txn.gasPrice : receipt.effectiveGasPrice;
    const gasUsed = (typeof receipt.gasUsed === 'undefined') ? ethers.BigNumber.from(0) : receipt.gasUsed;
    const gasFeeETHwei = (typeof gasPrice === 'undefined') ? ethers.BigNumber.from(0) : gasUsed.mul(gasPrice);
    const gasFeeUSD = convertWeiToDollars(gasFeeETHwei, ethPriceInUSD);
    const valueUSD = convertWeiToDollars(txn.value, ethPriceInUSD);
    //console.log('gasPrice', gasPrice, 'gasUsed', gasUsed, 'gasFeeETHwei', gasFeeETHwei);
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
      to: await showAddress(receipt.to),
      from: await showAddress(receipt.from),
      memo: txMemo,
    };
    return txData;
  }
  const getTxnsData = async function(receiptQuery: ReceiptQuery) : Promise<WrappedTxData> {
    if(Object.keys(receiptQuery.txMemos).length > 0){
      const txDataPromises : Promise<TxRowData>[] = [];
      for(let txHash in receiptQuery.txMemos) {
        txDataPromises.push(getTxnData(txHash, receiptQuery.txMemos[txHash]));
      }
      return {txData: await Promise.all(txDataPromises), startBlockTimestamp: undefined, endBlockTimestamp: undefined};
    } else {
      if(typeof receiptQuery.blockStart === 'undefined' && typeof receiptQuery.msStart !== 'undefined') {
        receiptQuery.blockStart = await getHexBlockNumberJustBeforeTimestamp(receiptQuery.msStart);
      }
      if(typeof receiptQuery.blockEnd === 'undefined' && typeof receiptQuery.msEnd !== 'undefined') {
        receiptQuery.blockEnd = await getHexBlockNumberJustBeforeTimestamp(receiptQuery.msEnd);
      }
      let startBlockTimestamp = undefined;
      let endBlockTimestamp = undefined;
      if(typeof receiptQuery.blockStart !== 'undefined' || typeof receiptQuery.blockEnd !== 'undefined') {
        const provider = getCoinbaseNodeProvider();
        if(typeof receiptQuery.blockStart !== 'undefined') {
          const block = await provider.getBlock(receiptQuery.blockStart);
          startBlockTimestamp = new Date(block.timestamp*1000);
        }
        if(typeof receiptQuery.blockEnd !== 'undefined') {
          const block = await provider.getBlock(receiptQuery.blockEnd);
          endBlockTimestamp = new Date(block.timestamp*1000);
        }
      }
      //get address data; TODO make these not mutually exclusive.
      return {startBlockTimestamp, endBlockTimestamp, txData: await getTxDataForAddresses(receiptQuery.addresses, receiptQuery.txMemos, receiptQuery.blockStart, receiptQuery.blockEnd)};
    }
  }
  const getAndDisplayTxnsData = async function(receiptQuery: ReceiptQuery | undefined) {
    if(typeof receiptQuery === 'undefined') {
      return;
    }
    let wrappedTxData = undefined;
    wrappedTxData= await getTxnsData(receiptQuery);
    setTxData(wrappedTxData);
    return wrappedTxData;
  }
  useEffect(() => { getAndDisplayTxnsData(receiptQuery); },[]); //https://stackoverflow.com/a/71434389/
  const [rangeStart, setRangeStart] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  let onRangeStartChange = (newRangeStartValue?: Date) => {
    setRangeStart(newRangeStartValue);
  }
  let onRangeEndChange = (newRangeEndValue?: Date) => {
    setRangeEnd(newRangeEndValue);
  }
  if(typeof receiptQuery === 'undefined' || (Object.keys(receiptQuery.txMemos).length === 0 && receiptQuery.addresses.length === 0)) {
    return (
      <>
      {/*<Navbar />*/}
      <div className="App">
        <header className="App-header">
          <img
            src={unblockReceiptLogo}
            className="App-logo"
            alt="logo"
            style={{ height: "180px", paddingBottom: "1rem" }}
          />
          <em>Spend your tokens, not your time!</em>
          <br />
          <div className="homepageContent">
            Welcome to UnblockReceipts!
            <br />
            Paste a transaction ID in this box to see a receipt (or more than one, separated by commas):<br />
            <input
              id="txHashInput"
              placeholder="e.g. 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2"
              />
            <button
              onClick={(ev: React.MouseEvent) => {
                const inputElement = document.getElementById("txHashInput");
                if(!(inputElement instanceof HTMLInputElement)) {
                  throw new Error('txHashInput element was not of the expected type - this should never happen.');
                }
                const inputValue = inputElement.value;
                if(membersMatchExpectedLength(inputValue, 66)) {
                  window.location.search = '?tx=' + inputValue;
                }
              }}
            >Get receipt!</button>
            <br />
            Alternatively, you can use this box to get a receipt for all the transactions on an account (or more than one, separated by commas):
            <br />
            <input
              id="acctInput"
              placeholder={address}
              />
            <DateRangePicker
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onRangeStartChange={onRangeStartChange}
              onRangeEndChange={onRangeEndChange}
            />
            <button
              onClick={(ev: React.MouseEvent) => {
                const inputElement = document.getElementById("acctInput");
                if(!(inputElement instanceof HTMLInputElement)) {
                  throw new Error('acctInput element was not of the expected type - this should never happen.');
                }
                const inputValue = inputElement.value.length > 0 ? inputElement.value : address;
                if(typeof inputValue !== 'undefined' && inputValue.length > 0) {
                  let searchParams = new URLSearchParams();
                  searchParams.set('acct', inputValue);
                  if(typeof rangeStart !== 'undefined' && rangeStart !== null) {
                    searchParams.set('start', rangeStart.valueOf().toString());
                  }
                  if(typeof rangeEnd !== 'undefined' && rangeEnd !== null) {
                    searchParams.set('end', rangeEnd.valueOf().toString());
                  }
                  window.location.search = '?' + searchParams.toString();
                }
              }}
            >Get receipt!</button>
            <br />
            Even more conveniently, you can <button onClick={connectWallet}>click here to connect to accounts you control</button>.
          </div>
          <br />
          <br />
          <small><em>
            Note: This project is far from feature-complete and might have bugs, but might also still be useful at this early point.
            </em></small>
        </header>
      </div>
      </>
    );
  } else {
    return (
      <>
        {/*<Navbar />*/}
        <a href='/'>
        <img
            src={unblockReceiptLogoTight}
            className="App-logo"
            alt="logo"
            style={{ height: "5em", padding: "1em" }}
        />
        </a>
        <span className="slogan">Spend your tokens, not your time!</span>
        <h1 style={{textAlign: "center" }}>
          Transaction receipt
        </h1>
        <p className="mode">
          This is a receipt for
          {Object.keys(receiptQuery.txMemos).length > 0 ?
          (Object.keys(receiptQuery.txMemos).length === 1 ? ' a specified transaction' : ' specified transactions') : (
          (typeof wrappedTxData.startBlockTimestamp === 'undefined' ?
          (typeof wrappedTxData.endBlockTimestamp === 'undefined' ? (' the entire history ') : (' the entire history until ' + wrappedTxData.endBlockTimestamp)) :
          (typeof wrappedTxData.endBlockTimestamp === 'undefined' ? (' the history starting from ' + wrappedTxData.startBlockTimestamp) :
          (' the history from ' + wrappedTxData.startBlockTimestamp + ' through ' + wrappedTxData.endBlockTimestamp))) +
          ' of'+(receiptQuery.addresses.length === 1 ? ' a specified account' : ' specified accounts')
          )}.
        </p>
        {wrappedTxData.txData.length > 0 ? '' :
          <p className="mode">Data has not yet loaded.
          <br />NOTE: Account data, including any applicable token information,
          was programmatically pulled from Coinbase Node, which was quietly discontinued in Feb. 2023.
          <br />Not all the associated account-based functionality
          has been removed yet due to plans of finding a substitute with adequate performance at least for simple transactions,
          <br />but features based on accounts and/or
          fungible or nonfungible token transfers probably won't work at present.</p>
        }
        <div className="receiptAndExplanationWrapper">
          <table className="txReceiptsTable">
            <thead>
              <tr>
                <td>
                  Transaction ID
                </td>
                <td>
                  From
                </td>
                <td>
                  To
                </td>
                <td title="This transaction took place on">
                  Date/Time
                </td>
                <td>
                  ETH sent<br />(ETH)
                </td>
                <td>
                  Tx fee<br />(ETH)
                </td>
                <td>
                  ETH sent<br />(USD)
                </td>
                <td>
                  Tx fee<br />(USD)
                </td>
              </tr>
            </thead>
            <tbody>
              {
                wrappedTxData.txData.map(getTxRow)
              }
            </tbody>
          </table>
          <p className="explanation">
            At the moment, this tool only generates receipts for transactions on the main Ethereum network.
          </p>
          <p className="explanation">
            On this decentralized network, the "transaction fee" (abbreviated "Tx fee") incentivizes network participants to
            do the work needed to include this transaction in the ledger.
          </p>
          <p className="explanation">
            The time zone displayed above is based on viewer system settings, and does not necessarily reflect the time zone the
            person who initiated this transaction may have been in.
          </p>
          <p className="explanation">
            Conversion rates are drawn from <a href="https://thegraph.com/" target="_blank" rel="noreferrer">The Graph's</a> subgraph/index of
            SushiSwap market pricing as of the date of each transaction listed above.
          </p>
          <p className="explanation">
            This project is far from feature-complete and might have bugs, but might also still be useful at this early point.
          </p>
        </div>
      </>
    );
  }
}

function getCoinbaseNodeProvider() {
  return new ethers.providers.JsonRpcProvider({
    url: 'https://mainnet.ethereum.coinbasecloud.net',
    user: process.env.REACT_APP_COINBASE_CLOUD_USER,
    password: process.env.REACT_APP_COINBASE_CLOUD_PASS,
  });
}

function getTxRow(txData: TxRowData) {
    return (
      <>
      <tr className="singleTxReceipt" key={txData.txID}>
        <td style={{maxWidth: "10em"}}><a className="txID"
        href={'https://etherscan.io/tx/' + txData.txID} target='_blank' rel="noreferrer" >{txData.txID}</a></td>
        <td style={{maxWidth: "10em"}}>{txData.from}</td>
        <td style={{maxWidth: "10em"}}>{txData.to}</td>
        <td style={{maxWidth: "10em"}}>{txData.timestamp.toString()}</td>
        <td>{ethers.utils.formatUnits(txData.value, 'ether')}</td>
        <td>{ethers.utils.formatUnits(txData.gasFeeETHwei, 'ether')}</td>
        <td>${txData.valueUSD}</td>
        <td>${txData.gasFeeUSD}</td>
      </tr>
      { txData.memo.length > 0 &&
        <tr className="memo" key={txData.txID + 'Memo'}>
          <td colSpan={8}>Memo: {txData.memo}</td>
        </tr>
      }
      </>
    );
}

async function resolveENSsIfNecessary(addressesIn: string[]): Promise<string[]> {
  let promises : Promise<string>[] = [];
  for (let address of addressesIn) {
    promises.push(resolveENSIfNecessary(address))
  }
  return await Promise.all(promises);
}

async function resolveENSIfNecessary(addressIn: string): Promise<string> {
  const provider = new ethers.providers.CloudflareProvider();
  const resolvedName = await provider.resolveName(addressIn);
  if(resolvedName === null) {
    return addressIn;
  } else {
    cachedENSResolutions[resolvedName.toLowerCase()] = addressIn;
    return resolvedName;
  }
}

async function showAddress(hexAddress: string) : Promise<string> {
  const cacheResult = cachedENSResolutions[hexAddress.toLowerCase()];
  if(typeof cacheResult !== 'undefined') {
    return cacheResult;
  }
  const provider = new ethers.providers.CloudflareProvider();
  const reverseLookup = await provider.lookupAddress(hexAddress);
  //NOTE: Reverse resolution doesn't always work if the owner doesn't have it configured;
  //see https://docs.ens.domains/contract-api-reference/reverseregistrar
  if(reverseLookup === null) {
    //console.log('Reverse lookup for ' + hexAddress + ' found no ENS name.');
    return hexAddress;
  } else {
    //console.log('Reverse lookup for ' + hexAddress + ' found ENS name ' + reverseLookup);
    return reverseLookup;
  }
}

function makeEmptyMemos(hashes: string[], objToAddTo: MemosObject = {}) {
  for(let hash of hashes) {
    Object.assign(objToAddTo, {[hash]: ''});
  }
  return objToAddTo;
}

function getMemos(
  urlSearchParams: URLSearchParams,
  paramNamesToIgnore: string[]
): {txMemos: MemosObject, acctMemos: MemosObject} {
  let txMemos : MemosObject = {};
  let acctMemos : MemosObject = {};
  for(const [key, value] of urlSearchParams.entries()) {
    if(!paramNamesToIgnore.includes(key)) {
      //These are not surefire ways of identifying their category,
      //but it's probably the most useful way to parse such parameters if provided.
      if(key.length === 66 && key.startsWith('0x')) {
        txMemos[key] = value;
      } else { //could be account address or ENS/domain-format addresses.
        console.log('Found acct memo ' + value + ' for acct ' + key + '.  These are not yet displayed.');
        acctMemos[key] = value;
      }
    }
  };
  return {txMemos, acctMemos};
}

function getReceiptQueryFromURL(): ReceiptQuery | undefined {
  //TODO: This currently ignores addresses if any transactions are defined;
  //they could technically coexist.
  //txMemos can coexist with account addresses but just for adding memos.
  const pathname = window.location.pathname;
  const SINGLE_TX_START = "/tx/";
  const ADDRESS_START = "/acct/";
  const urlSearchParams = new URLSearchParams(window.location.search);
  const specialParamKeys = [
    'tx',
    'acct',
    'blockStart',
    'blockEnd',
    'start',
    'end'
  ]
  const urlSearchParamsTx = urlSearchParams.get("tx");
  const urlSearchParamsAddr = urlSearchParams.get("acct");
  const urlSearchParamsBlockStart = urlSearchParams.get("blockStart");
  const urlSearchParamsBlockEnd = urlSearchParams.get("blockEnd");
  const urlSearchParamsMsStart = urlSearchParams.get("start");
  const urlSearchParamsMsEnd = urlSearchParams.get("end");
  const {txMemos, acctMemos} =  getMemos(urlSearchParams, specialParamKeys);
  //TODO: Show the acctMemos correspondence list at the top of the page
  //and then only the memo in references in the table below.
  let partialResult: Partial<ReceiptQuery> = {};
  if(urlSearchParamsBlockStart !== null) {
    partialResult.blockStart = urlSearchParamsBlockStart.startsWith('0x') ? urlSearchParamsBlockStart : convertToHex(urlSearchParamsBlockStart);
  }
  if(urlSearchParamsBlockEnd !== null) {
    partialResult.blockEnd = urlSearchParamsBlockEnd.startsWith('0x') ? urlSearchParamsBlockEnd : convertToHex(urlSearchParamsBlockEnd);
  }
  if(urlSearchParamsMsStart !== null) {
    partialResult.msStart = new Date(parseInt(urlSearchParamsMsStart));
  }
  if(urlSearchParamsMsEnd !== null) {
    partialResult.msEnd = new Date(parseInt(urlSearchParamsMsEnd));
  }
  if (pathname.startsWith(SINGLE_TX_START)) {
    let emptyTxMemos = makeEmptyMemos(splitToMultipleIDs(getPathPortionEndingAtOptionalSlash(pathname, SINGLE_TX_START.length)));
    return Object.assign({
      txMemos: Object.assign(txMemos, emptyTxMemos),
      addresses: [],
    }, partialResult);
  } else {
    if (urlSearchParamsTx !== null) {
      let emptyTxMemos = makeEmptyMemos(splitToMultipleIDs(urlSearchParamsTx));
      return Object.assign({
        txMemos: Object.assign(txMemos, emptyTxMemos),
        addresses: [],
      }, partialResult);
    } else if(pathname.startsWith(ADDRESS_START)) {
      const addresses = splitToMultipleIDs(getPathPortionEndingAtOptionalSlash(pathname, ADDRESS_START.length));
      return Object.assign({addresses, txMemos}, partialResult);
    } else if(urlSearchParamsAddr !== null) {
      const addresses = splitToMultipleIDs(urlSearchParamsAddr);
      return Object.assign({addresses, txMemos}, partialResult);
    } else if (Object.keys(txMemos).length > 0) {
      return Object.assign({
        txMemos,
        addresses: [],
      }, partialResult);
    }
  }
}

async function getTxDataForAddresses(
  addresses: string[],
  txMemos: MemosObject,
  blockStart: string = 'genesis',
  blockEnd: string = 'latest'
) : Promise<TxRowData[]> {
  //console.log('About to convert addresses: ',addresses);
  const convertedAddresses = await resolveENSsIfNecessary(addresses);
  //console.log('Converted to: ',convertedAddresses);
  const blockTransactions = await convertAddressesToTxList(convertedAddresses, blockStart, blockEnd);
  let result: TxRowData[] = [];
  for(let blockTransaction of blockTransactions) {
    const timestampInt = parseInt(blockTransaction.blockTimestamp, 16);
    const timestamp = new Date(timestampInt*1000);
    const blockNumber = parseInt(blockTransaction.blockNumber);
    for(let txn of blockTransaction.transactions) {
      const ethPriceInUSD = await getEthPriceInUSD(timestampInt);
      const value = ethers.BigNumber.from(txn.value);
      const gasFeeETHwei = ethers.BigNumber.from(txn.gasUsed).mul(txn.gasPrice);
      const gasFeeUSD = convertWeiToDollars(gasFeeETHwei, ethPriceInUSD);
      const valueUSD = convertWeiToDollars(ethers.BigNumber.from(txn.value), ethPriceInUSD);
      let txMemo = '';
      if(typeof txMemos[txn.transactionHash] !== 'undefined') {
        txMemo = txMemos[txn.transactionHash];
      }
      result.push({
        txID: txn.transactionHash,
        value,
        valueUSD,
        gasFeeETHwei,
        gasFeeUSD,
        timestamp,
        from: await showAddress(txn.from),
        to: await showAddress(txn.to),
        memo: txMemo,
      });
    }
  }
  return result;
}

async function convertAddressesToTxList(
  addresses: string[],
  blockStart: string = 'genesis',
  blockEnd: string = 'latest'
) : Promise<BlockTransaction[]> {
  let result = [];
  for(let address of addresses) {
    result.push(...(await getAllTxDataAboutAddress(address, blockStart, blockEnd)));
  }
  return result;
}

async function getAllTxDataAboutAddress(
  address: string,
  blockStart: string = 'genesis',
  blockEnd: string = 'latest',
  resultBlockSet: BlockTransaction[] = []
) : Promise<BlockTransaction[]> {
  if(blockStart === 'genesis') {
    blockStart = '0x0'; //'genesis' is not accepted.
  }
  const singleCallResult = await makeHTTPRequestToCoinbaseCloud({
    address,
    blockStart,
    blockEnd, //see pagination
    "addressFilter": "SENDER_ONLY", //can also be "SENDER_OR_RECEIVER" or "RECEIVER_ONLY"
    "blockchain": "Ethereum", //currently the only option; "Polygon" and "Optimism" and "Arbitrum" to be added.
    "network": "Mainnet" //"Goerli" also supported
  }) as TransactionsByAddressResult;
  resultBlockSet.push(...singleCallResult.result.blocks);
  //Pagination handling:
  let requestedBlockStart = ethers.BigNumber.from(blockStart);
  let actualBlockStartHex = singleCallResult?.result?.blockStart;
  if(typeof actualBlockStartHex === 'undefined') {
    console.warn('Could not determine if additional pagination queries are needed; not making them.');
  } else {
    let actualBlockStart = ethers.BigNumber.from(actualBlockStartHex);
    if(actualBlockStart.gt(requestedBlockStart)) {
      return getAllTxDataAboutAddress(address, blockStart, actualBlockStart.sub(1).toHexString(), resultBlockSet)
    }
  }
  return resultBlockSet;
}

function makeHTTPRequestToCoinbaseCloud(
  params: paramsForTxByAddress,
) {
  return new Promise(function(resolve, reject) {
    if(params.blockEnd === 'latest') {
      delete params.blockEnd; //it's the latest by default, but 'latest' isn't accepted
    }
    const reqBodyJSON = {
      "id": 1,
      "jsonrpc": "2.0",
      "method": "coinbaseCloud_getTransactionsByAddress",
      "params": params
    };
    const req = new XMLHttpRequest();
    req.onload = function () {
      const response = req.response;
      if(response?.error) {
        console.error('Error response from XMLHttpRequest to Coinbase Cloud:', response); //might still be an HTTP 200!
      }
      resolve(response);
    }
    req.responseType = 'json';
    //req.addEventListener("load", reqListener);
    req.open("POST", "https://mainnet.ethereum.coinbasecloud.net");
    req.setRequestHeader('Authorization','Basic ' + window.btoa(process.env.REACT_APP_COINBASE_CLOUD_USER + ':' + process.env.REACT_APP_COINBASE_CLOUD_PASS));
    req.setRequestHeader('Content-Type','application/json');
    let parsed = JSON.stringify(reqBodyJSON, null, 2);
    req.send(parsed);
  });
}

function getPathPortionEndingAtOptionalSlash(strIn: string, startPos: number) {
  let txHashEndSlash = strIn.indexOf("/", startPos);
  let txHashEndsBefore = strIn.length;
  if (txHashEndSlash >= 0) {
    txHashEndsBefore = txHashEndSlash;
  }
  return strIn.substring(startPos, txHashEndsBefore);
}

function splitToMultipleIDs(strIn: string): string[] {
  let components = strIn.split(',');
  return components.map(function(component) {return decodeURIComponent(component).trim();});
}

function membersMatchExpectedLength(possiblyCommaSeparatedList: string, expectedMemberLength: number) {
  const inputValueSplit = possiblyCommaSeparatedList.split(',');
  let countRightLength = 0;
  let countWrongLength = 0;
  for(let inputHash of inputValueSplit) {
    let len = inputHash.trim().length;
    if(len === expectedMemberLength) {
      countRightLength++;
    } else if (len > 0) {
      countWrongLength++;
    }
  }
  return (countRightLength > 0 && countWrongLength === 0);
}

function convertWeiToDollars(wei: ethers.BigNumber, ethPriceInUSD: number) : number {
  return parseFloat(ethers.utils.formatUnits(wei, 'ether'))*(ethPriceInUSD);
}

async function getEthPriceInUSD(blockTimestamp : number | undefined ) : Promise<number> {
  if(typeof blockTimestamp === 'undefined') {
    throw new Error('blockTimestamp should not be undefined for seeking exchange price.');
  }
  let blockDateObj = new Date(blockTimestamp*1000); //ms will already be 0
  blockDateObj.setUTCHours(0);
  blockDateObj.setUTCMinutes(0);
  blockDateObj.setUTCSeconds(0);
  blockTimestamp = blockDateObj.valueOf()/1000;
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  var graphql = JSON.stringify({
    query: "query oneQuery($pricedate: Int!){\n  tokens(where: { id: \"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2\"}){\n    id\n    name\n    dayData(where:{ date: $pricedate }){\n      priceUSD\n    }\n  }\n}",
    variables: {"pricedate":blockTimestamp}
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: graphql,
    redirect: 'follow'
  };
  return fetch("https://api.thegraph.com/subgraphs/name/sushiswap/exchange", {
    method: 'POST',
    headers: myHeaders,
    body: graphql,
    redirect: 'follow'
  }).then(response => response.text()).then(result => {
      //console.log("Eth Price: ", JSON.parse(result).data.tokens[0].dayData[0].priceUSD);
      return JSON.parse(result).data.tokens[0].dayData[0].priceUSD;
  }).catch(error => console.log('error', error));
}

async function getHexBlockNumberJustBeforeTimestamp(
  timestamp: Date
) : Promise<string> {
  return ethers.BigNumber.from((await getBlockInfoJustBeforeTimestamp(timestamp)).block).toHexString();
}

async function getBlockInfoJustBeforeTimestamp(
  timestamp: Date
) : Promise<EthDater.BlockResult> {
  return dater.getDate(timestamp, false, false);
}

function convertToHex(stringNumIn: ethers.BigNumberish) {
  return ethers.BigNumber.from(stringNumIn).toHexString();
}

export default App;
