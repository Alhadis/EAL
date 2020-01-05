import {log, isNode, isDeno, isElectron, isQuickJS, isV8Shell} from "../index.mjs";

log("Foo");
isDeno && log("Bar");
