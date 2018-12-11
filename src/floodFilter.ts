export default class FloodFilter {
	private store: { [key: string]: number };
	expire: number;

	constructor() {
		this.store = {};
		this.expire = 60000;
	}

	isAccepted(item: string) {
		let result = true;
		let now = new Date().getTime();
		if (this.store[item] && this.store[item] > now) {
			result = false;
		}
		// reset expiry timer if the item is flooding
		this.store[item] = now + this.expire;
		return result;
	}
}
