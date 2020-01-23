/**
 * Does the environment have a {@link http://mdn.io/console} global?
 * @const {Boolean} haveConsole
 */
export const haveConsole = !!("object" === typeof console && console);


/**
 * Does the environment support high-resolution timing?
 * @const {Boolean} haveHighResTiming
 */
export const haveHighResTiming =
	!!("object"   === typeof performance
	&& "number"   === typeof performance.timeOrigin
	&& "function" === typeof performance.now);


/**
 * Does the environment have a natively-supported DOM?
 * @const {Boolean} haveNativeDOM
 */
export const haveNativeDOM = (() => {
	try{
		const {all} = document;
		return "undefined" === typeof all && null === all();
	} catch(e){}
	return false;
})();


/**
 * Whether {@link Function.prototype.toString} returns source code.
 * @const {Boolean} haveSourceAccess
 */
export const haveSourceAccess = `${function(){ return 1; }}`.includes("return 1;");


/**
 * Are we running in a browser-like environment?
 * @const {Boolean} isBrowser
 */
export const isBrowser =
	!!("object" === typeof window
	&& "object" === typeof document
	&& haveNativeDOM);


/**
 * Are we running {@link http://deno.land/|Deno}?
 * @const {Boolean} isDeno
 */
export const isDeno = "object" === typeof Deno;


/**
 * Are we running in a Node.js-like environment?
 * @const {Boolean} isNode
 */
export const isNode =
	!!("object" === typeof process
	&& "object" === typeof global
	&& "object" === typeof process.versions
	&& "string" === typeof process.versions.node);


/**
 * Does this appear to be an Electron app?
 * @const {Boolean} isElectron
 */
export const isElectron = !!(isNode && process.versions.electron);


/**
 * Are we running {@link https://bellard.org/quickjs|QuickJS}?
 * @const {Boolean} isQuickJS
 */
export const isQuickJS = haveSourceAccess
	&& !`${function(){ "use strip"; return 1; }}`.includes("return 1;")
	&& "object"   === typeof scriptArgs
	&& "function" === typeof print;


/**
 * Are we running QuickJS with mathematical extensions?
 * @see {@link https://bellard.org/quickjs/quickjs.html#Extensions}
 * @const {Boolean} isQuickJSExt
 */
export const isQuickJSExt = isQuickJS
	&& "bigfloat" === (() => { "use math"; return typeof 45.8; })();


/**
 * Does this appear to be V8's [debugging shell]{@link https://v8.dev/docs/d8}?
 * @const {Boolean} isV8Shell
 */
export const isV8Shell = !isNode && !isDeno
	&& "number"   === typeof Error.stackTraceLimit
	&& "function" === typeof Error.captureStackTrace
	&& "function" === typeof print
	&& "function" === typeof version
	&& "function" === typeof readline
	&& "object"   === typeof testRunner
	&& "function" === typeof testRunner.notifyDone;
