import unblockReceiptLogoTight from '../../images/unblockReceiptLogoTight.png';

export const LogoBlock = function(props: {
	style ?: React.CSSProperties;
	onClick ?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
	return (
		<div className='logoBlock' style={props.style}>
			<a href='/' onClick={props.onClick}>
				<img
					src={unblockReceiptLogoTight}
					alt='Unblock Receipts'
				/>
			</a>
			<br />
			<span className='slogan'>Spend your tokens, not your time!</span>
		</div>
	);
}
