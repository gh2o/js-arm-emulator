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
	this.pages = new Array (1 << (30 - 9)); // 2^30 bytes of 2^9 byte sectors
}

SDBackend.prototype.close = function ()
{
	fs.closeSync (this.fd);
};

SDBackend.prototype.read = function (obj)
{
	// make sure that chunk is sector aligned
	if ((obj.offset & 0x1FF) || (obj.size & 0x1FF))
		throw new Error ("unaligned read!");

	var sdb = this;
	var firstPage = obj.offset >>> 9;
	var numPages = obj.size >>> 9;

	var nbuf = new Buffer (obj.size);
	fs.read (sdb.fd, nbuf, 0, obj.size, obj.offset, function (err, cnt) {
		if (err)
			throw err;
		if (cnt != obj.size)
			throw new Error ("read bad size!");
		var arr = new Uint8Array (nbuf);
		for (var i = 0; i < numPages; i++)
			if (sdb.pages[firstPage + i])
				arr.set (new Uint8Array (sdb.pages[firstPage + i]), i << 9);
		obj.callback (arr.buffer);
	});
};

SDBackend.prototype.write = function (obj)
{
	// make sure that chunk is sector aligned
	if ((obj.offset & 0x1FF) || (obj.size & 0x1FF))
		throw new Error ("unaligned write!");

	var sdb = this;
	var firstPage = obj.offset >>> 9;
	var numPages = obj.size >>> 9;

	for (var i = 0; i < numPages; i++)
		sdb.pages[firstPage + i] = obj.buffer.slice (i << 9, (i + 1) << 9);

	setTimeout (function () {
		obj.callback (obj.size);
	}, 0);
};

var system;

// copy kernel into memory
system = new System (null, new SDBackend ());
system.loadImage (neededFiles.kernel.buffer, 0x20008000);
system.loadImage (neededFiles.devicetree.buffer, 0x21000000);

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
