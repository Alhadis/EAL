/**
 * @file Wrappers for environment-specific features.
 */

import {haveConsole, haveHighResTiming, isBrowser, isElectron, isNode, isDeno, isQuickJS, isV8Shell} from "./flags.mjs";
import {nih} from "./hooks.mjs";


/**
 * Reference to the global object.
 * @const {Object} self
 */
export const self = (
	("object" === typeof globalThis && globalThis) ? globalThis :
	("object" === typeof global     && global)     ? global :
	("object" === typeof window     && window)     ? window :
	this
) || Function("return this")();


/**
 * List of arguments passed via command-line.
 * @const {?String[]} argv
 */
export const argv =
	isNode    ? process.argv.slice(2) :
	isDeno    ? [...Deno.args] :
	isQuickJS ? scriptArgs.slice(1) :
	isV8Shell ? [...self.arguments] :
	null;


/**
 * Asynchronously execute something as quickly as possible.
 * @const {Function} asap
 * @param {Function} fn
 * @return {void|Number}
 */
export const asap = "function" === typeof setImmediate
	? setImmediate
	: "object" === typeof process && process && "function" === typeof process.nextTick
		? process.nextTick
		: fn => Promise.resolve().then(fn);


/**
 * Change the current working directory.
 * @param {String} path
 * @return {void}
 */
export const cd =
	isNode    ? process.chdir :
	isDeno    ? Deno.chdir :
	isV8Shell ? path => os.chdir(wd = path) :
	isQuickJS && "object" === typeof os && os ? path => {
		const code = os.chdir(path);
		if(code) throw new Error(`[ERROR ${code}] Cannot change working directory`);
	} : path => wd = path;


/**
 * Manually-tracked working directory for environments that
 * don't expose functions for chdir(2) and getcwd(3).
 * @var {?String} wd
 * @internal
 */
let wd = null;


/**
 * Return the current working directory.
 * @const {Function} cwd
 * @return {String}
 */
export const cwd =
	isNode ? process.cwd :
	isDeno ? Deno.cwd :
	isQuickJS && "object" === typeof os && os ? () => {
		const [path, code] = os.getcwd();
		if(code) throw new Error(`[ERROR ${code}] Cannot resolve working directory`);
		return path;
	} : () => wd;


/**
 * Name of the host's operating system.
 * @const {?String} platform
 */
export const platform =
	isNode ? process.platform :
	isDeno ? "windows" === Deno.build.os ? "win32" : Deno.build.os :
	isQuickJS && "object" === typeof os && os ? os.platform :
	isBrowser ? (os =>
		os.startsWith("linux")              ? "linux"  :
		/^mac|^i(?:phone|pad|pod)/.test(os) ? "darwin" :
		/^win(?:16|32|64|ce|dows)/.test(os) ? "win32"  :
		/^([-.\w]+)bsd\b/.test(os)          ? RegExp.$1 + "bsd" :
		/^s(?:un\s?os|olaris)\b/.test(os)   ? "sunos"  : os
	)((navigator.platform || "").toLowerCase()) :
	null;


/**
 * Object containing environment variables.
 * @const {?Object} env
 */
export const env =
	isNode ? process.env :
	isDeno ? new Proxy({}, {
		get: (obj, key) => Deno.env.get(key),
		has: (obj, key) => null != Deno.env.get(key),
		set: (obj, key, value) => Deno.env.set(key, value),
	}) :
	isQuickJS && "object" === typeof std && std
		? new Proxy(Object.create(null), {
			get: (obj, key) => Reflect.has(obj, key) ? Reflect.get(obj, key) : std.getenv(key),
			has: (obj, key) => Reflect.has(obj, key) ? true : null != std.getenv(key),
			set: (...args)  => Reflect.set(...args),
		}) : null;


/**
 * Path of the running JavaScript interpreter.
 * @const {?String} execPath
 */
export const execPath =
	isNode ? process.execPath :
	isDeno ? Deno.realPathSync(Deno.execPath()) :
	isQuickJS && "object" === typeof std && std && "object" === typeof os && os ? os.realpath(std.getenv("_"))[0] :
	null;


/**
 * Path of the initially-invoked script.
 * @const {?String} $0
 */
