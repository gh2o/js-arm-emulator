#include "sd.inc"

#define SD_STATUS_CLEAR_A 0x02004100
#define SD_STATUS_CLEAR_B 0x00C01E00
#define SD_STATUS_CLEAR_C 0xFD39A028

#define SD_STATUS_CURRENT_STATE       (15 << 9)
#define SD_STATUS_CURRENT_STATE_idle  (0  << 9)
#define SD_STATUS_CURRENT_STATE_ready (1  << 9)
#define SD_STATUS_CURRENT_STATE_ident (2  << 9)
#define SD_STATUS_CURRENT_STATE_stby  (3  << 9)
#define SD_STATUS_CURRENT_STATE_tran  (4  << 9)

#define SD_STATUS_ILLEGAL_COMMAND (1 << 22)
#define SD_STATUS_APP_CMD         (1 <<  5)

var sdStatus = 0;

function _sdReset ()
{
	sdStatus = SD_STATUS_CURRENT_STATE_idle;
}

function _sdCommand (cmd, arg)
{
	PARAM_INT (cmd);
	PARAM_INT (arg);

	var isAppCmd = 0;

	console.log (">>> cmd = " + cmd);
	console.log (">>> arg = " + formatHex (arg));

	isAppCmd = sdStatus & SD_STATUS_APP_CMD;
	sdStatus = sdStatus & ~SD_STATUS_CLEAR_C;

	if (isAppCmd)
	{
		switch (cmd)
		{
			case 41:
				sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_ready;
				_pMCIRespond1 (0x80FF0000);
				return;
		}
	}

	switch (cmd)
	{
		case 0:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_idle;
			_pMCIRespond0 ();
			return;
		case 2:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_ident;
			_pMCIRespond4 (0xFF4A534A, 0x53454D55, 0x10000000, 0x0000D701);
			return;
		case 3:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_stby;
			_pMCIRespond1 ((0x01 << 16) | (sdStatus >> 8 & 0xC000) | (sdStatus >> 6 & 0x2000) | (sdStatus & 0x1FFF));
			return;
		case 7:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_tran;
			_pMCIRespond1 (sdStatus);
			return;
		case 8:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_idle;
			_pMCIRespond1 (arg & 0xFFF);
			return;
		case 9:
			sdStatus = sdStatus & ~SD_STATUS_CURRENT_STATE | SD_STATUS_CURRENT_STATE_stby;
			_pMCIRespond4 (0x007FFF08, 0xFFF983FF, 0xC0038000, 0x02600001);
			return;
		case 55:
			sdStatus = sdStatus | SD_STATUS_APP_CMD;
			_pMCIRespond1 (sdStatus);
			return;
		default:
			_pMCIRespond1 (sdStatus | SD_STATUS_ILLEGAL_COMMAND);
			return;
	}
}
