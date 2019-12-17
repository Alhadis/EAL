/**
 * Does the environment support high-resolution timing?
 * @const {Boolean} haveHighResTiming
 */
export const haveHighResTiming =
	!!("object"   === typeof performance
	&& "number"   === typeof performance.timeOrigin
	&& "function" === typeof performance.now);


/**
 * Whether {@link Function.prototype.toString} returns source code.
 * @const {Boolean} haveSourceAccess
 */
export const haveSourceAccess = `${function(){ return 1; }}`.includes("return 1;");
