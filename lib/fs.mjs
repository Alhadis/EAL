/**
 * @file Functions for interacting with the filesystem.
 */

import {isBrowser, isDeno, isElectron, isNode, isQuickJS, isV8Shell} from "./flags.mjs";
import {utf8Decode, utf8Encode} from "./shims.mjs";
import {nih} from "./hooks.mjs";

/**
 * @typedef {Number|Object} File
 * Whatever the host considers to be a file resource.
 */

/**
 * @typedef {String|Number[]|Uint8Array} FileData
 * Raw byte-stream or string decoded as UTF-8.
 */


/**
 * Close a file handle.
 * @param {File} file
 * @return {void}
 */
export async function close(file){
	
	// Node.js/Electron
	if(isNode){
		if("object" === typeof file) return file.close();
		const {close} = await import("fs");
		return new Promise((resolve, reject) => close(file, error =>
			error ? reject(error) : resolve()));
	}
	
	// Deno
	if(isDeno)
		return Deno.close("number" !== typeof file ? file.rid : file);
	
	// QuickJS
	if(isQuickJS){
		const {close} = await import("os");
		const result = close(file);
		if(result < 0)
			throw new Error((await import("std")).strerror(-result));
		else return;
	}
	
	// Emulated file descriptor
	if(openFiles.includes(file) && !file.closed){
		delete openFiles[file.fd];
		file.closed = true;
	}
	else throw new Error(`Bad file descriptor: ${file.fd}`);
}


/**
 * Execute an external command.
 *
 * TODO: Figure out a way to pass environment variables in QuickJS.
 *
 * @example exec("sed", ["-e", "s/in/out/"], {input: "input"});
 * @param {String}    cmd - Name or path of the command to execute
 * @param {String[]}  [args=[]] - List of arguments passed to program
 * @param {Object}    [opts={}] - A hash of additional options
 * @param {String}    [opts.cwd] - Set the working directory of the command
 * @param {Boolean}   [opts.raw=false] - Capture output as binary instead of UTF-8
 * @param {ExecInput} [opts.input=null] - Data piped to stdin, if any
 * @return {Promise<ExecResult>}
 */
export async function exec(cmd, args = [], {cwd, raw, input} = {}){
	
	// Node.js/Electron
	if(isNode){
		const {constants} = await import("os");
		const {spawn} = await import("child_process");
		const subproc = spawn(cmd, args, {cwd, windowsHide: true, stdio: "pipe"});
		const stdout = [], stderr = [];
		if(!raw){
			subproc.stdout.setEncoding("utf8");
			subproc.stderr.setEncoding("utf8");
		}
		if(null != input){
			subproc.stdin.write(input, "utf8");
			subproc.stdin.end();
		}
		subproc.stdout.on("data", data => stdout.push(data));
		subproc.stderr.on("data", data => stderr.push(data));
		return new Promise((resolve, reject) => {
			subproc.on("error", reject);
			subproc.on("close", (code, signal) => {
				const join = chunks => raw
					? Uint8Array.from(chunks.flatMap(chunk => [...chunk]))
					: chunks.join("");
				signal = null != signal ? constants.signals[signal] : 0;
				resolve({code: +code, signal, stdout: join(stdout), stderr: join(stderr)});
			});
		});
	}
	
	// Deno
	else if(isDeno){
		args = [cmd, ...args];
		const runOpts = {args, cwd, stdin: "inherit", stdout: "piped", stderr: "piped"};
		if(null != input){
			runOpts.stdin = "piped";
			input = "string" === typeof input
				? utf8Decode(input)
				: input instanceof Uint8Array ? input : Uint8Array.from([...input]);
		}
		const subproc = Deno.run(runOpts);
		if(input){
			await subproc.stdin.write(input);
			subproc.stdin.close();
		}
		const [stdout, stderr, {code = 0, signal = 0}] = await Promise.all([
			subproc.output(),
			subproc.stderrOutput(),
			subproc.status(),
		]);
		if(raw) return {code, signal, stdout, stderr};
		return {code, signal, stdout: utf8Encode(stdout), stderr: utf8Encode(stderr)};
	}
	
	// QuickJS
	else if(isQuickJS){
		const {fdopen, Error} = await import("std");
		const os = await import("os");
		let stdin, output = os.pipe(), errors = os.pipe();
		if(null != input) stdin = os.pipe();
		const pid = os.exec([cmd, ...args], {
			cwd: cwd || undefined,
			block: false,
			usePath: true,
			stdin: stdin && stdin[0],
			stdout: output[1],
			stderr: errors[1],
		});
		if(stdin){
			input = "string" === typeof input
				? utf8Decode(input)
				: input instanceof Uint8Array ? input : Uint8Array.from([...input]);
			os.write(stdin[1], input.buffer, 0, input.length);
			os.close(stdin[1]);
		}
		os.close(output[1]); output = fdopen(output[0], "r");
		os.close(errors[1]); errors = fdopen(errors[0], "r");
		const [stdout, stderr] = [output, errors].map(stream => {
			if(raw){
				const chunks = [], size = 64;
				let data, read = size;
				do{
					data = new Uint8Array(size);
					read = stream.read(data.buffer, 0, size);
					if(read < 0) throw new Error(~read);
					chunks.push(read < size ? data.subarray(0, read) : data);
				} while(read === size && !stream.eof());
				stream.close();
				return chunks;
			}
			else{
				const str = stream.readAsString();
				stream.close();
				return str;
			}
		});
		const [, code] = os.waitpid(pid, 0);
		return {code: code >>> 8, signal: code & 127, stdout, stderr};
	}
	
	// Not supported by environment
	else return nih(exec, cmd, args = [], {cwd, raw, input});
}

