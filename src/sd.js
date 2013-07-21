#define SD_STATUS_CLEAR_A 0x02004100
#define SD_STATUS_CLEAR_B 0x00C01E00
#define SD_STATUS_CLEAR_C 0xFD39A028

#define SD_STATUS_CURRENT_STATE       (15 << 9)
#define SD_STATUS_CURRENT_STATE_idle  (0  << 9)
#define SD_STATUS_CURRENT_STATE_ready (1  << 9)
#define SD_STATUS_CURRENT_STATE_ident (2  << 9)
#define SD_STATUS_CURRENT_STATE_stby  (3  << 9)
#define SD_STATUS_CURRENT_STATE_tran  (4  << 9)
#define SD_STATUS_CURRENT_STATE_data  (5  << 9)

#define SD_STATUS_ILLEGAL_COMMAND (1 << 22)
#define SD_STATUS_APP_CMD         (1 <<  5)

function SD ()
{
	this.status = SD_STATUS_CURRENT_STATE_idle;
}

SD.prototype.doCommand = function (cmd, arg) {

	console.log (">>> cmd = " + cmd);
	console.log (">>> arg = " + formatHex (arg));

	var isAppCmd = this.status & SD_STATUS_APP_CMD;
	this.status &= ~SD_STATUS_CLEAR_C;

	if (isAppCmd)
	{
		switch (cmd)
		{
			case 41:
				this.doCommandCallback (0x80FF0000);
				this.setMode (SD_STATUS_CURRENT_STATE_ready);
				return;
		}
	}

	switch (cmd)
	{
		case 0:
			this.doCommandCallback ();
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case 2:
			this.doCommandCallback (0xFF4A534A, 0x53454D55, 0x10000000, 0x0000D701);
			this.setMode (SD_STATUS_CURRENT_STATE_ident);
			return;
		case 3:
			this.doCommandCallback (
				(0x01 << 16) |
				(this.status >> 8 & 0xC000) |
				(this.status >> 6 & 0x2000) |
				(this.status & 0x1FFF)
			);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case 7:
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
			return;
		case 8:
			this.doCommandCallback (arg & 0xFFF);
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case 9:
			this.doCommandCallback (0x007FFF08, 0xFFF983FF, 0xC0038000, 0x02600001);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case 55:
			this.status |= SD_STATUS_APP_CMD;
			this.doCommandCallback (this.status);
			return;
		default:
			this.doCommandCallback (this.status | SD_STATUS_ILLEGAL_COMMAND);
			return;
	}

};

SD.prototype.doRead = function () {
	throw "2";
};

SD.prototype.doWrite = function () {
	throw "3";
};

SD.prototype.setMode = function (mode) {
	this.status = this.status & ~SD_STATUS_CURRENT_STATE | mode;
};