export const $0 =
	isNode    ? process.argv[1] :
	isDeno    ? new URL(Deno.mainModule).pathname :
	isQuickJS && "object" === typeof os && os ? os.realpath(scriptArgs[0])[0] :
	isBrowser ? location.toString().replace(/^file:\/\//, "") :
	null;


/**
 * Terminate the current process.
 * @param {Number} [code=0]
 * @return {void}
 */
export const exit =
	isNode ? process.exit :
	isDeno ? Deno.exit :
	isQuickJS && "object" === typeof std && std ? std.exit :
	isV8Shell ? self.quit :
	null;


/**
 * Determine if a file descriptor is attached to a terminal-like device.
 * @param {Number} [fd=0] - Integer between 0-2
 * @return {Boolean}
 */
export function isTTY(fd = 0){
	if(isQuickJS && "object" === typeof os && os)
		return os.isatty(fd);
	const name = {__proto__: null, 0: "stdin", 1: "stdout", 2: "stderr"}[fd] || "";
	if(isNode) return !!process[name].isTTY;
	if(isDeno) return !!Deno.isTTY()[name];
	if(isBrowser) return false;
	return nih(isTTY, fd);
}


/**
 * Return the current timestamp, using high-resolution timing if possible.
 * @return {Number}
 */
export const now = () => haveHighResTiming
	? performance.timeOrigin + performance.now()
	: Date.now();


/**
 * Write to standard output or the environment's debugging console.
 * @param {...*} args
 * @return {void}
 */
export const log = haveConsole && "function" === typeof console.log
	? console.log
	: "function" === typeof print ? print : () => {};


/**
 * Write to standard error if possible, or {@link log} if stderr is unavailable.
 * @param {...*} args
 * @return {void}
 */
export const warn = (
	isV8Shell   && "function" === typeof printErr      ? printErr      :
	haveConsole && "function" === typeof console.warn  ? console.warn  :
	haveConsole && "function" === typeof console.error ? console.error :
	isQuickJS   && "object"   === typeof std && std
		? (...args) => void std.err.puts(args.join(" ") + "\n")
		: null
) || log;


/**
 * Encode bytes as UTF-8 if possible, with an ASCII-only fallback.
 * @param {Number[]|Uint8Array} bytes
 * @return {String}
 */
export const encode = "function" === typeof TextDecoder
	? (x => x.decode.bind(x))(new TextDecoder("utf-8"))
	: bytes => {
		if(Math.max(...bytes) > 127)
			throw new RangeError("Cannot encode non-ASCII data");
		return String.fromCharCode(...bytes);
	};


/**
 * Decode string as UTF-8 if possible, with an ASCII-only fallback.
 * @param {String} input
 * @return {Uint8Array}
 */
export const decode = "function" === typeof TextEncoder
	? (x => x.encode.bind(x))(new TextEncoder("utf-8"))
	: input => {
		const {length} = (input = input.split(""));
		const bytes = new Uint8Array(length);
		for(let i = 0, byte; i < length; ++i)
			if(byte > 127) throw new RangeError("Cannot decode non-ASCII string");
			else bytes[i] = input.charCodeAt(i);
		return bytes;
	};


/**
 * Return the current dimensions of the terminal/browser window.
 * @example const [width, height] = getWindowSize() || [80, 25];
 * @return {?Number[]} A tuple containing [width, height]
 */
export function getWindowSize(){
	
	// Browser-like environments: return window dimensions in pixels
	if(isBrowser || isElectron && !(
		process.stdout.isTTY ||
		process.stderr.isTTY ||
		process.stdin.isTTY
	)) return [window.innerWidth, window.innerHeight];
	
	// Node.js: TTY columns × rows
	if(isNode) return (
		process.stdout.isTTY ? [process.stdout.columns, process.stdout.rows] :
		process.stderr.isTTY ? [process.stderr.columns, process.stderr.rows] :
		process.stdin.isTTY  ? [process.stdin.columns,  process.stdin.rows]  :
		null
	);
	
	// QuickJS: TTY columns × rows
	if(isQuickJS && "object" === typeof os && os) return (
		os.isatty(1) ? os.ttyGetWinSize(1) :
		os.isatty(2) ? os.ttyGetWinSize(2) :
		os.isatty(0) ? os.ttyGetWinSize(0) :
		null
	);
	
	// Anything else: return null
	return null;
}


/**
 * Configure a TTY stream to operate as a “raw” device.
 * @param {Number} [fd=0] - Integer between 0-2
 * @return {void}
 */
export function setRawTTY(fd = 0){
	if(isQuickJS && "object" === typeof os && os)
		os.ttySetRaw(fd);
	else if(isNode)
		[process.stdin, process.stdout, process.stderr][fd].setRawMode(true);
	else if(isDeno)
		Deno.setRaw(fd, true);
	else nih(setRawTTY, fd);
}


/**
 * Resolve the absolute path of a file relative to package's entry-point.
 * @param {String} path
 * @return {String}
 */
export async function resolvePath(path){
	const url = import.meta.url
		.replace(/\/[^\\/]+\/env\.mjs$/i, "")
		.replace(/\/[^/]*\.m?js$/i, "");
	
	// Node.js/Electron
	if(isNode){
		const {URL} = await import("url");
		const {resolve} = await import("path");
		return resolve("string" === typeof __dirname
			? __dirname
			: new URL(url).pathname, path);
	}
	
	// Browsers: abuse `HTMLAnchorElement.prototype.href` for path resolution
	else{
		anchorHack = anchorHack || document.createElement("a");
		anchorHack.href = url + "/" + path;
		return anchorHack.href;
	}
}
let anchorHack = null;


/**
 * Open a file or URL externally.
 * @param {String} uri
 * @return {void}
 */
export const openExternal = uri => isElectron
	? void require("shell").openExternal(uri)
	: window.open(uri);
