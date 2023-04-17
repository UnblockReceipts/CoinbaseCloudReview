import { Line } from 'rc-progress';

export interface ProgressProps {
	currentStepDescription?: string,
	numerator: number,
	denominator: number,
	allDone: boolean,
}
const ensureInInclusiveRange = function(input: number, maxAllowedInt: number = 255, minAllowedInt: number = 0) {
	return Math.max(minAllowedInt, Math.min(maxAllowedInt, Math.round(input)));
}
const colorComponentFrom255Scale = function(num0to255Inclusive: number) {
	return num0to255Inclusive.toString(16).padStart(2, '0');
}
const getColor = function(percent: number) : string {
	const componentRange = 255; //could be smaller for different color transition
	const completionOn255Scale = ensureInInclusiveRange(percent * componentRange/100);
	return '#00' + colorComponentFrom255Scale(completionOn255Scale) + colorComponentFrom255Scale(255-completionOn255Scale);
}
export default function Progress(props: ProgressProps) {
	const percent = props.denominator === 0 ? 0 : 100 * props.numerator / props.denominator;
	let stepDescription = '';
	if (props.currentStepDescription) {
		stepDescription = 'Now ' + props.currentStepDescription.charAt(0).toLocaleLowerCase() + props.currentStepDescription.substring(1) + '...';
	}
	return (<>
		{!props.allDone ?
			<>
				<p className='progressStepDescription'>Data has not yet loaded. Please be patient; it can sometimes take a while. {stepDescription}</p>
				<Line
					percent = {percent}
					strokeColor={getColor(percent)}
				/>
			</>
			: null
		}
	</>);
}
