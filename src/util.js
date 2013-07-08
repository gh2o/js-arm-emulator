function formatHex (a)
{
	var b = (a >>> 0).toString (16);
	while (b.length < 8)
		b = "0" + b;
	return "0x" + b;
}
