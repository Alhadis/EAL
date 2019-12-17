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
