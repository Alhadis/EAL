Environment Abstraction Library
===============================

Currently a work-in-progress.

##### Supported environments:

* [x] Browsers
* [x] [Deno](https://doc.deno.land/deno/stable) >=1.3.0
* [x] [Electron](https://electronjs.org/docs/latest) >=8.0.0
* [x] [GNOME `gjs`](https://gitlab.gnome.org/GNOME/gjs) >=1.67.2 [*](#1)
* [x] [GraalJS](https://github.com/oracle/graaljs) >=20.0.0 [*](#1)
* [x] [Moddable XS](https://www.moddable.com/) >=10.1.0 [*](#1)
* [x] [Node.js](https://nodejs.org/) >=12.17.0 <13 || >=13.2.0
* [x] [QuickJS](https://bellard.org/quickjs/) >=2020-04-12
* [x] [V8 debugging shell](https://v8.dev/docs/d8) >=7.9.317.31

##### Unsupported environments:

* [ ] [Adobe ExtendScript](https://web.archive.org/web/20210506202111/https://www.adobe.com/devnet/illustrator/scripting.html)
* [ ] [Chakra shell](https://github.com/chakra-core/ChakraCore)
* [ ] [Duktape](https://wiki.duktape.org/postes5features)
* [ ] [JerryScript](https://jerryscript.net/)
* [ ] [JXA](https://github.com/JXA-Cookbook/JXA-Cookbook/wiki/ES6-Features-in-JXA "JavaScript Automation for macOS")
* [ ] [MuJS](https://mujs.com/)
* [ ] [SpiderMonkey shell](https://firefox-source-docs.mozilla.org/js)

<a name="1"></a>
> \* Indicates an engine that passes [`./smoke-test.js`](smoke-test.js), but has yet to be fully-tested.
