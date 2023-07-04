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
	!!("object"   === typeof performance && performance
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
 * Can we synchronously resolve module-relative import specifiers?
 * @const {Boolean} haveResolve
 */
export const haveResolve =
	!!("function" === typeof import.meta.resolve
	&& "string"   === typeof import.meta.resolve(import.meta.url));


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
	!!("object" === typeof window   && window
	&& "object" === typeof document && document
	&& haveNativeDOM);


/**
 * Are we running {@link http://deno.land/|Deno}?
 * @const {Boolean} isDeno
 */
export const isDeno = !!("object" === typeof Deno && Deno);


/**
 * Are we running in a Node.js-like environment?
 * @const {Boolean} isNode
 */
export const isNode =
	!!("object" === typeof process          && process
	&& "object" === typeof global           && global
	&& "object" === typeof process.versions && process.versions
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
	&& "object"   === typeof scriptArgs && scriptArgs
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
	&& "object"   === typeof testRunner && testRunner
	&& "function" === typeof testRunner.notifyDone;


/**
 * Does this appear to be [Moddable XS]{@link https://moddable.com/}?
 * @const {Boolean} isXS
 */
export const isXS = !haveSourceAccess
	&& (1 === "😂".length
	|| 'function ["foo"]' === `${function foo(){}}`.slice(0, 16));
