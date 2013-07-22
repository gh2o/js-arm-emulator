#include "system.inc"

var neededFiles = {
	kernel: {path: "resources/kernelimage"},
	devicetree: {path: "resources/devicetree.dtb"}
};

var fs = require ('fs');
for (var name in neededFiles)
{
	var obj = neededFiles[name];
	obj.buffer = new Uint8Array (fs.readFileSync (obj.path)).buffer;
}

// SD backend
function SDBackend ()
{
	this.fd = fs.openSync ("resources/card/image", "r");
}

SDBackend.prototype.close = function ()
{
	fs.closeSync (this.fd);
};

SDBackend.prototype.read = function (obj)
{
	var buf = new Buffer (obj.size);
	fs.read (this.fd, buf, 0, obj.size, obj.offset, function (err, cnt) {
		if (err)
			throw err;
		if (cnt != obj.size)
			throw new Error ("read bad size!");
		obj.callback (new Uint8Array (buf).buffer);
	});
};

SDBackend.prototype.write = function (func)
{
	throw new Error ("write not implemented");
};

var system;

// copy kernel into memory
system = new System (null, new SDBackend ());
system.loadImage (neededFiles.kernel.buffer, 0x20008000);
system.loadImage (neededFiles.devicetree.buffer, 0x21000000);

// output routine
var writeBuffer = new Buffer (1);
system.onOutput = function (b) {
	writeBuffer[0] = b;
	process.stdout.write (writeBuffer);
};

// do system reset
system.reset ();
system.setPC (0x20008000);
system.setRegister (REG_R1, ~0);
system.setRegister (REG_R2, 0x21000000);

setInterval (function () {
	system.run (200000);
}, 0);
