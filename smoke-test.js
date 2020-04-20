"use strict";

import("./index.mjs")
	.then(result => result.log("Loaded successfully"))
	.catch(error => console.log(`Failed:\n${error}`));
