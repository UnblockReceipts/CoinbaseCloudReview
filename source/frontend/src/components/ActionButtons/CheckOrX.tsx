import { Check, Close } from '@mui/icons-material';

export const CheckOrX = function(props: {
	boolToShow ?: boolean,
}) {
	return(
		props.boolToShow ?
			<Check /> :
			<Close />
	);
}
