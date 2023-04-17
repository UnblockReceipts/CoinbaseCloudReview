import { Formatters } from "../../Formatters";
export const SpanWrapperWithHexAddressClassIfNecessary = function(props: {
	stringContent: string;
}) {
	// Use of the hexAddress display is for word-breaking so it seems
	// more correct to base use of this class on data appearance than origin.
	return(<span
		className={Formatters.looksLikeHexAddress(props.stringContent) ? 'hexAddress' : undefined}
	>{props.stringContent}</span>
	);
}
