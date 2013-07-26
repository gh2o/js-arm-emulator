#include "system.inc"

var neededFiles = {
	kernel: {path: "resources/kernelimage"},
	devicetree: {path: "resources/devicetree.dtb"},
	map: {path: "resources/kernelmap"}
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
	this.fd = fs.openSync ("resources/card/image", "r+");
	this.pages = new Array (1 << (30 - 9)); // 2^30 bytes of 2^9 byte sectors
}

SDBackend.prototype.close = function ()
{
	fs.closeSync (this.fd);
};

SDBackend.prototype.read = function (bytearray, offset, size, callback)
{
	var buffer = new Buffer (size);
	fs.read (this.fd, buffer, 0, size, offset, function (err, cnt) {
		if (err)
			throw err;
		if (cnt != size)
			throw new Error ('bad read size!');
		bytearray.set (new Uint8Array (buffer));
		callback (cnt);
	});
};

SDBackend.prototype.write = function (bytearray, offset, size, callback)
{
	var buffer = new Buffer (bytearray);
	fs.write (this.fd, buffer, 0, size, offset, function (err, cnt) {
		if (err)
			throw err;
		if (cnt != size)
			throw new Error ('bad write size!');
		callback (cnt);
	});
}

var system;
system = new System (null, new SDBackend ());

// copy kernel into memory
system.loadImage (neededFiles.kernel.buffer, 0x20008000);
system.loadImage (neededFiles.devicetree.buffer, 0x21000000);

// load map for overrides
system.loadMap (neededFiles.map.buffer);

// input routine
process.stdin.setRawMode (true);
process.stdin.resume ();
process.stdin.on ('data', function (buf) {
	for (var i = 0; i < buf.length; i++)
		system.writeInput (buf[i]);
});

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
