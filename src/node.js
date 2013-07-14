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

var system;

// copy kernel into memory
system = new System ();
system.loadImage (neededFiles.kernel.buffer, 0x20008000);
system.loadImage (neededFiles.devicetree.buffer, 0x21000000);

// output routine
var writeBuffer = new Buffer (1);
system.onConsoleByte = function (b) {
	writeBuffer[0] = b;
	process.stdout.write (writeBuffer);
};

// do system reset
system.reset ();
system.setPC (0x20008000);
system.setRegister (REG_R1, ~0);
system.setRegister (REG_R2, 0x21000000);

while (1)
	system.tick (1000);
