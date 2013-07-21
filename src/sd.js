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

#define NRM_CMD(x) (x)
#define APP_CMD(x) (x + 0x40)

function SD ()
{
	this.status = SD_STATUS_CURRENT_STATE_idle;
	this.dataCmd = 0;
	this.dataArg = 0;
	this.dataArray = undefined;
	this.dataOffset = 0;
}

SD.prototype.initData = function (cmd, arg, array)
{
	this.dataCmd = cmd;
	this.dataArg = arg;
	this.dataArray = array;
	this.dataOffset = 0;
}

SD.prototype.doCommand = function (cmd, arg)
{
	cmd |= !!(this.status & SD_STATUS_APP_CMD) << 6;
	this.status &= ~SD_STATUS_CLEAR_C;

	switch (cmd)
	{
		case NRM_CMD (0):
			this.doCommandCallback ();
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case NRM_CMD (2):
			this.doCommandCallback (0xFF4A534A, 0x53454D55, 0x10000000, 0x0000D701);
			this.setMode (SD_STATUS_CURRENT_STATE_ident);
			return;
		case NRM_CMD (3):
			this.doCommandCallback (
				(0x01 << 16) |
				(this.status >> 8 & 0xC000) |
				(this.status >> 6 & 0x2000) |
				(this.status & 0x1FFF)
			);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case NRM_CMD (7):
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
			return;
		case NRM_CMD (8):
			this.doCommandCallback (arg & 0xFFF);
			this.setMode (SD_STATUS_CURRENT_STATE_idle);
			return;
		case NRM_CMD (9):
			this.doCommandCallback (0x007FFF08, 0xFFF983FF, 0xC0038000, 0x02600001);
			this.setMode (SD_STATUS_CURRENT_STATE_stby);
			return;
		case NRM_CMD (12):
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
			return;
		case NRM_CMD (18):
			this.initData (cmd, arg);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case NRM_CMD (55):
			this.status |= SD_STATUS_APP_CMD;
			this.doCommandCallback (this.status);
			return;
		case APP_CMD (13):
			this.initData (cmd, arg, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case APP_CMD (41):
			this.doCommandCallback (0x80FF0000);
			this.setMode (SD_STATUS_CURRENT_STATE_ready);
			return;
		case APP_CMD (51):
			this.initData (cmd, arg, [0, 0]);
			this.doCommandCallback (this.status);
			this.setMode (SD_STATUS_CURRENT_STATE_data);
			return;
		case NRM_CMD (5):
		case NRM_CMD (52):
			this.doCommandCallback (this.status | SD_STATUS_ILLEGAL_COMMAND);
			return;
		default:
			throw new Error ("unknown command: " + (cmd & 0x40 ? "A" : "") + "CMD" + (cmd & 0x3F));
	}

};

SD.prototype.doRead = function (sz)
{
	if (this.dataArray)
	{
		while ((this.dataOffset >> 2) < this.dataArray.length && sz > 0)
		{
			this.doReadCallback (this.dataArray[this.dataOffset >> 2]);
			this.dataOffset += 4;
			sz -= 4;
		}

		if ((this.dataOffset >> 2) == this.dataArray.length)
			this.setMode (SD_STATUS_CURRENT_STATE_tran);
	}
	else
	{
		switch (this.dataCmd)
		{
			case NRM_CMD (18):
				while (sz > 0)
				{
					this.doReadCallback (0);
					sz -= 4;
				}
				break;
			default:
				throw new Error ("unknown data command: " + (cmd & 0x40 ? "A" : "") + "CMD" + (cmd & 0x3F));
		}
	}
};

SD.prototype.doWrite = function ()
{
	throw "3";
};

SD.prototype.setMode = function (mode) {
	this.status = this.status & ~SD_STATUS_CURRENT_STATE | mode;
};
