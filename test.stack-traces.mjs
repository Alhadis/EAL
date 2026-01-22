import {getStackTrace} from "./lib/stack-trace.mjs";

console.dir(getStackTrace());

eval(`
	console.dir(getStackTrace());
	globalThis.bar = function bar(){
		console.dir(getStackTrace());
	}
`);

bar();

async function foo(){
	const wat = getStackTrace();
	return wat;
}
foo();

class Foo{
	constructor(){
		console.dir(getStackTrace());
	}
	
	frobnicate(){
		console.dir(getStackTrace());
	}
}
Foo.prototype.frob = Foo.prototype.frobnicate;
let f = new Foo();
f.frob();
