import {argv, log} from "../index.mjs";

for(let i = 0; i < argv.length; ++i)
	log(`${i}: ${argv[i]}`);
