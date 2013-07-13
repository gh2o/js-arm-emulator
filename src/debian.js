#include "system.inc"

var neededFiles = {
	kernel: {path: "../resources/kernelimage"},
	devicetree: {path: "../resources/devicetree.dtb"}
};

var system = null;

initialize ();

function initialize ()
{
	function load (obj)
	{
		function success ()
		{
			for (var name in neededFiles)
				if (neededFiles[name].xhr.response === null)
					return;
			bootstrap ();
		}

		function failure ()
		{
			start ();
		}

		function start ()
		{
			var xhr = obj.xhr = new XMLHttpRequest ();
			xhr.open ("GET", obj.path);
			xhr.responseType = "arraybuffer";

			xhr.onload = success;
			xhr.onerror = failure;
			xhr.onabort = failure;

			xhr.send ();
		}

		start ();
	}

	for (var name in neededFiles)
		load (neededFiles[name]);
}

function bootstrap ()
{
	// don't start if started already
	if (system !== null)
		return;

	// copy kernel into memory
	system = new System ();
	system.loadImage (neededFiles.kernel.xhr.response, 0x20008000);
	system.loadImage (neededFiles.devicetree.xhr.response, 0x21000000);

	// do system reset
	system.reset ();
	system.setPC (0x20008000);
	system.setRegister (REG_R2, 0x21000000);

	// start CPU intervals
	var tickIntervalID = setInterval (function () {
		try {
			tick ();
		} catch (e) {
			clearInterval (tickIntervalID);
			throw e;
		}
	}, 5);
}

function tick ()
{
	system.tick (10000);
}
