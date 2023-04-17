
interface TokenTransfer {
	//https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#tokentransfer
	tokenAddress: string;
	tokenType: 'erc20' | 'erc721';
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

export interface Transaction {
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
	status:	string; //'1': Success, '0': Fail, Other return codes: Unknown.
	input:	string;
	nonce:	string;
	blockHash:	string;
	blockNumber:	string;
	blockTimestamp:	string;
	functionName ?: string; //added from Etherscan API
	internalTransactions?:	InternalTransaction[];
	tokenTransfers?:	TokenTransfer[];
}
export interface BlockTransaction {
	//https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#blocktransaction
	blockHash: string;
	blockNumber: string;
	blockTimestamp: string;
	transactions:	Transaction[];
}
