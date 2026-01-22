/**
 * @file Support for capturing stack traces at-point.
 */

/**
 * A null-prototype object populated with fields extracted from a traced call-frame.
 * @typedef  {Object}  CallFrame
 * @property {String?} caller             - Name of the calling function or method
 * @property {String?} file               - Path to the containing file
 * @property {Number?} line               - Line number, indexed from 1
 * @property {Number?} column             - Column number, indexed from 1
 * @property {Boolean} [isEval=false]     - True if called from {@link https://mdn.io/JS/eval}
 * @property {Boolean} [isNative=false]   - True if called from native/built-in code
 * @property {Boolean} [isTopLevel=false] - True if called from top-level in the containing file
 */


/**
 * Whether V8's native stack trace API is available.
 * @const {Boolean} haveNativeStackTraces
 */
export const haveNativeStackTraces = !!(
	"function" === typeof Error.captureStackTrace &&
	(Array.isArray((new Error()).rawStack) || (() => {
		const {prepareStackTrace} = Error;
		let called = false;
		try{
			Error.prepareStackTrace = (error, stack) => (called = !!error, stack);
			throw new Error();
		}
		catch(error){ error.stack; called = true; }
		finally{ Error.prepareStackTrace = prepareStackTrace; }
		return called;
	})())
);

/**
 * Capture a stack trace.
 * @return {CallFrame[]}
 */
export function getStackTrace(){
	
	// V8-powered environments: Use native stack trace API
	if(haveNativeStackTraces){
		const {prepareStackTrace} = Error;
		let result;
		try{
			Error.prepareStackTrace = (error, stack) => stack.map(frame => {
				const func   = frame.getFunctionName();
				const method = frame.getMethodName();
				const result = {
					__proto__:  null,
					caller:     func || method,
					file:       frame.getFileName(),
					line:       frame.getLineNumber(),
					column:     frame.getColumnNumber(),
					isEval:     frame.isEval(),
					isNative:   frame.isNative(),
					isTopLevel: frame.isToplevel(),
				};
				Object.defineProperties(result, {
					unparsed: {value: frame},
				});
				if(result.isEval)
					result.evalOrigin = frame.getEvalOrigin();
				return result;
			});
			throw new Error();
		}
		catch(error){ result = error.stack; }
		finally{ Error.prepareStackTrace = prepareStackTrace; }
		return result;
	}
	
	let error;
	try{ throw new Error(); }
	catch(e){ error = e; }
	
	const {stack} = error;
	if(!stack)
		return null;
	
	return String(stack).trim().split(/\r?\n|\r|\x85|\u2028|\u2029/).map(line => {
		const cut = line.indexOf("@");
		if(~cut){
			const result = {
				__proto__:  null,
				caller:     line.slice(0, cut),
				file:       line.slice(cut + 1),
				line:       null,
				column:     null,
				isEval:     false,
				isNative:   false,
				isTopLevel: false,
			};
			if("eval code" === result.caller && !result.file){
				result.isEval = true;
				result.caller = null;
			}
			else if(/^(?:global|module) code$/.test(result.caller)){
				result.isTopLevel = true;
				result.caller = null;
			}
			if("[native code]" === result.file){
				result.isNative = true;
				result.file = null;
			}
			else if(result.file){
				const parts = result.file.match(/^(.+?):(\d*)(?::(\d*))?$/);
				parts && Object.assign(result, {
					file:    parts[1],
					line:    parseInt(parts[2] || "", 10),
					column:  parseInt(parts[3] || "", 10),
				});
			}
			else result.file = "<anonymous>";
			return result;
		}
		return line;
	});
}
