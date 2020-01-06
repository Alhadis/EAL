import {
	haveHighResTiming,
	haveNativeDOM,
	haveSourceAccess,
	isBrowser,
	isDeno,
	isNode,
	isElectron,
	isQuickJS,
	isQuickJSExt,
	isV8Shell,
	log,
} from "../../index.mjs";

log(`haveHighResTiming: ${haveHighResTiming}`);
log(`haveNativeDOM: ${haveNativeDOM}`);
log(`haveSourceAccess: ${haveSourceAccess}`);
log(`isBrowser: ${isBrowser}`);
log(`isDeno: ${isDeno}`);
log(`isElectron: ${isElectron}`);
log(`isNode: ${isNode}`);
log(`isQuickJS: ${isQuickJS}`);
log(`isQuickJSExt: ${isQuickJSExt}`);
log(`isV8Shell: ${isV8Shell}`);
