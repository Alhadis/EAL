/**
 * @file Helpers for integrating with other projects.
 */

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
	const msg = "function" === typeof fn
		? `Unsupported by environment: ${fn.name}`
		: String(fn);
	throw new Object.assign(Error(msg), {args});
}
