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
	var begin = null;

	if (typeof process !== "undefined")
	{
		// node.js
		begin = process.hrtime ();
		func = function () {
			var now = process.hrtime ();
			ret = (now[0] - begin[0]) * 1e3 + (now[1] - begin[1]) * 1e-6;
		};
	}
	else if (typeof performance !== "undefined" && (performance.now || performance.webkitNow))
	{
		// performance API
		var nowfunc = performance.now || performance.webkitNow;
		begin = nowfunc ();
		func = function () { return nowfunc () - begin; };
	}
	else
	{
		// generic javascript
		begin = +(new Date);
		func = function () { return +(new Date) - begin; };
	}

	function getNanoseconds () { return func (); }
	return getNanoseconds;

})();
