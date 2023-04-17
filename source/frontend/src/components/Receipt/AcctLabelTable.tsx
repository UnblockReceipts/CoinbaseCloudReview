import type { AccountLabel } from "./ChainDataFetcher";
import { EditableAcctLabel } from "../Memos/EditableAcctLabel";
import { SpanWrapperWithHexAddressClassIfNecessary } from "./SpanWrapperWithHexAddressClassIfNecessary";
import { useState } from 'react';
import { addOrRemoveElementFromArray } from "./TxTable";

export const AcctLabelTable = function(props: {
	sortedAcctLabels: AccountLabel[];
	useNarrowVersion: boolean;
	onChangeToAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	isLocked: boolean;
}) {
	//useState can't be called conditionally (i.e. after the if)
	const [currentlyEditingFootnotes, setCurrentlyEditingFootnotes] = useState<number[]>([]);
	if(props.sortedAcctLabels.length === 0) {
		return null;
	}
	const updateEditingStatusOfFootnote = function(
		footnoteNumber: number,
		newIsEditing: boolean
	) {
		addOrRemoveElementFromArray(
			setCurrentlyEditingFootnotes,
			footnoteNumber,
			newIsEditing
		);
	};
	if(props.useNarrowVersion === true) {
		return (
			<AcctLabelTableNarrow
				sortedAcctLabels = {props.sortedAcctLabels}
				onChangeToAcctLabel = {props.onChangeToAcctLabel}
				isLocked = {props.isLocked}
				currentlyEditingFootnotes = {currentlyEditingFootnotes}
				updateEditingStatusOfFootnote = {updateEditingStatusOfFootnote}
			/>
		);
	} else {
		return (
			<AcctLabelTableWide
				sortedAcctLabels = {props.sortedAcctLabels}
				onChangeToAcctLabel = {props.onChangeToAcctLabel}
				isLocked = {props.isLocked}
				currentlyEditingFootnotes = {currentlyEditingFootnotes}
				updateEditingStatusOfFootnote = {updateEditingStatusOfFootnote}
			/>
		);
	}
}

const AcctLabelTableWide = function(props: {
	sortedAcctLabels: AccountLabel[];
	onChangeToAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	isLocked: boolean;
	currentlyEditingFootnotes : number[];
	updateEditingStatusOfFootnote : (footnoteNumber: number, newIsEditing: boolean) => void;
}) {
	return (
		<table className='acctLabels'>
			<thead>
				<tr>
					<td>
						Note #
					</td>
					<td>
						This name listed above
					</td>
					<td>
						substitutes for this address or on-chain label:
					</td>
				</tr>
			</thead>
			<tbody>
				{props.sortedAcctLabels.map((accountLabel, index) => {
					const footnoteNumber = index + 1;
					const id = 'acctLabelNote' + footnoteNumber;
					return (
						<tr
							id = {id}
							key = {id}
						>
							<td>
								{footnoteNumber}
							</td>
							<td>
								<EditableAcctLabel
									addressOrOnChainLabel = {accountLabel.addressOrOnChainLabel}
									specifiedLabel = {accountLabel.specifiedLabel}
									isLocked = {props.isLocked}
									editMode = {props.currentlyEditingFootnotes.includes(footnoteNumber)}
									updateIsEditing = {function(newIsEditing: boolean) {
										props.updateEditingStatusOfFootnote(footnoteNumber, newIsEditing)
									}}
									//width={accountLabel.specifiedLabel.length + 2 + 'ch'}
									onBlur={(newText: string) => {return props.onChangeToAcctLabel(accountLabel.addressOrOnChainLabel, newText.trim())}}
								/>
							</td>
							<td>
								<SpanWrapperWithHexAddressClassIfNecessary stringContent = {accountLabel.addressOrOnChainLabel} />
							</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	);
}

const AcctLabelTableNarrow = function(props: {
	sortedAcctLabels: AccountLabel[];
	onChangeToAcctLabel: ((addressOrOnChainLabel: string, newLabelTrimmed: string) => Promise<void>);
	isLocked: boolean;
	currentlyEditingFootnotes : number[];
	updateEditingStatusOfFootnote : (footnoteNumber: number, newIsEditing: boolean) => void;
}) {
	return (
		<div className='acctLabels'>
			{props.sortedAcctLabels.map((accountLabel, index) => {
				const footnoteNumber = index + 1;
				const id = 'acctLabelNote' + footnoteNumber;
				return(
					<div className='acctLabel'
						id = {id}
						key = {id}
					>
						Note {footnoteNumber}: The name "<EditableAcctLabel
							addressOrOnChainLabel = {accountLabel.addressOrOnChainLabel}
							specifiedLabel = {accountLabel.specifiedLabel}
							isLocked = {props.isLocked}
							editMode = {props.currentlyEditingFootnotes.includes(footnoteNumber)}
							updateIsEditing = {function(newIsEditing: boolean) {
								props.updateEditingStatusOfFootnote(footnoteNumber, newIsEditing)
							}}
							//width={accountLabel.specifiedLabel.length + 2 + 'ch'}
							onBlur={(newText: string) => {return props.onChangeToAcctLabel(accountLabel.addressOrOnChainLabel, newText.trim())}}
						/>"
						listed above is specified for this receipt
						as a substitute for <SpanWrapperWithHexAddressClassIfNecessary stringContent = {accountLabel.addressOrOnChainLabel} />.
					</div>
				)
			})}
		</div>
	);
}
