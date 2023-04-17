import { MemosObject, QueryParser } from "../../QueryParser";
import { useState, useEffect } from 'react';
import { LabeledInputRow } from "./LabeledInputRow";

export interface DisplayRow {
	key: string;
	content?: string;
	label?: string;
}

const getAvailableKey = function(
	possibleKey: string,
	usedKeys: string[],
) {
	if(!usedKeys.includes(possibleKey)) {
		return possibleKey;
	} else {
		let numberOnEnd = 2;
		while(usedKeys.includes(possibleKey + numberOnEnd)) {
			numberOnEnd++;
		}
		return possibleKey + numberOnEnd;
	}
}

export const ExpandingLabeledInputSet = function(props: {
	inputPlaceholder: string;
	labelPlaceholder?: string; //undefined to not show label column; empty string for blank
	value: string[]; //temporary until set of boxes is available
	idStarter: string;
	rowDescriptor: string;
	memos?: MemosObject;
	onContentUpdate: ((updatedHomepageRows: {
		oldContent?: string,
		newContentTrimmed?: string,
		labelTrimmed?: string,
	}[]) => void);
	onLabelUpdate: ((
		content: string,
		newLabelTrimmed?: string
	) => void);
	className?: string;
}) {
	const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
	useEffect(() => {
		const makeDisplayRow = function(
			content: string | undefined,
			labelIfContentIsUndefined: string | undefined,
			usedKeys: string[],
		) {
			let key = 'emptyFirstRow';
			let label = undefined;
			if(typeof content !== 'undefined') {
				//Due to the calling context, this is the only condition that will be active.
				label = QueryParser.getMemoCaseInsensitiveSearch(content, props.memos);
				key = getAvailableKey(content, usedKeys);
			} else if (typeof labelIfContentIsUndefined !== 'undefined') {
				label = labelIfContentIsUndefined;
				key = getAvailableKey('label:' + label, usedKeys);
			} else {
				key = getAvailableKey('blank:', usedKeys);
			}
			return {
					key,
					content: content,
					label,
			};
		}
		setDisplayRows(function(currentDisplayRows: DisplayRow[]) {
			let newDisplayRows : DisplayRow[] = [];
			//this keeps track of what keys have already been shown via leaving a displayRow in place (overwriting any label with the incoming)
			let displayedContent : string[] = [];
			let usedKeys : string[] = [];
			for(let displayRow of currentDisplayRows) {
				if(
					typeof displayRow.content === 'undefined' ||
					displayRow.content.trim().length === 0
				) { //functionally empty row; might have label
					if(
						(displayRow.key === 'soleRowStarter' || displayRow.key.startsWith('AddedBlank'))
					) {
						newDisplayRows.push(displayRow);
					}
				} else if(props.value.includes(displayRow.content)) { //exact case match: mismatch is removed during copy and new version replaced below.
					const displayRowToPush = makeDisplayRow(
						displayRow.content,
						displayRow.label,
						usedKeys,
					);
					usedKeys.push(displayRowToPush.key);
					newDisplayRows.push(displayRowToPush);
					displayedContent.push(displayRow.content);
				}
			}
			for(let valueMember of props.value) {
				if(!displayedContent.includes(valueMember)) {
					const displayRowToPush = makeDisplayRow(
						valueMember,
						undefined, //no label (yet)
						usedKeys,
					);
					usedKeys.push(displayRowToPush.key);
					newDisplayRows.push(displayRowToPush);
					displayedContent.push(valueMember); //helps w/deduplication
				}
			}
			if(newDisplayRows.length === 0) {
				newDisplayRows.push({key: 'soleRowStarter'});
			}
			return newDisplayRows;
		});
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.value, props.memos]);
	const getUsedKeysFromDisplayRows = function(
		displayRows: DisplayRow[],
	) {
		let usedKeys : string[] = [];
		for(let row of displayRows) {
			usedKeys.push(row.key);
		}
		return usedKeys;
	}
	const addRowAfter = function(
		index: number,
		//Not accepting a DisplayRow param here b/c this function doesn't update parent state
	) {
		setDisplayRows(function(currentDisplayRows: DisplayRow[]) {
			let usedKeys = getUsedKeysFromDisplayRows(currentDisplayRows);
			let result = [...currentDisplayRows];
			const rowToAdd = {key: getAvailableKey('AddedBlank', usedKeys)};
			result.splice(index + 1, 0, rowToAdd);
			return result;
		});
		return Promise.resolve(undefined); //effect should be immediately visible so no need for check/x
	}
	const handleMultiLinePaste = function(
		//TODO: Improve UX by using this index field:
		index: number,
		field: Exclude<keyof DisplayRow, 'key'>,
		pastedValuesTrimmed: string[][]
	) {
		if(field !== 'content') {
			console.warn('Programming bug: Multiline paste is reportedly not from content field but will be treated as if it were.');
		}
		let updatedHomepageRows: {
			oldContent?: string,
			newContentTrimmed?: string,
			labelTrimmed?: string,
		}[] = [];
		for(let line of pastedValuesTrimmed) {
			if(line.length > 0) {
				const contentTrimmed = line[0];
				let labelTrimmedOrUndefined: string | undefined = (line.length > 1) ? line[1] : undefined;
				if(typeof labelTrimmedOrUndefined === 'undefined') {
					labelTrimmedOrUndefined = QueryParser.getMemoCaseInsensitiveSearch(contentTrimmed, props.memos);
				}
				//Could look through content to see if there are any content matches, but that seems likely to be a confusing UX.
				updatedHomepageRows.push({
					oldContent: undefined,
					newContentTrimmed: contentTrimmed,
					labelTrimmed: labelTrimmedOrUndefined,
				});
			}
		}
		props.onContentUpdate(updatedHomepageRows);
	}
	const removeRow = function(index: number) {
		const contentOfRowForRemovalTrimmed = displayRows[index].content?.trim();
		if(typeof contentOfRowForRemovalTrimmed !== 'undefined' && contentOfRowForRemovalTrimmed.length > 0) {
			props.onContentUpdate([{
				oldContent: contentOfRowForRemovalTrimmed,
				newContentTrimmed: undefined,
				labelTrimmed: displayRows[index].label?.trim()
			}]);
			//and the data here will be updated through useEffect once the incoming props data is updated
		} else {
			setDisplayRows(function(currentDisplayRows: DisplayRow[]) {
				const copiedArray = [...currentDisplayRows];
				copiedArray.splice(index, 1);
				if(copiedArray.length === 0){
					copiedArray.push({key: 'soleRowStarter'});
				}
				return copiedArray;
			});
		}
		return Promise.resolve(undefined);
	}
	const handleUpdateInField = function(
		index: number,
		fieldUpdated: Exclude<keyof DisplayRow, 'key'>,
		newValueTrimmed: string,
	) {
		const oldValue = displayRows[index][fieldUpdated];
		const newValueTrimmedNonEmptyOrUndefined = newValueTrimmed.length === 0 ? undefined : newValueTrimmed;
		if(oldValue?.trim() !== newValueTrimmedNonEmptyOrUndefined) {
			if(fieldUpdated === 'label') {
				const content = displayRows[index].content;
				if(typeof content !== 'undefined') {
					props.onLabelUpdate(
						content,
						newValueTrimmedNonEmptyOrUndefined,
					);
				} else {
					setDisplayRows(function(currentDisplayRows: DisplayRow[]) {
						currentDisplayRows[index].label = newValueTrimmedNonEmptyOrUndefined;
						return currentDisplayRows;
					});
				}
			} else {
				//Updating the state here when content changes means the local state notes
				//that the row has content, and will not be copied over into a re-render
				//like a blank row would.
				setDisplayRows(function(currentDisplayRows: DisplayRow[]) {
					currentDisplayRows[index].content = newValueTrimmedNonEmptyOrUndefined;
					return currentDisplayRows;
				});
				props.onContentUpdate([{
					oldContent: oldValue,
					newContentTrimmed: newValueTrimmedNonEmptyOrUndefined,
					labelTrimmed: displayRows[index].label?.trim(),
				}]);
			}
		}
	}
	return(<>
		{displayRows.map((displayRow, index) =>
			<LabeledInputRow
				//Using displayRow.key is a poor choice because when the content changes,
				//the key changes. When the content changes on blur after a user entered/changed content
				//and then pressed tab to go to the next field,
				//the change in the key will cause the whole LabeledInputRow to re-render as completely new,
				//causing the label field the user just tabbed into to lose focus.
				key = {index}
				index = {index}
				className = {props.className}
				inputPlaceholder = {props.inputPlaceholder}
				labelPlaceholder = {props.labelPlaceholder}
				displayRow = {displayRow}
				removeRow = {removeRow}
				addEmptyRowAfter = {addRowAfter}
				handleUpdateInField = {handleUpdateInField}
				handleMultiLinePaste = {(
					fieldUpdated: Exclude<keyof DisplayRow, 'key'>,
					newValueTrimmed: string[][]
				) => {
					return handleMultiLinePaste(index, fieldUpdated, newValueTrimmed)
				}}
				rowDescriptor = {props.rowDescriptor}
			/>
		)}
	</>);
}