/**
 * @typedef  {Object} ExecResult
 * @property {Number} [code=0]
 * @property {Number} [signal=0]
 * @property {String|Uint8Array} [stdout=""]
 * @property {String|Uint8Array} [stderr=""]
 */



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
	else return nih(mkdirp, path, mode);
}


/**
 * Open a file handle, provided fopen(3)-like functionality exists.
 * @param {String} path
 * @param {String} [flags="r"]
 * @param {Number} [mode=0o666]
 * @return {Promise.<?File>}
 */
export async function open(path, flags = "r", mode = 0o666){
	
	// Node.js/Electron
	if(isNode){
		const {open} = await import("fs/promises");
		return open(path, flags, mode);
	}
	
	// Deno
	if(isDeno){
		const opts = {
			read:   "r" === flags[0],
			write:  "w" === flags[0],
			append: "a" === flags[0],
			createNew: flags.includes("wx") || flags.includes("w+x"),
			mode,
		};
		if(!opts.create)    delete opts.create;
		if(!opts.createNew) delete opts.createNew;
		return Deno.open(path, opts);
	}
	
	// QuickJS
	if(isQuickJS){
		const {open} = await import("os");
		const result = open(path, flags, mode);
		if(result < 0)
			throw new Error((await import("std")).strerror(-result));
		return result;
	}
	
	// Emulated file descriptor
	let fd = 3;
	while(openFiles[fd++]);
	return openFiles[fd] = {path, flags, mode, fd, data: null, pos: 0};
}
const openFiles = new Array(3);


/**
 * Read 𝑁 bytes from a file resource.
 * @param {File} file
 * @param {Uint8Array} buffer
 * @param {Number} [offset=0]
 * @return {Number} Returns the number of bytes read.
 */
export async function read(file, buffer, offset = null){
	
	// Node.js/Electron
	if(isNode){
		if("object" === typeof file)
			return (await file.read(buffer, 0, buffer.byteLength, offset)).bytesRead;
		const {read} = await import("fs");
		return new Promise((resolve, reject) => {
			read(file, buffer, 0, buffer.byteLength, offset, (error, bytesRead) =>
				error ? reject(error) : resolve(bytesRead));
		});
	}
	
	// Deno
	if(isDeno){
		if(offset > 0) await Deno.seek(file, offset, 0);
		return Deno.read(file.rid, buffer);
	}
	
	// QuickJS
	if(isQuickJS){
		const {read} = await import("os");
		const bytesRead = read(file, buffer.buffer, offset, buffer.byteLength);
		if(bytesRead < 0)
			throw new Error((await import("std")).strerror(-bytesRead));
		return bytesRead;
	}
	
	// Slurp entire file in environments that don't support positional reads
	if(openFiles.includes(file) && !file.closed){
		if(null === offset) offset = file.pos;
		file.data   = file.data || await readFile(file.path, true);
		const chunk = file.data.subarray(offset, offset + buffer.byteLength);
		file.pos    = offset + chunk.length;
		buffer.set(chunk, 0);
		return chunk.length;
	}
	else throw new Error(`Bad file descriptor: ${file.fd}`);
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
		return raw ? data : utf8Encode(data);
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
		return nih(readFile, path, raw);
	
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
		return Deno.readLink(path);
	
	// QuickJS
	else if(isQuickJS){
		const {readlink} = await import("os");
		const [link, code] = readlink(path);
		if(code) throw new Error((await import("std")).strerror(-code));
		return link;
	}
	
	// Not an environment that supports readlink(2)
	return nih(readlink, path);
}


/**
 * Process a plain-text database one record at a time.
 * @param {String} path
 * @param {Function} fn
 * @param {String} [opts={}]
 * @param {String} [opts.fs="\t"] - Field separator
 * @param {String} [opts.rs="\n"] - Record separator
 * @param {String} [opts.us=""]   - Unit (subfield) separator
 * @param {String} [opts.comment] - Comment character/introducer
 * @return {void}
 * @uses {@link streamFile}
 */
