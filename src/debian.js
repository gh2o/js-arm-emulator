var neededFiles = {
	kernel: {path: "../resources/kernelimage"},
};

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
	// copy kernel into memory
	// assume that the kernel's size will be divisble by 4
	system = new System ();
	system.loadImage (neededFiles.kernel.xhr.response, 0x10008000);
}
