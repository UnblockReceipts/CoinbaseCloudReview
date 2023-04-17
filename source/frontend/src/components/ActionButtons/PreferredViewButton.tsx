import { ActionButton } from './ActionButton';
import ListIcon from '@mui/icons-material/List';
import TableIcon from '@mui/icons-material/TableChart';
import type { ViewOption } from '../../QueryParser';

export const PreferredViewButton = function(props: {
	screenIsNarrow: boolean;
	preferListView: boolean;
	setPreferredView: React.Dispatch<React.SetStateAction<ViewOption>>;
}) {
	if(props.screenIsNarrow) { return null; }
	const toggleView = function() {
		return new Promise<boolean | undefined>(function(resolve, reject) {
			props.setPreferredView(function(oldPreferredView: ViewOption) {
				const newPreferredView = (oldPreferredView === 'list' ? undefined : 'list');
				resolve(undefined);
				return newPreferredView;
			});
		});
	}
	return(
		<ActionButton
			description = {props.preferListView ? 'View as table' : 'View as list (better for narrower displays)'}
			onClick={toggleView}
		>
			{props.preferListView ? <TableIcon /> : <ListIcon /> }
		</ActionButton>
	);
}
