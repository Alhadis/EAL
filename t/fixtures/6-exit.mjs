import {argv, exit} from "../../index.mjs";

argv.length > 0
	? exit(+argv[0])
	: exit();
