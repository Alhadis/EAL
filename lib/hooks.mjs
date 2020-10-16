/**
 * @file Helpers for integrating with other projects.
 */

/**
 * User-supplied replacements for missing features.
 * @const {Object} polyfills
 * @internal
 */
const polyfills = {__proto__: null};


/**
 * Retrieve a user-supplied polyfill.
 * @param {String} name
 * @param {?Function} [fallback=null]
 * @return {?Function}
 */
export function getPolyfill(name, fallback = null){
	if(name in polyfills)
		return polyfills[name];
	if("function" === typeof fallback)
		return function(...args){
			return (polyfills[name] || fallback).call(this, ...args);
		};
	return null;
}


/**
 * Provide a polyfill for a missing feature.
 * @param {String} name
 * @param {Function} fn
 * @return {Boolean}
 */
export function setPolyfill(name, fn){
	if("function" === typeof name)
		[fn, name] = [name, name.name];
	if(name in polyfills) return false;
	polyfills[name] = fn;
	return true;
}


/**
 * Action taken when attempting to use a feature unimplemented
 * or unsupported by the current JavaScript environment.
 *
 * @param {Function|String} fn
 * @param {...*} [args]
 * @return {void}
 * @internal
 */
export function nih(fn, ...args){
	if("function" === typeof polyfills[fn.name])
		return polyfills[fn.name](...args);
	const msg = "function" === typeof fn
		? `Unsupported by environment: ${fn.name}`
		: String(fn);
	throw Object.assign(new Error(msg), {args});
}
