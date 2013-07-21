// vim:ft=c
#pragma once

#define DEFAULT_OPTION(x,y) ((x === undefined || x === null) && (x = (y)))

#define CONCAT_TOKENS_(x,y) x##y
#define CONCAT_TOKENS(x,y) CONCAT_TOKENS_(x,y)

#ifdef ASM_JS
	#define FUNC_VOID(x,...) _##x(__VA_ARGS__)
	#define FUNC_INT(x,...) (_##x(__VA_ARGS__)|0)
	#define FUNC_DBL(x,...) (+_##x(__VA_ARGS__))
#endif
