import React, { useState, useEffect } from 'react';
export const ControlledTextBox = function(props: {
	inputPlaceholder: string;
	value: string;
	onBlur: ((newValueTrimmed: string) => void);
	onMultiLinePaste?: ((
		newValuesTrimmed: string[][]
	) => void);
	className?: string;
}) {
	const [inputValue, setInputValue] = useState<string>(props.value);
	useEffect(() => {
		setInputValue(props.value);
		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.value]);
	const inputValueChanged = function(event: React.ChangeEvent<HTMLInputElement>) {
		setInputValue(event.target.value);
	}
	const onBlur = function(event: React.FocusEvent<HTMLInputElement, Element>) {
		props.onBlur(event.target.value.trim());
	}
	const onPaste = function(event: React.ClipboardEvent<HTMLInputElement>) {
		const pastedContent = event.clipboardData.getData('text/plain');
		const pastedLines = pastedContent.split('\n');
		if(pastedLines.length > 1) {
			if(typeof props.onMultiLinePaste === 'undefined') {
				console.warn('Multiline paste is not supported in this input; will treat as regular paste.');
			} else {
				event.preventDefault();
				const trimmedLines : string[][] = [];
				for(let pastedLine of pastedLines) {
					const pastedCells = pastedLine.split('\t');
					let row: string[] = [];
					for(let pastedCell of pastedCells) {
						const trimmedContent = pastedCell.trim();
						if(trimmedContent.length > 0) {
							row.push(trimmedContent);
						}
					}
					if(row.length > 0) {
						trimmedLines.push(row);
					}
				}
				props.onMultiLinePaste(trimmedLines);
			}
		}
	}
	return(<>
		<input
			className = {props.className}
			placeholder = {props.inputPlaceholder}
			value = {inputValue}
			onBlur = {onBlur}
			onChange = {inputValueChanged}
			onPaste = {onPaste}
		/>
	</>);
}