export async function readLines(path, fn, opts = {}){
	const {comment, fs = "\t", rs = "\n", us} = opts;
	const parse = chunk => {
		for(let line of chunk.split(rs)){
			if(comment){
				const index = line.indexOf(comment);
				if(~index) line = line.slice(0, index);
			}
			if(line = line.trim())
				fn(...fs ? line.split(fs).map(field => {
					field = field.trim();
					return us ? field.split(us).map(x => x.trim()) : field;
				}) : [line]);
		}
	};
	let partial = "";
	await streamFile(path, chunk => {
		if(partial){
			chunk = partial + chunk;
			partial = "";
		}
		if(!chunk.endsWith(rs)){
			const nl = chunk.lastIndexOf(rs);
			partial = chunk.slice(nl);
			chunk = chunk.slice(0, nl);
		}
		parse(chunk);
	});
	if(partial) parse(partial);
	return;
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
		return Deno.realPath(path);
	
	// QuickJS
	else if(isQuickJS){
		const {realpath} = await import("os");
		const [abspath, code] = realpath(path);
		if(code) throw new Error((await import("std")).stderror(-code));
		return abspath;
	}
	
	// Not an environment that supports realpath(3)
	return nih(realpath, path);
}


/**
 * Select and load files from the user's filesystem.
 * @param {Boolean} [multiple=false]
 * @param {String|String[]} [fileExts=null]
 * @return {LoadedFile[]}
 */
export async function selectFile(multiple = false, fileExts = null){
	multiple = !!multiple;
	fileExts = fileExts && ("string" === typeof fileExts
		? fileExts.trim().split(/\s+/)
		: [...fileExts]).map(e => e.replace(/^\*?\.|,/g, ""));
	
	// Electron
	if(isElectron){
		const {dialog, remote} = await import("electron");
		const options = {properties: ["openFile", "showHiddenFiles"]};
		if(multiple) options.properties.push("multiSelections");
		if(fileExts) options.filters = fileExts.map(e => ({extensions: [e]}));
		const selection = await ((dialog || remote.dialog).showOpenDialog(options) || []);
		return Promise.all((selection.filePaths || [...selection])
			.map(path => readFile(path, true).then(data => ({path, data}))));
	}
	
	// Browsers
	else{
		let files;

		// Filesystem access API
		if("function" === typeof window.showOpenFilePicker
		&& (navigator.userActivation || {__proto__: null}).hasBeenActive){
			files = await window.showOpenFilePicker({
				multiple,
				excludeAcceptAllOption: !!fileExts.length,
				types: [{accept: {"application/octet-stream": fileExts.map(e => "." + e)}}],
			});
			files = await Promise.all((Array.isArray(files) ? files : files.files)
				.map(entry => entry instanceof File ? entry : entry.getFile()));
		}
		
		// Detached form element
		else{
			if(!fileInput){
				fileInput = document.createElement("input");
				fileInput.type = "file";
			}
			fileInput.multiple = multiple;
			fileInput.accept = fileExts ? fileExts.map(e => "." + e).join(",") : "";
			files = await new Promise(resolve => {
				fileInput.onchange = () => resolve([...fileInput.files]);
				fileInput.oncancel = () => resolve([]);
				fileInput.click();
			});
			fileInput.oncancel =
			fileInput.onchange = null;
			fileInput.value = "";
		}
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
 * Read a file in chunks.
 * @param {String} path
 * @param {Function} fn
 * @param {Boolean} [raw=false]
 * @return {Promise.<void>}
 */
export async function streamFile(path, fn, raw = false){
	
	// Node.js/Electron
	if(isNode){
		const {createReadStream} = await import("fs");
		const stream = createReadStream(path, {encoding: raw ? null : "utf8"});
		return new Promise((resolve, reject) => {
			stream.on("data",  fn);
			stream.on("error", reject);
			stream.on("end",   resolve);
		});
	}
	
	// Deno
	else if(isDeno){
		const file = await Deno.open(path);
		for await(const chunk of Deno.iter(file))
			fn(raw ? chunk : utf8Encode(chunk));
		file.close();
	}
	
	// QuickJS
	else if(isQuickJS){
		const {open, strerror} = await import("std");
		const buf = new ArrayBuffer(1024 * 1024);
		const file = open(path, "r", buf);
		if(buf.errno) throw new Error(strerror(buf.errno));
		while(!file.eof()){
			const bytesRead = file.read(buf, 0, buf.byteLength);
			const chunk = new Uint8Array(buf, 0, Math.min(bytesRead, buf.byteLength));
			fn(raw ? chunk : utf8Encode(chunk));
		}
		file.close();
	}
	
	// Browsers
	else if(isBrowser && "function" === typeof ReadableStream){
		const {body} = await fetch(path);
		const reader = body.getReader();
		const readNext = async ({done, value} = {}) => {
			if(done) return;
			if(null != value)
				fn(raw ? value : utf8Encode(value));
			return reader.read().then(readNext);
		};
		return readNext();
	}
	
	// Environment doesn't support streaming/chunked reads
	else return nih(streamFile, path, fn, raw);
}


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
	else return nih(symlink, target, link);
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
			: utf8Decode(input));
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
		return nih(writeFile, path, input);
	
	// Browsers: Assume the server can properly interpret POST requests to `path`
	else if("function" === typeof window.fetch)
		return fetch(path, {
			body: raw ? input : utf8Decode(input),
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
	else return nih(utimes, path, accessed, modified);
}
