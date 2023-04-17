import { LogoBlock } from "./components/Header/LogoBlock";

export const DocsPage = function(props: {
	logoClick: (
		(
			ev: React.MouseEvent<HTMLAnchorElement>,
		) => void
	);
}) {
	return(
		<div className='App'>
			<div className='docsPage'>
				<div className='docsPageContent'>
					<LogoBlock
						onClick={props.logoClick}
					/>
					<h1>Power Users' Guide to UnblockReceipts Link Construction</h1>
					<p>
						This application displays information based on URL parameters.
					</p>
					<p>
						This means it is relatively easy to construct a link to a particular receipt/report which
						can be e-mailed around, posted, shared, bookmarked, and
						embedded in other applications' workflows to easily add receipt functionality.
					</p>
					<h2>
						General notes about this documentation
					</h2>
					<p>
						For all examples in this documentation, double quotes (and sometimes parentheses) surround but are not part of what should be included in the URL.
					</p>
					<p>
						The names of URL parameters specified below are generally case-sensitive,
						though parameter names being used to label accounts or provide memos for transactions generally are not.
					</p>
					<h2>
						Building URLs manually
					</h2>
					<p>
						URLs for this application start with "https://www.unblockreceipts."
						<br />
						This is followed by your choice of the available top level domains: currently "com", "io", and "xyz" are available,
						with "com" recommended for best long-term stability.
						<br />
						This is then followed by a slash and then a question mark ("/?").
						<br />
						The question mark begins the portion of the URL dedicated to URL parameters.
						<br />
						Each URL parameter is in the form "urlParameter=value" and these units are separated from one another by "&" characters.
						<br />
						Certain special characters, which you might have in memos and labels, need to be "URI-encoded" (for example, spaces are replaced by "%20").
						Many browsers do this automatically, so if you put the link into a browser, visit the page, and copy the link from the browser's address bar,
						it may have the substitutions already made.
						<br />
						You can also use the homepage to create a starter link and modify it directly from there.
					</p>
					<h2>
						Building URLs with JavaScript
					</h2>
					<p>
						If you are developing a decentralized application and want to be able to include a link to UnblockReceipts after someone has successfully completed
						a transaction, you will likely be building those links with JavaScript.
						Use of the <a href='https://developer.mozilla.org/en-US/docs/Web/API/URL' target='_blank' rel="noreferrer">URL</a> and <a href='https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams' target='_blank' rel="noreferrer">URLSearchParams</a> objects
						is recommended.
						If not using these, <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent" target='_blank' rel="noreferrer">encodeURIComponent()</a> may help.
						For example, "let myURL = new URL('https://www.unblockreceipts.com/')" can be followed by
						"myURL.searchParams.set(parameterName, value)" for each parameter you wish to set, and "myURL.toString()" can be used to get the completed link,
						for example to be used as the value of the "href" attribute on an "a" link tag in your site's HTML.
					</p>
					<p>
						If you would like to be able to customize these receipts for transactions to addresses you control
						with your own logo, name, address, slogan, survey, guarantees or disclaimers, etc.
						and/or have these receipts be available at a custom
						subdomain (e.g. "https://yourdomain.unblockreceipts.xyz") or your own subdomain (e.g. "https://receipts.yourdomain.com"),
						please <a href='mailto:customReceipts@unblockreceipts.com'>reach out</a>.
					</p>
					<h2>
						Specifying Accounts
					</h2>
					<p>
						If you wish to generate a receipt for transactions from one or more specified accounts,
						set the "acct" parameter to a comma-separated list of those accounts (spaces are not needed).
						Accounts may be identified by their full hexadecimal address (starting with "0x") or by
						an <a href='https://ens.domains/' target='_blank' rel="noreferrer">ENS name</a> (which could also be
						a DNS name registered in the ENS directory).  If you're specifying more than one, you can mix
						hexadecimal and ENS addresses freely.
					</p>
					<p>
						It is highly recommended that you use one of the time-based limitations discussed in the next subsections,
						especially if any of the accounts have had very active periods in the past or present.
					</p>
					<h3>Including incoming transactions</h3>
					<p>
						By default UnblockReceipts will only show transactions which are "from" one of the specified accounts
						(or separately specified as an individual transaction, as discussed below).
						To also include transactions where the "to" field is one of the specified accounts,
						set the parameter "includeIncoming" to the value "true".
					</p>
					<h3>Limiting account-based inquiries by time</h3>
					<h4>Relative time</h4>
					<p>
						You can use the parameter "past" with one of these values: "hour", "day", "month", or "year"
						to get transactions for the specified duration ending at the time the receipt page is displayed.
						Note that "past=month" starts at the same day and time in the prior month and the exact duration
						covered will generally match the prior month,
						varying along with the lengths of the months (similar for other time units, which vary less).
						When visting such a link e.g. on March 30, the starting date will be set as the equivalent of Feb. 30,
						which is actually March 1 or 2 depending on the year.
					</p>
					<p>
						You can also use the "last" parameter with any of the values valid for "past" and the duration will
						end at the most recent ending of that time unit.
						For example, a link with the parameter "last=month" visited on April 2 or 19 from the same time zone
						should yield the same results (subject to any intervening site updates), covering all of March.
						The same link visited at some point in May should show the full set of April transactions from (and/or to)
						selected accounts.
					</p>
					<p>
						This should be computed according to the time zone
						set on the computer where the receipt is being shown, so results could differ if you are sending the
						same link to recipients in very different time zones.
					</p>
					<p>
						If "past" and "last" are both present, the "past" value will be used.
					</p>
					<p>
						You can bookmark these links and return to them each month to generate and send a report, as one example use case.
						If you would like to have a link, PDF, or CSV version of a link like this automatically sent to you
						periodically, please <a href='mailto:periodic@unblockreceipts.com'>reach out</a> including a copy of
						the complete link, how frequently you would want to have it, and which email address(es) you'd like it sent to.
						We do not guarantee we will honor every request, but are piloting this as a potential premium service.
					</p>
					<h4>Absolute Time</h4>
					<p>
						You can use the parameters "start" and/or "end" to limit transactions displayed to a particular time range.
						The value for each parameter is the number of milliseconds since the midnight at the beginning of
						January 1, 1970 in the UTC time zone. If you are building a link with JavaScript and using
						the <a href='https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date' target='_blank' rel="noreferrer">Date object</a>,
						you can use "myDate.valueOf()" to get this value.
					</p>
					<h4>Block Numbers</h4>
					<p>
						You can use the parameters "blockStart" and/or "blockEnd" to limit transactions displayed to a particular range of blocks.
						The starting value is included and the ending block is excluded. Use the same value for both if you only want one block.
						The value for each parameter is a number.
						Hexadecimal numbers beginning with "0x" may work but decimal (base-10) format is recommended.
						Special-value block identifiers are not supported: if you want to use "genesis" for "blockStart" just leave that parameter out or empty,
						and if you want to use "latest" for "blockEnd" just leave that parameter out.
					</p>
					<p>
						If "blockStart" or "blockEnd" values are set, the time-based "start" and "end" values are not used for generating receipts;
						if "past" or "last" are present none of those more specific four parameters are used for generating receipts.
					</p>
					<h3>
						Labeling accounts
					</h3>
					<p>
						You can label accounts by creating a URL parameter with a name matching the hexadecimal account address or ENS name associated with
						the account and the value being the label you want to show. This label will be shown in place of all instances of that account in
						"to" and "from" fields on the receipt, and a footnote to the receipt will show the original hexadecimal address or ENS name.
						The account being labeled can but does not have to be among the accounts listed in the "acct" parameter, if any.
					</p>
					<h2>
						Specifying Transactions
					</h2>
					<p>
						In addition to or instead of specifying accounts, you can also specify one or more specific transaction(s),
						by passing a comma-separated list of transaction hashes (sometimes called transaction ids) in the "tx" parameter.
					</p>
					<p>
						You can also add a memo to the transaction by setting a URL parameter with a name matching the transaction hash
						and a value matching the [URI-encoded] memo. If you specify a memo for a transaction, you do not need to include
						that transaction in the "tx" parameter.  If you include a memo for all specified transactions, you do not need
						the "tx" parameter at all.
					</p>
					<p>
						Specified transactions will be included on the receipt even if they are not "from" any accounts that may be specified
						in the "acct" parameter (or "to" any of those accounts if "includeIncoming" is used), and even if they are outside of
						the specified time/block range.  However, they will not be shown if the "filterTo" parameter is in use and the "to"
						account in the transaction does not match one of the accounts or ENS names listed there.
					</p>
					<h2>
						Filter by "To" Address
					</h2>
					<p>
						You can filter transactions that would otherwise be shown on a receipt to the subset of transactions
						where the "to" address is included in a set of hexadecimal addresses (or ENS names or a mix) which are
						joined in a comma-separated list set as the value of the "filterTo" parameter.
					</p>
					<h2>
						Lock
					</h2>
					<p>
						By default, UnblockReceipts loads with easy-to-access controls for labeling accounts and adding memos to transactions.
					</p>
					<p>
						You can change this (causing the receipt to look a bit cleaner and more finalized)
						by setting the "lock" parameter to "start" to require anyone viewing the receipt to have to
						find and click the "edit" button near the top of the page to re-enable those features.
					</p>
					<p>
						This is recommended if you have reasonably high confidence that your intended audience for viewing the receipt
						will NOT have any need to edit labels or memos or otherwise change the set of transactions being shown.
					</p>
					<h2>
						Parameters which are available but not recommended for use in link constructors:
					</h2>
					<h3>
						Home
					</h3>
					<p>
						Setting the URL parameter "home" to "true" will trigger display of the homepage, which can make editing certain
						aspects of the link easier.
					</p>
					<p>
						This parameter should NOT be set in links sent out intending for recipients to view a completed receipt.
					</p>
					<h3>
						View Format
					</h3>
					<p>
						By default on wide screens, UnblockReceipts will show receipt content in columns of a table.
					</p>
					<p>
						On narrower screens such as most smartphone devices, the same information is presented differently.
						If you want this narrower view to be the default even for wide screen displays, set the "view" parameter to "list"
						(e.g. in JavaScript "myURL.searchParams.set('view', 'list')"). This is NOT recommended.
					</p>
					<h3>
						Download on First Load
					</h3>
					<p>
						The effect of setting the "downloadOnFirstLoad" parameter (to "true" if intended) is the same as
						clicking on the button to download as CSV once the data has finished loading.
					</p>
					<p>
						Setting this parameter in a link is NOT recommended unless you are having an exceptional level of difficulty
						communicating about where to find that download link and how to click it once the page has loaded.
					</p>
				</div>
			</div>
		</div>
	);
}
