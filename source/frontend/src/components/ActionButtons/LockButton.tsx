import { ActionButton } from './ActionButton';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';

export const LockButton = function(props: {
	isLocked: boolean;
	setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	canEditScope: boolean;
}) {
	const toggleLock = function() {
		return new Promise<boolean | undefined>(function(resolve, reject) {
			props.setIsLocked(function(wasLocked: boolean) {
				const willBeLocked = !wasLocked;
				resolve(undefined);
				return willBeLocked;
			});
		});
	}
	return(
		<ActionButton
			description = {props.isLocked ? 'Edit labels' + (props.canEditScope ? ', memos, & scope' : ' & memos' ) : 'Lock (hide editing features)'}
			onClick={toggleLock}
		>
			{props.isLocked ? <EditIcon /> : <LockIcon /> }
		</ActionButton>
	);
}
