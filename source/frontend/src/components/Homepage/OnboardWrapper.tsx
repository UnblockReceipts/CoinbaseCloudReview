
import Onboard from '@web3-onboard/core';
import coinbaseWalletModule from '@web3-onboard/coinbase';
import walletConnectModule from '@web3-onboard/walletconnect';
import injectedModule from '@web3-onboard/injected-wallets';
const coinbaseWalletSdk = coinbaseWalletModule();
const walletConnect = walletConnectModule();
const injected = injectedModule();

//TODO: Use Coinbase Node for RPC if needed
const MAINNET_RPC_URL = `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`;
/* Disabling testnets for now- no receipts needed for those.
const GOERLI_RPC_URL = `https://goerli.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`;
const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`;
*/

export const OnboardWrapper = Onboard({
	wallets: [coinbaseWalletSdk, walletConnect, injected],
	chains: [
		{
			id: '0x1', // chain ID must be in hex
			token: 'ETH',
			namespace: 'evm',
			label: 'Ethereum Mainnet',
			rpcUrl: MAINNET_RPC_URL
		},
		/* Disabling testnets for now- no receipts needed for those.
		{
			id: '0x5',
			token: 'ETH',
			namespace: 'evm',
			label: 'Ethereum Goerli Testnet',
			rpcUrl: GOERLI_RPC_URL
		},
		{
			id: '0xaa36a7',
			token: 'ETH',
			namespace: 'evm',
			label: 'Ethereum Sepolia Testnet',
			rpcUrl: SEPOLIA_RPC_URL
		}
		*/
	],
	appMetadata: {
		name: 'Unblock Receipts',
		//Starting with a dot here will cause the loading to fail for e.g. /acct/ or /tx/ paths
		icon: '/icon-logo.png',
		logo: '/tight-black.png', //should be wider format
		description: 'Receipts for web3 transactions',
		recommendedInjectedWallets: [
			{ name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
			{ name: 'MetaMask', url: 'https://metamask.io' }
		],
	},
	connect: {
		autoConnectLastWallet: true,
	}
});
