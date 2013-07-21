#include "sd.inc"

function _sdReset ()
{
}

function _sdCommand (cmd, arg)
{
	console.log (">>> cmd = " + cmd);
	console.log (">>> arg = " + formatHex (arg));
}
