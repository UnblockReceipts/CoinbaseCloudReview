import type { AccountLabelSet } from "../../AddressTranslator";
import { AddressTranslatorClass } from "../../AddressTranslator";
import { EditableAcctLabel } from "../Memos/EditableAcctLabel";
import { ModifyAcctOnReportButton } from "../ActionButtons/ModifyAcctOnReportButton";
import { FilterToAcctButton } from "../ActionButtons/FilterToAcctButton";

export const TableDisplayAddress = function(props: {
	labelSet: AccountLabelSet;
	isLocked: boolean;
	isEditing: boolean;
	setIsEditing: (newIsEditing: boolean) => void;
	updateAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	setFilterTo?: ((addressOrOnChainLabel?: string) => Promise<string[]>);
	//Next set are for passing on to ModifyAcctOnReportButton:
	addressOrOnChainLabel: string;
	timeRangeConstraintType?: 'time' | 'block';
	anySpecifiedTxes: boolean;
	showAddOrRemoveAddressToReport?: boolean; //true = show add; false = show remove; undefined = show neither
}) {
	let addressOrOnChainLabelIsAddress: boolean = false;
	let addressOrOnChainLabel: string;
	if(AddressTranslatorClass.isEmptyLabel(props.labelSet.chainLabel)) {
		if(AddressTranslatorClass.isEmptyLabel(props.labelSet.address)) {
			console.error('Programming bug: Label set requires an address or on-chain label and neither was provided, so no editable label can be shown.');
			//the specifiedLabel should also be blank because there's no address or on-chain label by which to label it.
			//If there's need to proceed further, could set these, but directly returning seems OK in current code:
			//addressOrOnChainLabel = '--';
			//isEditable = false;
			return (<span>--</span>);
		} else {
			addressOrOnChainLabel = props.labelSet.address;
			addressOrOnChainLabelIsAddress = true;
		}
	} else {
		addressOrOnChainLabel = props.labelSet.chainLabel;
	}
	const updateAcctLabel = function(newLabel: string) {
		return props.updateAcctLabel(
			addressOrOnChainLabel,
			newLabel.trim()
		);
	}
	let footnoteNumber: number | undefined = undefined;
	let specifiedLabel: string | undefined = undefined;
	let isEditable: boolean = true;
	if(!AddressTranslatorClass.isEmptyLabel(props.labelSet.specifiedLabel)) {
		specifiedLabel = props.labelSet.specifiedLabel;
		footnoteNumber = props.labelSet.labelFootnote;
	}
	return (<>
		<TableDisplayAddressSpan
			isEditing = {props.isEditing}
			setIsEditing = {props.setIsEditing}
			addressOrOnChainLabel = {addressOrOnChainLabel}
			isLocked = {props.isLocked}
			specifiedLabel = {specifiedLabel}
			isEditable = {isEditable}
			addressOrOnChainLabelIsAddress = {addressOrOnChainLabelIsAddress}
			footnoteNumber = {footnoteNumber}
			updateAcctLabel = {updateAcctLabel}
		/>{(props.isEditing || props.isLocked) ? null : <>
				<ModifyAcctOnReportButton
					addressOrOnChainLabel = {props.addressOrOnChainLabel}
					timeRangeConstraintType = {props.timeRangeConstraintType}
					anySpecifiedTxes = {props.anySpecifiedTxes}
					showAddOrRemoveAddressToReport = {props.showAddOrRemoveAddressToReport}
				/><FilterToAcctButton
					addressOrOnChainLabel = {props.addressOrOnChainLabel}
					setFilterTo = {props.setFilterTo}
				/>
		</>}
	</>)
}

const TableDisplayAddressSpan = function(props: {
	isEditable: boolean;
	isEditing: boolean;
	setIsEditing: (newIsEditing: boolean) => void;
	addressOrOnChainLabel: string;
	isLocked: boolean;
	specifiedLabel?: string;
	addressOrOnChainLabelIsAddress: boolean;
	footnoteNumber?: number;
	updateAcctLabel : ((newText: string) => Promise<void>);
}) {
	const mainDisplayAddress = AddressTranslatorClass.isEmptyLabel(props.specifiedLabel) ? props.addressOrOnChainLabel : props.specifiedLabel;
	return (
		<span className={'tableDisplayAddress' + (props.isEditing ? 'Editing' : '')}>{props.isEditable ?
			<EditableAcctLabel
				addressOrOnChainLabel = {props.addressOrOnChainLabel}
				specifiedLabel = {props.specifiedLabel}
				onBlur = {props.updateAcctLabel}
				editMode = {props.isEditing}
				updateIsEditing = {props.setIsEditing}
				isLocked = {props.isLocked}
			/> :
			mainDisplayAddress}{
			typeof props.footnoteNumber === 'undefined' ? null :
			<sup className='footnoteRef'>
				<a href={'#acctLabelNote'+(props.footnoteNumber)}>{props.footnoteNumber}</a>
			</sup>
		}</span>
	);
}
