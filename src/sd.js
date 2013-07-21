function SD ()
{
}

SD.prototype.doCommand = function () {
	throw "1";
};

SD.prototype.doRead = function () {
	throw "2";
};

SD.prototype.doWrite = function () {
	throw "3";
};
