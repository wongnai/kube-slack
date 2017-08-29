class FloodFilter {
	constructor(){
		this._store = {};
		this.expire = 60000;
	}

	isAccepted(item){
		let result = true;
		let now = new Date().getTime();
		if(this._store[item] && this._store[item] > now){
			result = false;
		}
		// reset expiry timer if the item is flooding
		this._store[item] = now + this.expire;
		return result;
	}
}

module.exports = FloodFilter;