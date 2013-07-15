function formatHex (a)
{
	var b = (a >>> 0).toString (16);
	while (b.length < 8)
		b = "0" + b;
	return "0x" + b;
}

if (!Math.imul)
{
	Math.imul = function (a, b) {
		var ah  = (a >>> 16) & 0xffff;
		var al = a & 0xffff;
		var bh  = (b >>> 16) & 0xffff;
		var bl = b & 0xffff;
		return ((al * bl) + ((ah * bl + al * bh) << 16)) | 0;
	};
}

var getMilliseconds = (function () {

	var func;
	var last = null;

	if (typeof process !== "undefined") // node.js
	{
		func = function () {

			var ret = 0;
			var now = process.hrtime ();

			if (last !== null)
				ret = (now[0] - last[0]) * 1e3 + (now[1] - last[1]) * 1e-6;

			last = now;
			return ret;

		};
	}
	else // browser
	{
		func = function () { return +(new Date); };
		if (typeof performance !== "undefined")
			func = performance.now || performance.webkitNow || func;
	}

	function getNanoseconds () { return func (); }
	return getNanoseconds;

})();
