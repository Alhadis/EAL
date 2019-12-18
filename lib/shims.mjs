/**
 * @file Wrappers for environment-specific features.
 */

import {haveConsole, haveHighResTiming} from "./features.mjs";
import {isBrowser, isElectron, isNode, isDeno, isQuickJS, isV8Shell} from "./engine.mjs";


/**
 * Reference to the global object.
 * @const {Object} self
 */
export const self = ("object" === typeof globalThis
	? globalThis
	: "object" === typeof global
		? global
		: "object" === typeof window ? window : this
) || Function("return this")();


/**
 * List of arguments passed via command-line.
 * @const {?String[]} argv
 */
export const argv =
	isNode    ? process.argv.slice(2) :
	isDeno    ? Deno.args.slice(1) :
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
	: "object" === typeof process && "function" === typeof process.nextTick
		? process.nextTick
		: fn => Promise.resolve().then(fn);


/**
 * Terminate the current process.
 * @param {Number} [code=0]
 * @return {void}
 */
export const exit =
	isNode ? process.exit :
	isDeno ? Deno.exit :
	isQuickJS && "object" === typeof std ? std.exit :
	isV8Shell ? exit :
	null;


/**
 * Determine if a file descriptor is attached to a terminal-like device.
 * @param {Number} [fd=0] - Integer between 0-2
 * @return {Boolean}
 */
export function isTTY(fd = 0){
	if(isQuickJS && "object" === typeof os)
		return os.isatty(fd);
	const name = {__proto__: null, 0: "stdin", 1: "stdout", 2: "stderr"}[fd] || "";
	if(isNode) return !!process[name].isTTY;
	if(isDeno) return !!Deno.isTTY()[name];
	return unsupported(isTTY, fd);
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
	isQuickJS   && "object"   === typeof std
		? (...args) => void std.err.puts(args.join(" ") + "\n")
		: null
) || log;


/**
 * Asynchronously load the contents of a file.
 * @param {String|URL} path
 * @param {Boolean} [raw=false]
 * @return {String|Buffer|Uint8Array}
 */
export async function readFile(path, raw = false){
	
	// Node.js/Electron
	if(isNode){
		const {readFile} = await import("fs");
		return new Promise((resolve, reject) => {
			readFile(path, raw ? null : "utf8", (error, data) =>
				error ? reject(error) : resolve(data));
		});
	}
	
	// Deno
	else if(isDeno){
		const data = await Deno.readFile(path);
		return raw ? data : new TextDecoder("utf-8").decode(data);
	}
	
	// QuickJS
	else if(isQuickJS){
		const file = (await import("std")).open(path, "r");
		let data = null;
		if(raw){
			const {size} = (await import("os")).stat(path)[0];
			file.read((data = new Uint8Array(size)).buffer, 0, size);
		}
		else data = file.readAsString();
		file.close();
		return data;
	}
	
	// V8 shell
	else if(isV8Shell)
		return raw ? new Uint8Array(readbuffer(path)) : read(path);
	
	// Not an environment we recognise
	else if(!isBrowser)
		return unsupported(readFile, path, raw);
	
	// Modern browser
	else if("function" === typeof window.fetch){
		const file = await fetch(path);
		return raw ? new Uint8Array(await file.arrayBuffer()) : file.text();
	}
	
	// Ancient browser, probably running transpiled ES5 source
	else return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("GET", path);
		xhr.responseType = raw ? "arraybuffer" : "text";
		xhr.onreadystatechange = () => {
			if(4 !== xhr.readyState) return;
			
			// Server responded with an error code
			if(xhr.status >= 400)
				reject(new Error(`HTTP 1.1/${xhr.status} ${xhr.statusText}`));
			
			// Old IE only supports textual XHR
			else if(raw && !(xhr.response instanceof ArrayBuffer)){
				const error = new TypeError("String returned when ArrayBuffer expected");
				reject(Object.assign(error, {xhr}));
			}
			else resolve(raw ? new Uint8Array(xhr.response) : xhr.response);
		};
		xhr.onerror = reject;
		xhr.send();
	});
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
 * Select and load files from the user's filesystem.
 * @param {Boolean} [multiple=false]
 * @param {String|String[]} [fileExts=null]
 * @return {LoadedFile[]}
 */
export async function selectFile(multiple = false, fileExts = null){
	fileExts = fileExts && ("string" === typeof fileExts
		? fileExts.trim().split(/\s+/)
		: [...fileExts]).map(e => e.replace(/^\*?\.|,/g, ""));
	
	// Electron
	if(isElectron){
		const {dialog, remote} = await import("electron");
		const options = {properties: ["openFile", "showHiddenFiles"]};
		if(multiple) options.properties.push("multiSelections");
		if(fileExts) options.filters = fileExts.map(e => ({extensions: [e]}));
		return Promise.all(((dialog || remote.dialog).showOpenDialog(options) || [])
			.map(path => readFile(path, true).then(data => ({path, data}))));
	}
	
	// Browsers
	else{
		if(!fileInput){
			fileInput = document.createElement("input");
			fileInput.type = "file";
		}
		fileInput.multiple = !!multiple;
		fileInput.accept = fileExts ? fileExts.map(e => "." + e).join(",") : "";
		const files = await new Promise(resolve => {
			fileInput.onchange = () => resolve([...fileInput.files]);
			fileInput.click();
		});
		fileInput.onchange = null;
		fileInput.value = "";
		return Promise.all(files.map(file => new Promise((resolve, reject) => {
			const reader   = new FileReader();
			reader.onabort = () => resolve();
			reader.onerror = () => reject(reader.error);
			reader.onload  = () => resolve({
				data: new Uint8Array(reader.result),
				path: file.name,
			});
			reader.readAsArrayBuffer(file);
		})));
	}
	/**
	 * @typedef  {Object} LoadedFile
	 * @property {String} path
	 * @property {Uint8Array} data
	 */
}
let fileInput = null;


/**
 * Open a file or URL externally.
 * @param {String} uri
 * @return {void}
 */
export const openExternal = uri => isElectron
	? void require("shell").openExternal(uri)
	: window.open(uri);


/**
 * Raise an exception when calling a shim unsupported by the environment.
 * @param {Function|String} fn
 * @param {...*} [args]
 * @return {void}
 * @internal
 */
function unsupported(fn, ...args){
	const msg = "function" === typeof fn
		? `Unsupported by environment: ${fn.name}`
		: String(fn);
	throw new Object.assign(Error(msg), {args});
}
