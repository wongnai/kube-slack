module.exports = function(array, func){
	let out = [];

	let emit = (item) => {
		out.push(item);
	};

	for(let item of array){
		func(item, emit);
	}

	return out;
};
