import { AddToReportButton } from './AddToReportButton';
import { RemoveFromReportButton } from './RemoveFromReportButton';
export const ModifyAcctOnReportButton = function(props:{
	addressOrOnChainLabel: string;
	timeRangeConstraintType?: 'time' | 'block';
	anySpecifiedTxes: boolean;
	showAddOrRemoveAddressToReport?: boolean; //true = show add; false = show remove; undefined = show neither
}) {
	if(typeof props.showAddOrRemoveAddressToReport === 'undefined') {
		return null;
	} else if(props.showAddOrRemoveAddressToReport) {
		return(<AddToReportButton
			addressOrOnChainLabel = {props.addressOrOnChainLabel}
			timeRangeConstraintType = {props.timeRangeConstraintType}
		/>);
	} else {
		return(<RemoveFromReportButton
			addressOrOnChainLabel = {props.addressOrOnChainLabel}
			anySpecifiedTxes = {props.anySpecifiedTxes}
		/>);
	}
}
