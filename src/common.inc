// vim:ft=c

#ifdef NO_TYPE_ARRAYS
	#error "NO_TYPE_ARRAYS not supported!"
#else
	#define S32_VIEW_FROM_ARRAY_BUFFER(heap,global) (new global.Int32Array(heap))
#endif

#define DEFAULT_OPTION(x,y) ((typeof x !== "undefined") || (x = (y)))
