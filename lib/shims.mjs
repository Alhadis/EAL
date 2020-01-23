/**
 * @file Wrappers for environment-specific features.
 */

import {haveConsole, haveHighResTiming, isBrowser, isElectron, isNode, isDeno, isQuickJS, isV8Shell} from "./flags.mjs";


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
	: "object" === typeof process && "function" === typeof process.nextTick
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
	isQuickJS && "object" === typeof os ? path => {
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
	isQuickJS && "object" === typeof os ? () => {
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
	isDeno ? {mac: "darwin", win: "win32"}[Deno.build.os] || Deno.build.os :
	isQuickJS && "object" === typeof os ? os.platform :
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
	isDeno ? Deno.env()  :
	isQuickJS && "object" === typeof std
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
	isDeno ? Deno.realpathSync(Deno.execPath()) :
	isQuickJS && "object" === typeof std && "object" === typeof os ? os.realpath(std.getenv("_"))[0] :
	null;


/**
 * Path of the initially-invoked script.
 * @const {?String} $0
 */
export const $0 =
	isNode    ? process.argv[1] :
	isDeno    ? Deno.realpathSync(location.pathname) :
	isQuickJS && "object" === typeof os ? os.realpath(scriptArgs[0])[0] :
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
	isQuickJS && "object" === typeof std ? std.exit :
	isV8Shell ? self.quit :
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
	if(isBrowser) return false;
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
	if(isQuickJS && "object" === typeof os) return (
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
	if(isQuickJS && "object" === typeof os)
		os.ttySetRaw(fd);
	else if(isNode)
		[process.stdin, process.stdout, process.stderr][fd].setRawMode(true);
	else unsupported(setRawTTY, fd);
}


/**
 * Create a directory (and any intermediate parent directories) if they don't exist.
 * @param {String} path
 * @param {Number} [mode=0o777]
 * @return {void}
 */
export async function mkdirp(path, mode = 0o777){
	
	// Node.js/Electron
	if(isNode){
		const {mkdir, existsSync, statSync} = await import("fs");
		const {join, sep} = await import("path");
		const head = [];
		const tail = path.split(sep);
		while(tail.length){
			head.push(tail.shift());
			const next = join(...head);
			if(!existsSync(next))
				await new Promise((resolve, reject) => {
					mkdir(next, {mode}, error => error ? reject(error) : resolve());
				});
			else if(!statSync(next).isDirectory())
				throw new Error(`File exists: ${next}`);
		}
	}
	
	// Deno
	else if(isDeno)
		return Deno.mkdir(path, true, mode);
	
	// QuickJS
	else if(isQuickJS){
		const {mkdir} = await import("os");
		const code = mkdir(path, mode);
		if(code) throw new Error((await import("std")).strerror(-code));
	}
	
	// V8 shell
	else if(isV8Shell){
		let oldMask = null, error;
		try{
			oldMask = os.umask(~mode);
			os.mkdirp(path);
		}
		catch(e){ error = e; }
		null !== oldMask && os.umask(oldMask);
		if(error) throw error;
	}
	
	// Not supported by environment
	else return unsupported(mkdirp, path, mode);
}


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
 * Read the target of a symbolic link.
 * @param {String} path
 * @return {String}
 */
export async function readlink(path){
	
	// Node.js/Electron
	if(isNode){
		const {readlink} = await import("fs");
		return new Promise((resolve, reject) => {
			readlink(path, (error, link) => error ? reject(error) : resolve(link));
		});
	}
	
	// Deno
	else if(isDeno)
		return Deno.readlink(path);
	
	// QuickJS
	else if(isQuickJS){
		const {readlink} = await import("os");
		const [link, code] = readlink(path);
		if(code) throw new Error((await import("std")).strerror(-code));
		return link;
	}
	
	// Not an environment that supports readlink(2)
	return unsupported(readlink, path);
}


/**
 * Resolve the canonicalised, absolute form of a pathname.
 * @param {String} path
 * @return {String}
 */
export async function realpath(path){
	
	// Node.js/Electron
	if(isNode){
		const {realpath} = await import("fs");
		return new Promise((resolve, reject) => {
			realpath(path, (error, path) => error ? reject(error) : resolve(path));
		});
	}
	
	// Deno
	else if(isDeno)
		return Deno.realpath(path);
	
	// QuickJS
	else if(isQuickJS){
		const {realpath} = await import("os");
		const [abspath, code] = realpath(path);
		if(code) throw new Error((await import("std")).stderror(-code));
		return abspath;
	}
	
	// Not an environment that supports realpath(3)
	return unsupported(realpath, path);
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
 * Create a symbolic link.
 * @param {String} target - Destination being pointed to
 * @param {String} link - Location of the actual symlink
 * @return {void}
 */
export async function symlink(target, link){
	
	// Node.js/Electron
	if(isNode){
		const {symlink} = await import("fs");
		return new Promise((resolve, reject) => {
			symlink(target, link, error => error ? reject(error) : resolve());
		});
	}
	
	// Deno
	else if(isDeno)
		return Deno.symlink(target, link);
	
	// QuickJS
	else if(isQuickJS)
		return (await import("os")).symlink(target, link);
	
	// Not an environment that supports symlink(2)
	else return unsupported(symlink, target, link);
}


/**
 * Asynchronously write to a file.
 * @param {String|URL} path
 * @param {String|Buffer|Uint8Array} input
 * @return {void}
 */
export async function writeFile(path, input){
	const raw = "string" !== typeof input;
	
	// Node.js/Electron
	if(isNode){
		const {writeFile} = await import("fs");
		path = "number" === typeof path ? String(path) : path;
		input = Array.isArray(input) ? Buffer.from(input) : input;
		return new Promise((resolve, reject) => {
			writeFile(path, input, {encoding: raw ? null : "utf8"}, error =>
				error ? reject(error) : resolve());
		});
	}
	
	// Deno
	else if(isDeno){
		const {rid} = await Deno.open(path, "w");
		await Deno.write(rid, raw
			? Array.isArray(input) ? Uint8Array.from(input) : input
			: new TextEncoder().encode(input));
		await Deno.close(rid);
	}
	
	// QuickJS
	else if(isQuickJS){
		if(!raw){
			if(/[^\0-\x7F]/.test(input))
				throw new RangeError("Cannot decode non-ASCII string");
			input = input.split("").map(x => x.charCodeAt(0));
		}
		const data = (input instanceof Uint8Array) ? input : Uint8Array.from([...input]);
		const file = (await import("std")).open(path, "w");
		file.write(data.buffer, 0, data.byteLength);
		file.close();
	}
	
	// Not an environment we recognise
	else if(!isBrowser)
		return unsupported(writeFile, path, input);
	
	// Browsers: Assume the server can properly interpret POST requests to `path`
	else if("function" === typeof window.fetch)
		return fetch(path, {
			body: raw ? input : new TextEncoder().encode(input),
			cache: "no-store",
			method: "POST",
			mode: "same-origin",
			redirect: "follow",
		});
	
	else return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", path);
		xhr.onerror = reject;
		xhr.onreadystatechange = () => 4 === xhr.readyState || (xhr.status >= 400
			? reject(new Error(`HTTP 1.1/${xhr.status} ${xhr.statusText}`))
			: resolve());
		xhr.send(input);
	});
}


/**
 * Open a file or URL externally.
 * @param {String} uri
 * @return {void}
 */
export const openExternal = uri => isElectron
	? void require("shell").openExternal(uri)
	: window.open(uri);


/**
 * Set a file's access and modification times.
 * @param {String} path
 * @param {Number|Date|BigInt} accessed
 * @param {Number|Date|BigInt} modified
 * @return {void}
 */
export async function utimes(path, accessed, modified){
	if(!isFinite(accessed = Number(accessed))) throw new Error("Invalid access time");
	if(!isFinite(modified = Number(modified))) throw new Error("Invalid modify time");
	
	// Node.js/Electron
	if(isNode){
		const {utimes} = await import("fs");
		return new Promise((resolve, reject) => {
			utimes(path, accessed, modified, error => error ? reject(error) : resolve());
		});
	}
	
	// Deno
	else if(isDeno)
		return Deno.utime(path, accessed, modified);
	
	// QuickJS
	else if(isQuickJS)
		(await import("os")).utimes(path, accessed, modified);
	
	// Environment doesn't offer a utimes(3) equivalent
	else return unsupported(utimes, path, accessed, modified);
}


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
