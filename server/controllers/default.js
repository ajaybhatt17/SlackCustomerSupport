

exports.install = function() {

	F.route('/contact-us', this.contact_us);
	F.route('/future-scope', this.future_scope);
	F.route('/demo', this.demo);
}

exports.contact_us = function() {

	var self = this;

	self.view('contact_us');

}

exports.future_scope = function() {

	var self = this;

	self.view('future_scope');

}

exports.demo = function() {

	var self = this;

	self.view('demo');

}