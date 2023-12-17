/*
---
MooTools: the javascript framework

web build:
 - http://mootools.net/core/7c56cfef9dddcf170a5d68e3fb61cfd7

packager build:
 - packager build Core/Core Core/Array Core/String Core/Number Core/Function Core/Object Core/Event Core/Browser Core/Class Core/Class.Extras Core/Slick.Parser Core/Slick.Finder Core/Element Core/Element.Style Core/Element.Event Core/Element.Dimensions Core/Fx Core/Fx.CSS Core/Fx.Tween Core/Fx.Morph Core/Fx.Transitions Core/Request Core/Request.HTML Core/Request.JSON Core/Cookie Core/JSON Core/DOMReady Core/Swiff

/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

...
*/

(function(){

this.MooTools = {
	version: '1.3',
	build: 'a3eed692dd85050d80168ec2c708efe901bb7db3'
};

// typeOf, instanceOf

var typeOf = this.typeOf = function(item){
	if (item == null) return 'null';
	if (item.$family) return item.$family();

	if (item.nodeName){
		if (item.nodeType == 1) return 'element';
		if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
	} else if (typeof item.length == 'number'){
		if (item.callee) return 'arguments';
		if ('item' in item) return 'collection';
	}

	return typeof item;
};

var instanceOf = this.instanceOf = function(item, object){
	if (item == null) return false;
	var constructor = item.$constructor || item.constructor;
	while (constructor){
		if (constructor === object) return true;
		constructor = constructor.parent;
	}
	return item instanceof object;
};

// Function overloading

var Function = this.Function;

var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

Function.prototype.overloadSetter = function(usePlural){
	var self = this;
	return function(a, b){
		if (a == null) return this;
		if (usePlural || typeof a != 'string'){
			for (var k in a) self.call(this, k, a[k]);
			if (enumerables) for (var i = enumerables.length; i--;){
				k = enumerables[i];
				if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
			}
		} else {
			self.call(this, a, b);
		}
		return this;
	};
};

Function.prototype.overloadGetter = function(usePlural){
	var self = this;
	return function(a){
		var args, result;
		if (usePlural || typeof a != 'string') args = a;
		else if (arguments.length > 1) args = arguments;
		if (args){
			result = {};
			for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
		} else {
			result = self.call(this, a);
		}
		return result;
	};
};

Function.prototype.extend = function(key, value){
	this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
	this.prototype[key] = value;
}.overloadSetter();

// From

var slice = Array.prototype.slice;

Function.from = function(item){
	return (typeOf(item) == 'function') ? item : function(){
		return item;
	};
};

Array.from = function(item){
	if (item == null) return [];
	return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
};

Number.from = function(item){
	var number = parseFloat(item);
	return isFinite(number) ? number : null;
};

String.from = function(item){
	return item + '';
};

// hide, protect

Function.implement({

	hide: function(){
		this.$hidden = true;
		return this;
	},

	protect: function(){
		this.$protected = true;
		return this;
	}

});

// Type

var Type = this.Type = function(name, object){
	if (name){
		var lower = name.toLowerCase();
		var typeCheck = function(item){
			return (typeOf(item) == lower);
		};

		Type['is' + name] = typeCheck;
		if (object != null){
			object.prototype.$family = (function(){
				return lower;
			}).hide();
			//<1.2compat>
			object.type = typeCheck;
			//</1.2compat>
		}
	}

	if (object == null) return null;

	object.extend(this);
	object.$constructor = Type;
	object.prototype.$constructor = object;

	return object;
};

var toString = Object.prototype.toString;

Type.isEnumerable = function(item){
	return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
};

var hooks = {};

var hooksOf = function(object){
	var type = typeOf(object.prototype);
	return hooks[type] || (hooks[type] = []);
};

var implement = function(name, method){
	if (method && method.$hidden) return this;

	var hooks = hooksOf(this);

	for (var i = 0; i < hooks.length; i++){
		var hook = hooks[i];
		if (typeOf(hook) == 'type') implement.call(hook, name, method);
		else hook.call(this, name, method);
	}
	
	var previous = this.prototype[name];
	if (previous == null || !previous.$protected) this.prototype[name] = method;

	if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function(item){
		return method.apply(item, slice.call(arguments, 1));
	});

	return this;
};

var extend = function(name, method){
	if (method && method.$hidden) return this;
	var previous = this[name];
	if (previous == null || !previous.$protected) this[name] = method;
	return this;
};

Type.implement({

	implement: implement.overloadSetter(),

	extend: extend.overloadSetter(),

	alias: function(name, existing){
		implement.call(this, name, this.prototype[existing]);
	}.overloadSetter(),

	mirror: function(hook){
		hooksOf(this).push(hook);
		return this;
	}

});

new Type('Type', Type);

// Default Types

var force = function(name, object, methods){
	var isType = (object != Object),
		prototype = object.prototype;

	if (isType) object = new Type(name, object);

	for (var i = 0, l = methods.length; i < l; i++){
		var key = methods[i],
			generic = object[key],
			proto = prototype[key];

		if (generic) generic.protect();

		if (isType && proto){
			delete prototype[key];
			prototype[key] = proto.protect();
		}
	}

	if (isType) object.implement(prototype);

	return force;
};

force('String', String, [
	'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
	'slice', 'split', 'substr', 'substring', 'toLowerCase', 'toUpperCase'
])('Array', Array, [
	'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
	'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
])('Number', Number, [
	'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
])('Function', Function, [
	'apply', 'call', 'bind'
])('RegExp', RegExp, [
	'exec', 'test'
])('Object', Object, [
	'create', 'defineProperty', 'defineProperties', 'keys',
	'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
	'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
])('Date', Date, ['now']);

Object.extend = extend.overloadSetter();

Date.extend('now', function(){
	return +(new Date);
});

new Type('Boolean', Boolean);

// fixes NaN returning as Number

Number.prototype.$family = function(){
	return isFinite(this) ? 'number' : 'null';
}.hide();

// Number.random

Number.extend('random', function(min, max){
	return Math.floor(Math.random() * (max - min + 1) + min);
});

// forEach, each

Object.extend('forEach', function(object, fn, bind){
	for (var key in object){
		if (object.hasOwnProperty(key)) fn.call(bind, object[key], key, object);
	}
});

Object.each = Object.forEach;

Array.implement({

	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},

	each: function(fn, bind){
		Array.forEach(this, fn, bind);
		return this;
	}

});

// Array & Object cloning, Object merging and appending

var cloneOf = function(item){
	switch (typeOf(item)){
		case 'array': return item.clone();
		case 'object': return Object.clone(item);
		default: return item;
	}
};

Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

var mergeOne = function(source, key, current){
	switch (typeOf(current)){
		case 'object':
			if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
			else source[key] = Object.clone(current);
		break;
		case 'array': source[key] = current.clone(); break;
		default: source[key] = current;
	}
	return source;
};

Object.extend({

	merge: function(source, k, v){
		if (typeOf(k) == 'string') return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	},

	append: function(original){
		for (var i = 1, l = arguments.length; i < l; i++){
			var extended = arguments[i] || {};
			for (var key in extended) original[key] = extended[key];
		}
		return original;
	}

});

// Object-less types

['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function(name){
	new Type(name);
});

// Unique ID

var UID = Date.now();

String.extend('uniqueID', function(){
	return (UID++).toString(36);
});

//<1.2compat>

var Hash = this.Hash = new Type('Hash', function(object){
	if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
	for (var key in object) this[key] = object[key];
	return this;
});

Hash.implement({

	forEach: function(fn, bind){
		Object.forEach(this, fn, bind);
	},

	getClean: function(){
		var clean = {};
		for (var key in this){
			if (this.hasOwnProperty(key)) clean[key] = this[key];
		}
		return clean;
	},

	getLength: function(){
		var length = 0;
		for (var key in this){
			if (this.hasOwnProperty(key)) length++;
		}
		return length;
	}

});

Hash.alias('each', 'forEach');

Object.type = Type.isObject;

var Native = this.Native = function(properties){
	return new Type(properties.name, properties.initialize);
};

Native.type = Type.type;

Native.implement = function(objects, methods){
	for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
	return Native;
};

var arrayType = Array.type;
Array.type = function(item){
	return instanceOf(item, Array) || arrayType(item);
};

this.$A = function(item){
	return Array.from(item).slice();
};

this.$arguments = function(i){
	return function(){
		return arguments[i];
	};
};

this.$chk = function(obj){
	return !!(obj || obj === 0);
};

this.$clear = function(timer){
	clearTimeout(timer);
	clearInterval(timer);
	return null;
};

this.$defined = function(obj){
	return (obj != null);
};

this.$each = function(iterable, fn, bind){
	var type = typeOf(iterable);
	((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
};

this.$empty = function(){};

this.$extend = function(original, extended){
	return Object.append(original, extended);
};

this.$H = function(object){
	return new Hash(object);
};

this.$merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

this.$lambda = Function.from;
this.$mixin = Object.merge;
this.$random = Number.random;
this.$splat = Array.from;
this.$time = Date.now;

this.$type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

this.$unlink = function(object){
	switch (typeOf(object)){
		case 'object': return Object.clone(object);
		case 'array': return Array.clone(object);
		case 'hash': return new Hash(object);
		default: return object;
	}
};

//</1.2compat>

})();


/*
---

name: Array

description: Contains Array Prototypes like each, contains, and erase.

license: MIT-style license.

requires: Type

provides: Array

...
*/

Array.implement({

	invoke: function(methodName){
		var args = Array.slice(arguments, 1);
		return this.map(function(item){
			return item[methodName].apply(item, args);
		});
	},

	every: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
		}
		return results;
	},

	clean: function(){
		return this.filter(function(item){
			return item != null;
		});
	},

	indexOf: function(item, from){
		var len = this.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},

	associate: function(keys){
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function(object){
		var result = {};
		for (var i = 0, l = this.length; i < l; i++){
			for (var key in object){
				if (object[key](this[i])){
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function(item, from){
		return this.indexOf(item, from) != -1;
	},

	append: function(array){
		this.push.apply(this, array);
		return this;
	},

	getLast: function(){
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function(){
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function(item){
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function(array){
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function(item){
		for (var i = this.length; i--;){
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function(){
		this.length = 0;
		return this;
	},

	flatten: function(){
		var array = [];
		for (var i = 0, l = this.length; i < l; i++){
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},

	pick: function(){
		for (var i = 0, l = this.length; i < l; i++){
			if (this[i] != null) return this[i];
		}
		return null;
	},

	hexToRgb: function(array){
		if (this.length != 3) return null;
		var rgb = this.map(function(value){
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function(array){
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++){
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});

//<1.2compat>

Array.alias('extend', 'append');

var $pick = function(){
	return Array.from(arguments).pick();
};

//</1.2compat>


/*
---

name: String

description: Contains String Prototypes like camelCase, capitalize, test, and toInt.

license: MIT-style license.

requires: Type

provides: String

...
*/

String.implement({

	test: function(regex, params){
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function(string, separator){
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : this.indexOf(string) > -1;
	},

	trim: function(){
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function(){
		return this.replace(/\s+/g, ' ').trim();
	},

	camelCase: function(){
		return this.replace(/-\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function(){
		return this.replace(/[A-Z]/g, function(match){
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function(){
		return this.replace(/\b[a-z]/g, function(match){
			return match.toUpperCase();
		});
	},

	escapeRegExp: function(){
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	hexToRgb: function(array){
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function(array){
		var rgb = this.match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function(object, regexp){
		return this.replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != null) ? object[name] : '';
		});
	}

});


/*
---

name: Number

description: Contains Number Prototypes like limit, round, times, and ceil.

license: MIT-style license.

requires: Type

provides: Number

...
*/

Number.implement({

	limit: function(min, max){
		return Math.min(max, Math.max(min, this));
	},

	round: function(precision){
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function(fn, bind){
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	}

});

Number.alias('each', 'times');

(function(math){
	var methods = {};
	math.each(function(name){
		if (!Number[name]) methods[name] = function(){
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);


/*
---

name: Function

description: Contains Function Prototypes like create, bind, pass, and delay.

license: MIT-style license.

requires: Type

provides: Function

...
*/

Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

Function.implement({

	attempt: function(args, bind){
		try {
			return this.apply(bind, Array.from(args));
		} catch (e){}
		
		return null;
	},

	bind: function(bind){
		var self = this,
			args = (arguments.length > 1) ? Array.slice(arguments, 1) : null;
		
		return function(){
			if (!args && !arguments.length) return self.call(bind);
			if (args && arguments.length) return self.apply(bind, args.concat(Array.from(arguments)));
			return self.apply(bind, args || arguments);
		};
	},

	pass: function(args, bind){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.pass(args, bind), delay);
	},

	periodical: function(periodical, bind, args){
		return setInterval(this.pass(args, bind), periodical);
	}

});

//<1.2compat>

delete Function.prototype.bind;

Function.implement({

	create: function(options){
		var self = this;
		options = options || {};
		return function(event){
			var args = options.arguments;
			args = (args != null) ? Array.from(args) : Array.slice(arguments, (options.event) ? 1 : 0);
			if (options.event) args = [event || window.event].extend(args);
			var returns = function(){
				return self.apply(options.bind || null, args);
			};
			if (options.delay) return setTimeout(returns, options.delay);
			if (options.periodical) return setInterval(returns, options.periodical);
			if (options.attempt) return Function.attempt(returns);
			return returns();
		};
	},

	bind: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	bindWithEvent: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(event){
			return self.apply(bind, (args == null) ? arguments : [event].concat(args));
		};
	},

	run: function(args, bind){
		return this.apply(bind, Array.from(args));
	}

});

var $try = Function.attempt;

//</1.2compat>


/*
---

name: Object

description: Object generic methods

license: MIT-style license.

requires: Type

provides: [Object, Hash]

...
*/


Object.extend({

	subset: function(object, keys){
		var results = {};
		for (var i = 0, l = keys.length; i < l; i++){
			var k = keys[i];
			results[k] = object[k];
		}
		return results;
	},

	map: function(object, fn, bind){
		var results = {};
		for (var key in object){
			if (object.hasOwnProperty(key)) results[key] = fn.call(bind, object[key], key, object);
		}
		return results;
	},

	filter: function(object, fn, bind){
		var results = {};
		Object.each(object, function(value, key){
			if (fn.call(bind, value, key, object)) results[key] = value;
		});
		return results;
	},

	every: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && !fn.call(bind, object[key], key)) return false;
		}
		return true;
	},

	some: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && fn.call(bind, object[key], key)) return true;
		}
		return false;
	},

	keys: function(object){
		var keys = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) keys.push(key);
		}
		return keys;
	},

	values: function(object){
		var values = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) values.push(object[key]);
		}
		return values;
	},

	getLength: function(object){
		return Object.keys(object).length;
	},

	keyOf: function(object, value){
		for (var key in object){
			if (object.hasOwnProperty(key) && object[key] === value) return key;
		}
		return null;
	},

	contains: function(object, value){
		return Object.keyOf(object, value) != null;
	},

	toQueryString: function(object, base){
		var queryString = [];

		Object.each(object, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result;
			switch (typeOf(value)){
				case 'object': result = Object.toQueryString(value, key); break;
				case 'array':
					var qs = {};
					value.each(function(val, i){
						qs[i] = val;
					});
					result = Object.toQueryString(qs, key);
				break;
				default: result = key + '=' + encodeURIComponent(value);
			}
			if (value != null) queryString.push(result);
		});

		return queryString.join('&');
	}

});


//<1.2compat>

Hash.implement({

	has: Object.prototype.hasOwnProperty,

	keyOf: function(value){
		return Object.keyOf(this, value);
	},

	hasValue: function(value){
		return Object.contains(this, value);
	},

	extend: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.set(this, key, value);
		}, this);
		return this;
	},

	combine: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.include(this, key, value);
		}, this);
		return this;
	},

	erase: function(key){
		if (this.hasOwnProperty(key)) delete this[key];
		return this;
	},

	get: function(key){
		return (this.hasOwnProperty(key)) ? this[key] : null;
	},

	set: function(key, value){
		if (!this[key] || this.hasOwnProperty(key)) this[key] = value;
		return this;
	},

	empty: function(){
		Hash.each(this, function(value, key){
			delete this[key];
		}, this);
		return this;
	},

	include: function(key, value){
		if (this[key] == null) this[key] = value;
		return this;
	},

	map: function(fn, bind){
		return new Hash(Object.map(this, fn, bind));
	},

	filter: function(fn, bind){
		return new Hash(Object.filter(this, fn, bind));
	},

	every: function(fn, bind){
		return Object.every(this, fn, bind);
	},

	some: function(fn, bind){
		return Object.some(this, fn, bind);
	},

	getKeys: function(){
		return Object.keys(this);
	},

	getValues: function(){
		return Object.values(this);
	},

	toQueryString: function(base){
		return Object.toQueryString(this, base);
	}

});

Hash.extend = Object.append;

Hash.alias({indexOf: 'keyOf', contains: 'hasValue'});

//</1.2compat>


/*
---

name: Browser

description: The Browser Object. Contains Browser initialization, Window and Document, and the Browser Hash.

license: MIT-style license.

requires: [Array, Function, Number, String]

provides: [Browser, Window, Document]

...
*/

(function(){

var document = this.document;
var window = document.window = this;

var UID = 1;

this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var ua = navigator.userAgent.toLowerCase(),
	platform = navigator.platform.toLowerCase(),
	UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0],
	mode = UA[1] == 'ie' && document.documentMode;

var Browser = this.Browser = {

	extend: Function.prototype.extend,

	name: (UA[1] == 'version') ? UA[3] : UA[1],

	version: mode || parseFloat((UA[1] == 'opera' && UA[4]) ? UA[4] : UA[2]),

	Platform: {
		name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
	},

	Features: {
		xpath: !!(document.evaluate),
		air: !!(window.runtime),
		query: !!(document.querySelector),
		json: !!(window.JSON)
	},

	Plugins: {}

};

Browser[Browser.name] = true;
Browser[Browser.name + parseInt(Browser.version, 10)] = true;
Browser.Platform[Browser.Platform.name] = true;

// Request

Browser.Request = (function(){

	var XMLHTTP = function(){
		return new XMLHttpRequest();
	};

	var MSXML2 = function(){
		return new ActiveXObject('MSXML2.XMLHTTP');
	};

	var MSXML = function(){
		return new ActiveXObject('Microsoft.XMLHTTP');
	};

	return Function.attempt(function(){
		XMLHTTP();
		return XMLHTTP;
	}, function(){
		MSXML2();
		return MSXML2;
	}, function(){
		MSXML();
		return MSXML;
	});

})();

Browser.Features.xhr = !!(Browser.Request);

// Flash detection

var version = (Function.attempt(function(){
	return navigator.plugins['Shockwave Flash'].description;
}, function(){
	return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
}) || '0 r0').match(/\d+/g);

Browser.Plugins.Flash = {
	version: Number(version[0] || '0.' + version[1]) || 0,
	build: Number(version[2]) || 0
};

// String scripts

Browser.exec = function(text){
	if (!text) return text;
	if (window.execScript){
		window.execScript(text);
	} else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.text = text;
		document.head.appendChild(script);
		document.head.removeChild(script);
	}
	return text;
};

String.implement('stripScripts', function(exec){
	var scripts = '';
	var text = this.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(all, code){
		scripts += code + '\n';
		return '';
	});
	if (exec === true) Browser.exec(scripts);
	else if (typeOf(exec) == 'function') exec(scripts, text);
	return text;
});

// Window, Document

Browser.extend({
	Document: this.Document,
	Window: this.Window,
	Element: this.Element,
	Event: this.Event
});

this.Window = this.$constructor = new Type('Window', function(){});

this.$family = Function.from('window').hide();

Window.mirror(function(name, method){
	window[name] = method;
});

this.Document = document.$constructor = new Type('Document', function(){});

document.$family = Function.from('document').hide();

Document.mirror(function(name, method){
	document[name] = method;
});

document.html = document.documentElement;
document.head = document.getElementsByTagName('head')[0];

if (document.execCommand) try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e){}

if (this.attachEvent && !this.addEventListener){
	var unloadEvent = function(){
		this.detachEvent('onunload', unloadEvent);
		document.head = document.html = document.window = null;
	};
	this.attachEvent('onunload', unloadEvent);
}

// IE fails on collections and <select>.options (refers to <select>)
var arrayFrom = Array.from;
try {
	arrayFrom(document.html.childNodes);
} catch(e){
	Array.from = function(item){
		if (typeof item != 'string' && Type.isEnumerable(item) && typeOf(item) != 'array'){
			var i = item.length, array = new Array(i);
			while (i--) array[i] = item[i];
			return array;
		}
		return arrayFrom(item);
	};

	var prototype = Array.prototype,
		slice = prototype.slice;
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice'].each(function(name){
		var method = prototype[name];
		Array[name] = function(item){
			return method.apply(Array.from(item), slice.call(arguments, 1));
		};
	});
}

//<1.2compat>

if (Browser.Platform.ios) Browser.Platform.ipod = true;

Browser.Engine = {};

var setEngine = function(name, version){
	Browser.Engine.name = name;
	Browser.Engine[name + version] = true;
	Browser.Engine.version = version;
};

if (Browser.ie){
	Browser.Engine.trident = true;

	switch (Browser.version){
		case 6: setEngine('trident', 4); break;
		case 7: setEngine('trident', 5); break;
		case 8: setEngine('trident', 6);
	}
}

if (Browser.firefox){
	Browser.Engine.gecko = true;

	if (Browser.version >= 3) setEngine('gecko', 19);
	else setEngine('gecko', 18);
}

if (Browser.safari || Browser.chrome){
	Browser.Engine.webkit = true;

	switch (Browser.version){
		case 2: setEngine('webkit', 419); break;
		case 3: setEngine('webkit', 420); break;
		case 4: setEngine('webkit', 525);
	}
}

if (Browser.opera){
	Browser.Engine.presto = true;

	if (Browser.version >= 9.6) setEngine('presto', 960);
	else if (Browser.version >= 9.5) setEngine('presto', 950);
	else setEngine('presto', 925);
}

if (Browser.name == 'unknown'){
	switch ((ua.match(/(?:webkit|khtml|gecko)/) || [])[0]){
		case 'webkit':
		case 'khtml':
			Browser.Engine.webkit = true;
		break;
		case 'gecko':
			Browser.Engine.gecko = true;
	}
}

this.$exec = Browser.exec;

//</1.2compat>

})();


/*
---

name: Event

description: Contains the Event Class, to make the event object cross-browser.

license: MIT-style license.

requires: [Window, Document, Array, Function, String, Object]

provides: Event

...
*/

var Event = new Type('Event', function(event, win){
	if (!win) win = window;
	var doc = win.document;
	event = event || win.event;
	if (event.$extended) return event;
	this.$extended = true;
	var type = event.type,
		target = event.target || event.srcElement,
		page = {},
		client = {};
	while (target && target.nodeType == 3) target = target.parentNode;

	if (type.indexOf('key') != -1){
		var code = event.which || event.keyCode;
		var key = Object.keyOf(Event.Keys, code);
		if (type == 'keydown'){
			var fKey = code - 111;
			if (fKey > 0 && fKey < 13) key = 'f' + fKey;
		}
		if (!key) key = String.fromCharCode(code).toLowerCase();
	} else if (type.test(/click|mouse|menu/i)){
		doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
		page = {
			x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
			y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		};
		client = {
			x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
			y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		};
		if (type.test(/DOMMouseScroll|mousewheel/)){
			var wheel = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
		}
		var rightClick = (event.which == 3) || (event.button == 2),
			related = null;
		if (type.test(/over|out/)){
			related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			var testRelated = function(){
				while (related && related.nodeType == 3) related = related.parentNode;
				return true;
			};
			var hasRelated = (Browser.firefox2) ? testRelated.attempt() : testRelated();
			related = (hasRelated) ? related : null;
		}
	} else if (type.test(/gesture|touch/i)){
		this.rotation = event.rotation;
		this.scale = event.scale;
		this.targetTouches = event.targetTouches;
		this.changedTouches = event.changedTouches;
		var touches = this.touches = event.touches;
		if (touches && touches[0]){
			var touch = touches[0];
			page = {x: touch.pageX, y: touch.pageY};
			client = {x: touch.clientX, y: touch.clientY};
		}
	}

	return Object.append(this, {
		event: event,
		type: type,

		page: page,
		client: client,
		rightClick: rightClick,

		wheel: wheel,

		relatedTarget: document.id(related),
		target: document.id(target),

		code: code,
		key: key,

		shift: event.shiftKey,
		control: event.ctrlKey,
		alt: event.altKey,
		meta: event.metaKey
	});
});

Event.Keys = {
	'enter': 13,
	'up': 38,
	'down': 40,
	'left': 37,
	'right': 39,
	'esc': 27,
	'space': 32,
	'backspace': 8,
	'tab': 9,
	'delete': 46
};

//<1.2compat>

Event.Keys = new Hash(Event.Keys);

//</1.2compat>

Event.implement({

	stop: function(){
		return this.stopPropagation().preventDefault();
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	}

});


/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

requires: [Array, String, Function, Number]

provides: Class

...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};

var reset = function(object){
	for (var key in object){
		var value = object[key];
		switch (typeOf(value)){
			case 'object':
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
			break;
			case 'array': object[key] = value.clone(); break;
		}
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (typeOf(value) == 'function'){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();


/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

provides: [Class.Extras, Chain, Events, Options]

...
*/

(function(){

this.Chain = new Class({

	$chain: [],

	chain: function(){
		this.$chain.append(Array.flatten(arguments));
		return this;
	},

	callChain: function(){
		return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
	},

	clearChain: function(){
		this.$chain.empty();
		return this;
	}

});

var removeOn = function(string){
	return string.replace(/^on([A-Z])/, function(full, first){
		return first.toLowerCase();
	});
};

this.Events = new Class({

	$events: {},

	addEvent: function(type, fn, internal){
		type = removeOn(type);

		/*<1.2compat>*/
		if (fn == $empty) return this;
		/*</1.2compat>*/

		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;
		return this;
	},

	addEvents: function(events){
		for (var type in events) this.addEvent(type, events[type]);
		return this;
	},

	fireEvent: function(type, args, delay){
		type = removeOn(type);
		var events = this.$events[type];
		if (!events) return this;
		args = Array.from(args);
		events.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},
	
	removeEvent: function(type, fn){
		type = removeOn(type);
		var events = this.$events[type];
		if (events && !fn.internal){
			var index =  events.indexOf(fn);
			if (index != -1) delete events[index];
		}
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		if (events) events = removeOn(events);
		for (type in this.$events){
			if (events && events != type) continue;
			var fns = this.$events[type];
			for (var i = fns.length; i--;) this.removeEvent(type, fns[i]);
		}
		return this;
	}

});

this.Options = new Class({

	setOptions: function(){
		var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
		if (!this.addEvent) return this;
		for (var option in options){
			if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	}

});

})();


/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

(function(){

var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (expression == null) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {Slick: true, expressions: [], raw: expression, reverse: function(){
		return parse(this.raw, true);
	}};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[expression] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};

		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}

		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|:+(<unicode>+)(?:\\((?:(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,

	separator,
	combinator,
	combinatorChildren,

	tagName,
	id,
	className,

	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,

	pseudoClass,
	pseudoQuote,
	pseudoClassQuotedValue,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}

	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}

	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});

	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue
		});

	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');

		var test, regexp;

		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}

		if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function(){
			return false;
		};

		if (!test) test = function(value){
			return value && regexp.test(value);
		};

		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});

	}

	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---
name: Slick.Finder
description: The new, superfast css selector engine.
provides: Slick.Finder
requires: Slick.Parser
...
*/

(function(){

var local = {};

// Feature / Bug detection

local.isNativeCode = function(fn){
	return (/\{\s*\[native code\]\s*\}/).test('' + fn);
};

local.isXML = function(document){
	return (!!document.xmlVersion) || (!!document.xml) || (Object.prototype.toString.call(document) === '[object XMLDocument]') ||
	(document.nodeType === 9 && document.documentElement.nodeName !== 'HTML');
};

local.setDocument = function(document){

	// convert elements / window arguments to document. if document cannot be extrapolated, the function returns.

	if (document.nodeType === 9); // document
	else if (document.ownerDocument) document = document.ownerDocument; // node
	else if (document.navigator) document = document.document; // window
	else return;

	// check if it's the old document

	if (this.document === document) return;
	this.document = document;
	var root = this.root = document.documentElement;

	this.isXMLDocument = this.isXML(document);

	this.brokenStarGEBTN
	= this.starSelectsClosedQSA
	= this.idGetsName
	= this.brokenMixedCaseQSA
	= this.brokenGEBCN
	= this.brokenCheckedQSA
	= this.brokenEmptyAttributeQSA
	= this.isHTMLDocument
	= false;

	var starSelectsClosed, starSelectsComments,
		brokenSecondClassNameGEBCN, cachedGetElementsByClassName;

	var selected, id;
	var testNode = document.createElement('div');
	root.appendChild(testNode);

	// on non-HTML documents innerHTML and getElementsById doesnt work properly
	try {
		id = 'slick_getbyid_test';
		testNode.innerHTML = '<a id="'+id+'"></a>';
		this.isHTMLDocument = !!document.getElementById(id);
	} catch(e){};

	if (this.isHTMLDocument){
		
		testNode.style.display = 'none';
		
		// IE returns comment nodes for getElementsByTagName('*') for some documents
		testNode.appendChild(document.createComment(''));
		starSelectsComments = (testNode.getElementsByTagName('*').length > 0);

		// IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
		try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.getElementsByTagName('*');
			starSelectsClosed = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		this.brokenStarGEBTN = starSelectsComments || starSelectsClosed;

		// IE 8 returns closed nodes (EG:"</foo>") for querySelectorAll('*') for some documents
		if (testNode.querySelectorAll) try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.querySelectorAll('*');
			this.starSelectsClosedQSA = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		// IE returns elements with the name instead of just id for getElementsById for some documents
		try {
			id = 'slick_id_gets_name';
			testNode.innerHTML = '<a name="'+id+'"></a><b id="'+id+'"></b>';
			this.idGetsName = document.getElementById(id) === testNode.firstChild;
		} catch(e){};

		// Safari 3.2 querySelectorAll doesnt work with mixedcase on quirksmode
		try {
			testNode.innerHTML = '<a class="MiXedCaSe"></a>';
			this.brokenMixedCaseQSA = !testNode.querySelectorAll('.MiXedCaSe').length;
		} catch(e){};

		try {
			testNode.innerHTML = '<a class="f"></a><a class="b"></a>';
			testNode.getElementsByClassName('b').length;
			testNode.firstChild.className = 'b';
			cachedGetElementsByClassName = (testNode.getElementsByClassName('b').length != 2);
		} catch(e){};

		// Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
		try {
			testNode.innerHTML = '<a class="a"></a><a class="f b a"></a>';
			brokenSecondClassNameGEBCN = (testNode.getElementsByClassName('a').length != 2);
		} catch(e){};

		this.brokenGEBCN = cachedGetElementsByClassName || brokenSecondClassNameGEBCN;
		
		// Webkit dont return selected options on querySelectorAll
		try {
			testNode.innerHTML = '<select><option selected="selected">a</option></select>';
			this.brokenCheckedQSA = (testNode.querySelectorAll(':checked').length == 0);
		} catch(e){};
		
		// IE returns incorrect results for attr[*^$]="" selectors on querySelectorAll
		try {
			testNode.innerHTML = '<a class=""></a>';
			this.brokenEmptyAttributeQSA = (testNode.querySelectorAll('[class*=""]').length != 0);
		} catch(e){};
		
	}

	root.removeChild(testNode);
	testNode = null;

	// hasAttribute

	this.hasAttribute = (root && this.isNativeCode(root.hasAttribute)) ? function(node, attribute) {
		return node.hasAttribute(attribute);
	} : function(node, attribute) {
		node = node.getAttributeNode(attribute);
		return !!(node && (node.specified || node.nodeValue));
	};

	// contains
	// FIXME: Add specs: local.contains should be different for xml and html documents?
	this.contains = (root && this.isNativeCode(root.contains)) ? function(context, node){
		return context.contains(node);
	} : (root && root.compareDocumentPosition) ? function(context, node){
		return context === node || !!(context.compareDocumentPosition(node) & 16);
	} : function(context, node){
		if (node) do {
			if (node === context) return true;
		} while ((node = node.parentNode));
		return false;
	};

	// document order sorting
	// credits to Sizzle (http://sizzlejs.com/)

	this.documentSorter = (root.compareDocumentPosition) ? function(a, b){
		if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0;
		return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	} : ('sourceIndex' in root) ? function(a, b){
		if (!a.sourceIndex || !b.sourceIndex) return 0;
		return a.sourceIndex - b.sourceIndex;
	} : (document.createRange) ? function(a, b){
		if (!a.ownerDocument || !b.ownerDocument) return 0;
		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	} : null ;

	this.getUID = (this.isHTMLDocument) ? this.getUIDHTML : this.getUIDXML;

};

// Main Method

local.search = function(context, expression, append, first){

	var found = this.found = (first) ? null : (append || []);

	// context checks

	if (!context) return found; // No context
	if (context.navigator) context = context.document; // Convert the node from a window to a document
	else if (!context.nodeType) return found; // Reject misc junk input

	// setup

	var parsed, i;

	var uniques = this.uniques = {};

	if (this.document !== (context.ownerDocument || context)) this.setDocument(context);

	// should sort if there are nodes in append and if you pass multiple expressions.
	// should remove duplicates if append already has items
	var shouldUniques = !!(append && append.length);

	// avoid duplicating items already in the append array
	if (shouldUniques) for (i = found.length; i--;) this.uniques[this.getUID(found[i])] = true;

	// expression checks

	if (typeof expression == 'string'){ // expression is a string

		// Overrides

		for (i = this.overrides.length; i--;){
			var override = this.overrides[i];
			if (override.regexp.test(expression)){
				var result = override.method.call(context, expression, found, first);
				if (result === false) continue;
				if (result === true) return found;
				return result;
			}
		}

		parsed = this.Slick.parse(expression);
		if (!parsed.length) return found;
	} else if (expression == null){ // there is no expression
		return found;
	} else if (expression.Slick){ // expression is a parsed Slick object
		parsed = expression;
	} else if (this.contains(context.documentElement || context, expression)){ // expression is a node
		(found) ? found.push(expression) : found = expression;
		return found;
	} else { // other junk
		return found;
	}

	// cache elements for the nth selectors

	/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

	this.posNTH = {};
	this.posNTHLast = {};
	this.posNTHType = {};
	this.posNTHTypeLast = {};

	/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

	// if append is null and there is only a single selector with one expression use pushArray, else use pushUID
	this.push = (!shouldUniques && (first || (parsed.length == 1 && parsed.expressions[0].length == 1))) ? this.pushArray : this.pushUID;

	if (found == null) found = [];

	// default engine

	var j, m, n;
	var combinator, tag, id, classList, classes, attributes, pseudos;
	var currentItems, currentExpression, currentBit, lastBit, expressions = parsed.expressions;

	search: for (i = 0; (currentExpression = expressions[i]); i++) for (j = 0; (currentBit = currentExpression[j]); j++){

		combinator = 'combinator:' + currentBit.combinator;
		if (!this[combinator]) continue search;

		tag        = (this.isXMLDocument) ? currentBit.tag : currentBit.tag.toUpperCase();
		id         = currentBit.id;
		classList  = currentBit.classList;
		classes    = currentBit.classes;
		attributes = currentBit.attributes;
		pseudos    = currentBit.pseudos;
		lastBit    = (j === (currentExpression.length - 1));

		this.bitUniques = {};

		if (lastBit){
			this.uniques = uniques;
			this.found = found;
		} else {
			this.uniques = {};
			this.found = [];
		}

		if (j === 0){
			this[combinator](context, tag, id, classes, attributes, pseudos, classList);
			if (first && lastBit && found.length) break search;
		} else {
			if (first && lastBit) for (m = 0, n = currentItems.length; m < n; m++){
				this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
				if (found.length) break search;
			} else for (m = 0, n = currentItems.length; m < n; m++) this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
		}

		currentItems = this.found;
	}

	if (shouldUniques || (parsed.expressions.length > 1)) this.sort(found);

	return (first) ? (found[0] || null) : found;
};

// Utils

local.uidx = 1;
local.uidk = 'slick:uniqueid';

local.getUIDXML = function(node){
	var uid = node.getAttribute(this.uidk);
	if (!uid){
		uid = this.uidx++;
		node.setAttribute(this.uidk, uid);
	}
	return uid;
};

local.getUIDHTML = function(node){
	return node.uniqueNumber || (node.uniqueNumber = this.uidx++);
};

// sort based on the setDocument documentSorter method.

local.sort = function(results){
	if (!this.documentSorter) return results;
	results.sort(this.documentSorter);
	return results;
};

/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

local.cacheNTH = {};

local.matchNTH = /^([+-]?\d*)?([a-z]+)?([+-]\d+)?$/;

local.parseNTHArgument = function(argument){
	var parsed = argument.match(this.matchNTH);
	if (!parsed) return false;
	var special = parsed[2] || false;
	var a = parsed[1] || 1;
	if (a == '-') a = -1;
	var b = +parsed[3] || 0;
	parsed =
		(special == 'n')	? {a: a, b: b} :
		(special == 'odd')	? {a: 2, b: 1} :
		(special == 'even')	? {a: 2, b: 0} : {a: 0, b: a};

	return (this.cacheNTH[argument] = parsed);
};

local.createNTHPseudo = function(child, sibling, positions, ofType){
	return function(node, argument){
		var uid = this.getUID(node);
		if (!this[positions][uid]){
			var parent = node.parentNode;
			if (!parent) return false;
			var el = parent[child], count = 1;
			if (ofType){
				var nodeName = node.nodeName;
				do {
					if (el.nodeName !== nodeName) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			} else {
				do {
					if (el.nodeType !== 1) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			}
		}
		argument = argument || 'n';
		var parsed = this.cacheNTH[argument] || this.parseNTHArgument(argument);
		if (!parsed) return false;
		var a = parsed.a, b = parsed.b, pos = this[positions][uid];
		if (a == 0) return b == pos;
		if (a > 0){
			if (pos < b) return false;
		} else {
			if (b < pos) return false;
		}
		return ((pos - b) % a) == 0;
	};
};

/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

local.pushArray = function(node, tag, id, classes, attributes, pseudos){
	if (this.matchSelector(node, tag, id, classes, attributes, pseudos)) this.found.push(node);
};

local.pushUID = function(node, tag, id, classes, attributes, pseudos){
	var uid = this.getUID(node);
	if (!this.uniques[uid] && this.matchSelector(node, tag, id, classes, attributes, pseudos)){
		this.uniques[uid] = true;
		this.found.push(node);
	}
};

local.matchNode = function(node, selector){
	var parsed = this.Slick.parse(selector);
	if (!parsed) return true;

	// simple (single) selectors
	if(parsed.length == 1 && parsed.expressions[0].length == 1){
		var exp = parsed.expressions[0][0];
		return this.matchSelector(node, (this.isXMLDocument) ? exp.tag : exp.tag.toUpperCase(), exp.id, exp.classes, exp.attributes, exp.pseudos);
	}

	var nodes = this.search(this.document, parsed);
	for (var i = 0, item; item = nodes[i++];){
		if (item === node) return true;
	}
	return false;
};

local.matchPseudo = function(node, name, argument){
	var pseudoName = 'pseudo:' + name;
	if (this[pseudoName]) return this[pseudoName](node, argument);
	var attribute = this.getAttribute(node, name);
	return (argument) ? argument == attribute : !!attribute;
};

local.matchSelector = function(node, tag, id, classes, attributes, pseudos){
	if (tag){
		if (tag == '*'){
			if (node.nodeName < '@') return false; // Fix for comment nodes and closed nodes
		} else {
			if (node.nodeName != tag) return false;
		}
	}

	if (id && node.getAttribute('id') != id) return false;

	var i, part, cls;
	if (classes) for (i = classes.length; i--;){
		cls = ('className' in node) ? node.className : node.getAttribute('class');
		if (!(cls && classes[i].regexp.test(cls))) return false;
	}
	if (attributes) for (i = attributes.length; i--;){
		part = attributes[i];
		if (part.operator ? !part.test(this.getAttribute(node, part.key)) : !this.hasAttribute(node, part.key)) return false;
	}
	if (pseudos) for (i = pseudos.length; i--;){
		part = pseudos[i];
		if (!this.matchPseudo(node, part.key, part.value)) return false;
	}
	return true;
};

var combinators = {

	' ': function(node, tag, id, classes, attributes, pseudos, classList){ // all child nodes, any level

		var i, item, children;

		if (this.isHTMLDocument){
			getById: if (id){
				item = this.document.getElementById(id);
				if ((!item && node.all) || (this.idGetsName && item && item.getAttributeNode('id').nodeValue != id)){
					// all[id] returns all the elements with that name or id inside node
					// if theres just one it will return the element, else it will be a collection
					children = node.all[id];
					if (!children) return;
					if (!children[0]) children = [children];
					for (i = 0; item = children[i++];) if (item.getAttributeNode('id').nodeValue == id){
						this.push(item, tag, null, classes, attributes, pseudos);
						break;
					} 
					return;
				}
				if (!item){
					// if the context is in the dom we return, else we will try GEBTN, breaking the getById label
					if (this.contains(this.document.documentElement, node)) return;
					else break getById;
				} else if (this.document !== node && !this.contains(node, item)) return;
				this.push(item, tag, null, classes, attributes, pseudos);
				return;
			}
			getByClass: if (classes && node.getElementsByClassName && !this.brokenGEBCN){
				children = node.getElementsByClassName(classList.join(' '));
				if (!(children && children.length)) break getByClass;
				for (i = 0; item = children[i++];) this.push(item, tag, id, null, attributes, pseudos);
				return;
			}
		}
		getByTag: {
			children = node.getElementsByTagName(tag);
			if (!(children && children.length)) break getByTag;
			if (!this.brokenStarGEBTN) tag = null;
			for (i = 0; item = children[i++];) this.push(item, tag, id, classes, attributes, pseudos);
		}
	},

	'>': function(node, tag, id, classes, attributes, pseudos){ // direct children
		if ((node = node.firstChild)) do {
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
		} while ((node = node.nextSibling));
	},

	'+': function(node, tag, id, classes, attributes, pseudos){ // next sibling
		while ((node = node.nextSibling)) if (node.nodeType === 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'^': function(node, tag, id, classes, attributes, pseudos){ // first child
		node = node.firstChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'~': function(node, tag, id, classes, attributes, pseudos){ // next siblings
		while ((node = node.nextSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	},

	'++': function(node, tag, id, classes, attributes, pseudos){ // next sibling and previous sibling
		this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
	},

	'~~': function(node, tag, id, classes, attributes, pseudos){ // next siblings and previous siblings
		this['combinator:~'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!~'](node, tag, id, classes, attributes, pseudos);
	},

	'!': function(node, tag, id, classes, attributes, pseudos){  // all parent nodes up to document
		while ((node = node.parentNode)) if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!>': function(node, tag, id, classes, attributes, pseudos){ // direct parent (one level)
		node = node.parentNode;
		if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!+': function(node, tag, id, classes, attributes, pseudos){ // previous sibling
		while ((node = node.previousSibling)) if (node.nodeType === 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'!^': function(node, tag, id, classes, attributes, pseudos){ // last child
		node = node.lastChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'!~': function(node, tag, id, classes, attributes, pseudos){ // previous siblings
		while ((node = node.previousSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	}

};

for (var c in combinators) local['combinator:' + c] = combinators[c];

var pseudos = {

	/*<pseudo-selectors>*/

	'empty': function(node){
		var child = node.firstChild;
		return !(child && child.nodeType == 1) && !(node.innerText || node.textContent || '').length;
	},

	'not': function(node, expression){
		return !this.matchNode(node, expression);
	},

	'contains': function(node, text){
		return (node.innerText || node.textContent || '').indexOf(text) > -1;
	},

	'first-child': function(node){
		while ((node = node.previousSibling)) if (node.nodeType === 1) return false;
		return true;
	},

	'last-child': function(node){
		while ((node = node.nextSibling)) if (node.nodeType === 1) return false;
		return true;
	},

	'only-child': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)) if (prev.nodeType === 1) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeType === 1) return false;
		return true;
	},

	/*<nth-pseudo-selectors>*/

	'nth-child': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTH'),

	'nth-last-child': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHLast'),

	'nth-of-type': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTHType', true),

	'nth-last-of-type': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHTypeLast', true),

	'index': function(node, index){
		return this['pseudo:nth-child'](node, '' + index + 1);
	},

	'even': function(node, argument){
		return this['pseudo:nth-child'](node, '2n');
	},

	'odd': function(node, argument){
		return this['pseudo:nth-child'](node, '2n+1');
	},

	/*</nth-pseudo-selectors>*/

	/*<of-type-pseudo-selectors>*/

	'first-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.previousSibling)) if (node.nodeName === nodeName) return false;
		return true;
	},

	'last-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.nextSibling)) if (node.nodeName === nodeName) return false;
		return true;
	},

	'only-of-type': function(node){
		var prev = node, nodeName = node.nodeName;
		while ((prev = prev.previousSibling)) if (prev.nodeName === nodeName) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeName === nodeName) return false;
		return true;
	},

	/*</of-type-pseudo-selectors>*/

	// custom pseudos

	'enabled': function(node){
		return (node.disabled === false);
	},

	'disabled': function(node){
		return (node.disabled === true);
	},

	'checked': function(node){
		return node.checked || node.selected;
	},

	'focus': function(node){
		return this.isHTMLDocument && this.document.activeElement === node && (node.href || node.type || this.hasAttribute(node, 'tabindex'));
	},

	'root': function(node){
		return (node === this.root);
	},
	
	'selected': function(node){
		return node.selected;
	}

	/*</pseudo-selectors>*/
};

for (var p in pseudos) local['pseudo:' + p] = pseudos[p];

// attributes methods

local.attributeGetters = {

	'class': function(){
		return ('className' in this) ? this.className : this.getAttribute('class');
	},

	'for': function(){
		return ('htmlFor' in this) ? this.htmlFor : this.getAttribute('for');
	},

	'href': function(){
		return ('href' in this) ? this.getAttribute('href', 2) : this.getAttribute('href');
	},

	'style': function(){
		return (this.style) ? this.style.cssText : this.getAttribute('style');
	}

};

local.getAttribute = function(node, name){
	// FIXME: check if getAttribute() will get input elements on a form on this browser
	// getAttribute is faster than getAttributeNode().nodeValue
	var method = this.attributeGetters[name];
	if (method) return method.call(node);
	var attributeNode = node.getAttributeNode(name);
	return attributeNode ? attributeNode.nodeValue : null;
};

// overrides

local.overrides = [];

local.override = function(regexp, method){
	this.overrides.push({regexp: regexp, method: method});
};

/*<overrides>*/

/*<query-selector-override>*/

var reEmptyAttribute = /\[.*[*$^]=(?:["']{2})?\]/;

local.override(/./, function(expression, found, first){ //querySelectorAll override

	if (!this.querySelectorAll || this.nodeType != 9 || !local.isHTMLDocument || local.brokenMixedCaseQSA ||
	(local.brokenCheckedQSA && expression.indexOf(':checked') > -1) ||
	(local.brokenEmptyAttributeQSA && reEmptyAttribute.test(expression)) || Slick.disableQSA) return false;

	var nodes, node;
	try {
		if (first) return this.querySelector(expression) || null;
		else nodes = this.querySelectorAll(expression);
	} catch(error){
		return false;
	}

	var i, hasOthers = !!(found.length);

	if (local.starSelectsClosedQSA) for (i = 0; node = nodes[i++];){
		if (node.nodeName > '@' && (!hasOthers || !local.uniques[local.getUIDHTML(node)])) found.push(node);
	} else for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
	}

	if (hasOthers) local.sort(found);

	return true;

});

/*</query-selector-override>*/

/*<tag-override>*/

local.override(/^[\w-]+$|^\*$/, function(expression, found, first){ // tag override
	var tag = expression;
	if (tag == '*' && local.brokenStarGEBTN) return false;

	var nodes = this.getElementsByTagName(tag);

	if (first) return nodes[0] || null;
	var i, node, hasOthers = !!(found.length);

	for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUID(node)]) found.push(node);
	}

	if (hasOthers) local.sort(found);

	return true;
});

/*</tag-override>*/

/*<class-override>*/

local.override(/^\.[\w-]+$/, function(expression, found, first){ // class override
	if (!local.isHTMLDocument || (!this.getElementsByClassName && this.querySelectorAll)) return false;

	var nodes, node, i, hasOthers = !!(found && found.length), className = expression.substring(1);
	if (this.getElementsByClassName && !local.brokenGEBCN){
		nodes = this.getElementsByClassName(className);
		if (first) return nodes[0] || null;
		for (i = 0; node = nodes[i++];){
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	} else {
		var matchClass = new RegExp('(^|\\s)'+ Slick.escapeRegExp(className) +'(\\s|$)');
		nodes = this.getElementsByTagName('*');
		for (i = 0; node = nodes[i++];){
			className = node.className;
			if (!className || !matchClass.test(className)) continue;
			if (first) return node;
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	}
	if (hasOthers) local.sort(found);
	return (first) ? null : true;
});

/*</class-override>*/

/*<id-override>*/

local.override(/^#[\w-]+$/, function(expression, found, first){ // ID override
	if (!local.isHTMLDocument || this.nodeType != 9) return false;

	var id = expression.substring(1), el = this.getElementById(id);
	if (!el) return found;
	if (local.idGetsName && el.getAttributeNode('id').nodeValue != id) return false;
	if (first) return el || null;
	var hasOthers = !!(found.length);
	if (!hasOthers || !local.uniques[local.getUIDHTML(el)]) found.push(el);
	if (hasOthers) local.sort(found);
	return true;
});

/*</id-override>*/

/*</overrides>*/

if (typeof document != 'undefined') local.setDocument(document);

// Slick

var Slick = local.Slick = (this.Slick || {});

Slick.version = '0.9dev';

// Slick finder

Slick.search = function(context, expression, append){
	return local.search(context, expression, append);
};

Slick.find = function(context, expression){
	return local.search(context, expression, null, true);
};

// Slick containment checker

Slick.contains = function(container, node){
	local.setDocument(container);
	return local.contains(container, node);
};

// Slick attribute getter

Slick.getAttribute = function(node, name){
	return local.getAttribute(node, name);
};

// Slick matcher

Slick.match = function(node, selector){
	if (!(node && selector)) return false;
	if (!selector || selector === node) return true;
	if (typeof selector != 'string') return false;
	local.setDocument(node);
	return local.matchNode(node, selector);
};

// Slick attribute accessor

Slick.defineAttributeGetter = function(name, fn){
	local.attributeGetters[name] = fn;
	return this;
};

Slick.lookupAttributeGetter = function(name){
	return local.attributeGetters[name];
};

// Slick pseudo accessor

Slick.definePseudo = function(name, fn){
	local['pseudo:' + name] = function(node, argument){
		return fn.call(node, argument);
	};
	return this;
};

Slick.lookupPseudo = function(name){
	var pseudo = local['pseudo:' + name];
	if (pseudo) return function(argument){
		return pseudo.call(this, argument);
	};
	return null;
};

// Slick overrides accessor

Slick.override = function(regexp, fn){
	local.override(regexp, fn);
	return this;
};

Slick.isXML = local.isXML;

Slick.uidOf = function(node){
	return local.getUIDHTML(node);
};

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);


/*
---

name: Element

description: One of the most important items in MooTools. Contains the dollar function, the dollars function, and an handful of cross-browser, time-saver methods to let you easily work with HTML Elements.

license: MIT-style license.

requires: [Window, Document, Array, String, Function, Number, Slick.Parser, Slick.Finder]

provides: [Element, Elements, $, $$, Iframe, Selectors]

...
*/

var Element = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);

	if (!props) props = {};

	if (!tag.test(/^[\w-]+$/)){
		var parsed = Slick.parse(tag).expressions[0][0];
		tag = (parsed.tag == '*') ? 'div' : parsed.tag;
		if (parsed.id && props.id == null) props.id = parsed.id;

		var attributes = parsed.attributes;
		if (attributes) for (var i = 0, l = attributes.length; i < l; i++){
			var attr = attributes[i];
			if (attr.value != null && attr.operator == '=' && props[attr.key] == null)
				props[attr.key] = attr.value;
		}

		if (parsed.classList && props['class'] == null) props['class'] = parsed.classList.join(' ');
	}

	return document.newElement(tag, props);
};

if (Browser.Element) Element.prototype = Browser.Element.prototype;

new Type('Element', Element).mirror(function(name){
	if (Array.prototype[name]) return;

	var obj = {};
	obj[name] = function(){
		var results = [], args = arguments, elements = true;
		for (var i = 0, l = this.length; i < l; i++){
			var element = this[i], result = results[i] = element[name].apply(element, args);
			elements = (elements && typeOf(result) == 'element');
		}
		return (elements) ? new Elements(results) : results;
	};

	Elements.implement(obj);
});

if (!Browser.Element){
	Element.parent = Object;

	Element.Prototype = {'$family': Function.from('element').hide()};

	Element.mirror(function(name, method){
		Element.Prototype[name] = method;
	});
}

Element.Constructors = {};

//<1.2compat>

Element.Constructors = new Hash;

//</1.2compat>

var IFrame = new Type('IFrame', function(){
	var params = Array.link(arguments, {
		properties: Type.isObject,
		iframe: function(obj){
			return (obj != null);
		}
	});

	var props = params.properties || {}, iframe;
	if (params.iframe) iframe = document.id(params.iframe);
	var onload = props.onload || function(){};
	delete props.onload;
	props.id = props.name = [props.id, props.name, iframe ? (iframe.id || iframe.name) : 'IFrame_' + String.uniqueID()].pick();
	iframe = new Element(iframe || 'iframe', props);

	var onLoad = function(){
		onload.call(iframe.contentWindow);
	};
	
	if (window.frames[props.id]) onLoad();
	else iframe.addListener('load', onLoad);
	return iframe;
});

var Elements = this.Elements = function(nodes){
	if (nodes && nodes.length){
		var uniques = {}, node;
		for (var i = 0; node = nodes[i++];){
			var uid = Slick.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				this.push(node);
			}
		}
	}
};

Elements.prototype = {length: 0};
Elements.parent = Array;

new Type('Elements', Elements).implement({

	filter: function(filter, bind){
		if (!filter) return this;
		return new Elements(Array.filter(this, (typeOf(filter) == 'string') ? function(item){
			return item.match(filter);
		} : filter, bind));
	}.protect(),

	push: function(){
		var length = this.length;
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) this[length++] = item;
		}
		return (this.length = length);
	}.protect(),

	concat: function(){
		var newElements = new Elements(this);
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = arguments[i];
			if (Type.isEnumerable(item)) newElements.append(item);
			else newElements.push(item);
		}
		return newElements;
	}.protect(),

	append: function(collection){
		for (var i = 0, l = collection.length; i < l; i++) this.push(collection[i]);
		return this;
	}.protect(),

	empty: function(){
		while (this.length) delete this[--this.length];
		return this;
	}.protect()

});

(function(){

// FF, IE
var splice = Array.prototype.splice, object = {'0': 0, '1': 1, length: 2};

splice.call(object, 1, 1);
if (object[1] == 1) Elements.implement('splice', function(){
	var length = this.length;
	splice.apply(this, arguments);
	while (length >= this.length) delete this[length--];
	return this;
}.protect());

Elements.implement(Array.prototype);

Array.mirror(Elements);

/*<ltIE8>*/
var createElementAcceptsHTML;
try {
	var x = document.createElement('<input name=x>');
	createElementAcceptsHTML = (x.name == 'x');
} catch(e){}

var escapeQuotes = function(html){
	return ('' + html).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};
/*</ltIE8>*/

Document.implement({

	newElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		/*<ltIE8>*/// Fix for readonly name and type properties in IE < 8
		if (createElementAcceptsHTML && props){
			tag = '<' + tag;
			if (props.name) tag += ' name="' + escapeQuotes(props.name) + '"';
			if (props.type) tag += ' type="' + escapeQuotes(props.type) + '"';
			tag += '>';
			delete props.name;
			delete props.type;
		}
		/*</ltIE8>*/
		return this.id(this.createElement(tag)).set(props);
	}

});

})();

Document.implement({

	newTextNode: function(text){
		return this.createTextNode(text);
	},

	getDocument: function(){
		return this;
	},

	getWindow: function(){
		return this.window;
	},

	id: (function(){

		var types = {

			string: function(id, nocash, doc){
				id = Slick.find(doc, '#' + id.replace(/(\W)/g, '\\$1'));
				return (id) ? types.element(id, nocash) : null;
			},

			element: function(el, nocash){
				$uid(el);
				if (!nocash && !el.$family && !(/^object|embed$/i).test(el.tagName)){
					Object.append(el, Element.Prototype);
				}
				return el;
			},

			object: function(obj, nocash, doc){
				if (obj.toElement) return types.element(obj.toElement(doc), nocash);
				return null;
			}

		};

		types.textnode = types.whitespace = types.window = types.document = function(zero){
			return zero;
		};

		return function(el, nocash, doc){
			if (el && el.$family && el.uid) return el;
			var type = typeOf(el);
			return (types[type]) ? types[type](el, nocash, doc || document) : null;
		};

	})()

});

if (window.$ == null) Window.implement('$', function(el, nc){
	return document.id(el, nc, this.document);
});

Window.implement({

	getDocument: function(){
		return this.document;
	},

	getWindow: function(){
		return this;
	}

});

[Document, Element].invoke('implement', {

	getElements: function(expression){
		return Slick.search(this, expression, new Elements);
	},

	getElement: function(expression){
		return document.id(Slick.find(this, expression));
	}

});

//<1.2compat>

(function(search, find, match){

	this.Selectors = {};
	var pseudos = this.Selectors.Pseudo = new Hash();

	var addSlickPseudos = function(){
		for (var name in pseudos) if (pseudos.hasOwnProperty(name)){
			Slick.definePseudo(name, pseudos[name]);
			delete pseudos[name];
		}
	};

	Slick.search = function(context, expression, append){
		addSlickPseudos();
		return search.call(this, context, expression, append);
	};

	Slick.find = function(context, expression){
		addSlickPseudos();
		return find.call(this, context, expression);
	};

	Slick.match = function(node, selector){
		addSlickPseudos();
		return match.call(this, node, selector);
	};

})(Slick.search, Slick.find, Slick.match);

if (window.$$ == null) Window.implement('$$', function(selector){
	var elements = new Elements;
	if (arguments.length == 1 && typeof selector == 'string') return Slick.search(this.document, selector, elements);
	var args = Array.flatten(arguments);
	for (var i = 0, l = args.length; i < l; i++){
		var item = args[i];
		switch (typeOf(item)){
			case 'element': elements.push(item); break;
			case 'string': Slick.search(this.document, item, elements);
		}
	}
	return elements;
});

//</1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	if (arguments.length == 1){
		if (typeof selector == 'string') return Slick.search(this.document, selector, new Elements);
		else if (Type.isEnumerable(selector)) return new Elements(selector);
	}
	return new Elements(arguments);
});

(function(){

var collected = {}, storage = {};
var props = {input: 'checked', option: 'selected', textarea: 'value'};

var get = function(uid){
	return (storage[uid] || (storage[uid] = {}));
};

var clean = function(item){
	if (item.removeEvents) item.removeEvents();
	if (item.clearAttributes) item.clearAttributes();
	var uid = item.uid;
	if (uid != null){
		delete collected[uid];
		delete storage[uid];
	}
	return item;
};

var camels = ['defaultValue', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan', 'frameBorder', 'maxLength', 'readOnly',
	'rowSpan', 'tabIndex', 'useMap'
];
var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked', 'disabled', 'readOnly', 'multiple', 'selected',
	'noresize', 'defer'
];
 var attributes = {
	'html': 'innerHTML',
	'class': 'className',
	'for': 'htmlFor',
	'text': (function(){
		var temp = document.createElement('div');
		return (temp.innerText == null) ? 'textContent' : 'innerText';
	})()
};
var readOnly = ['type'];
var expandos = ['value', 'defaultValue'];
var uriAttrs = /^(?:href|src|usemap)$/i;

bools = bools.associate(bools);
camels = camels.associate(camels.map(String.toLowerCase));
readOnly = readOnly.associate(readOnly);

Object.append(attributes, expandos.associate(expandos));

var inserters = {

	before: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element);
	},

	after: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element.nextSibling);
	},

	bottom: function(context, element){
		element.appendChild(context);
	},

	top: function(context, element){
		element.insertBefore(context, element.firstChild);
	}

};

inserters.inside = inserters.bottom;

//<1.2compat>

Object.each(inserters, function(inserter, where){

	where = where.capitalize();

	var methods = {};

	methods['inject' + where] = function(el){
		inserter(this, document.id(el, true));
		return this;
	};

	methods['grab' + where] = function(el){
		inserter(document.id(el, true), this);
		return this;
	};

	Element.implement(methods);

});

//</1.2compat>

var injectCombinator = function(expression, combinator){
	if (!expression) return combinator;

	expression = Slick.parse(expression);

	var expressions = expression.expressions;
	for (var i = expressions.length; i--;)
		expressions[i][0].combinator = combinator;

	return expression;
};

Element.implement({

	set: function(prop, value){
		var property = Element.Properties[prop];
		(property && property.set) ? property.set.call(this, value) : this.setProperty(prop, value);
	}.overloadSetter(),

	get: function(prop){
		var property = Element.Properties[prop];
		return (property && property.get) ? property.get.apply(this) : this.getProperty(prop);
	}.overloadGetter(),

	erase: function(prop){
		var property = Element.Properties[prop];
		(property && property.erase) ? property.erase.apply(this) : this.removeProperty(prop);
		return this;
	},

	setProperty: function(attribute, value){
		attribute = camels[attribute] || attribute;
		if (value == null) return this.removeProperty(attribute);
		var key = attributes[attribute];
		(key) ? this[key] = value :
			(bools[attribute]) ? this[attribute] = !!value : this.setAttribute(attribute, '' + value);
		return this;
	},

	setProperties: function(attributes){
		for (var attribute in attributes) this.setProperty(attribute, attributes[attribute]);
		return this;
	},

	getProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute] || readOnly[attribute];
		return (key) ? this[key] :
			(bools[attribute]) ? !!this[attribute] :
			(uriAttrs.test(attribute) ? this.getAttribute(attribute, 2) :
			(key = this.getAttributeNode(attribute)) ? key.nodeValue : null) || null;
	},

	getProperties: function(){
		var args = Array.from(arguments);
		return args.map(this.getProperty, this).associate(args);
	},

	removeProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute];
		(key) ? this[key] = '' :
			(bools[attribute]) ? this[attribute] = false : this.removeAttribute(attribute);
		return this;
	},

	removeProperties: function(){
		Array.each(arguments, this.removeProperty, this);
		return this;
	},

	hasClass: function(className){
		return this.className.clean().contains(className, ' ');
	},

	addClass: function(className){
		if (!this.hasClass(className)) this.className = (this.className + ' ' + className).clean();
		return this;
	},

	removeClass: function(className){
		this.className = this.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		return this;
	},

	toggleClass: function(className, force){
		if (force == null) force = !this.hasClass(className);
		return (force) ? this.addClass(className) : this.removeClass(className);
	},

	adopt: function(){
		var parent = this, fragment, elements = Array.flatten(arguments), length = elements.length;
		if (length > 1) parent = fragment = document.createDocumentFragment();

		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) parent.appendChild(element);
		}

		if (fragment) this.appendChild(fragment);

		return this;
	},

	appendText: function(text, where){
		return this.grab(this.getDocument().newTextNode(text), where);
	},

	grab: function(el, where){
		inserters[where || 'bottom'](document.id(el, true), this);
		return this;
	},

	inject: function(el, where){
		inserters[where || 'bottom'](this, document.id(el, true));
		return this;
	},

	replaces: function(el){
		el = document.id(el, true);
		el.parentNode.replaceChild(this, el);
		return this;
	},

	wraps: function(el, where){
		el = document.id(el, true);
		return this.replaces(el).grab(el, where);
	},

	getPrevious: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!~')));
	},

	getAllPrevious: function(expression){
		return Slick.search(this, injectCombinator(expression, '!~'), new Elements);
	},

	getNext: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '~')));
	},

	getAllNext: function(expression){
		return Slick.search(this, injectCombinator(expression, '~'), new Elements);
	},

	getFirst: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>'))[0]);
	},

	getLast: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>')).getLast());
	},

	getParent: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!')));
	},

	getParents: function(expression){
		return Slick.search(this, injectCombinator(expression, '!'), new Elements);
	},

	getSiblings: function(expression){
		return Slick.search(this, injectCombinator(expression, '~~'), new Elements);
	},

	getChildren: function(expression){
		return Slick.search(this, injectCombinator(expression, '>'), new Elements);
	},

	getWindow: function(){
		return this.ownerDocument.window;
	},

	getDocument: function(){
		return this.ownerDocument;
	},

	getElementById: function(id){
		return document.id(Slick.find(this, '#' + ('' + id).replace(/(\W)/g, '\\$1')));
	},

	getSelected: function(){
		this.selectedIndex; // Safari 3.2.1
		return new Elements(Array.from(this.options).filter(function(option){
			return option.selected;
		}));
	},

	toQueryString: function(){
		var queryString = [];
		this.getElements('input, select, textarea').each(function(el){
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');

			Array.from(value).each(function(val){
				if (typeof val != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(val));
			});
		});
		return queryString.join('&');
	},

	clone: function(contents, keepid){
		contents = contents !== false;
		var clone = this.cloneNode(contents);
		var clean = function(node, element){
			if (!keepid) node.removeAttribute('id');
			if (Browser.ie){
				node.clearAttributes();
				node.mergeAttributes(element);
				node.removeAttribute('uid');
				if (node.options){
					var no = node.options, eo = element.options;
					for (var j = no.length; j--;) no[j].selected = eo[j].selected;
				}
			}
			var prop = props[element.tagName.toLowerCase()];
			if (prop && element[prop]) node[prop] = element[prop];
		};

		var i;
		if (contents){
			var ce = clone.getElementsByTagName('*'), te = this.getElementsByTagName('*');
			for (i = ce.length; i--;) clean(ce[i], te[i]);
		}

		clean(clone, this);
		if (Browser.ie){
			var ts = this.getElementsByTagName('object'),
				cs = clone.getElementsByTagName('object'),
				tl = ts.length, cl = cs.length;
			for (i = 0; i < tl && i < cl; i++)
				cs[i].outerHTML = ts[i].outerHTML;
		}
		return document.id(clone);
	},

	destroy: function(){
		var children = clean(this).getElementsByTagName('*');
		Array.each(children, clean);
		Element.dispose(this);
		return null;
	},

	empty: function(){
		Array.from(this.childNodes).each(Element.dispose);
		return this;
	},

	dispose: function(){
		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
	},

	match: function(expression){
		return !expression || Slick.match(this, expression);
	}

});

var contains = {contains: function(element){
	return Slick.contains(this, element);
}};

if (!document.contains) Document.implement(contains);
if (!document.createElement('div').contains) Element.implement(contains);

//<1.2compat>

Element.implement('hasChild', function(element){
	return this !== element && this.contains(element);
});

//</1.2compat>

[Element, Window, Document].invoke('implement', {

	addListener: function(type, fn){
		if (type == 'unload'){
			var old = fn, self = this;
			fn = function(){
				self.removeListener('unload', fn);
				old();
			};
		} else {
			collected[this.uid] = this;
		}
		if (this.addEventListener) this.addEventListener(type, fn, false);
		else this.attachEvent('on' + type, fn);
		return this;
	},

	removeListener: function(type, fn){
		if (this.removeEventListener) this.removeEventListener(type, fn, false);
		else this.detachEvent('on' + type, fn);
		return this;
	},

	retrieve: function(property, dflt){
		var storage = get(this.uid), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	},

	store: function(property, value){
		var storage = get(this.uid);
		storage[property] = value;
		return this;
	},

	eliminate: function(property){
		var storage = get(this.uid);
		delete storage[property];
		return this;
	}

});

// IE purge
if (window.attachEvent && !window.addEventListener) window.addListener('unload', function(){
	Object.each(collected, clean);
	if (window.CollectGarbage) CollectGarbage();
});

})();

Element.Properties = {};

//<1.2compat>

Element.Properties = new Hash;

//</1.2compat>

Element.Properties.style = {

	set: function(style){
		this.style.cssText = style;
	},

	get: function(){
		return this.style.cssText;
	},

	erase: function(){
		this.style.cssText = '';
	}

};

Element.Properties.tag = {

	get: function(){
		return this.tagName.toLowerCase();
	}

};

(function(maxLength){
	if (maxLength != null) Element.Properties.maxlength = Element.Properties.maxLength = {
		get: function(){
			var maxlength = this.getAttribute('maxLength');
			return maxlength == maxLength ? null : maxlength;
		}
	};
})(document.createElement('input').getAttribute('maxLength'));

Element.Properties.html = (function(){

	var tableTest = Function.attempt(function(){
		var table = document.createElement('table');
		table.innerHTML = '<tr><td></td></tr>';
	});

	var wrapper = document.createElement('div');

	var translations = {
		table: [1, '<table>', '</table>'],
		select: [1, '<select>', '</select>'],
		tbody: [2, '<table><tbody>', '</tbody></table>'],
		tr: [3, '<table><tbody><tr>', '</tr></tbody></table>']
	};
	translations.thead = translations.tfoot = translations.tbody;

	var html = {
		set: function(){
			var html = Array.flatten(arguments).join('');
			var wrap = (!tableTest && translations[this.get('tag')]);
			if (wrap){
				var first = wrapper;
				first.innerHTML = wrap[1] + html + wrap[2];
				for (var i = wrap[0]; i--;) first = first.firstChild;
				this.empty().adopt(first.childNodes);
			} else {
				this.innerHTML = html;
			}
		}
	};

	html.erase = html.set;

	return html;
})();


/*
---

name: Element.Style

description: Contains methods for interacting with the styles of Elements in a fashionable way.

license: MIT-style license.

requires: Element

provides: Element.Style

...
*/

(function(){

var html = document.html;

Element.Properties.styles = {set: function(styles){
	this.setStyles(styles);
}};

var hasOpacity = (html.style.opacity != null);
var reAlpha = /alpha\(opacity=([\d.]+)\)/i;

var setOpacity = function(element, opacity){
	if (!element.currentStyle || !element.currentStyle.hasLayout) element.style.zoom = 1;
	if (hasOpacity){
		element.style.opacity = opacity;
	} else {
		opacity = (opacity == 1) ? '' : 'alpha(opacity=' + opacity * 100 + ')';
		var filter = element.style.filter || element.getComputedStyle('filter') || '';
		element.style.filter = filter.test(reAlpha) ? filter.replace(reAlpha, opacity) : filter + opacity;
	}
};

Element.Properties.opacity = {

	set: function(opacity){
		var visibility = this.style.visibility;
		if (opacity == 0 && visibility != 'hidden') this.style.visibility = 'hidden';
		else if (opacity != 0 && visibility != 'visible') this.style.visibility = 'visible';

		setOpacity(this, opacity);
	},

	get: (hasOpacity) ? function(){
		var opacity = this.style.opacity || this.getComputedStyle('opacity');
		return (opacity == '') ? 1 : opacity;
	} : function(){
		var opacity, filter = (this.style.filter || this.getComputedStyle('filter'));
		if (filter) opacity = filter.match(reAlpha);
		return (opacity == null || filter == null) ? 1 : (opacity[1] / 100);
	}

};

var floatName = (html.style.cssFloat == null) ? 'styleFloat' : 'cssFloat';

Element.implement({

	getComputedStyle: function(property){
		if (this.currentStyle) return this.currentStyle[property.camelCase()];
		var defaultView = Element.getDocument(this).defaultView,
			computed = defaultView ? defaultView.getComputedStyle(this, null) : null;
		return (computed) ? computed.getPropertyValue((property == floatName) ? 'float' : property.hyphenate()) : null;
	},

	setOpacity: function(value){
		setOpacity(this, value);
		return this;
	},

	getOpacity: function(){
		return this.get('opacity');
	},

	setStyle: function(property, value){
		switch (property){
			case 'opacity': return this.set('opacity', parseFloat(value));
			case 'float': property = floatName;
		}
		property = property.camelCase();
		if (typeOf(value) != 'string'){
			var map = (Element.Styles[property] || '@').split(' ');
			value = Array.from(value).map(function(val, i){
				if (!map[i]) return '';
				return (typeOf(val) == 'number') ? map[i].replace('@', Math.round(val)) : val;
			}).join(' ');
		} else if (value == String(Number(value))){
			value = Math.round(value);
		}
		this.style[property] = value;
		return this;
	},

	getStyle: function(property){
		switch (property){
			case 'opacity': return this.get('opacity');
			case 'float': property = floatName;
		}
		property = property.camelCase();
		var result = this.style[property];
		if (!result || property == 'zIndex'){
			result = [];
			for (var style in Element.ShortStyles){
				if (property != style) continue;
				for (var s in Element.ShortStyles[style]) result.push(this.getStyle(s));
				return result.join(' ');
			}
			result = this.getComputedStyle(property);
		}
		if (result){
			result = String(result);
			var color = result.match(/rgba?\([\d\s,]+\)/);
			if (color) result = result.replace(color[0], color[0].rgbToHex());
		}
		if (Browser.opera || (Browser.ie && isNaN(parseFloat(result)))){
			if (property.test(/^(height|width)$/)){
				var values = (property == 'width') ? ['left', 'right'] : ['top', 'bottom'], size = 0;
				values.each(function(value){
					size += this.getStyle('border-' + value + '-width').toInt() + this.getStyle('padding-' + value).toInt();
				}, this);
				return this['offset' + property.capitalize()] - size + 'px';
			}
			if (Browser.opera && String(result).indexOf('px') != -1) return result;
			if (property.test(/(border(.+)Width|margin|padding)/)) return '0px';
		}
		return result;
	},

	setStyles: function(styles){
		for (var style in styles) this.setStyle(style, styles[style]);
		return this;
	},

	getStyles: function(){
		var result = {};
		Array.flatten(arguments).each(function(key){
			result[key] = this.getStyle(key);
		}, this);
		return result;
	}

});

Element.Styles = {
	left: '@px', top: '@px', bottom: '@px', right: '@px',
	width: '@px', height: '@px', maxWidth: '@px', maxHeight: '@px', minWidth: '@px', minHeight: '@px',
	backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px', color: 'rgb(@, @, @)',
	fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', clip: 'rect(@px @px @px @px)',
	margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
	borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
	zIndex: '@', 'zoom': '@', fontWeight: '@', textIndent: '@px', opacity: '@'
};

//<1.2compat>

Element.Styles = new Hash(Element.Styles);

//</1.2compat>

Element.ShortStyles = {margin: {}, padding: {}, border: {}, borderWidth: {}, borderStyle: {}, borderColor: {}};

['Top', 'Right', 'Bottom', 'Left'].each(function(direction){
	var Short = Element.ShortStyles;
	var All = Element.Styles;
	['margin', 'padding'].each(function(style){
		var sd = style + direction;
		Short[style][sd] = All[sd] = '@px';
	});
	var bd = 'border' + direction;
	Short.border[bd] = All[bd] = '@px @ rgb(@, @, @)';
	var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
	Short[bd] = {};
	Short.borderWidth[bdw] = Short[bd][bdw] = All[bdw] = '@px';
	Short.borderStyle[bds] = Short[bd][bds] = All[bds] = '@';
	Short.borderColor[bdc] = Short[bd][bdc] = All[bdc] = 'rgb(@, @, @)';
});

})();


/*
---

name: Element.Event

description: Contains Element methods for dealing with events. This file also includes mouseenter and mouseleave custom Element Events.

license: MIT-style license.

requires: [Element, Event]

provides: Element.Event

...
*/

(function(){

Element.Properties.events = {set: function(events){
	this.addEvents(events);
}};

[Element, Window, Document].invoke('implement', {

	addEvent: function(type, fn){
		var events = this.retrieve('events', {});
		if (!events[type]) events[type] = {keys: [], values: []};
		if (events[type].keys.contains(fn)) return this;
		events[type].keys.push(fn);
		var realType = type,
			custom = Element.Events[type],
			condition = fn,
			self = this;
		if (custom){
			if (custom.onAdd) custom.onAdd.call(this, fn);
			if (custom.condition){
				condition = function(event){
					if (custom.condition.call(this, event)) return fn.call(this, event);
					return true;
				};
			}
			realType = custom.base || realType;
		}
		var defn = function(){
			return fn.call(self);
		};
		var nativeEvent = Element.NativeEvents[realType];
		if (nativeEvent){
			if (nativeEvent == 2){
				defn = function(event){
					event = new Event(event, self.getWindow());
					if (condition.call(self, event) === false) event.stop();
				};
			}
			this.addListener(realType, defn);
		}
		events[type].values.push(defn);
		return this;
	},

	removeEvent: function(type, fn){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		var list = events[type];
		var index = list.keys.indexOf(fn);
		if (index == -1) return this;
		var value = list.values[index];
		delete list.keys[index];
		delete list.values[index];
		var custom = Element.Events[type];
		if (custom){
			if (custom.onRemove) custom.onRemove.call(this, fn);
			type = custom.base || type;
		}
		return (Element.NativeEvents[type]) ? this.removeListener(type, value) : this;
	},

	addEvents: function(events){
		for (var event in events) this.addEvent(event, events[event]);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		var attached = this.retrieve('events');
		if (!attached) return this;
		if (!events){
			for (type in attached) this.removeEvents(type);
			this.eliminate('events');
		} else if (attached[events]){
			attached[events].keys.each(function(fn){
				this.removeEvent(events, fn);
			}, this);
			delete attached[events];
		}
		return this;
	},

	fireEvent: function(type, args, delay){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		args = Array.from(args);

		events[type].keys.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	cloneEvents: function(from, type){
		from = document.id(from);
		var events = from.retrieve('events');
		if (!events) return this;
		if (!type){
			for (var eventType in events) this.cloneEvents(from, eventType);
		} else if (events[type]){
			events[type].keys.each(function(fn){
				this.addEvent(type, fn);
			}, this);
		}
		return this;
	}

});

// IE9
try {
	if (typeof HTMLElement != 'undefined')
		HTMLElement.prototype.fireEvent = Element.prototype.fireEvent;
} catch(e){}

Element.NativeEvents = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

var check = function(event){
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
};

Element.Events = {

	mouseenter: {
		base: 'mouseover',
		condition: check
	},

	mouseleave: {
		base: 'mouseout',
		condition: check
	},

	mousewheel: {
		base: (Browser.firefox) ? 'DOMMouseScroll' : 'mousewheel'
	}

};

//<1.2compat>

Element.Events = new Hash(Element.Events);

//</1.2compat>

})();


/*
---

name: Element.Dimensions

description: Contains methods to work with size, scroll, or positioning of Elements and the window object.

license: MIT-style license.

credits:
  - Element positioning based on the [qooxdoo](http://qooxdoo.org/) code and smart browser fixes, [LGPL License](http://www.gnu.org/licenses/lgpl.html).
  - Viewport dimensions based on [YUI](http://developer.yahoo.com/yui/) code, [BSD License](http://developer.yahoo.com/yui/license.html).

requires: [Element, Element.Style]

provides: [Element.Dimensions]

...
*/

(function(){

Element.implement({

	scrollTo: function(x, y){
		if (isBody(this)){
			this.getWindow().scrollTo(x, y);
		} else {
			this.scrollLeft = x;
			this.scrollTop = y;
		}
		return this;
	},

	getSize: function(){
		if (isBody(this)) return this.getWindow().getSize();
		return {x: this.offsetWidth, y: this.offsetHeight};
	},

	getScrollSize: function(){
		if (isBody(this)) return this.getWindow().getScrollSize();
		return {x: this.scrollWidth, y: this.scrollHeight};
	},

	getScroll: function(){
		if (isBody(this)) return this.getWindow().getScroll();
		return {x: this.scrollLeft, y: this.scrollTop};
	},

	getScrolls: function(){
		var element = this.parentNode, position = {x: 0, y: 0};
		while (element && !isBody(element)){
			position.x += element.scrollLeft;
			position.y += element.scrollTop;
			element = element.parentNode;
		}
		return position;
	},

	getOffsetParent: function(){
		var element = this;
		if (isBody(element)) return null;
		if (!Browser.ie) return element.offsetParent;
		while ((element = element.parentNode)){
			if (styleString(element, 'position') != 'static' || isBody(element)) return element;
		}
		return null;
	},

	getOffsets: function(){
		if (this.getBoundingClientRect && !Browser.Platform.ios){
			var bound = this.getBoundingClientRect(),
				html = document.id(this.getDocument().documentElement),
				htmlScroll = html.getScroll(),
				elemScrolls = this.getScrolls(),
				isFixed = (styleString(this, 'position') == 'fixed');

			return {
				x: bound.left.toInt() + elemScrolls.x + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y: bound.top.toInt()  + elemScrolls.y + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};
		}

		var element = this, position = {x: 0, y: 0};
		if (isBody(this)) return position;

		while (element && !isBody(element)){
			position.x += element.offsetLeft;
			position.y += element.offsetTop;

			if (Browser.firefox){
				if (!borderBox(element)){
					position.x += leftBorder(element);
					position.y += topBorder(element);
				}
				var parent = element.parentNode;
				if (parent && styleString(parent, 'overflow') != 'visible'){
					position.x += leftBorder(parent);
					position.y += topBorder(parent);
				}
			} else if (element != this && Browser.safari){
				position.x += leftBorder(element);
				position.y += topBorder(element);
			}

			element = element.offsetParent;
		}
		if (Browser.firefox && !borderBox(this)){
			position.x -= leftBorder(this);
			position.y -= topBorder(this);
		}
		return position;
	},

	getPosition: function(relative){
		if (isBody(this)) return {x: 0, y: 0};
		var offset = this.getOffsets(),
			scroll = this.getScrolls();
		var position = {
			x: offset.x - scroll.x,
			y: offset.y - scroll.y
		};
		
		if (relative && (relative = document.id(relative))){
			var relativePosition = relative.getPosition();
			return {x: position.x - relativePosition.x - leftBorder(relative), y: position.y - relativePosition.y - topBorder(relative)};
		}
		return position;
	},

	getCoordinates: function(element){
		if (isBody(this)) return this.getWindow().getCoordinates();
		var position = this.getPosition(element),
			size = this.getSize();
		var obj = {
			left: position.x,
			top: position.y,
			width: size.x,
			height: size.y
		};
		obj.right = obj.left + obj.width;
		obj.bottom = obj.top + obj.height;
		return obj;
	},

	computePosition: function(obj){
		return {
			left: obj.x - styleNumber(this, 'margin-left'),
			top: obj.y - styleNumber(this, 'margin-top')
		};
	},

	setPosition: function(obj){
		return this.setStyles(this.computePosition(obj));
	}

});


[Document, Window].invoke('implement', {

	getSize: function(){
		var doc = getCompatElement(this);
		return {x: doc.clientWidth, y: doc.clientHeight};
	},

	getScroll: function(){
		var win = this.getWindow(), doc = getCompatElement(this);
		return {x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop};
	},

	getScrollSize: function(){
		var doc = getCompatElement(this),
			min = this.getSize(),
			body = this.getDocument().body;

		return {x: Math.max(doc.scrollWidth, body.scrollWidth, min.x), y: Math.max(doc.scrollHeight, body.scrollHeight, min.y)};
	},

	getPosition: function(){
		return {x: 0, y: 0};
	},

	getCoordinates: function(){
		var size = this.getSize();
		return {top: 0, left: 0, bottom: size.y, right: size.x, height: size.y, width: size.x};
	}

});

// private methods

var styleString = Element.getComputedStyle;

function styleNumber(element, style){
	return styleString(element, style).toInt() || 0;
};

function borderBox(element){
	return styleString(element, '-moz-box-sizing') == 'border-box';
};

function topBorder(element){
	return styleNumber(element, 'border-top-width');
};

function leftBorder(element){
	return styleNumber(element, 'border-left-width');
};

function isBody(element){
	return (/^(?:body|html)$/i).test(element.tagName);
};

function getCompatElement(element){
	var doc = element.getDocument();
	return (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
};

})();

//aliases
Element.alias({position: 'setPosition'}); //compatability

[Window, Document, Element].invoke('implement', {

	getHeight: function(){
		return this.getSize().y;
	},

	getWidth: function(){
		return this.getSize().x;
	},

	getScrollTop: function(){
		return this.getScroll().y;
	},

	getScrollLeft: function(){
		return this.getScroll().x;
	},

	getScrollHeight: function(){
		return this.getScrollSize().y;
	},

	getScrollWidth: function(){
		return this.getScrollSize().x;
	},

	getTop: function(){
		return this.getPosition().y;
	},

	getLeft: function(){
		return this.getPosition().x;
	}

});


/*
---

name: Fx

description: Contains the basic animation logic to be extended by all other Fx Classes.

license: MIT-style license.

requires: [Chain, Events, Options]

provides: Fx

...
*/

(function(){

var Fx = this.Fx = new Class({

	Implements: [Chain, Events, Options],

	options: {
		/*
		onStart: nil,
		onCancel: nil,
		onComplete: nil,
		*/
		fps: 50,
		unit: false,
		duration: 500,
		link: 'ignore'
	},

	initialize: function(options){
		this.subject = this.subject || this;
		this.setOptions(options);
	},

	getTransition: function(){
		return function(p){
			return -(Math.cos(Math.PI * p) - 1) / 2;
		};
	},

	step: function(){
		var time = Date.now();
		if (time < this.time + this.options.duration){
			var delta = this.transition((time - this.time) / this.options.duration);
			this.set(this.compute(this.from, this.to, delta));
		} else {
			this.set(this.compute(this.from, this.to, 1));
			this.complete();
		}
	},

	set: function(now){
		return now;
	},

	compute: function(from, to, delta){
		return Fx.compute(from, to, delta);
	},

	check: function(){
		if (!this.timer) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},

	start: function(from, to){
		if (!this.check(from, to)) return this;
		var duration = this.options.duration;
		this.options.duration = Fx.Durations[duration] || duration.toInt();
		this.from = from;
		this.to = to;
		this.time = 0;
		this.transition = this.getTransition();
		this.startTimer();
		this.onStart();
		return this;
	},

	complete: function(){
		if (this.stopTimer()) this.onComplete();
		return this;
	},

	cancel: function(){
		if (this.stopTimer()) this.onCancel();
		return this;
	},

	onStart: function(){
		this.fireEvent('start', this.subject);
	},

	onComplete: function(){
		this.fireEvent('complete', this.subject);
		if (!this.callChain()) this.fireEvent('chainComplete', this.subject);
	},

	onCancel: function(){
		this.fireEvent('cancel', this.subject).clearChain();
	},

	pause: function(){
		this.stopTimer();
		return this;
	},

	resume: function(){
		this.startTimer();
		return this;
	},

	stopTimer: function(){
		if (!this.timer) return false;
		this.time = Date.now() - this.time;
		this.timer = removeInstance(this);
		return true;
	},

	startTimer: function(){
		if (this.timer) return false;
		this.time = Date.now() - this.time;
		this.timer = addInstance(this);
		return true;
	}

});

Fx.compute = function(from, to, delta){
	return (to - from) * delta + from;
};

Fx.Durations = {'short': 250, 'normal': 500, 'long': 1000};

// global timers

var instances = {}, timers = {};

var loop = function(){
	for (var i = this.length; i--;){
		if (this[i]) this[i].step();
	}
};

var addInstance = function(instance){
	var fps = instance.options.fps,
		list = instances[fps] || (instances[fps] = []);
	list.push(instance);
	if (!timers[fps]) timers[fps] = loop.periodical(Math.round(1000 / fps), list);
	return true;
};

var removeInstance = function(instance){
	var fps = instance.options.fps,
		list = instances[fps] || [];
	list.erase(instance);
	if (!list.length && timers[fps]) timers[fps] = clearInterval(timers[fps]);
	return false;
};

})();


/*
---

name: Fx.CSS

description: Contains the CSS animation logic. Used by Fx.Tween, Fx.Morph, Fx.Elements.

license: MIT-style license.

requires: [Fx, Element.Style]

provides: Fx.CSS

...
*/

Fx.CSS = new Class({

	Extends: Fx,

	//prepares the base from/to object

	prepare: function(element, property, values){
		values = Array.from(values);
		if (values[1] == null){
			values[1] = values[0];
			values[0] = element.getStyle(property);
		}
		var parsed = values.map(this.parse);
		return {from: parsed[0], to: parsed[1]};
	},

	//parses a value into an array

	parse: function(value){
		value = Function.from(value)();
		value = (typeof value == 'string') ? value.split(' ') : Array.from(value);
		return value.map(function(val){
			val = String(val);
			var found = false;
			Object.each(Fx.CSS.Parsers, function(parser, key){
				if (found) return;
				var parsed = parser.parse(val);
				if (parsed || parsed === 0) found = {value: parsed, parser: parser};
			});
			found = found || {value: val, parser: Fx.CSS.Parsers.String};
			return found;
		});
	},

	//computes by a from and to prepared objects, using their parsers.

	compute: function(from, to, delta){
		var computed = [];
		(Math.min(from.length, to.length)).times(function(i){
			computed.push({value: from[i].parser.compute(from[i].value, to[i].value, delta), parser: from[i].parser});
		});
		computed.$family = Function.from('fx:css:value');
		return computed;
	},

	//serves the value as settable

	serve: function(value, unit){
		if (typeOf(value) != 'fx:css:value') value = this.parse(value);
		var returned = [];
		value.each(function(bit){
			returned = returned.concat(bit.parser.serve(bit.value, unit));
		});
		return returned;
	},

	//renders the change to an element

	render: function(element, property, value, unit){
		element.setStyle(property, this.serve(value, unit));
	},

	//searches inside the page css to find the values for a selector

	search: function(selector){
		if (Fx.CSS.Cache[selector]) return Fx.CSS.Cache[selector];
		var to = {};
		Array.each(document.styleSheets, function(sheet, j){
			var href = sheet.href;
			if (href && href.contains('://') && !href.contains(document.domain)) return;
			var rules = sheet.rules || sheet.cssRules;
			Array.each(rules, function(rule, i){
				if (!rule.style) return;
				var selectorText = (rule.selectorText) ? rule.selectorText.replace(/^\w+/, function(m){
					return m.toLowerCase();
				}) : null;
				if (!selectorText || !selectorText.test('^' + selector + '$')) return;
				Element.Styles.each(function(value, style){
					if (!rule.style[style] || Element.ShortStyles[style]) return;
					value = String(rule.style[style]);
					to[style] = (value.test(/^rgb/)) ? value.rgbToHex() : value;
				});
			});
		});
		return Fx.CSS.Cache[selector] = to;
	}

});

Fx.CSS.Cache = {};

Fx.CSS.Parsers = {

	Color: {
		parse: function(value){
			if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
			return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
		},
		compute: function(from, to, delta){
			return from.map(function(value, i){
				return Math.round(Fx.compute(from[i], to[i], delta));
			});
		},
		serve: function(value){
			return value.map(Number);
		}
	},

	Number: {
		parse: parseFloat,
		compute: Fx.compute,
		serve: function(value, unit){
			return (unit) ? value + unit : value;
		}
	},

	String: {
		parse: Function.from(false),
		compute: function(zero, one){
			return one;
		},
		serve: function(zero){
			return zero;
		}
	}

};

//<1.2compat>

Fx.CSS.Parsers = new Hash(Fx.CSS.Parsers);

//</1.2compat>


/*
---

name: Fx.Tween

description: Formerly Fx.Style, effect to transition any CSS property for an element.

license: MIT-style license.

requires: Fx.CSS

provides: [Fx.Tween, Element.fade, Element.highlight]

...
*/

Fx.Tween = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(property, now){
		if (arguments.length == 1){
			now = property;
			property = this.property || this.options.property;
		}
		this.render(this.element, property, now, this.options.unit);
		return this;
	},

	start: function(property, from, to){
		if (!this.check(property, from, to)) return this;
		var args = Array.flatten(arguments);
		this.property = this.options.property || args.shift();
		var parsed = this.prepare(this.element, this.property, args);
		return this.parent(parsed.from, parsed.to);
	}

});

Element.Properties.tween = {

	set: function(options){
		this.get('tween').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var tween = this.retrieve('tween');
		if (!tween){
			tween = new Fx.Tween(this, {link: 'cancel'});
			this.store('tween', tween);
		}
		return tween;
	}

};

Element.implement({

	tween: function(property, from, to){
		this.get('tween').start(arguments);
		return this;
	},

	fade: function(how){
		var fade = this.get('tween'), o = 'opacity', toggle;
		how = [how, 'toggle'].pick();
		switch (how){
			case 'in': fade.start(o, 1); break;
			case 'out': fade.start(o, 0); break;
			case 'show': fade.set(o, 1); break;
			case 'hide': fade.set(o, 0); break;
			case 'toggle':
				var flag = this.retrieve('fade:flag', this.get('opacity') == 1);
				fade.start(o, (flag) ? 0 : 1);
				this.store('fade:flag', !flag);
				toggle = true;
			break;
			default: fade.start(o, arguments);
		}
		if (!toggle) this.eliminate('fade:flag');
		return this;
	},

	highlight: function(start, end){
		if (!end){
			end = this.retrieve('highlight:original', this.getStyle('background-color'));
			end = (end == 'transparent') ? '#fff' : end;
		}
		var tween = this.get('tween');
		tween.start('background-color', start || '#ffff88', end).chain(function(){
			this.setStyle('background-color', this.retrieve('highlight:original'));
			tween.callChain();
		}.bind(this));
		return this;
	}

});


/*
---

name: Fx.Morph

description: Formerly Fx.Styles, effect to transition any number of CSS properties for an element using an object of rules, or CSS based selector rules.

license: MIT-style license.

requires: Fx.CSS

provides: Fx.Morph

...
*/

Fx.Morph = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(now){
		if (typeof now == 'string') now = this.search(now);
		for (var p in now) this.render(this.element, p, now[p], this.options.unit);
		return this;
	},

	compute: function(from, to, delta){
		var now = {};
		for (var p in from) now[p] = this.parent(from[p], to[p], delta);
		return now;
	},

	start: function(properties){
		if (!this.check(properties)) return this;
		if (typeof properties == 'string') properties = this.search(properties);
		var from = {}, to = {};
		for (var p in properties){
			var parsed = this.prepare(this.element, p, properties[p]);
			from[p] = parsed.from;
			to[p] = parsed.to;
		}
		return this.parent(from, to);
	}

});

Element.Properties.morph = {

	set: function(options){
		this.get('morph').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var morph = this.retrieve('morph');
		if (!morph){
			morph = new Fx.Morph(this, {link: 'cancel'});
			this.store('morph', morph);
		}
		return morph;
	}

};

Element.implement({

	morph: function(props){
		this.get('morph').start(props);
		return this;
	}

});


/*
---

name: Fx.Transitions

description: Contains a set of advanced transitions to be used with any of the Fx Classes.

license: MIT-style license.

credits:
  - Easing Equations by Robert Penner, <http://www.robertpenner.com/easing/>, modified and optimized to be used with MooTools.

requires: Fx

provides: Fx.Transitions

...
*/

Fx.implement({

	getTransition: function(){
		var trans = this.options.transition || Fx.Transitions.Sine.easeInOut;
		if (typeof trans == 'string'){
			var data = trans.split(':');
			trans = Fx.Transitions;
			trans = trans[data[0]] || trans[data[0].capitalize()];
			if (data[1]) trans = trans['ease' + data[1].capitalize() + (data[2] ? data[2].capitalize() : '')];
		}
		return trans;
	}

});

Fx.Transition = function(transition, params){
	params = Array.from(params);
	return Object.append(transition, {
		easeIn: function(pos){
			return transition(pos, params);
		},
		easeOut: function(pos){
			return 1 - transition(1 - pos, params);
		},
		easeInOut: function(pos){
			return (pos <= 0.5) ? transition(2 * pos, params) / 2 : (2 - transition(2 * (1 - pos), params)) / 2;
		}
	});
};

Fx.Transitions = {

	linear: function(zero){
		return zero;
	}

};

//<1.2compat>

Fx.Transitions = new Hash(Fx.Transitions);

//</1.2compat>

Fx.Transitions.extend = function(transitions){
	for (var transition in transitions) Fx.Transitions[transition] = new Fx.Transition(transitions[transition]);
};

Fx.Transitions.extend({

	Pow: function(p, x){
		return Math.pow(p, x && x[0] || 6);
	},

	Expo: function(p){
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p){
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p){
		return 1 - Math.sin((1 - p) * Math.PI / 2);
	},

	Back: function(p, x){
		x = x && x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p){
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2){
			if (p >= (7 - 4 * a) / 11){
				value = b * b - Math.pow((11 - 6 * a - 11 * p) / 4, 2);
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x){
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x && x[0] || 1) / 3);
	}

});

['Quad', 'Cubic', 'Quart', 'Quint'].each(function(transition, i){
	Fx.Transitions[transition] = new Fx.Transition(function(p){
		return Math.pow(p, [i + 2]);
	});
});


/*
---

name: Request

description: Powerful all purpose Request Class. Uses XMLHTTPRequest.

license: MIT-style license.

requires: [Object, Element, Chain, Events, Options, Browser]

provides: Request

...
*/

(function(){

var progressSupport = ('onprogress' in new Browser.Request);

var Request = this.Request = new Class({

	Implements: [Chain, Events, Options],

	options: {/*
		onRequest: function(){},
		onLoadstart: function(event, xhr){},
		onProgress: function(event, xhr){},
		onComplete: function(){},
		onCancel: function(){},
		onSuccess: function(responseText, responseXML){},
		onFailure: function(xhr){},
		onException: function(headerName, value){},
		onTimeout: function(){},
		user: '',
		password: '',*/
		url: '',
		data: '',
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
		},
		async: true,
		format: false,
		method: 'post',
		link: 'ignore',
		isSuccess: null,
		emulation: true,
		urlEncoded: true,
		encoding: 'utf-8',
		evalScripts: false,
		evalResponse: false,
		timeout: 0,
		noCache: false
	},

	initialize: function(options){
		this.xhr = new Browser.Request();
		this.setOptions(options);
		this.headers = this.options.headers;
	},

	onStateChange: function(){
		var xhr = this.xhr;
		if (xhr.readyState != 4 || !this.running) return;
		this.running = false;
		this.status = 0;
		Function.attempt(function(){
			var status = xhr.status;
			this.status = (status == 1223) ? 204 : status;
		}.bind(this));
		xhr.onreadystatechange = function(){};
		clearTimeout(this.timer);
		
		this.response = {text: this.xhr.responseText || '', xml: this.xhr.responseXML};
		if (this.options.isSuccess.call(this, this.status))
			this.success(this.response.text, this.response.xml);
		else
			this.failure();
	},

	isSuccess: function(){
		var status = this.status;
		return (status >= 200 && status < 300);
	},

	isRunning: function(){
		return !!this.running;
	},

	processScripts: function(text){
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) return Browser.exec(text);
		return text.stripScripts(this.options.evalScripts);
	},

	success: function(text, xml){
		this.onSuccess(this.processScripts(text), xml);
	},

	onSuccess: function(){
		this.fireEvent('complete', arguments).fireEvent('success', arguments).callChain();
	},

	failure: function(){
		this.onFailure();
	},

	onFailure: function(){
		this.fireEvent('complete').fireEvent('failure', this.xhr);
	},
	
	loadstart: function(event){
		this.fireEvent('loadstart', [event, this.xhr]);
	},
	
	progress: function(event){
		this.fireEvent('progress', [event, this.xhr]);
	},
	
	timeout: function(){
		this.fireEvent('timeout', this.xhr);
	},

	setHeader: function(name, value){
		this.headers[name] = value;
		return this;
	},

	getHeader: function(name){
		return Function.attempt(function(){
			return this.xhr.getResponseHeader(name);
		}.bind(this));
	},

	check: function(){
		if (!this.running) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},
	
	send: function(options){
		if (!this.check(options)) return this;

		this.options.isSuccess = this.options.isSuccess || this.isSuccess;
		this.running = true;

		var type = typeOf(options);
		if (type == 'string' || type == 'element') options = {data: options};

		var old = this.options;
		options = Object.append({data: old.data, url: old.url, method: old.method}, options);
		var data = options.data, url = String(options.url), method = options.method.toLowerCase();

		switch (typeOf(data)){
			case 'element': data = document.id(data).toQueryString(); break;
			case 'object': case 'hash': data = Object.toQueryString(data);
		}

		if (this.options.format){
			var format = 'format=' + this.options.format;
			data = (data) ? format + '&' + data : format;
		}

		if (this.options.emulation && !['get', 'post'].contains(method)){
			var _method = '_method=' + method;
			data = (data) ? _method + '&' + data : _method;
			method = 'post';
		}

		if (this.options.urlEncoded && ['post', 'put'].contains(method)){
			var encoding = (this.options.encoding) ? '; charset=' + this.options.encoding : '';
			this.headers['Content-type'] = 'application/x-www-form-urlencoded' + encoding;
		}

		if (!url) url = document.location.pathname;
		
		var trimPosition = url.lastIndexOf('/');
		if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) url = url.substr(0, trimPosition);

		if (this.options.noCache)
			url += (url.contains('?') ? '&' : '?') + String.uniqueID();

		if (data && method == 'get'){
			url += (url.contains('?') ? '&' : '?') + data;
			data = null;
		}

		var xhr = this.xhr;
		if (progressSupport){
			xhr.onloadstart = this.loadstart.bind(this);
			xhr.onprogress = this.progress.bind(this);
		}

		xhr.open(method.toUpperCase(), url, this.options.async, this.options.user, this.options.password);
		if (this.options.user && 'withCredentials' in xhr) xhr.withCredentials = true;
		
		xhr.onreadystatechange = this.onStateChange.bind(this);

		Object.each(this.headers, function(value, key){
			try {
				xhr.setRequestHeader(key, value);
			} catch (e){
				this.fireEvent('exception', [key, value]);
			}
		}, this);

		this.fireEvent('request');
		xhr.send(data);
		if (!this.options.async) this.onStateChange();
		if (this.options.timeout) this.timer = this.timeout.delay(this.options.timeout, this);
		return this;
	},

	cancel: function(){
		if (!this.running) return this;
		this.running = false;
		var xhr = this.xhr;
		xhr.abort();
		clearTimeout(this.timer);
		xhr.onreadystatechange = xhr.onprogress = xhr.onloadstart = function(){};
		this.xhr = new Browser.Request();
		this.fireEvent('cancel');
		return this;
	}

});

var methods = {};
['get', 'post', 'put', 'delete', 'GET', 'POST', 'PUT', 'DELETE'].each(function(method){
	methods[method] = function(data){
		return this.send({
			data: data,
			method: method
		});
	};
});

Request.implement(methods);

Element.Properties.send = {

	set: function(options){
		var send = this.get('send').cancel();
		send.setOptions(options);
		return this;
	},

	get: function(){
		var send = this.retrieve('send');
		if (!send){
			send = new Request({
				data: this, link: 'cancel', method: this.get('method') || 'post', url: this.get('action')
			});
			this.store('send', send);
		}
		return send;
	}

};

Element.implement({

	send: function(url){
		var sender = this.get('send');
		sender.send({data: this, url: url || sender.options.url});
		return this;
	}

});

})();

/*
---

name: Request.HTML

description: Extends the basic Request Class with additional methods for interacting with HTML responses.

license: MIT-style license.

requires: [Element, Request]

provides: Request.HTML

...
*/

Request.HTML = new Class({

	Extends: Request,

	options: {
		update: false,
		append: false,
		evalScripts: true,
		filter: false,
		headers: {
			Accept: 'text/html, application/xml, text/xml, */*'
		}
	},

	success: function(text){
		var options = this.options, response = this.response;

		response.html = text.stripScripts(function(script){
			response.javascript = script;
		});

		var match = response.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		if (match) response.html = match[1];
		var temp = new Element('div').set('html', response.html);

		response.tree = temp.childNodes;
		response.elements = temp.getElements('*');

		if (options.filter) response.tree = response.elements.filter(options.filter);
		if (options.update) document.id(options.update).empty().set('html', response.html);
		else if (options.append) document.id(options.append).adopt(temp.getChildren());
		if (options.evalScripts) Browser.exec(response.javascript);

		this.onSuccess(response.tree, response.elements, response.html, response.javascript);
	}

});

Element.Properties.load = {

	set: function(options){
		var load = this.get('load').cancel();
		load.setOptions(options);
		return this;
	},

	get: function(){
		var load = this.retrieve('load');
		if (!load){
			load = new Request.HTML({data: this, link: 'cancel', update: this, method: 'get'});
			this.store('load', load);
		}
		return load;
	}

};

Element.implement({

	load: function(){
		this.get('load').send(Array.link(arguments, {data: Type.isObject, url: Type.isString}));
		return this;
	}

});


/*
---

name: JSON

description: JSON encoder and decoder.

license: MIT-style license.

See Also: <http://www.json.org/>

requires: [Array, String, Number, Function]

provides: JSON

...
*/

if (!this.JSON) this.JSON = {};

//<1.2compat>

JSON = new Hash({
	stringify: JSON.stringify,
	parse: JSON.parse
});

//</1.2compat>

Object.append(JSON, {

	$specialChars: {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'},

	$replaceChars: function(chr){
		return JSON.$specialChars[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16);
	},

	encode: function(obj){
		switch (typeOf(obj)){
			case 'string':
				return '"' + obj.replace(/[\x00-\x1f\\"]/g, JSON.$replaceChars) + '"';
			case 'array':
				return '[' + String(obj.map(JSON.encode).clean()) + ']';
			case 'object': case 'hash':
				var string = [];
				Object.each(obj, function(value, key){
					var json = JSON.encode(value);
					if (json) string.push(JSON.encode(key) + ':' + json);
				});
				return '{' + string + '}';
			case 'number': case 'boolean': return String(obj);
			case 'null': return 'null';
		}
		return null;
	},

	decode: function(string, secure){
		if (typeOf(string) != 'string' || !string.length) return null;
		if (secure && !(/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, ''))) return null;
		return eval('(' + string + ')');
	}

});


/*
---

name: Request.JSON

description: Extends the basic Request Class with additional methods for sending and receiving JSON data.

license: MIT-style license.

requires: [Request, JSON]

provides: Request.JSON

...
*/

Request.JSON = new Class({

	Extends: Request,

	options: {
		secure: true
	},

	initialize: function(options){
		this.parent(options);
		Object.append(this.headers, {
			'Accept': 'application/json',
			'X-Request': 'JSON'
		});
	},

	success: function(text){
		var secure = this.options.secure;
		var json = this.response.json = Function.attempt(function(){
			return JSON.decode(text, secure);
		});

		if (json == null) this.onFailure();
		else this.onSuccess(json, text);
	}

});


/*
---

name: Cookie

description: Class for creating, reading, and deleting browser Cookies.

license: MIT-style license.

credits:
  - Based on the functions by Peter-Paul Koch (http://quirksmode.org).

requires: Options

provides: Cookie

...
*/

var Cookie = new Class({

	Implements: Options,

	options: {
		path: '/',
		domain: false,
		duration: false,
		secure: false,
		document: document,
		encode: true
	},

	initialize: function(key, options){
		this.key = key;
		this.setOptions(options);
	},

	write: function(value){
		if (this.options.encode) value = encodeURIComponent(value);
		if (this.options.domain) value += '; domain=' + this.options.domain;
		if (this.options.path) value += '; path=' + this.options.path;
		if (this.options.duration){
			var date = new Date();
			date.setTime(date.getTime() + this.options.duration * 24 * 60 * 60 * 1000);
			value += '; expires=' + date.toGMTString();
		}
		if (this.options.secure) value += '; secure';
		this.options.document.cookie = this.key + '=' + value;
		return this;
	},

	read: function(){
		var value = this.options.document.cookie.match('(?:^|;)\\s*' + this.key.escapeRegExp() + '=([^;]*)');
		return (value) ? decodeURIComponent(value[1]) : null;
	},

	dispose: function(){
		new Cookie(this.key, Object.merge({}, this.options, {duration: -1})).write('');
		return this;
	}

});

Cookie.write = function(key, value, options){
	return new Cookie(key, options).write(value);
};

Cookie.read = function(key){
	return new Cookie(key).read();
};

Cookie.dispose = function(key, options){
	return new Cookie(key, options).dispose();
};


/*
---

name: DOMReady

description: Contains the custom event domready.

license: MIT-style license.

requires: [Browser, Element, Element.Event]

provides: [DOMReady, DomReady]

...
*/

(function(window, document){

var ready,
	loaded,
	checks = [],
	shouldPoll,
	timer,
	isFramed = true;

// Thanks to Rich Dougherty <http://www.richdougherty.com/>
try {
	isFramed = window.frameElement != null;
} catch(e){}

var domready = function(){
	clearTimeout(timer);
	if (ready) return;
	Browser.loaded = ready = true;
	document.removeListener('DOMContentLoaded', domready).removeListener('readystatechange', check);
	
	document.fireEvent('domready');
	window.fireEvent('domready');
};

var check = function(){
	for (var i = checks.length; i--;) if (checks[i]()){
		domready();
		return true;
	}

	return false;
};

var poll = function(){
	clearTimeout(timer);
	if (!check()) timer = setTimeout(poll, 10);
};

document.addListener('DOMContentLoaded', domready);

// doScroll technique by Diego Perini http://javascript.nwbox.com/IEContentLoaded/
var testElement = document.createElement('div');
if (testElement.doScroll && !isFramed){
	checks.push(function(){
		try {
			testElement.doScroll();
			return true;
		} catch (e){}

		return false;
	});
	shouldPoll = true;
}

if (document.readyState) checks.push(function(){
	var state = document.readyState;
	return (state == 'loaded' || state == 'complete');
});

if ('onreadystatechange' in document) document.addListener('readystatechange', check);
else shouldPoll = true;

if (shouldPoll) poll();

Element.Events.domready = {
	onAdd: function(fn){
		if (ready) fn.call(this);
	}
};

// Make sure that domready fires before load
Element.Events.load = {
	base: 'load',
	onAdd: function(fn){
		if (loaded && this == window) fn.call(this);
	},
	condition: function(){
		if (this == window){
			domready();
			delete Element.Events.load;
		}
		
		return true;
	}
};

// This is based on the custom load event
window.addEvent('load', function(){
	loaded = true;
});

})(window, document);


/*
---

name: Swiff

description: Wrapper for embedding SWF movies. Supports External Interface Communication.

license: MIT-style license.

credits:
  - Flash detection & Internet Explorer + Flash Player 9 fix inspired by SWFObject.

requires: [Options, Object]

provides: Swiff

...
*/

(function(){

var id = 0;

var Swiff = this.Swiff = new Class({

	Implements: Options,

	options: {
		id: null,
		height: 1,
		width: 1,
		container: null,
		properties: {},
		params: {
			quality: 'high',
			allowScriptAccess: 'always',
			wMode: 'window',
			swLiveConnect: true
		},
		callBacks: {},
		vars: {}
	},

	toElement: function(){
		return this.object;
	},

	initialize: function(path, options){
		this.instance = 'Swiff_' + id++;

		this.setOptions(options);
		options = this.options;
		var id = this.id = options.id || this.instance;
		var container = document.id(options.container);

		Swiff.CallBacks[this.instance] = {};

		var params = options.params, vars = options.vars, callBacks = options.callBacks;
		var properties = Object.append({height: options.height, width: options.width}, options.properties);

		var self = this;

		for (var callBack in callBacks){
			Swiff.CallBacks[this.instance][callBack] = (function(option){
				return function(){
					return option.apply(self.object, arguments);
				};
			})(callBacks[callBack]);
			vars[callBack] = 'Swiff.CallBacks.' + this.instance + '.' + callBack;
		}

		params.flashVars = Object.toQueryString(vars);
		if (Browser.ie){
			properties.classid = 'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000';
			params.movie = path;
		} else {
			properties.type = 'application/x-shockwave-flash';
		}
		properties.data = path;

		var build = '<object id="' + id + '"';
		for (var property in properties) build += ' ' + property + '="' + properties[property] + '"';
		build += '>';
		for (var param in params){
			if (params[param]) build += '<param name="' + param + '" value="' + params[param] + '" />';
		}
		build += '</object>';
		this.object = ((container) ? container.empty() : new Element('div')).set('html', build).firstChild;
	},

	replaces: function(element){
		element = document.id(element, true);
		element.parentNode.replaceChild(this.toElement(), element);
		return this;
	},

	inject: function(element){
		document.id(element, true).appendChild(this.toElement());
		return this;
	},

	remote: function(){
		return Swiff.remote.apply(Swiff, [this.toElement()].extend(arguments));
	}

});

Swiff.CallBacks = {};

Swiff.remote = function(obj, fn){
	var rs = obj.CallFunction('<invoke name="' + fn + '" returntype="javascript">' + __flash__argumentsToXML(arguments, 2) + '</invoke>');
	return eval(rs);
};

})();


/*
	References:
		http://ejohn.org/blog/javascript-getters-and-setters/
		http://dev.enekoalonso.com/2009/07/20/setters-getters-on-mootools-classes/
			Keyboard input:
		http://msdn.microsoft.com/en-us/scriptjunkie/ff928319.aspx
			Potential IE9 compatibility:
		http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
			

	NOTES:

		For compatibility with MooTools,
			getters and setters must use __defineGetter__ and __defineSetter__ rather
			than the get and set keywords.
		Always declare Javascript strings with an initial value if the first operation
			you're going to do to them is something besides assignment
*/

String.prototype.pad = function(len, chr, side) {
	chr = (chr === undefined) ? " " : chr;

	var t = len - this.length;
	var padstr = "";
	while (t > 0) {
		padstr += chr;
		t--;
	}
	switch (side) {
		case 'left': return padstr + this;
		case 'right': return this + padstr;
		default: break;
	}

	return;
};

//Compatibility function that gives IE9 some hope of working
//FROM: http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
//emulate legacy getter/setter API using ES5 APIs
try {
   if (!Object.prototype.__defineGetter__ &&
        Object.defineProperty({},"x",{get: function(){return true;}}).x) {
      Object.defineProperty(Object.prototype, "__defineGetter__",
         {enumerable: false, configurable: true,
          value: function(name,func)
             {Object.defineProperty(this,name,
                 {get:func,enumerable: true,configurable: true});
      }});
      Object.defineProperty(Object.prototype, "__defineSetter__",
         {enumerable: false, configurable: true,
          value: function(name,func)
             {Object.defineProperty(this,name,
                 {set:func,enumerable: true,configurable: true});
      }});
   }
} catch(defPropException) {/*Do nothing if an exception occurs*/}

//NOTE: Opera doesn't support createImageData (but we might not need it after all)
if (!CanvasRenderingContext2D.prototype.createImageData) {

	CanvasRenderingContext2D.prototype.createImageData = function(sw, sh) {

		var c = document.createElement('canvas');
		c.width = sw; c.height = sh;
		data = c.getContext('2d').getImageData(0, 0, sw, sh);
		c = null;
		return data;
	};
}

//imitates the flash.x.y package hierarchy where needed
flash = {};

//flash.utils package
flash.utils = new Class({

	initialize: function() {
		var d = new Date();
		this.startTimer = d.getTime();
	},

	getTimer: function() {
		var d = new Date();
		return (d.getTime() - this.startTimer);
	}

});

flash.utils = new flash.utils();

// Each asset is an instance of the Asset class. Global "assets" variable holds reference to
//	all of them. Instead of passing a classname to certain Flixel methods, you pass
//	and asset object - asset.example - and its properties are at
//		asset.example.name, asset.example.src, etc
/*

	Audio: audio/mpeg (mp3), audio/webm, audio/ogg, application/ogg
	Video: video/webm, video/ogg
	images: image/jpeg, image/gif, image/png, image/bmp

*/
Asset = new Class({
	initialize: function(assetName, assetSrc, assetType, mime) {
		this.name = assetName;
		this.src = assetSrc;
		this.type = assetType;
		this.mime = mime;
	}
});

Assets = new Class({

	initialize:  function() {
		this.mimeList = {};
		this.images = {};
		this.sounds = {};

		this.assetList = new Array();
		this.assetCount = 0;
		this.loadCount = 0;

		//public callbacks
		this.onAssetLoaded = null;
		this.onAllLoaded = null;
	},

	//Valid types: audio, image, csv, text
	//mime is optional and reserved for future use
	add: function(name, src, type, mime) {
		this.assetList.push(new Asset(name, src, type, mime));
	},

	loadAll: function() {
		for (var i in this.assetList) {
			var item = this.assetList[i];

			if (item instanceof Asset) {
				switch(item.type) {
					case 'image':
						item.image = new Image();
						item.image.relatedItem = item;
						item.image.index = i;
						item.image.onload = this.imageLoaded;
						item.image.src = item.src;
					break;

					case 'audio':
					break;
				}
			}
		}
	},

	imageLoaded: function(e) {
		var i = this.index;
		var item = this.relatedItem;

		Assets.images[item.name] = BitmapData.fromImage(item.image);
		Assets.loadCount++;
	},


});

Assets = new Assets;

Point = new Class({

	initialize: function(X, Y) {
		X = isNaN(X) ? 0 : X;
		Y = isNaN(Y) ? 0 : Y;

		this.x = X;
		this.y = Y;
	}

});

Rectangle = new Class({

	Extends: Point,

	initialize: function(X, Y, Width, Height) {
		Width = isNaN(Width) ? 0 : Width;
		Height = isNaN(Height) ? 0 : Height;

		this.parent(X, Y);
		this.width = Width;
		this.height = Height;
	    this.__defineGetter__("left", this.getLeft);
	    this.__defineGetter__("right", this.getRight);
	    this.__defineGetter__("top", this.getTop);
	    this.__defineGetter__("bottom", this.getBottom);
	},

	getLeft: function() { return this.x; },
	getRight: function() { return this.x + this.width; },
	getTop: function() { return this.y; },
	getBottom: function() { return this.y + this.height; }

});

//Not a full implementation of the Matrix class. Exists to pass a matrix to bitmapData.draw
//	which passes the properties onto Canvas in its setTransform method:
//		setTransform(m11, m12, m21, m22, dx, dy)
//Not implemented: invert, transformPoint, deltaTransformPoint, createGradientBox
Matrix = new Class({

	initialize: function(a, b, c, d, tx, ty) {
		this.a = isNaN(a) ? 1 : a;
		this.b = isNaN(b) ? 0 : b;
		this.c = isNaN(c) ? 0 : c;
		this.d = isNaN(d) ? 1 : d;
		this.tx = isNaN(tx) ? 0 : tx;
		this.ty = isNaN(ty) ? 0 : ty;
		this.u = 0;
		this.v = 0;
		this.w = 1;
	},

	identity: function() {
		this.a = 1;
		this.b = 0;
		this.c = 0;
		this.d = 1;
		this.tx = 0;
		this.ty = 0;
		this.u = 0;
		this.v = 0;
		this.w = 1;
	},

	rotate: function(angle) {
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		var mrotate = new Matrix(cos, sin, -sin, cos, 0, 0);
		this.concat(mrotate);
	},

	scale: function(sx, sy) {
		var mscale = new Matrix(sx, 0, 0, sy, 0, 0);
		this.concat(mscale);
	},

	translate: function(dx, dy) {
		var mtrans = new Matrix(1, 0, 0, 1, dx, dy);
		this.concat(mtrans);
	},

	//deep copy
	clone: function() {
		return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
	},

	//"Concatenates a matrix with the current matrix, effectively combining the
	//		geometric effects of the two.
	//In mathematical terms, concatenating two matrixes is the same as combining them
	//		using matrix multiplication."
	concat: function(m2) {
		//"This method replaces the source matrix with the concatenated matrix."
		var mcon = this.multiply(m2);
		this.a = mcon.a;
		this.b = mcon.b;
		this.c = mcon.c;
		this.d = mcon.d;
		this.tx = mcon.tx;
		this.ty = mcon.ty;
	},

	//"Using the createBox() method lets you obtain the same matrix as you would if you
	//		applied the identity(), rotate(), scale(), and translate() methods in succession."
	createBox: function(scaleX, scaleY, rotation, tx, ty) {
		rotation = isNaN(rotation) ? 0 : rotation;
		tx = isNaN(tx) ? 0 : tx;
		ty = isNaN(ty) ? 0 : ty;

		this.identity();
		if (rotation != 0) {
			this.rotate(rotation); 
		}
		this.scale(scaleX, scaleY);
		if (tx != 0 || ty != 0) {
			this.translate(tx, ty);
		}
	},

	//Not a flash method. Helper for performing other transforms
	//m2: The matrix to multiply this one with
	//		[this.a	this.c	this.tx]	[m2.a	m2.c	m2.tx]
	//		[this.b	this.d	this.ty]	[m2.b	m2.d	m2.ty]
	//		[this.u	this.v	 this.w]	[m2.u	m2.v	 m2.w]
	multiply: function(m2) {
		var mfinal = new Matrix();

		//first row
		mfinal.a = (this.a * m2.a) + (this.c * m2.b) + 0;
		mfinal.c = (this.a * m2.c) + (this.c * m2.d) + 0;
		mfinal.tx = (this.a * m2.tx) + (this.c * m2.ty) + this.tx;

		//second row
		mfinal.b = (this.b * m2.a) + (this.d * m2.b) + 0;
		mfinal.d = (this.b * m2.c) + (this.d * m2.d) + 0;
		mfinal.ty = (this.b * m2.tx) + (this.d * m2.ty) + this.ty;

		return mfinal;
	}

});

// example as3 output: (a=0.1220703125, b=0, c=0, d=0.1220703125, tx=150, ty=150)
//NOTE: goes here to override MooTools' own toString
Matrix.prototype.toString = function() {
	return "(a=" + this.a + ", b=" + this.b + ", c=" + this.c +
			", d=" + this.d + ", tx=" + this.tx + ", ty=" + this.ty + ")";
};

//TODO: hitTest (needed by FlxSprite.overlapsPoint)
BitmapData = new Class({

		//NOTE: FillColor is ARGB like Flash, but canvas uses RGBA

	initialize: function(Width, Height, Transparent, FillColor) {
		Transparent = (Transparent === undefined) ? true : Transparent;
		FillColor = (FillColor === undefined) ? 0xFFFFFFFF : FillColor;

		//pre-process FillColor to ensure correct behavior
		//FIXME: For now we set the fill to fully transparent if Transparent is true
		/*FillColor = FillColor.toString(16).pad(8, 0, "left");
		if (Transparent) {
			FillColor = parseInt("00" + FillColor.substr(2, 6), 16);
			console.log("fixed color", FillColor);
		}*/
		

		this.transparent = Transparent;
		this.width = Width;
		this.height = Height;
		this._data = Array();		//pixel data array
		this._canvas = document.createElement('canvas');
		this._canvas.width = this.width;
		this._canvas.height = this.height;
		this.context = this._canvas.getContext('2d');

		//FIXME: Temporarily disabled fill while researching alpha problems
		this.context.save();
			var a;
		this.context.fillStyle = a = this.makeRGBA(FillColor);
			//console.log(a, this.context.fillStyle); //DEBUG
		this.context.fillRect(0, 0, this.width, this.height);
			//document.body.appendChild(this._canvas).setAttribute('title', a); //DEBUG
		this.rect = new Rectangle(0, 0, this.width, this.height);
		this.context.restore();
	},

	//FIXME: This returns "premultiplied" (affected by alpha) pixels, not "unmultiplied" as Flash specifies
	getPixel: function(X, Y) {
		var d = this.context.getImageData(X, Y, 1, 1).data;
		return ( (d[0] << 16) | (d[1] << 8) | (d[2]) );
	},

	//FIXME: alphaBitmapData, alphaPoint are ignored. mergeAlpha temporarily ignored
	copyPixels: function(sourceBitmapData, sourceRect, destPoint, alphaBitmapData, alphaPoint, mergeAlpha) {

		/*var d = sourceBitmapData.context.getImageData(
			sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height
		);

		this.context.putImageData(d, destPoint.x, destPoint.y);*/

		//NOTE: Alternate implementation to get alpha right. Copying pixels is not correct because we don't blend
		//	alpha with the new canvas
		var s = sourceRect;
		var d = destPoint;
		this.context.clearRect(s.x, s.y, s.width, s.height);
		this.context.drawImage(sourceBitmapData._canvas, s.x, s.y, s.width, s.height, d.x, d.y, s.width, s.height);
	},

	setPixel: function(X, Y, Color) {

		//is a 1x1 rect faster than manipulating the data? No idea
		this.context.fillStyle = this.makeRGBA(Color);
		this.context.fillRect(X, Y, 1, 1);		
	},

	fillRect: function (rect, color) {
		this.context.save();
		this.context.clearRect(rect.x, rect.y, rect.width, rect.height);
		this.context.fillStyle = this.makeRGBA(color);
		this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
		this.context.restore();
	},

	colorTransform: function(rect, colorTransform) {
		var ct = colorTransform;
		var d = this.context.getImageData(rect.x, rect.y, rect.width, rect.height);
		var r, g, b, a;

		for (var i = 0; i<d.data.length; i+=4) {
				//figure out new component values
			r = (d.data[i] * ct.redMultiplier) + ct.redOffset;
			g = (d.data[i+1] * ct.greenMultiplier) + ct.greenOffset;
			b = (d.data[i+2] * ct.blueMultiplier) + ct.blueOffset;
			a = (d.data[i+3] * ct.alphaMultiplier) + ct.alphaOffset;

			//clamp values.
			r = (r > 255) ? 255 : r;		r = (r < 0) ? 0 : r;
			g = (g > 255) ? 255 : g;		g = (g < 0) ? 0 : g;
			b = (b > 255) ? 255 : b;		b = (b < 0) ? 0 : b;
			a = (a > 255) ? 255 : a;		a = (a < 0) ? 0 : a;

			//assign new values
			d.data[i  ] = r;
			d.data[i+1] = g;
			d.data[i+2] = b;
			d.data[i+3] = a;
		}

		this.context.putImageData(d, rect.x, rect.y);

	},

	//NOTE: Only source and matrix are used
	draw: function(source, matrix, colorTransform, blendMode, clipRect, smoothing) {

		this.context.save();

		//Perform a transform (scale, rotation, or translation) only if a matrix is passed
		if (matrix !== undefined && matrix !== null) {
			var m = matrix;
			this.context.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
		}

		//If a clip rect is specified then draw only a portion of the source image
		if (clipRect !== undefined && clipRect !== null) {
			var r = clipRect;
			this.context.drawImage(source._canvas, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
		} else {
			this.context.drawImage(source._canvas, 0, 0);
		}

		this.context.restore();
		
	},

	//NOTE: This is not a Flash BitmapData function. This is a helper function.
	//makes a CSS color for Canvas fillStyles, e.g. rgb(128, 64, 64, 0.7);
	makeRGBA: function(Color) {
		var f = Color.toString(16).pad(8, "0", "left");
		var a = parseInt(f.substr(0, 2), 16) / 255;
		var r = parseInt(f.substr(2, 2), 16);
		var g = parseInt(f.substr(4, 2), 16);
		var b = parseInt(f.substr(6, 2), 16);

		return ("rgba(" + r + "," + g + "," + b + "," + a + ")");
	},

	clone: function() {
		var b = new BitmapData(this.width, this.height, this.transparent, 0x00000000);
		b.draw(this);

		return b;
	}


});

//NOTE: JS-specific static function to turn HTMLImageElemnt objects into BitmapData objects
BitmapData.fromImage = function(img) {

	var b = new BitmapData(img.width, img.height, true, 0x00000000);
	b.context.drawImage(img, 0, 0);

	return b;

};

//Doesn't really need to do anything, just hold some properties
ColorTransform = new Class({

	initialize: function(redMultiplier, greenMultiplier, blueMultiplier, alphaMultiplier,
		redOffset, greenOffset, blueOffset, alphaOffset) {

		this.redMultiplier = isNaN(redMultiplier) ? 1.0 : redMultiplier;
		this.greenMultiplier = isNaN(greenMultiplier) ? 1.0 : greenMultiplier;
		this.blueMultiplier = isNaN(blueMultiplier) ? 1.0 : blueMultiplier;
		this.alphaMultiplier = isNaN(alphaMultiplier) ? 1.0 : alphaMultiplier;
		this.redOffset = isNaN(redOffset) ? 0 : redOffset;
		this.greenOffset = isNaN(greenOffset) ? 0 : greenOffset;
		this.blueOffset = isNaN(blueOffset) ? 0 : blueOffset;
		this.alphaOffset = isNaN(alphaOffset) ? 0 : alphaOffset;

	}

});//TODO: Make this class!
FlxG = new Class({

	initialize: function() {
		this.LIBRARY_NAME = "JSFlixel";
		this.LIBRARY_MAJOR_VERSION = 0;
		this.LIBRARY_MINOR_VERSION = 1

		this.__defineGetter__("pause", this.getPause);
		this.__defineSetter__("pause", this.setPause);
		this.__defineGetter__("framerate", this.getFramerate);
		this.__defineSetter__("framerate", this.setFramerate);
		this.__defineGetter__("frameratePaused", this.getFrameratePaused);
		this.__defineSetter__("frameratePaused", this.setFrameratePaused);
		this.__defineGetter__("mute", this.getMute);
		this.__defineSetter__("mute", this.setMute);
		this.__defineGetter__("state", this.getState);
		this.__defineSetter__("state", this.setState);

		this._cache = Array();
	},

	log: function(Data)
	{
		if((this._game != null) && (this._game._console != null))
			this._game._console.log((Data === undefined) ? "ERROR: nothing to log" : Data);
	},

	getPause: function() {
		return this._pause;
	},

	setPause: function(Pause)
	{
		var op = this._pause;
		this._pause = Pause;
		if(this._pause != op)
		{
			if(this._pause)
			{
				this._game.pauseGame();
				this.pauseSounds();
			}
			else
			{
				this._game.unpauseGame();
				this.playSounds();
			}
		}
	},

	//TODO: Fix all 4 of these framerate methods so they make sense for Javascript
	//		We don't have a stage and nothing automatically manages framerate
	getFramerate: function() {
		return this._game._framerate;
	},
	
	setFramerate: function(Framerate) {
		this._game._framerate = Framerate;
		if(!this._game._paused && (this._game.stage != null))
			this._game.stage.frameRate = Framerate;
	},
	
	getFrameratePaused: function() {
		return this._game._frameratePaused;
	},
	
	setFrameratePaused: function(Framerate) {
		this._game._frameratePaused = Framerate;
		if(this._game._paused && (this._game.stage != null))
			this._game.stage.frameRate = Framerate;
	},

	resetInput: function() {
		this.keys.reset();
		this.mouse.reset();
		var i = 0;
		var l = this.gamepads.length;
		while(i < l)
			this.gamepads[i++].reset();
	},

	//FIXME: None of these will do anything for a while. Rework sound system completely
	//		Need both asset loading finished, and <audio> API stuff figured out
	playMusic: function(Music, Volume) {
		Volume = isNaN(Volume) ? 1.0 : Volume;

		if(this.music === undefined)
			this.music = new FlxSound();
		else if(this.music.active)
			this.music.stop();
		this.music.loadEmbedded(Music,true);
		this.music.volume = Volume;
		this.music.survive = true;
		this.music.play();
	},

	play: function(EmbeddedSound, Volume, Looped) {
		Volume = isNaN(Volume) ? 1.0 : Volume;
		Looped = (Looped === undefined) ?  true : Looped;

		var i = 0;
		var sl = this.sounds.length;
		while(i < sl)
		{
			if(!(this.sounds[i]).active)
				break;
			i++;
		}
		if(this.sounds[i] === undefined)
			this.sounds[i] = new FlxSound();
		var s = this.sounds[i];
		s.loadEmbedded(EmbeddedSound,Looped);
		s.volume = Volume;
		s.play();
		return s;
	},

	stream: function(URL, Volume, Looped) {

		Volume = isNaN(Volume) ? 1.0 : Volume;
		Looped = (Looped === undefined) ?  true : Looped;

		var i = 0;
		var sl = this.sounds.length;
		while(i < sl)
		{
			if(!(this.sounds[i]).active)
				break;
			i++;
		}
		if(this.sounds[i] === undefined)
			this.sounds[i] = new FlxSound();
		var s = this.sounds[i];
		s.loadStream(URL,Looped);
		s.volume = Volume;
		s.play();
		return s;
	},

	getMute: function() {
		return this._mute;
	},
	
	setMute: function(Mute) {
		this._mute = Mute;
		this.changeSounds();
	},

	//NOTE: IMO this should just be a getter, but that will break compatibility. Later....
	getMuteValue: function() {
		if(this._mute)
			return 0;
		else
			return 1;
	},

	getVolume: function() { return this._volume; },
	 
	setVolume: function(Volume) {
		this._volume = Volume;
		if(this._volume < 0)
			this._volume = 0;
		else if(this._volume > 1)
			this._volume = 1;
		this.changeSounds();
	},

	destroySounds: function(ForceDestroy) {

		ForceDestroy = (ForceDestroy === undefined) ? false : ForceDestroy;

		if(this.sounds === undefined)
			return;
		if((this.music !== undefined) && (ForceDestroy || !this.music.survive))
			this.music.destroy();
		var i = 0;
		var s;
		var sl = this.sounds.length;
		while(i < sl)
		{
			s = this.sounds[i++];
			if((s !== undefined) && (ForceDestroy || !s.survive))
				s.destroy();
		}
	},

	changeSounds: function()
	{
		if((this.music !== undefined) && this.music.active)
			this.music.updateTransform();
		var i = 0;
		var s;
		var sl = this.sounds.length;
		while(i < sl)
		{
			s = this.sounds[i++];
			if((s !== undefined) && s.active)
				s.updateTransform();
		}
	},

	updateSounds: function()
	{
		if((this.music !== undefined) && this.music.active)
			this.music.update();
		var i = 0;
		var s;
		var sl = this.sounds.length;
		while(i < sl)
		{
			s = this.sounds[i++];
			if((s !== undefined) && s.active)
				s.update();
		}
	},
	
	pauseSounds: function()
	{
		if((this.music !== undefined) && this.music.active)
			this.music.pause();
		var i = 0;
		var s;
		var sl = this.sounds.length;
		while(i < sl)
		{
			s = sounds[i++];
			if((s !== undefined) && s.active)
				s.pause();
		}
	},
	
	playSounds: function()
	{
		if((this.music !== undefined) && this.music.active)
			this.music.play();
		var i = 0;
		var s;
		var sl = this.sounds.length;
		while(i < sl)
		{
			s = this.sounds[i++];
			if((s !== undefined) && s.active)
				s.play();
		}
	},

	checkBitmapCache: function(Key)
	{
		return (this._cache[Key] !== undefined) && (this._cache[Key] !== null);
	},

	createBitmap: function(Width, Height, Color, Unique, Key) {

		Unique = (Unique === undefined) ? false : Unique;
		Key = (Key === undefined) ? null : Key;

		var key = Key;
		if(key === null || key === undefined)
		{
			key = Width + "x" + Height + ":" + Color;
			if(Unique && (this._cache[key] !== undefined) && (this._cache[key] !== null))
			{
				//Generate a unique key
				var inc = 0;
				var ukey;
				do { ukey = key + inc++;
				} while((this._cache[ukey] !== undefined) && (this._cache[ukey] !== null));
				key = ukey;
			}
		}
		if(!this.checkBitmapCache(key))
			this._cache[key] = new BitmapData(Width,Height,true,Color);
		return this._cache[key];
	},

	addBitmap: function(Graphic, Reverse, Unique, Key) {

		Reverse = (Reverse === undefined) ? false : Reverse;
		Unique = (Unique === undefined) ? false : Unique;
		Key = (Key === undefined) ? null : Key;

		Graphic = Graphic.clone();

		var needReverse = false;
		var key = Key = Math.random().toString(); //FIXME: We're just disabling the cache right now
		if(key === undefined || key === null)
		{
			key = Graphic;	//FIXME
			if(Unique && (this._cache[key] !== undefined) && (this._cache[key] !== null))
			{
				//Generate a unique key
				var inc = 0;
				var ukey;
				do { ukey = key + inc++;
				} while((this._cache[ukey] !== undefined) && (this._cache[ukey] !== null));
				key = ukey;
			}
		}
		//If there is no data for this key, generate the requested graphic
		if(!this.checkBitmapCache(key))
		{
			this._cache[key] = Graphic; //FIXME
			if(Reverse) needReverse = true;
		}
		var pixels = this._cache[key];
		if(!needReverse && Reverse && (pixels.width == Graphic.width)) //FIXME [x]
			needReverse = true;
		if(needReverse)
		{
			var newPixels = new BitmapData(pixels.width<<1,pixels.height,true,0x00000000);
			newPixels.draw(pixels);
			var mtx = new Matrix();
			mtx.scale(-1,1);
			mtx.translate(newPixels.width,0);
			newPixels.draw(pixels,mtx);
			pixels = newPixels;
		}
		return pixels;
	},

	follow: function(Target, Lerp) {
		Lerp = (Lerp === undefined) ? 1 : Lerp;

		this.followTarget = Target;
		this.followLerp = Lerp;
		this._scrollTarget.x = (this.width>>1) - this.followTarget.x - (this.followTarget.width>>1);
		this._scrollTarget.y = (this.height>>1) - this.followTarget.y - (this.followTarget.height>>1);
		this.scroll.x = this._scrollTarget.x;
		this.scroll.y = this._scrollTarget.y;
		this.doFollow();
	},

	followAdjust: function(LeadX, LeadY) {
		LeadX = isNaN(LeadX) ? 0 : LeadX;
		LeadY = isNaN(LeadY) ? 0 : LeadY;

		this.followLead = new Point(LeadX,LeadY);
	},

	followBounds: function(MinX, MinY, MaxX, MaxY, UpdateWorldBounds) {

		MinX = isNaN(MinX) ? 0 : MinX;
		MinY = isNaN(MinY) ? 0 : MinY;
		MaxX = isNaN(MaxX) ? 0 : MaxX;
		MaxY = isNaN(MaxY) ? 0 : MaxY;
		UpdateWorldBounds = (UpdateWorldBounds === undefined) ? true : UpdateWorldBounds;

		this.followMin = new Point(-MinX,-MinY);
		this.followMax = new Point(-MaxX+ this.width,-MaxY+this.height);
		if(this.followMax.x > this.followMin.x)
			this.followMax.x = this.followMin.x;
		if(this.followMax.y > this.followMin.y)
			this.followMax.y = this.followMin.y;
		if(UpdateWorldBounds)
			FlxU.setWorldBounds(MinX, MinY, MaxX - MinX, MaxY - MinY);
		this.doFollow();
	},

	//OMITTED: getter for stage. No such thing in Javascript

	getState: function() {
		return this._game._state;
	},
	
	setState: function(State) {
		this._game.switchState(State);
	},

	unfollow: function() {
		this.followTarget = null;
		this.followLead = null;
		this.followLerp = 1;
		this.followMin = null;
		this.followMax = null;
		if(this.scroll === null) //NOTE: Flixel explicitly sets null for scroll and _scrollTarget in setGameData
			this.scroll = new Point();
		else
			this.scroll.x = this.scroll.y = 0;
		if(this._scrollTarget === null)
			this._scrollTarget = new Point();
		else
			this._scrollTarget.x = this._scrollTarget.y = 0;
	},

	setGameData: function(Game, Width, Height, Zoom) {

		this._game = Game;
		this._cache = new Object();
		this.width = Width;
		this.height = Height;
		this._mute = false;
		this._volume = 0.5;
		this.sounds = new Array();
		this.mouse = new FlxMouse();
		this.keys = new FlxKeyboard();
		this.gamepads = new Array(4);
		this.gamepads[0] = new FlxGamepad();
		this.gamepads[1] = new FlxGamepad();
		this.gamepads[2] = new FlxGamepad();
		this.gamepads[3] = new FlxGamepad();
		this.scroll = null;
		this._scrollTarget = null;
		this.unfollow();
		FlxG.levels = new Array();
		FlxG.scores = new Array();
		this.level = 0;
		this.score = 0;
		this.pause = false;
		this.timeScale = 1.0;
		this.framerate = 60;
		this.frameratePaused = 10;
		this.maxElapsed = 0.0333333;
		FlxG.elapsed = 0;
		this.showBounds = false;
		
		this.mobile = false;
		
		this.panel = new FlxPanel();
		this.quake = new FlxQuake(Zoom);
		this.flash = new FlxFlash();
		this.fade = new FlxFade();

		FlxU.setWorldBounds(0,0,FlxG.width,FlxG.height);
	},

	doFollow: function()
	{
		if(this.followTarget != null)
		{
			this._scrollTarget.x = (this.width>>1)-this.followTarget.x-(this.followTarget.width>>1);
			this._scrollTarget.y = (this.height>>1)-this.followTarget.y-(this.followTarget.height>>1);

			if((this.followLead != null) && (this.followTarget instanceof FlxSprite))
			{
				this._scrollTarget.x -= (this.followTarget).velocity.x*this.followLead.x;
				this._scrollTarget.y -= (this.followTarget).velocity.y*this.followLead.y;
			}
			this.scroll.x += (this._scrollTarget.x-this.scroll.x)*this.followLerp*FlxG.elapsed;
			this.scroll.y += (this._scrollTarget.y-this.scroll.y)*this.followLerp*FlxG.elapsed;
			
			if(this.followMin != null)
			{
				if(this.scroll.x > this.followMin.x)
					this.scroll.x = this.followMin.x;
				if(this.scroll.y > this.followMin.y)
					this.scroll.y = this.followMin.y;
			}
			
			if(this.followMax != null)
			{
				if(this.scroll.x < this.followMax.x)
					this.scroll.x = this.followMax.x;
				if(this.scroll.y < this.followMax.y)
					this.scroll.y = this.followMax.y;
			}
		}
	},

	updateInput: function() {
		this.keys.update();
		this.mouse.update(this.state.mouseX,this.state.mouseY,this.scroll.x,this.scroll.y);
		var i = 0;
		var l = this.gamepads.length;
		while(i < l)
			this.gamepads[i++].update();
	},

});

//Static class. Like FlxU, everything is static, so just set it to an instance of itself
FlxG = new FlxG;
FlxU = new Class({

	initialize: function() {
	},

	abs: function(N) {
		return Math.abs(N);
	},
	
	floor: function(N) {
		return Math.floor(N);
	},
	
	ceil: function(N) {
		return Math.ceil(N);
	},
	
	min: function(N1,N2) {
		return Math.min(N1, N2);
	},
		
	max: function(N1,N2) {
		return Math.max(N1, N2);
	},

	random: function(Seed) {
		if(isNaN(Seed) || Seed === undefined)
			return Math.random();
		else
		{
			//Make sure the seed value is OK
			if(Seed == 0)
				Seed = Number.MIN_VALUE;
			if(Seed >= 1)
			{
				if((Seed % 1) == 0)
					Seed /= Math.PI;
				Seed %= 1;
			}
			else if(Seed < 0)
				Seed = (Seed % 1) + 1;
			
			//Then do an LCG thing and return a predictable random number
			return ((69621 * Math.floor(Seed * 0x7FFFFFFF)) % 0x7FFFFFFF) / 0x7FFFFFFF;
		}
	},

	startProfile: function() {
		return flash.utils.getTimer();
	},

	endProfile: function(Start, Name, Log) {
		var t = flash.utils.getTimer();
		if(Log)
			FlxG.log(Name+": "+((t-Start)/1000)+"s");
		return t;
	},

	rotatePoint: function(X, Y, PivotX, PivotY, Angle, P) {
		var sin = 0;
		var cos = 0;
		var radians = Angle * -0.017453293;
		while (radians < -3.14159265)
			radians += 6.28318531;
		while (radians >  3.14159265)
			radians = radians - 6.28318531;

		if (radians < 0)
		{
			sin = 1.27323954 * radians + .405284735 * radians * radians;
			if (sin < 0)
				sin = .225 * (sin *-sin - sin) + sin;
			else
				sin = .225 * (sin * sin - sin) + sin;
		}
		else
		{
			sin = 1.27323954 * radians - 0.405284735 * radians * radians;
			if (sin < 0)
				sin = .225 * (sin *-sin - sin) + sin;
			else
				sin = .225 * (sin * sin - sin) + sin;
		}
		
		radians += 1.57079632;
		if (radians >  3.14159265)
			radians = radians - 6.28318531;
		if (radians < 0)
		{
			cos = 1.27323954 * radians + 0.405284735 * radians * radians;
			if (cos < 0)
				cos = .225 * (cos *-cos - cos) + cos;
			else
				cos = .225 * (cos * cos - cos) + cos;
		}
		else
		{
			cos = 1.27323954 * radians - 0.405284735 * radians * radians;
			if (cos < 0)
				cos = .225 * (cos *-cos - cos) + cos;
			else
				cos = .225 * (cos * cos - cos) + cos;
		}

		var dx = X-PivotX;
		var dy = PivotY-Y;
		if(P === undefined) P = new FlxPoint();
		P.x = PivotX + cos*dx - sin*dy;
		P.y = PivotY - sin*dx - cos*dy;
		return P;
	},

	getAngle: function(X, Y) {
		
		var c1 = 3.14159265 / 4;
		var c2 = 3 * c1;
		var ay = (Y < 0)?-Y:Y;
		var angle = 0;
		if (X >= 0)
			angle = c1 - c1 * ((X - ay) / (X + ay));
		else
			angle = c2 - c1 * ((X + ay) / (ay - X));
		return ((Y < 0)?-angle:angle)*57.2957796;
	},

	getColor: function(Red, Green, Blue, Alpha)
	{
		//AS3 default value of 1.0
		Alpha = (isNaN(Alpha)) ? 1.0 : Alpha;
		return (((Alpha>1)?Alpha:(Alpha * 255)) & 0xFF) << 24 | (Red & 0xFF) << 16 | (Green & 0xFF) << 8 | (Blue & 0xFF);
	},

	getColorHSB: function(Hue,Saturation,Brightness,Alpha)
	{
		//AS3 default value of 1.0
		Alpha = (isNaN(Alpha)) ? 1.0 : Alpha;
		var red;
		var green;
		var blue;
		if(Saturation == 0.0)
		{
			red   = Brightness;
			green = Brightness;        
			blue  = Brightness;
		}       
		else
		{
			if(Hue == 360)
				Hue = 0;
			var slice = Hue/60;
			var hf = Hue/60 - slice;
			var aa = Brightness*(1 - Saturation);
			var bb = Brightness*(1 - Saturation*hf);
			var cc = Brightness*(1 - Saturation*(1.0 - hf));
			switch (slice)
			{
				case 0: red = Brightness; green = cc;   blue = aa;  break;
				case 1: red = bb;  green = Brightness;  blue = aa;  break;
				case 2: red = aa;  green = Brightness;  blue = cc;  break;
				case 3: red = aa;  green = bb;   blue = Brightness; break;
				case 4: red = cc;  green = aa;   blue = Brightness; break;
				case 5: red = Brightness; green = aa;   blue = bb;  break;
				default: red = 0;  green = 0;    blue = 0;   break;
			}
		}
		
		return (((Alpha>1)?Alpha:(Alpha * 255)) & 0xFF) << 24 | uint(red*255) << 16 | uint(green*255) << 8 | uint(blue*255);
	},

	getRGBA: function(Color, Results) {
		if(Results == null)
			Results = new Array();
		Results[0] = (Color >> 16) & 0xFF;
		Results[1] = (Color >> 8) & 0xFF;
		Results[2] = Color & 0xFF;
		Results[3] = Number((Color >> 24) & 0xFF) / 255;
		return Results;
	},

	//FIXME: Skipped completely for now. May not even be important outside Flash
	getClassName: function(Obj,Simple) {
		/*var s = getQualifiedClassName(Obj);
		s = s.replace("::",".");
		if(Simple)
			s = s.substr(s.lastIndexOf(".")+1);
		return s;*/
	},

	//FIXME: Also skipped
	getClass: function(Name) {
		//return getDefinitionByName(Name) as Class;
	},

	computeVelocity: function (Velocity, Acceleration, Drag, Max) {

		//Set default values for optional parameters
		Acceleration = (isNaN(Acceleration)) ? 0 : Acceleration;
		Max = (isNaN(Max)) ? 10000 : Max;
		Drag = (isNaN(Drag)) ? 0 : Drag;

		if(Acceleration != 0)
			Velocity += Acceleration*FlxG.elapsed;
		else if(Drag != 0)
		{
			var d = Drag*FlxG.elapsed;
			if(Velocity - d > 0)
				Velocity = Velocity - d;
			else if(Velocity + d < 0)
				Velocity += d;
			else
				Velocity = 0;
		}
		if((Velocity != 0) && (Max != 10000))
		{
			if(Velocity > Max)
				Velocity = Max;
			else if(Velocity < -Max)
				Velocity = -Max;
		}
		return Velocity;
	},

	setWorldBounds: function(X, Y, Width, Height, Divisions) {

		//Set default values for optional parameters
		X = (isNaN(X)) ? 0 : X;
		Y = (isNaN(Y)) ? 0 : Y;
		Width = (isNaN(Width)) ? 0 : Width;
		Height = (isNaN(Height)) ? 0 : Height;
		Divisions = (isNaN(Divisions)) ? 3 : Divisions;

		if(FlxQuadTree.bounds == null)
			FlxQuadTree.bounds = new FlxRect();
		FlxQuadTree.bounds.x = X;
		FlxQuadTree.bounds.y = Y;
		if(Width > 0)
			FlxQuadTree.bounds.width = Width;
		if(Height > 0)
			FlxQuadTree.bounds.height = Height;
		if(Divisions > 0)
			FlxQuadTree.divisions = Divisions;
	},

	overlap: function(Object1, Object2, Callback) {
		if( (Object1 == null) || !Object1.exists ||
			(Object2 == null) || !Object2.exists )
			return false;
		FlxU.quadTree = new FlxQuadTree(FlxQuadTree.bounds.x,FlxQuadTree.bounds.y,FlxQuadTree.bounds.width,FlxQuadTree.bounds.height);
		FlxU.quadTree.add(Object1,FlxQuadTree.A_LIST);
		if(Object1 === Object2)
			return FlxU.quadTree.overlap(false,Callback);
		FlxU.quadTree.add(Object2,FlxQuadTree.B_LIST);

		return FlxU.quadTree.overlap(true,Callback);
	},

	//FIXME: Strict comparison of Object1 and Object2 may not do what intended here. Test.
	collide: function(Object1, Object2) {
		if( (Object1 == null) || !Object1.exists ||
			(Object2 == null) || !Object2.exists )
			return false;
		FlxU.quadTree = new FlxQuadTree(FlxQuadTree.bounds.x,FlxQuadTree.bounds.y,FlxQuadTree.bounds.width,FlxQuadTree.bounds.height);
		FlxU.quadTree.add(Object1,FlxQuadTree.A_LIST);
		var match = (Object1 == Object2);
		if(!match)
			FlxU.quadTree.add(Object2, FlxQuadTree.B_LIST);
		var cx = FlxU.quadTree.overlap(!match, FlxU.solveXCollision);
		var cy = FlxU.quadTree.overlap(!match, FlxU.solveYCollision);
		return cx || cy;			
	}, 

	solveXCollision: function(Object1, Object2)
	{
		//Avoid messed up collisions ahead of time
		var o1 = Object1.colVector.x;
		var o2 = Object2.colVector.x;
		if(o1 == o2)
			return false;
		
		//Give the objects a heads up that we're about to resolve some collisions
		Object1.preCollide(Object2);
		Object2.preCollide(Object1);

		//Basic resolution variables
		var f1;
		var f2;
		var overlap;
		var hit = false;
		var p1hn2;
		
		//Directional variables
		var obj1Stopped = o1 == 0;
		var obj1MoveNeg = o1 < 0;
		var obj1MovePos = o1 > 0;
		var obj2Stopped = o2 == 0;
		var obj2MoveNeg = o2 < 0;
		var obj2MovePos = o2 > 0;
		
		//Offset loop variables
		var i1;
		var i2;
		var obj1Hull = Object1.colHullX;
		var obj2Hull = Object2.colHullX;
		var co1 = Object1.colOffsets;
		var co2 = Object2.colOffsets;
		var l1 = co1.length;
		var l2 = co2.length;
		var ox1;
		var oy1;
		var ox2;
		var oy2;
		var r1;
		var r2;
		var sv1;
		var sv2;
		
		//Decide based on object's movement patterns if it was a right-side or left-side collision
		p1hn2 = ((obj1Stopped && obj2MoveNeg) || (obj1MovePos && obj2Stopped) || (obj1MovePos && obj2MoveNeg) || //the obvious cases
				(obj1MoveNeg && obj2MoveNeg && (((o1>0)?o1:-o1) < ((o2>0)?o2:-o2))) || //both moving left, obj2 overtakes obj1
				(obj1MovePos && obj2MovePos && (((o1>0)?o1:-o1) > ((o2>0)?o2:-o2))) ); //both moving right, obj1 overtakes obj2
		
		//Check to see if these objects allow these collisions
		if(p1hn2?(!Object1.collideRight || !Object2.collideLeft):(!Object1.collideLeft || !Object2.collideRight))
			return false;
		
		//this looks insane, but we're just looping through collision offsets on each object
		i1 = 0;
		while(i1 < l1)
		{
			ox1 = co1[i1].x;
			oy1 = co1[i1].y;
			obj1Hull.x += ox1;
			obj1Hull.y += oy1;
			i2 = 0;
			while(i2 < l2)
			{
				ox2 = co2[i2].x;
				oy2 = co2[i2].y;
				obj2Hull.x += ox2;
				obj2Hull.y += oy2;
				
				//See if it's a actually a valid collision
				if( (obj1Hull.x + obj1Hull.width  < obj2Hull.x + FlxU.roundingError) ||
					(obj1Hull.x + FlxU.roundingError > obj2Hull.x + obj2Hull.width) ||
					(obj1Hull.y + obj1Hull.height < obj2Hull.y + FlxU.roundingError) ||
					(obj1Hull.y + FlxU.roundingError > obj2Hull.y + obj2Hull.height) )
				{
					obj2Hull.x = obj2Hull.x - ox2;
					obj2Hull.y = obj2Hull.y - oy2;
					i2++;
					continue;
				}

				//Calculate the overlap between the objects
				if(p1hn2)
				{
					if(obj1MoveNeg)
						r1 = obj1Hull.x + Object1.colHullY.width;
					else
						r1 = obj1Hull.x + obj1Hull.width;
					if(obj2MoveNeg)
						r2 = obj2Hull.x;
					else
						r2 = obj2Hull.x + obj2Hull.width - Object2.colHullY.width;
				}
				else
				{
					if(obj2MoveNeg)
						r1 = -obj2Hull.x - Object2.colHullY.width;
					else
						r1 = -obj2Hull.x - obj2Hull.width;
					if(obj1MoveNeg)
						r2 = -obj1Hull.x;
					else
						r2 = -obj1Hull.x - obj1Hull.width + Object1.colHullY.width;
				}
				overlap = r1 - r2;
				
				//Slightly smarter version of checking if objects are 'fixed' in space or not
				f1 = Object1.fixed;
				f2 = Object2.fixed;
				if(f1 && f2)
				{
					f1 = f1 && ((Object1.colVector.x == 0) && (o1 == 0));
					f2 = f2 && ((Object2.colVector.x == 0) && (o2 == 0));
				}

				//Last chance to skip out on a bogus collision resolution
				if( (overlap == 0) ||
					((!f1 && ((overlap>0)?overlap:-overlap) > obj1Hull.width*0.8)) ||
					((!f2 && ((overlap>0)?overlap:-overlap) > obj2Hull.width*0.8)) )
				{
					obj2Hull.x = obj2Hull.x - ox2;
					obj2Hull.y = obj2Hull.y - oy2;
					i2++;
					continue;
				}
				hit = true;
				
				//Adjust the objects according to their flags and stuff
				sv1 = Object2.velocity.x;
				sv2 = Object1.velocity.x;
				if(!f1 && f2)
				{
					if(Object1._group)
						Object1.reset(Object1.x - overlap,Object1.y);
					else
						Object1.x = Object1.x - overlap;
				}
				else if(f1 && !f2)
				{
					if(Object2._group)
						Object2.reset(Object2.x + overlap,Object2.y);
					else
						Object2.x += overlap;
				}
				else if(!f1 && !f2)
				{
					overlap /= 2;
					if(Object1._group)
						Object1.reset(Object1.x - overlap,Object1.y);
					else
						Object1.x = Object1.x - overlap;
					if(Object2._group)
						Object2.reset(Object2.x + overlap,Object2.y);
					else
						Object2.x += overlap;
					sv1 *= 0.5;
					sv2 *= 0.5;
				}
				if(p1hn2)
				{
					Object1.hitRight(Object2,sv1);
					Object2.hitLeft(Object1,sv2);
				}
				else
				{
					Object1.hitLeft(Object2,sv1);
					Object2.hitRight(Object1,sv2);
				}
				
				//Adjust collision hulls if necessary
				if(!f1 && (overlap != 0))
				{
					if(p1hn2)
						obj1Hull.width = obj1Hull.width - overlap;
					else
					{
						obj1Hull.x = obj1Hull.x - overlap;
						obj1Hull.width += overlap;
					}
					Object1.colHullY.x = Object1.colHullY.x - overlap;
				}
				if(!f2 && (overlap != 0))
				{
					if(p1hn2)
					{
						obj2Hull.x += overlap;
						obj2Hull.width = obj2Hull.width - overlap;
					}
					else
						obj2Hull.width += overlap;
					Object2.colHullY.x += overlap;
				}
				obj2Hull.x = obj2Hull.x - ox2;
				obj2Hull.y = obj2Hull.y - oy2;
				i2++;
			}
			obj1Hull.x = obj1Hull.x - ox1;
			obj1Hull.y = obj1Hull.y - oy1;
			i1++;
		}

		return hit;
	},


	solveYCollision: function(Object1, Object2)
	{
		//Avoid messed up collisions ahead of time
		var o1 = Object1.colVector.y;
		var o2 = Object2.colVector.y;
		if(o1 == o2)
			return false;
		
		//Give the objects a heads up that we're about to resolve some collisions
		Object1.preCollide(Object2);
		Object2.preCollide(Object1);
		
		//Basic resolution variables
		var f1;
		var f2;
		var overlap;
		var hit = false;
		var p1hn2;
		
		//Directional variables
		var obj1Stopped = o1 == 0;
		var obj1MoveNeg = o1 < 0;
		var obj1MovePos = o1 > 0;
		var obj2Stopped = o2 == 0;
		var obj2MoveNeg = o2 < 0;
		var obj2MovePos = o2 > 0;
		
		//Offset loop variables
		var i1;
		var i2;
		var obj1Hull = Object1.colHullY;
		var obj2Hull = Object2.colHullY;
		var co1 = Object1.colOffsets;
		var co2 = Object2.colOffsets;
		var l1 = co1.length;
		var l2 = co2.length;
		var ox1;
		var oy1;
		var ox2;
		var oy2;
		var r1;
		var r2;
		var sv1;
		var sv2;
		
		//Decide based on object's movement patterns if it was a top or bottom collision
		p1hn2 = ((obj1Stopped && obj2MoveNeg) || (obj1MovePos && obj2Stopped) || (obj1MovePos && obj2MoveNeg) || //the obvious cases
			(obj1MoveNeg && obj2MoveNeg && (((o1>0)?o1:-o1) < ((o2>0)?o2:-o2))) || //both moving up, obj2 overtakes obj1
			(obj1MovePos && obj2MovePos && (((o1>0)?o1:-o1) > ((o2>0)?o2:-o2))) ); //both moving down, obj1 overtakes obj2
		
		//Check to see if these objects allow these collisions
		if(p1hn2?(!Object1.collideBottom || !Object2.collideTop):(!Object1.collideTop || !Object2.collideBottom))
			return false;
		
		//this looks insane, but we're just looping through collision offsets on each object
		i1 = 0;
		while(i1 < l1)
		{
			ox1 = co1[i1].x;
			oy1 = co1[i1].y;
			obj1Hull.x += ox1;
			obj1Hull.y += oy1;
			i2 = 0;
			while(i2 < l2)
			{
				ox2 = co2[i2].x;
				oy2 = co2[i2].y;
				obj2Hull.x += ox2;
				obj2Hull.y += oy2;
				
				//See if it's a actually a valid collision
				if( (obj1Hull.x + obj1Hull.width  < obj2Hull.x + FlxU.roundingError) ||
					(obj1Hull.x + FlxU.roundingError > obj2Hull.x + obj2Hull.width) ||
					(obj1Hull.y + obj1Hull.height < obj2Hull.y + FlxU.roundingError) ||
					(obj1Hull.y + FlxU.roundingError > obj2Hull.y + obj2Hull.height) )
				{
					obj2Hull.x = obj2Hull.x - ox2;
					obj2Hull.y = obj2Hull.y - oy2;
					i2++;
					continue;
				}
				
				//Calculate the overlap between the objects
				if(p1hn2)
				{
					if(obj1MoveNeg)
						r1 = obj1Hull.y + Object1.colHullX.height;
					else
						r1 = obj1Hull.y + obj1Hull.height;
					if(obj2MoveNeg)
						r2 = obj2Hull.y;
					else
						r2 = obj2Hull.y + obj2Hull.height - Object2.colHullX.height;
				}
				else
				{
					if(obj2MoveNeg)
						r1 = -obj2Hull.y - Object2.colHullX.height;
					else
						r1 = -obj2Hull.y - obj2Hull.height;
					if(obj1MoveNeg)
						r2 = -obj1Hull.y;
					else
						r2 = -obj1Hull.y - obj1Hull.height + Object1.colHullX.height;
				}
				overlap = r1 - r2;
				
				//Slightly smarter version of checking if objects are 'fixed' in space or not
				f1 = Object1.fixed;
				f2 = Object2.fixed;
				if(f1 && f2)
				{
					f1 = f1 && ((Object1.colVector.x == 0) && (o1 == 0));
					f2 = f2 && ((Object2.colVector.x == 0) && (o2 == 0));
				}
				
				//Last chance to skip out on a bogus collision resolution
				if( (overlap == 0) ||
					((!f1 && ((overlap>0)?overlap:-overlap) > obj1Hull.height*0.8)) ||
					((!f2 && ((overlap>0)?overlap:-overlap) > obj2Hull.height*0.8)) )
				{
					obj2Hull.x = obj2Hull.x - ox2;
					obj2Hull.y = obj2Hull.y - oy2;
					i2++;
					continue;
				}
				hit = true;
				
				//Adjust the objects according to their flags and stuff
				sv1 = Object2.velocity.y;
				sv2 = Object1.velocity.y;
				if(!f1 && f2)
				{
					if(Object1._group)
						Object1.reset(Object1.x, Object1.y - overlap);
					else
						Object1.y = Object1.y - overlap;
				}
				else if(f1 && !f2)
				{
					if(Object2._group)
						Object2.reset(Object2.x, Object2.y + overlap);
					else
						Object2.y += overlap;
				}
				else if(!f1 && !f2)
				{
					overlap /= 2;
					if(Object1._group)
						Object1.reset(Object1.x, Object1.y - overlap);
					else
						Object1.y = Object1.y - overlap;
					if(Object2._group)
						Object2.reset(Object2.x, Object2.y + overlap);
					else
						Object2.y += overlap;
					sv1 *= 0.5;
					sv2 *= 0.5;
				}
				if(p1hn2)
				{
					Object1.hitBottom(Object2,sv1);
					Object2.hitTop(Object1,sv2);
				}
				else
				{
					Object1.hitTop(Object2,sv1);
					Object2.hitBottom(Object1,sv2);
				}
				
				//Adjust collision hulls if necessary
				if(!f1 && (overlap != 0))
				{
					if(p1hn2)
					{
						obj1Hull.y = obj1Hull.y - overlap;
						
						//This code helps stuff ride horizontally moving platforms.
						if(f2 && Object2.moves)
						{
							sv1 = Object2.colVector.x;
							Object1.x += sv1;
							obj1Hull.x += sv1;
							Object1.colHullX.x += sv1;
						}
					}
					else
					{
						obj1Hull.y = obj1Hull.y - overlap;
						obj1Hull.height += overlap;
					}
				}
				if(!f2 && (overlap != 0))
				{
					if(p1hn2)
					{
						obj2Hull.y += overlap;
						obj2Hull.height = obj2Hull.height - overlap;
					}
					else
					{
						obj2Hull.height += overlap;
					
						//This code helps stuff ride horizontally moving platforms.
						if(f1 && Object1.moves)
						{
							sv2 = Object1.colVector.x;
							Object2.x += sv2;
							obj2Hull.x += sv2;
							Object2.colHullX.x += sv2;
						}
					}
				}
				obj2Hull.x = obj2Hull.x - ox2;
				obj2Hull.y = obj2Hull.y - oy2;
				i2++;
			}
			obj1Hull.x = obj1Hull.x - ox1;
			obj1Hull.y = obj1Hull.y - oy1;
			i1++;
		}
		
		return hit;
	}


});

//Static class, so replace class definition with an instance of the class
FlxU = new FlxU();
FlxU.roundingError = 0.000001;
FlxU.quadTree = null;
FlxPoint = new Class({

	initialize: function(X, Y) {
		X = isNaN(X) ? 0 : X;
		Y = isNaN(Y) ? 0 : Y;

		this.x = X;
		this.y = Y;
	}

});
FlxRect = new Class({

	Extends: FlxPoint,

	initialize: function(X, Y, Width, Height) {
		this.parent(X, Y);
		this.width = Width;
		this.height = Height;
	    this.__defineGetter__("left", this.getLeft);
	    this.__defineGetter__("right", this.getRight);
	    this.__defineGetter__("top", this.getTop);
	    this.__defineGetter__("bottom", this.getBottom);
	},

	getLeft: function() { return this.x; },
	getRight: function() { return this.x + this.width; },
	getTop: function() { return this.y; },
	getBottom: function() { return this.y + this.height; }

});
FlxObject = new Class({

		Extends: FlxRect,

		initialize: function (X, Y, Width, Height) {

			this.parent(X,Y,Width,Height);

			this.__defineGetter__("solid", this.getSolid);
			this.__defineGetter__("fixed", this.getFixed);

			this.__defineSetter__("solid", this.setSolid);
			this.__defineSetter__("fixed", this.setFixed);
			
			this.exists = true;
			this.active = true;
			this.visible = true;
			this._solid = true;
			this._fixed = false;
			this.moves = true;
			
			this.collideLeft = true;
			this.collideRight = true;
			this.collideTop = true;
			this.collideBottom = true;
			
			this.origin = new FlxPoint();

			this.velocity = new FlxPoint();
			this.acceleration = new FlxPoint();
			this.drag = new FlxPoint();
			this.maxVelocity = new FlxPoint(10000,10000);
			
			this.angle = 0;
			this.angularVelocity = 0;
			this.angularAcceleration = 0;
			this.angularDrag = 0;
			this.maxAngular = 10000;
			
			this.thrust = 0;
			
			this.scrollFactor = new FlxPoint(1,1);
			this._flicker = false;
			this._flickerTimer = -1;
			this.health = 1;
			this.dead = false;
			this._point = new FlxPoint();
			this._rect = new FlxRect();
			this._flashPoint = new Point();
			
			this.colHullX = new FlxRect();
			this.colHullY = new FlxRect();
			this.colVector = new FlxPoint();
			this.colOffsets = new Array(new FlxPoint());
			this._group = false;

			this._point = new FlxPoint();

		},

		destroy: function() {},
		getSolid: function() { return this._solid; },
		setSolid: function(Solid) { this._solid = Solid; },
		getFixed: function() { return this._fixed; },
		setFixed: function(Fixed) { this._fixed = Fixed; },

		refreshHulls: function() {

			this.colHullX.x = this.x;
			this.colHullX.y = this.y;
			this.colHullX.width = this.width;
			this.colHullX.height = this.height;
			this.colHullY.x = this.x;
			this.colHullY.y = this.y;
			this.colHullY.width = this.width;
			this.colHullY.height = this.height;
		},

		updateMotion: function() {

			if(!this.moves)
				return;
			
			if(this._solid)
				this.refreshHulls();
			this.onFloor = false;
			var vc;

			this.vc = (FlxU.computeVelocity(this.angularVelocity,
					this.angularAcceleration,this.angularDrag,this.maxAngular) - this.angularVelocity)/2;
			this.angularVelocity += vc; 
			this.angle += this.angularVelocity*FlxG.elapsed;
			this.angularVelocity += this.vc;
			
			var thrustComponents;
			if(this.thrust != 0)
			{
				thrustComponents = FlxU.rotatePoint(-this.thrust,0,0,0,this.angle);
				var maxComponents = FlxU.rotatePoint(-this.maxThrust,0,0,0,this.angle);
				var max = ((maxComponents.x>0)?maxComponents.x:-maxComponents.x);
				if(max > ((maxComponents.y>0)?maxComponents.y:-maxComponents.y))
					maxComponents.y = max;
				else
					max = ((maxComponents.y>0)?maxComponents.y:-maxComponents.y);
				this.maxVelocity.x = this.maxVelocity.y = ((max>0)?max:-max);
			}
			else
				thrustComponents = FlxObject._pZero;

			vc = (FlxU.computeVelocity(this.velocity.x,this.acceleration.x+
					thrustComponents.x,this.drag.x,this.maxVelocity.x) - this.velocity.x)/2;
			this.velocity.x += vc;
			var xd = this.velocity.x*FlxG.elapsed;
			this.velocity.x += vc;
			
			vc = (FlxU.computeVelocity(this.velocity.y,this.acceleration.y+
					thrustComponents.y,this.drag.y,this.maxVelocity.y) - this.velocity.y)/2;
			this.velocity.y += vc;
			var yd = this.velocity.y*FlxG.elapsed;
			this.velocity.y += vc;
			
			this.x += xd;
			this.y += yd;
			
			//Update collision data with new movement results
			if(!this._solid)
				return;
			this.colVector.x = xd;
			this.colVector.y = yd;
			this.colHullX.width += ((this.colVector.x>0)?this.colVector.x:-this.colVector.x);
			if(this.colVector.x < 0)
				this.colHullX.x += this.colVector.x;
			this.colHullY.x = this.x;
			this.colHullY.height += ((this.colVector.y>0)?this.colVector.y:-this.colVector.y);
			if(this.colVector.y < 0)
				this.colHullY.y += this.colVector.y;
		},

		updateFlickering: function()  {
			if(this.flickering())
			{
				if(this._flickerTimer > 0)
				{
					this._flickerTimer = this._flickerTimer - FlxG.elapsed;
					if(this._flickerTimer == 0)
						this._flickerTimer = -1;
				}
				if(this._flickerTimer < 0)
					this.flicker(-1);
				else
				{
					this._flicker = !this._flicker;
					this.visible = !this._flicker;
				}
			}
		},

		update: function() {
			this.updateMotion();
			this.updateFlickering();
		},

		render: function() {},

		overlaps: function(Obj)
		{
			this.getScreenXY(this._point);
			var tx = this._point.x;
			var ty = this._point.y;
			Obj.getScreenXY(this._point);
			if((this._point.x <= tx-Object.width) || (this._point.x >= tx+this.width) ||
					(this._point.y <= ty-Object.height) || (this._point.y >= ty+this.height)) {
				return false;
			}
			return true;
		},

		overlapsPoint: function(X, Y, PerPixel)
		{
			PerPixel = (PerPixel === undefined) ? false : PerPixel;
			X = X + FlxU.floor(FlxG.scroll.x);
			Y = Y + FlxU.floor(FlxG.scroll.y);
			this.getScreenXY(this._point);
			if((X <= this._point.x) || (X >= this._point.x+this.width) ||
					(Y <= this._point.y) || (Y >= this._point.y+this.height)) {
				return false;
			}
			return true;
		},

		collide: function(Obj)
		{
			return FlxU.collide(this, ((Obj === undefined) ? this : Obj));
		},

		preCollide: function(Obj)
		{
			//Most objects don't have to do anything here.
		},

		hitLeft: function(Contact,Velocity)
		{
			this.hitSide(Contact,Velocity);
		},

		hitRight: function(Contact, Velocity)
		{
			this.hitSide(Contact,Velocity);
		},

		hitSide: function(Contact, Velocity)
		{
			if(!this.fixed || (Contact.fixed && ((this.velocity.y != 0) || (this.velocity.x != 0))))
				this.velocity.x = Velocity;
		},

		hitTop: function(Contact,Velocity)
		{
			if(!this.fixed || (Contact.fixed && ((this.velocity.y != 0) || (this.velocity.x != 0))))
				this.velocity.y = Velocity;
		},

		hitBottom: function(Contact, Velocity)
		{
			this.onFloor = true;
			if(!this.fixed || (Contact.fixed && ((this.velocity.y != 0) || (this.velocity.x != 0))))
				this.velocity.y = Velocity;
		},

		//NOTE: I have no idea what you do with a "virtual" function
		hurt: function(Damage)
		{
			this.health = this.health - Damage;
			if(this.health <= 0)
				this.kill();
		},

		kill: function()
		{
			this.exists = false;
			this.dead = true;
		},

		flicker: function(Duration) {
			Duration = (Duration === undefined) ? 1 : Duration;
			this._flickerTimer = Duration;
			if (this._flickerTimer < 0) { this._flicker = false; this.visible = true; }
		},

		flickering: function() { return this._flickerTimer >= 0; },

		getScreenXY: function(Point)
		{
			if(Point == null) Point = new FlxPoint();
			Point.x = FlxU.floor(this.x + FlxU.roundingError)+FlxU.floor(FlxG.scroll.x*this.scrollFactor.x);
			Point.y = FlxU.floor(this.y + FlxU.roundingError)+FlxU.floor(FlxG.scroll.y*this.scrollFactor.y);
			return Point;
		},

		onScreen: function()
		{
			this.getScreenXY(this._point);
			if((this._point.x + this.width < 0) || (this._point.x > FlxG.width) ||
					(this._point.y + this.height < 0) || (this._point.y > FlxG.height)) {
				return false;
			}
			return true;
		},

		reset: function(X, Y)
		{
			this.x = X;
			this.y = Y;
			this.exists = true;
			this.dead = false;
		},

		getBoundingColor: function()
		{
			if(this.solid)
			{
				if(this.fixed)
					return 0x7f00f225;
				else
					return 0x7fff0012;
			}
			else
				return 0x7f0090e9;
		}

});

FlxObject._pZero = new FlxPoint();
//NOTE: _gfxSprite and _gfx are omitted, because they're only used as a buffer to draw a line
//		We can do this directly with canvas instead, drawing directly to _pixels
//TODO: Fix a couple spots after resource handling added
FlxSprite = new Class({

	Extends: FlxObject,

	initialize: function(X, Y, SimpleGraphic) {
		this.parent(X, Y);
		this.__defineGetter__("pixels", this.getPixels);
		this.__defineSetter__("pixels", this.setPixels);
		this.__defineSetter__("solid", this.setSolid);
		this.__defineSetter__("fixed", this.setFixed);
		this.__defineGetter__("alpha", this.getAlpha);
		this.__defineSetter__("alpha", this.setAlpha);
		this.__defineGetter__("facing", this.getFacing);
		this.__defineSetter__("facing", this.setFacing);
		this.__defineGetter__("color", this.getColor);
		this.__defineSetter__("color", this.setColor);
		this.__defineGetter__("frame", this.getFrame);
		this.__defineSetter__("frame", this.setFrame);
		this.x = X;
		this.y = Y;

		this._flashRect = new Rectangle();
		this._flashRect2 = new Rectangle();
		this._flashPointZero = new Point();
		this.offset = new FlxPoint();
		
		this.scale = new FlxPoint(1,1);
		this._alpha = 1;
		this._color = 0x00ffffff;
		this.blend = null;
		this.antialiasing = false;
		
		this.finished = false;
		this._facing = FlxSprite.RIGHT;
		this._animations = new Array();
		this._flipped = 0;
		this._curAnim = null;
		this._curFrame = 0;
		this._caf = 0;
		this._frameTimer = 0;

		this._mtx = new Matrix();
		this._callback = null;
		//FIXME: We don't use this right now
		if(this._gfxSprite === undefined)
		{
			//this._gfxSprite = new Sprite();
			//this._gfx = this._gfxSprite.graphics;
		}
		
		if(SimpleGraphic === undefined)
			this.createGraphic(8,8);
		else
			this.loadGraphic(SimpleGraphic);

	},

	loadGraphic: function(Graphic, Animated, Reverse, Width, Height, Unique) {

		Animated = (Animated === undefined) ? false : Animated;
		Reverse = (Reverse === undefined) ? false : Reverse;
		Width = isNaN(Width) ? 0 : Width;
		Height = isNaN(Height) ? 0 : Height;
		Unique = (Unique === undefined) ? false : Unique;

		Graphic = Graphic.clone();

		this._bakedRotation = 0;
		this._pixels = FlxG.addBitmap(Graphic,Reverse,Unique); //FIXME random is stopgap for cache
		if(Reverse)
			this._flipped = this._pixels.width>>1;
		else
			this._flipped = 0;
		if(Width == 0)
		{
			if(Animated)
				Width = this._pixels.height;
			else if(this._flipped > 0)
				Width = this._pixels.width*0.5;
			else
				Width = this._pixels.width;
		}
		this.width = this.frameWidth = Width;
		if(Height == 0)
		{
			if(Animated)
				Height = this.width;
			else
				Height = this._pixels.height;
		}
		this.height = this.frameHeight = Height;
		this.resetHelpers();
		return this;
	},

	loadRotatedGraphic: function(Graphic, Rotations, Frame, AntiAliasing, AutoBuffer) {

		Rotations = isNaN(Rotations) ? 16 : Rotations;
		Frame = isNaN(Frame) ? -1 : Frame;
		AntiAliasing = (AntiAliasing === undefined) ? false : AntiAliasing;
		AutoBuffer = (AutoBuffer === undefined) ? false : AutoBuffer;

		//Create the brush and canvas
		var rows = Math.sqrt(Rotations);
		var brush = FlxG.addBitmap(Graphic);
		if(Frame >= 0)
		{
			//Using just a segment of the graphic - find the right bit here
			var full = brush;
			brush = new BitmapData(full.height,full.height);
			var rx = Frame * brush.width;
			var ry = 0;
			var fw = full.width;
			if(rx >= fw)
			{
				ry = Math.floor(rx/fw) * brush.height;
				rx %= fw;
			}
			this._flashRect.x = rx;
			this._flashRect.y = ry;
			this._flashRect.width = brush.width;
			this._flashRect.height = brush.height;
			brush.copyPixels(full,this._flashRect,this._flashPointZero);
		}
		
		var max = brush.width;
		if(brush.height > max)
			max = brush.height;
		if(AutoBuffer)
			max *= 1.5;
		var cols = FlxU.ceil(Rotations/rows);
		this.width = max*cols;
		this.height = max*rows;
		var key = String(Graphic) + ":" + Frame + ":" + width + "x" + height; //FIXME
		var skipGen = FlxG.checkBitmapCache(key);
		this._pixels = FlxG.createBitmap(this.width, this.height, 0, true, key);
		this.width = this.frameWidth = this._pixels.width;
		this.height = this.frameHeight = this._pixels.height;
		this._bakedRotation = 360/Rotations;
		
		//Generate a new sheet if necessary, then fix up the width & height
		if(!skipGen)
		{
			var r = 0;
			var c;
			var ba = 0;
			var bw2 = brush.width*0.5;
			var bh2 = brush.height*0.5;
			var gxc = max*0.5;
			var gyc = max*0.5;
			while(r < rows)
			{
				c = 0;
				while(c < cols)
				{
					this._mtx.identity();
					this._mtx.translate(-bw2,-bh2);
					this._mtx.rotate(ba*0.017453293);
					this._mtx.translate(max * c + gxc, gyc);
					ba += this._bakedRotation;
					this._pixels.draw(brush,this._mtx,null,null,null,AntiAliasing);
					c++;
				}
				gyc += max;
				r++;
			}
		}
		this.frameWidth = this.frameHeight = this.width = this.height = max;
		this.resetHelpers();
		return this;
	},

	createGraphic: function(Width,Height, Color, Unique, Key) {
		Color = isNaN(Color) ? 0xFFFFFFFF : Color;
		Unique = (Unique === undefined) ? false : Unique;
		Key = (Key === undefined) ? null : Key;

		this._bakedRotation = 0;
		this._pixels = FlxG.createBitmap(Width,Height,Color,Unique,Key);
		this.width = this.frameWidth = this._pixels.width;
		this.height = this.frameHeight = this._pixels.height;
		this.resetHelpers();
		return this;
	},

	getPixels: function() {
		return this._pixels;
	},

	setPixels: function(Pixels) {
		this._pixels = Pixels;
		this.width = this.frameWidth = this._pixels.width;
		this.height = this.frameHeight = this._pixels.height;
		this.resetHelpers();
	},

	resetHelpers: function() {

		this._boundsVisible = false;
		this._flashRect.x = 0;
		this._flashRect.y = 0;
		this._flashRect.width = this.frameWidth;
		this._flashRect.height = this.frameHeight;
		this._flashRect2.x = 0;
		this._flashRect2.y = 0;
		this._flashRect2.width = this._pixels.width;
		this._flashRect2.height = this._pixels.height;
		if((this._framePixels == null) || (this._framePixels.width != this.width) || (this._framePixels.height != this.height)) {
			this._framePixels = new BitmapData(this.width,this.height);
		}
		if((this._bbb == null) || (this._bbb.width != this.width) || (this._bbb.height != this.height))
			this._bbb = new BitmapData(this.width,this.height);
		this.origin.x = this.frameWidth*0.5;
		this.origin.y = this.frameHeight*0.5;
		this._framePixels.copyPixels(this._pixels,this._flashRect,this._flashPointZero);
		this.frames = (this._flashRect2.width / this._flashRect.width) * (this._flashRect2.height / this._flashRect.height);
		if(this._ct != null) this._framePixels.colorTransform(this._flashRect,this._ct);
		if(FlxG.showBounds)
			this.drawBounds();
		this._caf = 0;
		this.refreshHulls();
	},

	setSolid: function(Solid) {
		this.parent(Solid);
		var os = this._solid;
		this._solid = Solid;
		if((os != this._solid) && FlxG.showBounds)
			this.calcFrame();
	},

	setFixed: function(Fixed) {
		this.parent(Fixed);
		var of = this._fixed;
		this._fixed = Fixed;
		if((of != this._fixed) && FlxG.showBounds)
			this.calcFrame();
	},

	getFacing: function() {
		return this._facing;
	},
	
	setFacing: function(Direction) {
		var c = this._facing != Direction;
		this._facing = Direction;
		if(c) this.calcFrame();
	},
	
	getAlpha: function() {
		return this._alpha;
	},
	
	setAlpha: function(Alpha) {
		if(Alpha > 1) Alpha = 1;
		if(Alpha < 0) Alpha = 0;
		if(Alpha == this._alpha) return;
		this._alpha = Alpha;
		if((this._alpha != 1) || (this._color != 0x00ffffff))
			this._ct = new ColorTransform((this._color>>16)*0.00392,(this._color>>8&0xff)*0.00392,(this._color&0xff)*0.00392,this._alpha);
		else this._ct = null;
		this.calcFrame();
	},

	getColor: function()
	{
		return this._color;
	},
	
	setColor: function(Color)
	{
		Color &= 0x00ffffff;
		if(this._color == Color) return;
		this._color = Color;
		if((this._alpha != 1) || (this._color != 0x00ffffff))
			this._ct = new ColorTransform((this._color>>16)*0.00392,(this._color>>8&0xff)*0.00392,(this._color&0xff)*0.00392,this._alpha);
		else this._ct = null;
		this.calcFrame();
	},

	draw: function(Brush,X,Y) {
		X = isNaN(X) ? 0 : X;
		Y = isNaN(Y) ? 0 : Y;		

		var b = Brush._framePixels;
		
		//Simple draw
		if(((Brush.angle == 0) || (Brush._bakedRotation > 0)) && (Brush.scale.x == 1) && (Brush.scale.y == 1) && (Brush.blend === null || Brush.blend === undefined))
		{
			this._flashPoint.x = X;
			this._flashPoint.y = Y;
			this._flashRect2.width = b.width;
			this._flashRect2.height = b.height;
			this._pixels.copyPixels(b,this._flashRect2,this._flashPoint,null,null,true);
			this._flashRect2.width = this._pixels.width;
			this._flashRect2.height = this._pixels.height;
			this.calcFrame();
			return;
		}

		//Advanced draw
		this._mtx.identity();
		this._mtx.translate(-Brush.origin.x,-Brush.origin.y);
		this._mtx.scale(Brush.scale.x,Brush.scale.y);
		if(Brush.angle != 0)
			this._mtx.rotate(Brush.angle * 0.017453293);
		this._mtx.translate(X + Brush.origin.x, Y + Brush.origin.y);
		this._pixels.draw(b,this._mtx,null,Brush.blend,null,Brush.antialiasing);
		this.calcFrame();
	},

	//FIXME: Not currently implemented. Depends on Sprite. Either make wrapper or write native alternative
	drawLine: function(StartX,StartY,EndX,EndY,Color,Thickness) {
		Thickness = isNaN(Thickness) ? 1 : Thickness;
	/*
		//Draw line
		_gfx.clear();
		_gfx.moveTo(StartX,StartY);
		_gfx.lineStyle(Thickness,Color);
		_gfx.lineTo(EndX,EndY);
		
		//Cache line to bitmap
		_pixels.draw(_gfxSprite);
		calcFrame();
	*/
	},

	fill: function(Color) {
		this._pixels.fillRect(this._flashRect2,Color);
		if(this._pixels != this._framePixels)
			this.calcFrame();
	},

	updateAnimation: function() {

		if(this._bakedRotation)
		{
			var oc = this._caf;
			var ta = this.angle % 360;
			if(ta < 0)
				ta += 360;
			this._caf = ta/this._bakedRotation;
			if(oc != this._caf)
				this.calcFrame();
			return;
		}
		if((this._curAnim !== undefined && this._curAnim !== null) && (this._curAnim.delay > 0) && (this._curAnim.looped || !this.finished))
		{
			this._frameTimer += FlxG.elapsed;
			while(this._frameTimer > this._curAnim.delay)
			{
				this._frameTimer = this._frameTimer - this._curAnim.delay;
				if(this._curFrame == this._curAnim.frames.length-1)
				{
					if(this._curAnim.looped) this._curFrame = 0;
					this.finished = true;
				}
				else
					this._curFrame++;
				this._caf = this._curAnim.frames[this._curFrame];
				this.calcFrame();
			}
		}
	},

	update: function() {
		this.updateMotion();
		this.updateAnimation();
		this.updateFlickering();
	},

	renderSprite: function() {
		if(FlxG.showBounds != this._boundsVisible)
			this.calcFrame();
		
		this.getScreenXY(this._point);
		this._flashPoint.x = this._point.x;
		this._flashPoint.y = this._point.y;
		
		//Simple render
		this.angle = 0 //FIXME: hack! Ensures simple render TODO: Figure out why angle is NaN
		if(((this.angle == 0) || (this._bakedRotation > 0)) && (this.scale.x == 1) && (this.scale.y == 1) && (this.blend === null || this.blend === undefined))
		{
			FlxG.buffer.copyPixels(this._framePixels,this._flashRect,this._flashPoint,null,null,true);
			return;
		}
		
		//Advanced render
		this._mtx.identity();
		this._mtx.translate(-this.origin.x,-this.origin.y);
		this._mtx.scale(this.scale.x,this.scale.y);
		if(this.angle != 0)
			this._mtx.rotate(this.angle * 0.017453293);
		this._mtx.translate(this._point.x + this.origin.x, this._point.y + this.origin.y);
		FlxG.buffer.draw(this._framePixels,this._mtx,null,this.blend,null,this.antialiasing);
	},

	render: function() {
		this.renderSprite();
	},

	overlapsPoint: function(X, Y, PerPixel) {
		PerPixel = (PerPixel === undefined) ? false : PerPixel;

		X = X + FlxU.floor(FlxG.scroll.x);
		Y = Y + FlxU.floor(FlxG.scroll.y);
		this.getScreenXY(this._point);
		if(PerPixel)
			return this._framePixels.hitTest(new Point(0,0),0xFF,new Point(X-this._point.x,Y-this._point.y));
		else if((X <= this._point.x) || (X >= this._point.x + this.frameWidth) || (Y <= this._point.y) || (Y >= this._point.y + this.frameHeight))
			return false;
		return true;
	},

	//NOTE: virtual function
	onEmit: function() {
	},

	addAnimation: function(Name, Frames, FrameRate, Looped) {
		FrameRate = isNaN(FrameRate) ? 0 : FrameRate;
		Looped = (Looped === undefined) ? true : Looped;

		this._animations.push(new FlxAnim(Name,Frames,FrameRate,Looped));
	},

	addAnimationCallback: function(AnimationCallback) {
		this._callback = AnimationCallback;
	},

	play: function(AnimName,Force) {
		Force = (Force === undefined) ? false : Force;

		if(!Force && (this._curAnim !== null) && (this._curAnim !== undefined) && (AnimName == this._curAnim.name) && (this._curAnim.looped || !this.finished)) return;
		this._curFrame = 0;
		this._caf = 0;
		this._frameTimer = 0;
		var i = 0;
		var al = this._animations.length;
		while(i < al)
		{
			if(this._animations[i].name == AnimName)
			{
				this._curAnim = this._animations[i];
				if(this._curAnim.delay <= 0)
					this.finished = true;
				else
					this.finished = false;
				this._caf = this._curAnim.frames[this._curFrame];
				this.calcFrame();
				return;
			}
			i++;
		}
	},

	randomFrame: function() {
		this._curAnim = null;
		this._caf = Math.floor(FlxU.random()*(this._pixels.width/this.frameWidth));
		this.calcFrame();
	},

	getFrame: function() {
		return this._caf;
	},
	
	setFrame: function(Frame) {
		this._curAnim = null;
		this._caf = Frame;
		this.calcFrame();
	},

	getScreenXY: function(Point) {
		if(Point === undefined) Point = new FlxPoint();
		Point.x = FlxU.floor(this.x + FlxU.roundingError)+FlxU.floor(FlxG.scroll.x * this.scrollFactor.x) - this.offset.x;
		Point.y = FlxU.floor(this.y + FlxU.roundingError)+FlxU.floor(FlxG.scroll.y * this.scrollFactor.y) - this.offset.y;
		return Point;
	},

	calcFrame: function() {

		this._boundsVisible = false;
		var rx = this._caf * this.frameWidth;
		var ry = 0;

		//Handle sprite sheets
		var w = this._flipped ? this._flipped : this._pixels.width;
		if(rx >= w)
		{
			ry = Math.floor(rx/w) * this.frameHeight;
			rx %= w;
		}
		
		//handle reversed sprites
		if(this._flipped && (this._facing == FlxSprite.LEFT))
			rx = (this._flipped<<1) - rx - this.frameWidth;
		
		//Update display bitmap
		this._flashRect.x = rx;
		this._flashRect.y = ry;
		this._framePixels.copyPixels(this._pixels, this._flashRect, this._flashPointZero);
		this._flashRect.x = this._flashRect.y = 0;
		if(this._ct != null) this._framePixels.colorTransform(this._flashRect, this._ct);
		if(FlxG.showBounds)
			this.drawBounds();
		if(this._callback != null) this._callback(this._curAnim.name, this._curFrame, this._caf);
	},

	drawBounds: function()
	{
		this._boundsVisible = true;
		if((this._bbb == null) || (this._bbb.width != this.width) || (this._bbb.height != this.height))
			this._bbb = new BitmapData(this.width,this.height);
		var bbbc = this.getBoundingColor();
		this._bbb.fillRect(this._flashRect,0);
		var ofrw = this._flashRect.width;
		var ofrh = this._flashRect.height;
		this._flashRect.width = Math.floor(this.width);
		this._flashRect.height = Math.floor(this.height);
		this._bbb.fillRect(this._flashRect,bbbc);
		this._flashRect.width = this._flashRect.width - 2;
		this._flashRect.height = this._flashRect.height - 2;
		this._flashRect.x = 1;
		this._flashRect.y = 1;
		this._bbb.fillRect(this._flashRect,0);
		this._flashRect.width = ofrw;
		this._flashRect.height = ofrh;
		this._flashRect.x = this._flashRect.y = 0;
		this._flashPoint.x = Math.floor(this.offset.x);
		this._flashPoint.y = Math.floor(this.offset.y);
		this._framePixels.copyPixels(this._bbb,this._flashRect,this._flashPoint,null,null,true);
	},
	
	unsafeBind: function(Pixels) {
		this._pixels = this._framePixels = Pixels;
	}


});

FlxSprite.LEFT = 0;
FlxSprite.RIGHT = 1;
FlxSprite.UP = 2;
FlxSprite.DOWN = 3;
FlxGroup = new Class({

	Extends: FlxObject,

	initialize: function() {
		this.parent();
		this._group = true;
		this.solid = false;
		this.members = new Array();
		this._last = new FlxPoint();
		this._first = true;
	},

	add: function (Obj,ShareScroll)
	{
		ShareScroll = (ShareScroll === undefined) ? false : ShareScroll;
		if (this.members.indexOf(Obj) < 0)
			this.members[this.members.length] = Obj;
		if(ShareScroll)
			Obj.scrollFactor = this.scrollFactor;
		return Obj;
	},

	replace: function(OldObject, NewObject)
	{
		var index = this.members.indexOf(OldObject);
		if((index < 0) || (index >= this.members.length))
			return null;
		this.members[index] = NewObject;
		return NewObject;
	},

	remove: function(Obj,Splice)
	{
		Splice = (Splice === undefined) ? false : Splice;
		var index = this.members.indexOf(Obj);
		if((index < 0) || (index >= this.members.length))
			return null;
		if(Splice)
			this.members.splice(index,1);
		else
			this.members[index] = null;
		return Obj;
	},

	sort: function(Index,Order)
	{
		Index = (Index === undefined) ? "y" : Index;
		Order = (Order === undefined) ? FlxGroup.ASCENDING : Order;
		this._sortIndex = Index;
		this._sortOrder = Order;
		this.members.sort(this.sortHandler);
	},

	getFirstAvail: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != undefined) && !o.exists)
				return o;
		}
		return null;
	},

	getFirstNull: function()
	{
		var i = 0;
		var ml = this.members.length;
		while(i < ml)
		{
			if(this.members[i] == undefined)
				return i;
			else
				i++;
		}
		return -1;
	},

	resetFirstAvail: function(X, Y)
	{
		X = (X === undefined) ? 0 : X;
		Y = (Y === undefined) ? 0 : Y;
		var o = getFirstAvail();
		if(o == null)
			return false;
		o.reset(X,Y);
		return true;
	},

	getFirstExtant: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != null) && o.exists)
				return o;
		}
		return null;
	},

	getFirstAlive: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != null) && o.exists && !o.dead)
				return o;
		}
		return null;
	},

	getFirstDead: function()
	{
		var i= 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != null) && o.dead)
				return o;
		}
		return null;
	},

	countLiving: function()
	{
		var count = -1;
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if(o != null)
			{
				if(count < 0)
					count = 0;
				if(o.exists && !o.dead)
					count++;
			}
		}
		return count;
	},

	countDead: function()
	{
		var count = -1;
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if(o != null)
			{
				if(count < 0)
					count = 0;
				if(o.dead)
					count++;
			}
		}
		return count;
	},

	countOnScreen: function()
	{
		var count= -1;
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if(o != null)
			{
				if(count < 0)
					count = 0;
				if(o.onScreen())
					count++;
			}
		}
		return count;
	},

	getRandom: function()
	{
		var c = 0;
		var o = null;
		var l = this.members.length;
		var i = Math.floor(FlxU.random()*l);
		while((o === null || o === undefined) && (c < this.members.length))
		{
			o = this.members[(++i)%l];
			c++;
		}
		return o;
	},

	saveOldPosition: function()
	{
		if(this._first)
		{
			this._first = false;
			this._last.x = 0;
			this._last.y = 0;
			return;
		}
		this._last.x = this.x;
		this._last.y = this.y;
	},

	updateMembers: function()
	{
		var mx;
		var my;
		var moved = false;
		if((this.x != this._last.x) || (this.y != this._last.y))
		{
			moved = true;
			mx = this.x - this._last.x;
			my = this.y - this._last.y;
		}
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != null) && o.exists)
			{
				if(moved)
				{
					if(o._group)
						o.reset(o.x+mx,o.y+my);
					else
					{
						o.x += mx;
						o.y += my;
					}
				}
				if(o.active)
					o.update();
				if(moved && o.solid)
				{
					o.colHullX.width += ((mx>0)?mx:-mx);
					if(mx < 0)
						o.colHullX.x += mx;
					o.colHullY.x = this.x;
					o.colHullY.height += ((my>0)?my:-my);
					if(my < 0)
						o.colHullY.y += my;
					o.colVector.x += mx;
					o.colVector.y += my;
				}
			}
		}
	},

	update: function()
	{
		this.saveOldPosition();
		this.updateMotion();
		this.updateMembers();
		this.updateFlickering();
	},

	renderMembers: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if((o != null) && o.exists && o.visible)
				o.render();
		}
	},

	render: function()
	{
		this.renderMembers();
	},

	killMembers: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = this.members[i++];
			if(o != null)
				o.kill();
		}
	},

	kill: function()
	{
		this.killMembers();
		this.parent();
	},

	destroyMembers: function()
	{
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = members[i++];
			if(o != null)
				o.destroy();
		}
		this.members.length = 0;
	},

	destroy: function()
	{
		this.destroyMembers();
		this.parent();
	},

	reset: function(X,Y)
	{
		this.saveOldPosition();
		this.parent(X,Y);
		var mx;
		var my;
		var moved = false;
		if((this.x != this._last.x) || (this.y != this._last.y))
		{
			moved = true;
			mx = this.x - this._last.x;
			my = this.y - this._last.y;
		}
		var i = 0;
		var o;
		var ml = this.members.length;
		while(i < ml)
		{
			o = members[i++];
			if((o != null) && o.exists)
			{
				if(moved)
				{
					if(o._group)
						o.reset(o.x+mx,o.y+my);
					else
					{
						o.x += mx;
						o.y += my;
						if(this.solid)
						{
							o.colHullX.width += ((mx>0)?mx:-mx);
							if(mx < 0)
								o.colHullX.x += mx;
							o.colHullY.x = this.x;
							o.colHullY.height += ((my>0)?my:-my);
							if(my < 0)
								o.colHullY.y += my;
							o.colVector.x += mx;
							o.colVector.y += my;
						}
					}
				}
			}
		}
	},

	sortHandler: function(Obj1,Obj2)
	{
		if(Obj1[this._sortIndex] < Obj2[this._sortIndex])
			return this._sortOrder;
		else if(Obj1[this._sortIndex] > Obj2[this._sortIndex])
			return -this._sortOrder;
		return 0;
	}
});

FlxGroup.ASCENDING = FlxGroup.prototype.ASCENDING = -1;
FlxGroup.DESCENDING = FlxGroup.prototype.DESCENDING = 1;
FlxAnim = new Class({

	initialize: function (Name, Frames, FrameRate, Looped) {
		FrameRate = (FrameRate === undefined) ? 0 : FrameRate;
		Looped = (Looped === undefined) ? true : Looped;
		this.name = Name;
		this.delay = 0;
		if(FrameRate > 0)
			this.delay = 1.0/FrameRate;
		this.frames = Frames;
		this.looped = Looped;
	}

});
FlxConsole = new Class({

	initialize: function(X, Y, Zoom) {
		
		this.mtrUpdate = new FlxMonitor(16);
		this.mtrRender = new FlxMonitor(16);
		this.mtrTotal = new FlxMonitor(16);
		
		this._lines = new Array();
	},

	update: function() {
		var total = this.mtrTotal.average();
		$('debugFPS').value = (Math.round(1000 / total));
	},

	toggle: function() {},

	log: function() {},

	show: function() {},
	hide: function() {},

});
//FIXME: depends on loadGraphic in a few spots

FlxEmitter = new Class({

	Extends: FlxGroup,

	initialize: function(X, Y) {

		X = isNaN(X) ? 0 : X;
		Y = isNaN(Y) ? 0 : Y;

		this.parent();
		
		this.x = X;
		this.y = Y;
		this.width = 0;
		this.height = 0;
			
		this.minParticleSpeed = new FlxPoint(-100,-100);
		this.maxParticleSpeed = new FlxPoint(100,100);
		this.minRotation = -360;
		this.maxRotation = 360;
		this.gravity = 400;
		this.particleDrag = new FlxPoint();
		this.delay = 0;
		this.quantity = 0;
		this._counter = 0;
		this._explode = true;
		this.exists = false;
		this.on = false;
		this.justEmitted = false;
	},

	createSprites: function(Graphics, Quantity, BakedRotations, Multiple, Collide, Bounce) {

		Quantity = isNaN(Quantity) ? 50 : Quantity;
		BakedRotations = isNaN(BakedRotations) ? 16 : BakedRotations;
		Multiple = (Multiple === undefined) ? true : Multiple;
		Collide = isNaN(Collide) ? 0 : Collide;
		Bounce = isNaN(Bounce) ? 0 : Bounce;

		this.members = new Array();
		var r;
		var s;
		var tf = 1;
		var sw;
		var sh;
		if(Multiple)
		{
			s = new FlxSprite();
			s.loadGraphic(Graphics,true);
			tf = s.frames;
		}
		var i = 0;
		while(i < Quantity)
		{
			if((Collide > 0) && (Bounce > 0))
				s = new FlxParticle(Bounce);
			else
				s = new FlxSprite();
			if(Multiple)
			{
				r = FlxU.random()*tf;
				if(BakedRotations > 0)
					s.loadRotatedGraphic(Graphics,BakedRotations,r);
				else
				{
					s.loadGraphic(Graphics,true);
					s.frame = r;
				}
			}
			else
			{
				if(BakedRotations > 0)
					s.loadRotatedGraphic(Graphics,BakedRotations);
				else
					s.loadGraphic(Graphics);
			}
			if(Collide > 0)
			{
				sw = s.width;
				sh = s.height;
				s.width *= Collide;
				s.height *= Collide;
				s.offset.x = (sw-s.width)/2;
				s.offset.y = (sh-s.height)/2;
				s.solid = true;
			}
			else
				s.solid = false;
			s.exists = false;
			s.scrollFactor = scrollFactor;
			add(s);
			i++;
		}
		return this;
	},

	setSize: function(Width,Height)
	{
		this.width = Width;
		this.height = Height;
	},

	setXSpeed: function(Min, Max) {
		Min = isNaN(Min) ? 0 : Min;
		Max = isNaN(Max) ? 0 : Max;

		this.minParticleSpeed.x = Min;
		this.maxParticleSpeed.x = Max;
	},

	setYSpeed: function(Min, Max) {
		Min = isNaN(Min) ? 0 : Min;
		Max = isNaN(Max) ? 0 : Max;

		this.minParticleSpeed.y = Min;
		this.maxParticleSpeed.y = Max;
	},

	setRotation: function(Min, Max) {
		Min = isNaN(Min) ? 0 : Min;
		Max = isNaN(Max) ? 0 : Max;

		this.minRotation = Min;
		this.maxRotation = Max;
	},

	updateEmitter: function() {

		if(this._explode)
		{
			this._timer += FlxG.elapsed;
			if((this.delay > 0) && (this._timer > this.delay))
			{
				this.kill();
				return;
			}
			if(this.on)
			{
				this.on = false;
				var i = this._particle;
				var l = this.members.length;
				if(this.quantity > 0)
					l = this.quantity;
				l += this._particle;
				while(i < l)
				{
					this.emitParticle();
					i++;
				}
			}
			return;
		}
		if(!this.on)
			return;
		this._timer += FlxG.elapsed;
		while((this._timer > this.delay) && ((this.quantity <= 0) || (this._counter < this.quantity)))
		{
			this._timer -= this.delay;
			this.emitParticle();
		}
	},

	updateMembers: function() {
		var o;
		var i = 0;
		var l = this.members.length;
		while(i < l)
		{
			o = this.members[i++];
			if((o !== undefined && o !== null) && o.exists && o.active)
				o.update();
		}
	},

	update: function() {

		this.justEmitted = false;
		this.parent();
		this.updateEmitter();
	},

	start: function(Explode, Delay, Quantity) {

		Explode = (Explode === undefined) ? true : Explode;
		Delay = isNaN(Delay) ? 0 : Delay;
		Quantity = isNaN(Quantity) ? 0 : Quantity;

		if(this.members.length <= 0)
		{
			//FlxG.log("WARNING: there are no sprites loaded in your emitter.\nAdd some to FlxEmitter.members or use FlxEmitter.createSprites().");
			return;
		}
		this._explode = Explode;
		if(!this._explode)
			this._counter = 0;
		if(!this.exists)
			this._particle = 0;
		this.exists = true;
		this.visible = true;
		this.active = true;
		this.dead = false;
		this.on = true;
		this._timer = 0;
		if(this.quantity == 0)
			this.quantity = Quantity;
		else if(Quantity != 0)
			this.quantity = Quantity;
		if(Delay != 0)
			this.delay = Delay;
		if(this.delay < 0)
			this.delay = -this.delay;
		if(this.delay == 0)
		{
			if(Explode)
				this.delay = 3;	//default value for particle explosions
			else
				this.delay = 0.1;//default value for particle streams
		}
	},

	emitParticle: function()
	{
		this._counter++;
		var s = this.members[this._particle];
		s.visible = true;
		s.exists = true;
		s.active = true;
		s.x = this.x - (s.width>>1) + FlxU.random() * this.width;
		s.y = this.y - (s.height>>1) + FlxU.random()* this.height;
		s.velocity.x = this.minParticleSpeed.x;
		if(this.minParticleSpeed.x != this.maxParticleSpeed.x) s.velocity.x += FlxU.random()*(this.maxParticleSpeed.x-this.minParticleSpeed.x);
		s.velocity.y = this.minParticleSpeed.y;
		if(this.minParticleSpeed.y != this.maxParticleSpeed.y) s.velocity.y += FlxU.random()*(this.maxParticleSpeed.y-this.minParticleSpeed.y);
		s.acceleration.y = this.gravity;
		s.angularVelocity = this.minRotation;
		if(this.minRotation != this.maxRotation) s.angularVelocity += FlxU.random()*(this.maxRotation-this.minRotation);
		if(s.angularVelocity != 0) s.angle = FlxU.random()*360-180;
		s.drag.x = this.particleDrag.x;
		s.drag.y = this.particleDrag.y;
		this._particle++;
		if(this._particle >= this.members.length)
			this._particle = 0;
		s.onEmit();
		this.justEmitted = true;
	},

	stop: function(Delay)
	{
		Delay = isNaN(Delay) ? 3 : Delay;

		this._explode = true;
		this.delay = Delay;
		if(this.delay < 0)
			this.delay = -Delay;
		this.on = false;
	},

	at: function(Obj) {
		this.x = Obj.x + Obj.origin.x;
		this.y = Obj.y + Obj.origin.y;
	},

	kill: function() {
		this.parent();
		this.on = false;
	}

});
FlxFade = new Class({

	initialize: function() {
	},

	stop: function() {
	},

	update: function() {},

});
FlxFlash = new Class({

	initialize: function() {
	},

	stop: function() {
	},

	update: function() {},


});FlxGame = new Class({

	initialize: function(GameSizeX, GameSizeY, InitialState, Zoom) {
		Zoom = isNaN(Zoom) ? 2 : Zoom;
	
		this._zoom = Zoom;
		FlxState.bgColor = 0xFFAACEAA
		FlxG.setGameData(this, GameSizeX, GameSizeY, Zoom);
		this._elapsed = 0;
		this._total = 0;
		this.pause = new FlxPause();
		this._state = null;
		this._iState = InitialState;
		this._zeroPoint = new Point();

		this.useDefaultHotKeys = true;
		
		this._frame = null;
		this._gameXOffset = 0;
		this._gameYOffset = 0;
		
		this._paused = false;
		this._created = false;

		this.create();
	},

	//FIXME: We're not actually doing frames right now...
	addFrame: function(Frame, ScreenOffsetX, ScreenOffsetY) {
		this._frame = Frame;
		this._gameXOffset = ScreenOffsetX;
		this._gameYOffset = ScreenOffsetY;
		return this;
	},

	showSoundTray: function(Silent) {

		return; //FIXME: Bypassing this whole thing. Not using sound tray right now, also there's no SndBeep

		Silent = (Silent === undefined) ? false : Silent;

		if(!Silent)
			FlxG.play(SndBeep);
		this._soundTrayTimer = 1;
		this._soundTray.y = this._gameYOffset * this._zoom;
		this._soundTray.visible = true;
		var gv = Math.round(FlxG.volume * 10);
		if(FlxG.mute)
			gv = 0;
		for (var i = 0; i < this._soundTrayBars.length; i++)
		{
			if(i < gv) this._soundTrayBars[i].alpha = 1;
			else this._soundTrayBars[i].alpha = 0.5;
		}
	},

	//NOTE: Had Flash specific stage/display list stuff
	switchState: function(State)
	{

		//Basic reset stuff
		FlxG.panel.hide();
		FlxG.unfollow();
		FlxG.resetInput();
		FlxG.destroySounds();
		FlxG.flash.stop();
		FlxG.fade.stop();
		FlxG.quake.stop();
		//this._screen.x = 0;
		//this._screen.y = 0;
		
		//Swap the new state for the old one and dispose of it
		if(this._state !== null && this._state !== undefined) {
			this._state.destroy();
		}
		this._state = State;
		this._state.scaleX = this._state.scaleY = this._zoom;
		
		//Finally, create the new state
		this._state.create();
	},

	//e is a MooTools event object. It puts some convenient properties right on e,
	//		but leaves the native event object available on e.event as a fallback
	onKeyUp: function(e) {

		if((e.code == 192) || (e.code == 220)) //FOR ZE GERMANZ
		{
			this._console.toggle();
			return;
		}
		if(!FlxG.mobile && this.useDefaultHotKeys)
		{
			var c = e.code;
			var code = String.fromCharCode(e.code);	//NOTE: Not used anywhere....must be Adam's work in progress
			switch(c)
			{
				case 48:
				case 96:
					FlxG.mute = !FlxG.mute;
					this.showSoundTray();
					return;
				case 109:
				case 189:
					FlxG.mute = false;
					FlxG.volume = FlxG.volume - 0.1;
					this.showSoundTray();
					return;
				case 107:
				case 187:
					FlxG.mute = false;
					FlxG.volume = FlxG.volume + 0.1;
					this.showSoundTray();
					return;
				case 80:
					FlxG.pause = !FlxG.pause;
					break;
				default:
					break;
			}

		}
		FlxG.keys.handleKeyUp(e);
		var i = 0;
		var l = FlxG.gamepads.length;
		while(i < l)
			FlxG.gamepads[i++].handleKeyUp(e);

		e.preventDefault();

	},

	onKeyDown: function(e) {
		FlxG.keys.handleKeyDown(e);
		var i = 0;
		var l = FlxG.gamepads.length;
		while(i < l)
			FlxG.gamepads[i++].handleKeyDown(e);

		e.preventDefault();
	},

	//NOTE: Makes no use of event parameter, just passes it. Probably needs to for Flash's sake
	//TODO: Make this focus/blur pause behavior optional via FlxOptions
	onFocus: function(e) {
		if(FlxG.pause)
			FlxG.pause = false;
	},

	onFocusLost: function(e)
	{
		FlxG.pause = true;
	},

	//NOTE: Pretty useless now; removed Flash-specific stuff
	unpauseGame: function()
	{
		FlxG.resetInput();
		this._paused = false;
	},

	//NOTE: Also useless for Javascript. Can probably just hack these both out
	pauseGame: function()
	{
		if((this.x != 0) || (this.y != 0))
		{
			this.x = 0;
			this.y = 0;
		}
		this._paused = true;
	},

	doUpdate: function() {
	},

	//NOTE: Event parameter (e) probably unnecessary as it's just to appease Flash
	//			(called from an ENTER_FRAME event)
	//TODO: We need to actually draw the screen buffer to the main window Canvas:
	//		Normally, FlxGame has a Sprite named _screen, which contains a bitmap,
	//		that FlxG.buffer has a reference to (its BitmapData)
	//		Our update loop needs to blit FlxG.buffer onto the main canvas
	update: function(e) {

		var mark = flash.utils.getTimer();
		
		var i;
		var soundPrefs;

		//FlxG.buffer.fillRect(0, 0, 320, 240, FlxState.bgColor);
		StageContext.clearRect(0, 0, FlxG.width, FlxG.height);

		//Frame timing
		var ems = mark - this._total;
		this._elapsed = ems/1000;
		this._console.mtrTotal.add(ems);
		this._total = mark;
		FlxG.elapsed = this._elapsed;
		if(FlxG.elapsed > FlxG.maxElapsed)
			FlxG.elapsed = FlxG.maxElapsed;
		FlxG.elapsed *= FlxG.timeScale;
		
		//Sound tray crap
		if(this._soundTray !== null && this._soundTray !== undefined)
		{
			if(this._soundTrayTimer > 0)
				this._soundTrayTimer -= this._elapsed;
			else if(this._soundTray.y > - this._soundTray.height)
			{
				this._soundTray.y -= this._elapsed * FlxG.height*2;
				if(this._soundTray.y <= - this._soundTray.height)
				{
					this._soundTray.visible = false;
					
					//Save sound preferences
					soundPrefs = new FlxSave();
					if(soundPrefs.bind("flixel"))
					{
						if(soundPrefs.data.sound === undefined)
							soundPrefs.data.sound = new Object;
						soundPrefs.data.mute = FlxG.mute;
						soundPrefs.data.volume = FlxG.volume;
						soundPrefs.forceSave();
					}
				}
			}
		}

		//Animate flixel HUD elements
		FlxG.panel.update();
		//if(this._console.visible)
			this._console.update();
		
		//State updating
		FlxG.updateInput();
		FlxG.updateSounds();
		if(this._paused)
			this.pause.update();
		else
		{
			//Update the camera and game state
			FlxG.doFollow();
			this._state.update();
			
			//Update the various special effects
			if(FlxG.flash.exists)
				FlxG.flash.update();
			if(FlxG.fade.exists)
				FlxG.fade.update();
			FlxG.quake.update();
			//this._screen.x = FlxG.quake.x;
			//this._screen.y = FlxG.quake.y;
		}
		//Keep track of how long it took to update everything
		var updateMark = flash.utils.getTimer();
		this._console.mtrUpdate.add(updateMark - mark);
		
		//Render game content, special fx, and overlays
		this._state.preProcess();
		this._state.render();
		if(FlxG.flash.exists)
			FlxG.flash.render();
		if(FlxG.fade.exists)
			FlxG.fade.render();
		if(FlxG.panel.visible)
			FlxG.panel.render();
		if(FlxG.mouse.cursor !== null && FlxG.mouse.cursor !== undefined)
		{
			if(FlxG.mouse.cursor.active)
				FlxG.mouse.cursor.update();
			if(FlxG.mouse.cursor.visible)
				FlxG.mouse.cursor.render();
		}
		this._state.postProcess();
		if(this._paused)
			this.pause.render();
		//Keep track of how long it took to draw everything
		this._console.mtrRender.add(flash.utils.getTimer() - this.updateMark);
		//clear mouse wheel delta
		FlxG.mouse.wheel = 0;

		//StageContext.drawImage(FlxState.screen._pixels._canvas, 0, 0);
		StageContext.drawImage(FlxG.buffer._canvas, 0, 0);
	},

	create: function(e) {

		var i;
		var l;
		var soundPrefs;
		
		//NOTE: Removed Flash stuff here: setting up stage and adding _screen Sprite to it


		//NOTE: tmp is the main screen buffer. Normally added as child of _screen Sprite here
		//	It's also normally a Bitmap, but here we stripped it down to a direct BitmapData
		var tmp = new BitmapData(FlxG.width,FlxG.height,false,FlxState.bgColor);
		tmp.x = this._gameXOffset;
		tmp.y = this._gameYOffset;
		tmp.scaleX = tmp.scaleY = this._zoom;
		FlxG.buffer = tmp;
		
		//Initialize game console
		this._console = new FlxConsole(this._gameXOffset,this._gameYOffset,this._zoom);
		var vstring = FlxG.LIBRARY_NAME+" v"+FlxG.LIBRARY_MAJOR_VERSION+"."+FlxG.LIBRARY_MINOR_VERSION;

		//NOTE: Removed big chunk of text formatting stuff that's displayed on the console
		//		Add back in [debug] and [release] identifiers to console class directly
		
		//Add basic input even listeners
		//NOTE: Changed these significantly to fit Javascript + MooTools
		//		StageCanvas is a reference to the HTML Canvas element we draw the whole game on
		//		MooTools abstracts all event listeners through addEvent

		StageCanvas.addEvent("mousedown", FlxG.mouse.handleMouseDown.bindWithEvent(FlxG.mouse));
		StageCanvas.addEvent("mouseup", FlxG.mouse.handleMouseUp.bindWithEvent(FlxG.mouse));
		$(window).addEvent("keydown", this.onKeyDown.bindWithEvent(this));
		$(window).addEvent("keyup", this.onKeyUp.bindWithEvent(this));
		if(!FlxG.mobile)
		{
			//bindWithEvent to make sure "this" points to the right place within the handler function
			StageCanvas.addEvent("mouseout", FlxG.mouse.handleMouseOut.bindWithEvent(FlxG.mouse));
			StageCanvas.addEvent("mouseover", FlxG.mouse.handleMouseOver.bindWithEvent(FlxG.mouse));
			StageCanvas.addEvent("mousewheel", FlxG.mouse.handleMouseWheel.bindWithEvent(FlxG.mouse));

			//NOTE: Removed focus/blur events here. Only applies to Flash
			//	For our purposes, no functional difference compared to mouse out/over
			

			//NOTE: Removed large chunk that creates and styles sound tray
			
			//Check for saved sound preference data
			soundPrefs = new FlxSave();
			if(soundPrefs.bind("flixel") && (soundPrefs.data.sound !== undefined))
			{
				if(soundPrefs.data.volume !== undefined)
					FlxG.volume = soundPrefs.data.volume;
				if(soundPrefs.data.mute !=- undefined)
					FlxG.mute = soundPrefs.data.mute;
				this.showSoundTray(true);
			}
		}

		//NOTE: Removed Frame thing. Maybe add later
		
		//All set!
		this.switchState(new this._iState());
		FlxState.screen.unsafeBind(FlxG.buffer);

		//Framerate is in FPS, but setInterval wants milliseconds between frames
		//this.update.periodical(1000 * (1 / this.framerate), this);
		this.framerate = 60;
		setInterval(this.update.bind(this), 1000 * (1 / this.framerate));
	}


});
FlxInput = new Class({

	initialize: function() {
		this._t = 256;	//Constant. Size of map that holds keys
		this._lookup = new Object();
		this._map = new Array(this._t);
	},

	update: function() {
		var i = 0;
		while(i < this._t)
		{
			var o = this._map[i++];
			if(o === undefined) continue;
			if((o.last == -1) && (o.current == -1)) o.current = 0;
			else if((o.last == 2) && (o.current == 2)) o.current = 1;
			o.last = o.current;
		}
	},

	reset: function()
	{
		var i = 0;
		while(i < this._t)
		{
			var o = this._map[i++];
			if(o === undefined) continue;
			this[o.name] = false;
			o.current = 0;
			o.last = 0;
		}
	},

	pressed: function(Key) { return this[Key]; },
	justPressed: function(Key) { return this._map[this._lookup[Key]].current == 2; },
	justReleased: function(Key) { return this._map[this._lookup[Key]].current == -1; },

	handleKeyDown: function(event) {
		var o = this._map[event.code];
		if(o === undefined) return;
		if(o.current > 0) o.current = 1;
		else o.current = 2;
		this[o.name] = true;
	},

	handleKeyUp: function(event)
	{
		var o = this._map[event.code];
		if(o === undefined) return;
		if(o.current > 0) o.current = -1;
		else o.current = 0;
		this[o.name] = false;
	},

	addKey: function(KeyName, KeyCode)
	{
		this._lookup[KeyName] = KeyCode;
		this._map[KeyCode] = { name: KeyName, current: 0, last: 0 };
	}

});
//NOTE: More dummy classes
FlxGamepad = new Class({

	Extends: FlxInput,

	initialize: function() {
		this.parent();
	},

	reset: function() {
	},

	update: function() {
	},

});
FlxKeyboard = new Class({

	Extends: FlxInput,

	initialize: function() {
		this.parent();

		var i;
		
		//LETTERS
		i = 65;
		while(i <= 90)
			this.addKey(String.fromCharCode(i), i++);
		
		//NUMBERS
		i = 48;
		this.addKey("ZERO",i++);
		this.addKey("ONE",i++);
		this.addKey("TWO",i++);
		this.addKey("THREE",i++);
		this.addKey("FOUR",i++);
		this.addKey("FIVE",i++);
		this.addKey("SIX",i++);
		this.addKey("SEVEN",i++);
		this.addKey("EIGHT",i++);
		this.addKey("NINE",i++);
		i = 96;
		this.addKey("NUMPADZERO",i++);
		this.addKey("NUMPADONE",i++);
		this.addKey("NUMPADTWO",i++);
		this.addKey("NUMPADTHREE",i++);
		this.addKey("NUMPADFOUR",i++);
		this.addKey("NUMPADFIVE",i++);
		this.addKey("NUMPADSIX",i++);
		this.addKey("NUMPADSEVEN",i++);
		this.addKey("NUMPADEIGHT",i++);
		this.addKey("NUMPADNINE",i++);
		
		//FUNCTION KEYS
		i = 1;
		while(i <= 12)
			this.addKey("F"+i,111+(i++));
		
		//SPECIAL KEYS + PUNCTUATION
		this.addKey("ESCAPE",27);
		this.addKey("MINUS",189);
		this.addKey("NUMPADMINUS",109);
		this.addKey("PLUS",187);
		this.addKey("NUMPADPLUS",107);
		this.addKey("DELETE",46);
		this.addKey("BACKSPACE",8);
		this.addKey("LBRACKET",219);
		this.addKey("RBRACKET",221);
		this.addKey("BACKSLASH",220);
		this.addKey("CAPSLOCK",20);
		this.addKey("SEMICOLON",186);
		this.addKey("QUOTE",222);
		this.addKey("ENTER",13);
		this.addKey("SHIFT",16);
		this.addKey("COMMA",188);
		this.addKey("PERIOD",190);
		this.addKey("NUMPADPERIOD",110);
		this.addKey("SLASH",191);
		this.addKey("NUMPADSLASH",191);
		this.addKey("CONTROL",17);
		this.addKey("ALT",18);
		this.addKey("SPACE",32);
		this.addKey("UP",38);
		this.addKey("DOWN",40);
		this.addKey("LEFT",37);
		this.addKey("RIGHT",39);
	}

});
FlxList = new Class({

	initialize: function() {
		this.object = null;
		this.next = null;
	}

});
FlxMonitor = new Class({

	initialize: function(Size, Default) {
		Default = isNaN(Default) ? 0 : Default;

		this._size = Size;
		if(this._size <= 0)
			this._size = 1;
		this._itr = 0;
		this._data = new Array(this._size);
		var i = 0;
		while(i < this._size)
			this._data[i++] = Default;
	},

	add: function(Data)
	{
		this._data[this._itr++] = Data;
		if(this._itr >= this._size)
			this._itr = 0;
	},

	average: function()
	{
		var sum = 0;
		var i = 0;
		while(i < this._size)
			sum += this._data[i++];
		return sum/this._size;
	}

});
//TODO: Implememnt hiding of actual browser cursor.
//	Amazingly, FF, Chrome, Opera all support cursor:none
//	Implement this by setting style.cursor = "none" on the HTML Canvas element for the game
//	IE doesn't support it, of course. Needs a blank .cur cursor
FlxMouse = new Class({

	initialize: function()
	{
		this.x = 0;
		this.y = 0;
		this.screenX = 0;
		this.screenY = 0;
		this._current = 0;
		this._last = 0;
		this.cursor = null;
		this._out = false;
	},

	show: function(Graphic, XOffset, YOffset) {

		XOffset = isNaN(XOffset) ? 0 : XOffset;
		YOffset = isNaN(YOffset) ? 0 : YOffset;

		this._out = true;
		if(Graphic !== undefined)
			this.load(Graphic,XOffset,YOffset);
		else if(this.cursor != null)
			this.cursor.visible = true;
		else
			this.load(null);
	},

	hide: function() {

		if(this.cursor !== null) {
			this.cursor.visible = false;
			this._out = false;
		}
	},

	//FIXME: Needs asset handling. Needs "ImageDefaultCursor" as an asset
	load: function(Graphic, XOffset, YOffset) {
		XOffset = isNaN(XOffset) ? 0 : XOffset;
		YOffset = isNaN(YOffset) ? 0 : YOffset;

		if(Graphic === undefined || Graphic === null)
			Graphic = FlxMouse.ImgDefaultCursor;
		this.cursor = new FlxSprite(this.screenX,this.screenY,Graphic);
		this.cursor.solid = false;
		this.cursor.offset.x = XOffset;
		this.cursor.offset.y = YOffset;
	},

	unload: function()
	{
		if(this.cursor != null)
		{
			if(this.cursor.visible)
				this.load(null);
			else
				this.cursor = null;
		}
	},

	update: function(X, Y, XScroll, YScroll) {
		this.screenX = X;
		this.screenY = Y;
		this.x = screenX-FlxU.floor(XScroll);
		this.y = screenY-FlxU.floor(YScroll);
		if(this.cursor != null)
		{
			this.cursor.x = x;
			this.cursor.y = y;
		}
		if((this._last == -1) && (this._current == -1))
			this._current = 0;
		else if((this._last == 2) && (this._current == 2))
			this._current = 1;
		this._last = this._current;
	},

	reset: function() {
		this._current = 0;
		this._last = 0;
	},

	pressed: function() { return this._current > 0; },
	justPressed:function() { return this._current == 2; },
	justReleased:function() { return this._current == -1; },

	handleMouseDown: function(e) {
		if(this._current > 0) this._current = 1;
		else this._current = 2;
	},

	handleMouseUp: function(e) {
		if(this._current > 0) this._current = -1;
		else this._current = 0;
	},

	handleMouseOut: function(e) {

		if(this.cursor !== null)
		{
			this._out = this.cursor.visible;
			this.cursor.visible = false;
		}
	},

	handleMouseOver: function(e)
	{
		if(this.cursor !== null)
			this.cursor.visible = this._out;
	},

	//NOTE: Flixel expects: UP is positive, DOWN is negative
	//	Reality:
	//		OPERA: Up is -2, down is 2 (event.detail)
	//		FIREFOX: Up is -3, down is 3 (event.detail)
	//		CHOME: Up is +120, down is -120 (event.wheelDelta)
	//Luckily, all 3 can prevent default (no page scrolling)
	//TODO: Ensure that preventing scrolling only applies to in-game window
	//		When the users moves out of the window they should scroll again
	handleMouseWheel: function(e) {

		//NOTE: e is a MooTools event object. Actual event object is on e.event
		//For FF/Opera it's a DOMMouseScroll type event. For Chrome it's a WheelEvent
		
		if (e.event.detail) {
			this.wheel = e.event.detail * -1;
		} else if (e.event.wheelDelta) {
			this.wheel = e.event.wheelDelta / 40;
		}

		e.preventDefault();
	}

});

FlxMouse.ImgDefaultCursor = null;	//FIXME: Just a dummy placeholder
//NOTE: Dummy class. FlxPanel omitted due to low importance
FlxPanel = new Class({

	initialize: function() {
	},

	hide: function() {
	},

	update: function() {
	}

});
FlxParticle = new Class({

	Extends: FlxSprite,

	initialize: function(Bounce) {
		this.parent();
		this._bounce = Bounce;
	},

	hitSide: function(Contact, Velocity) {
		this.velocity.x = -this.velocity.x * this._bounce;
		if(this.angularVelocity != 0)
			this.angularVelocity = -this.angularVelocity * this._bounce;
	},

	hitBottom: function(Contact, Velocity)
	{
		this.onFloor = true;
		if(((this.velocity.y > 0) ? this.velocity.y : -this.velocity.y) > this._bounce*100)
		{
			this.velocity.y = -this.velocity.y * this._bounce;
			if(this.angularVelocity != 0)
				this.angularVelocity *= -this._bounce;
		}
		else
		{
			this.angularVelocity = 0;
			this.parent(Contact,Velocity);
		}
		this.velocity.x *= this._bounce;
	}

});
FlxPause = new Class({
	initialize: function() {
	},
});
FlxQuadTree = new Class({

	Extends: FlxRect,

	initialize: function(X, Y, Width, Height, Parent) {
		Parent = (Parent === undefined) ? null : Parent;

		this.parent(X,Y,Width,Height);

		this._headA = this._tailA = new FlxList();
		this._headB = this._tailB = new FlxList();

		//DEBUG: draw a randomly colored rectangle indicating this quadrant (may induce seizures)
		/*var brush = new FlxSprite().createGraphic(Width,Height,0xffffffff*FlxU.random());
		FlxState.screen.draw(brush,X+FlxG.scroll.x,Y+FlxG.scroll.y);*/

		
		//Copy the parent's children (if there are any)
		if(Parent != null)
		{
			var itr;
			var ot;
			if(Parent._headA.object != null)
			{
				itr = Parent._headA;
				while(itr != null)
				{
					if(this._tailA.object != null)
					{
						ot = _tailA;
						this._tailA = new FlxList();
						ot.next = this._tailA;
					}
					this._tailA.object = itr.object;
					itr = itr.next;
				}
			}
			if(Parent._headB.object != null)
			{
				itr = Parent._headB;
				while(itr != null)
				{
					if(this._tailB.object != null)
					{
						ot = this._tailB;
						this._tailB = new FlxList();
						ot.next = this._tailB;
					}
					this._tailB.object = itr.object;
					itr = itr.next;
				}
			}
		}
		else
			FlxQuadTree._min = (this.width + this.height)/(2 * FlxQuadTree.divisions);
		this._canSubdivide = (this.width > this._min) || (this.height > FlxQuadTree._min);
		
		//Set up comparison/sort helpers
		this._nw = null;
		this._ne = null;
		this._se = null;
		this._sw = null;
		this._l = this.x;
		this._r = this.x + this.width;
		this._hw = this.width/2;
		this._mx = this._l + this._hw;
		this._t = this.y;
		this._b = this.y + this.height;
		this._hh = this.height/2;
		this._my = this._t + this._hh;
	},

	add: function(Obj, List)
	{
		this._oa = List;
		if(Obj._group)
		{
			var i = 0;
			var m;
			var members = Obj.members;
			var l = members.length;
			while(i < l)
			{
				m = members[i++];
				if((m != null) && m.exists)
				{
					if(m._group)
						this.add(m,List);
					else if(m.solid)
					{
						FlxQuadTree._o = m;
						FlxQuadTree._ol = FlxQuadTree._o.x;
						FlxQuadTree._ot = FlxQuadTree._o.y;
						FlxQuadTree._or = FlxQuadTree._o.x + FlxQuadTree._o.width;
						FlxQuadTree._ob = FlxQuadTree._o.y + FlxQuadTree._o.height;
						this.addObject();
					}
				}
			}
		}
		if(Obj.solid)
		{
			FlxQuadTree._o = Obj;
			FlxQuadTree._ol = FlxQuadTree._o.x;
			FlxQuadTree._ot = FlxQuadTree._o.y;
			FlxQuadTree._or = FlxQuadTree._o.x + FlxQuadTree._o.width;
			FlxQuadTree._ob = FlxQuadTree._o.y + FlxQuadTree._o.height;
			this.addObject();
		}
	},

	addObject: function()
	{
		//If this quad (not its children) lies entirely inside this object, add it here
		if(!this._canSubdivide || ((this._l >= this._ol) && (this._r <= this._or) && (this._t >= this._ot) && (this._b <= this._ob)))
		{
			this.addToList();
			return;
		}
		
		//See if the selected object fits completely inside any of the quadrants
		if((this._ol > this._l) && (this._or < this._mx))
		{
			if((this._ot > this._t) && (this._ob < this._my))
			{
				if(this._nw == null)
					this._nw = new FlxQuadTree(this._l,this._t,this._hw,this._hh,this);
				this._nw.addObject();
				return;
			}
			if((this._ot > this._my) && (this._ob < this._b))
			{
				if(this._sw == null)
					this._sw = new FlxQuadTree(this._l,this._my,this._hw,this._hh,this);
				this._sw.addObject();
				return;
			}
		}
		if((this._ol > this._mx) && (this._or < this._r))
		{
			if((this._ot > this._t) && (this._ob < this._my))
			{
				if(this._ne == null)
					this._ne = new FlxQuadTree(this._mx,this._t,this._hw,this._hh,this);
				this._ne.addObject();
				return;
			}
			if((this._ot > this._my) && (this._ob < this._b))
			{
				if(this._se == null)
					this._se = new FlxQuadTree(this._mx,this._my,this._hw,this._hh,this);
				this._se.addObject();
				return;
			}
		}
		
		//If it wasn't completely contained we have to check out the partial overlaps
		if((this._or > this._l) && (this._ol < this._mx) && (this._ob > this._t) && (this._ot < this._my))
		{
			if(this._nw == null)
				this._nw = new FlxQuadTree(this._l,this._t,this._hw,this._hh,this);
			this._nw.addObject();
		}
		if((this._or > this._mx) && (this._ol < this._r) && (this._ob > this._t) && (this._ot < this._my))
		{
			if(this._ne == null)
				this._ne = new FlxQuadTree(this._mx,this._t,this._hw,this._hh,this);
			this._ne.addObject();
		}
		if((this._or > this._mx) && (this._ol < this._r) && (this._ob > this._my) && (this._ot < this._b))
		{
			if(this._se == null)
				this._se = new FlxQuadTree(this._mx,this._my,this._hw,this._hh,this);
			this._se.addObject();
		}
		if((this._or > this._l) && (this._ol < this._mx) && (this._ob > this._my) && (this._ot < this._b))
		{
			if(this._sw == null)
				this._sw = new FlxQuadTree(this._l,this._my,this._hw,this._hh,this);
			this._sw.addObject();
		}
	},

	addToList: function()
	{
		var ot;
		if(this._oa == FlxQuadTree.A_LIST)
		{
			if(this._tailA.object != null)
			{
				ot = this._tailA;
				this._tailA = new FlxList();
				ot.next = this._tailA;
			}
			this._tailA.object = this._o;
		}
		else
		{
			if(this._tailB.object != null)
			{
				ot = this._tailB;
				this._tailB = new FlxList();
				ot.next = this._tailB;
			}
			this._tailB.object = this._o;
		}
		if(!this._canSubdivide)
			return;
		if(this._nw != null)
			this._nw.addToList();
		if(this._ne != null)
			this._ne.addToList();
		if(this._se != null)
			this._se.addToList();
		if(this._sw != null)
			this._sw.addToList();
	},

	overlap: function(BothLists, Callback) {
		BothLists = (BothLists === undefined) ? true : BothLists;
		Callback = (Callback === undefined) ? null : Callback;

		this._oc = Callback;
		var c = false;
		var itr;
		if(BothLists)
		{
			//An A-B list comparison
			this._oa = FlxQuadTree.B_LIST;
			if(this._headA.object != null)
			{
				itr = this._headA;
				while(itr != null)
				{
					FlxQuadTree._o = itr.object;
					if(this._o.exists && this._o.solid && this.overlapNode())
						c = true;
					itr = itr.next;
				}
			}
			this._oa = FlxQuadTree.A_LIST;
			if(this._headB.object != null)
			{
				itr = this._headB;
				while(itr != null)
				{
					FlxQuadTree._o = itr.object;
					if(this._o.exists && this._o.solid)
					{
						if((this._nw != null) && this._nw.overlapNode())
							c = true;
						if((this._ne != null) && this._ne.overlapNode())
							c = true;
						if((this._se != null) && this._se.overlapNode())
							c = true;
						if((this._sw != null) && this._sw.overlapNode())
							c = true;
					}
					itr = itr.next;
				}
			}
		}
		else
		{
			//Just checking the A list against itself
			if(this._headA.object != null)
			{
				itr = this._headA;
				while(itr != null)
				{
					FlxQuadTree._o = itr.object;
					if(this._o.exists && this._o.solid && this.overlapNode(itr.next))
						c = true;
					itr = itr.next;
				}
			}
		}
		
		//Advance through the tree by calling overlap on each child
		if((this._nw != null) && this._nw.overlap(BothLists,this._oc))
			c = true;
		if((this._ne != null) && this._ne.overlap(BothLists,this._oc))
			c = true;
		if((this._se != null) && this._se.overlap(BothLists,this._oc))
			c = true;
		if((this._sw != null) && this._sw.overlap(BothLists,this._oc))
			c = true;
		
		return c;
	},

	overlapNode: function(Iterator) {
		Iterator = (Iterator === undefined) ? null : Iterator;

		//member list setup
		var c = false;
		var co;
		var itr = Iterator;
		if(itr == null)
		{
			if(this._oa == FlxQuadTree.A_LIST)
				itr = this._headA;
			else
				itr = this._headB;
		}
		
		//Make sure this is a valid list to walk first!
		if(itr.object != null)
		{
			//Walk the list and check for overlaps
			while(itr != null)
			{
				co = itr.object;
				if( (FlxQuadTree._o === co) || !co.exists || !this._o.exists || !co.solid || !this._o.solid ||
					(FlxQuadTree._o.x + this._o.width  < co.x + FlxU.roundingError) ||
					(FlxQuadTree._o.x + FlxU.roundingError > co.x + co.width) ||
					(FlxQuadTree._o.y + this._o.height < co.y + FlxU.roundingError) ||
					(FlxQuadTree._o.y + FlxU.roundingError > co.y + co.height) )
				{
					itr = itr.next;
					continue;
				}
				if(this._oc == null)
				{
					this._o.kill();
					co.kill();
					c = true;
				}
				else if(this._oc(this._o,co))
					c = true;
				itr = itr.next;
			}
		}
		
		return c;
	}


});

//Static properties
FlxQuadTree.A_LIST = 0;
FlxQuadTree.B_LIST = 1;
FlxQuadTree.divisions =  3;
FlxQuadTree.quadTree = null;
FlxQuadTree.bounds = null;
//TODO: Implement these. FlxQuake, FlxFlash, and FlxFade are also currently dummy classes
//	They will be implemented eventually, though
FlxQuake = new Class({

	initialize: function() {
	},

	stop: function() {
	},

	update: function() {},


});
//TODO: Implement. Currently a dummy class, but this one's important
//		Also make SharedObject wrapper
FlxSave = new Class({

	initialize: function() {
	},

	bind: function() {
	},

	forceSave: function() {
	},

});
FlxState = new Class({

	initialize: function() {
		this.defaultGroup = new FlxGroup();
		if(FlxState.screen === undefined || FlxState.screen === null) {
			FlxState.screen = new FlxSprite();
			FlxState.screen.createGraphic(FlxG.width,FlxG.height,0,true);
			FlxState.screen.origin.x = FlxState.screen.origin.y = 0;
			FlxState.screen.antialiasing = true;
			FlxState.screen.exists = false;
			FlxState.screen.solid = false;
			FlxState.screen.fixed = true;
		}
	},

	create: function() {
	},

	add: function(Core) {
		return this.defaultGroup.add(Core);
	},

	preProcess: function() {
		//FIXME: This somehow causes the screen FlxSprite's _pixels to become null
		//FlxState.screen.fill(FlxState.bgColor);
	},

	update: function() {
		this.defaultGroup.update();
	},

	collide: function() {
		FlxU.collide(this.defaultGroup, this.defaultGroup);
	},

	render: function() {
		this.defaultGroup.render();
	},

	postProcess: function() {
	},

	destroy: function() {
		this.defaultGroup.destroy();
	}

});

//FlxState.screen = new FlxSprite;
FlxState.bgColor = 0xFFAACEAA;
FlxTileblock = new Class({

	Extends: FlxSprite,

	initialize: function(X,Y,Width,Height) {
		this.parent(X,Y);
		this.createGraphic(Width,Height,0,true);		
		this.fixed = true;
	},

	loadTiles: function(TileGraphic, TileWidth, TileHeight, Empties) {

		TileWidth = isNaN(TileWidth) ? 0 : TileWidth;
		TileHeight = isNaN(TileHeight) ? 0 : TileHeight;
		Empties = isNaN(Empties) ? 0 : Empties;

		if(TileGraphic === undefined)
			return this;
		
		//First create a tile brush
		var s = new FlxSprite().loadGraphic(TileGraphic,true,false,TileWidth,TileHeight);
		var sw = s.width;
		var sh = s.height;
		var total = s.frames + Empties;
		
		//Then prep the "canvas" as it were (just doublechecking that the size is on tile boundaries)
		var regen = false;
		if(this.width % s.width != 0)
		{
			this.width = Math.floor(width/sw+1) * sw;
			regen = true;
		}
		if(this.height % s.height != 0)
		{
			this.height = Math.floor(height/sh+1)*sh;
			regen = true;
		}
		if(regen)
			this.createGraphic(this.width,this.height,0,true);
		else
			this.fill(0);
		
		//Stamp random tiles onto the canvas
		var r = 0;
		var c;
		var ox;
		var oy = 0;
		var widthInTiles = this.width/sw;
		var heightInTiles = this.height/sh;
		while(r < heightInTiles)
		{
			ox = 0;
			c = 0;
			while(c < widthInTiles)
			{
				if(FlxU.random() * total > Empties)
				{
					s.randomFrame();
					this.draw(s,ox,oy);
				}
				ox += sw;
				c++;
			}
			oy += sh;
			r++;
		}
		
		return this;
	},

	loadGraphic: function(Graphic, Animated, Reverse, Width, Height, Unique) {
		Animated = (Animated === undefined) ? false : Animated;
		Reverse = (Reverse === undefined) ? false : Reverse;
		Width = isNaN(Width) ? 0 : Width;
		Height = isNaN(Height) ? 0 : Height;
		Unique = (Unique === undefined) ? false : Unique;

		this.loadTiles(Graphic);
		return this;
	}

});
FlxTilemap = new Class({

	Extends: FlxObject,

	initialize: function() {
		this.parent();
		this.auto = FlxTilemap.OFF;
		this.collideIndex = 1;
		this.startingIndex = 0;
		this.drawIndex = 1;
		this.widthInTiles = 0;
		this.heightInTiles = 0;
		this.totalTiles = 0;
		this._buffer = null;
		this._bufferLoc = new FlxPoint();
		this._flashRect2 = new Rectangle();
		this._flashRect = this._flashRect2;
		this._data = null;
		this._tileWidth = 0;
		this._tileHeight = 0;
		this._rects = null;
		this._pixels = null;
		this._block = new FlxObject();
		this._block.width = this._block.height = 0;
		this._block.fixed = true;
		this._callbacks = new Array();
		this.fixed = true;

		//NOTE: This class overrides FlxObject setters but not getters
		this.__defineSetter__("fixed", this.setFixed);
		this.__defineSetter__("solid", this.setSolid);
	},

	//TODO: Figure out what to do about TileGraphic (a class in AS3) and FlxG.addBitmap's use of it
	loadMap: function(MapData, TileGraphic, TileWidth, TileHeight) {

		TileWidth = isNaN(TileWidth) ? 0 : TileWidth;
		TileHeight = isNaN(TileHeight) ? 0 : TileHeight;

		this.refresh = true;

		TileGraphic = TileGraphic.clone();
		
		//Figure out the map dimensions based on the data string
		var cols;
		var rows = MapData.split("\n");
		this.heightInTiles = rows.length;
		this._data = new Array();
		var r = 0;
		var c;
		while(r < this.heightInTiles)
		{
			cols = rows[r++].split(",");
			if(cols.length <= 1)
			{
				this.heightInTiles--;
				continue;
			}
			if(this.widthInTiles == 0)
				this.widthInTiles = cols.length;
			c = 0;
			while(c < this.widthInTiles)
				this._data.push(Math.floor(cols[c++]));
		}
		
		//Pre-process the map data if it's auto-tiled
		var i;
		this.totalTiles = this.widthInTiles * this.heightInTiles;
		if(this.auto > FlxTilemap.OFF)
		{
			this.collideIndex = this.startingIndex = this.drawIndex = 1;
			i = 0;
			while(i < this.totalTiles)
				this.autoTile(i++);
		}
		
		//Figure out the size of the tiles
		this._pixels = FlxG.addBitmap(TileGraphic);
		this._tileWidth = TileWidth;
		if(this._tileWidth == 0)
			this._tileWidth = this._pixels.height;
		this._tileHeight = TileHeight;
		if(this._tileHeight == 0)
			this._tileHeight = this._tileWidth;
		this._block.width = this._tileWidth;
		this._block.height = this._tileHeight;
		
		//Then go through and create the actual map
		this.width = this.widthInTiles * this._tileWidth;
		this.height = this.heightInTiles * this._tileHeight;
		this._rects = new Array(this.totalTiles);
		i = 0;
		while(i < this.totalTiles)
			this.updateTile(i++);
		
		//Also need to allocate a buffer to hold the rendered tiles
		var bw = (FlxU.ceil(FlxG.width / this._tileWidth) + 1) * this._tileWidth;
		var bh = (FlxU.ceil(FlxG.height / this._tileHeight) + 1) * this._tileHeight;
		this._buffer = new BitmapData(bw,bh,true,0);
		
		//Pre-set some helper variables for later
		this._screenRows = Math.ceil(FlxG.height / this._tileHeight)+1;
		if(this._screenRows > this.heightInTiles)
			this._screenRows = this.heightInTiles;
		this._screenCols = Math.ceil(FlxG.width / this._tileWidth)+1;
		if(this._screenCols > this.widthInTiles)
			this._screenCols = this.widthInTiles;

		//FIXME: This is not how we'll be handling TileGraphic
		this._bbKey = Math.random(); //String(TileGraphic);
		this.generateBoundingTiles();
		this.refreshHulls();
		
		this._flashRect.x = 0;
		this._flashRect.y = 0;
		this._flashRect.width = this._buffer.width;
		this._flashRect.height = this._buffer.height;
		
		return this;
	},

	generateBoundingTiles: function() {

		this.refresh = true;
		
		if((this._bbKey == null) || (this._bbKey.length <= 0))
			return;
		
		//Check for an existing version of this bounding boxes tilemap
		var bbc = this.getBoundingColor();
		var key = this._bbKey + ":BBTILES" + bbc;
		var skipGen = FlxG.checkBitmapCache(key);
		this._bbPixels = FlxG.createBitmap(this._pixels.width, this._pixels.height, 0, true, key);
		if(!skipGen)
		{
			//Generate a bounding boxes tilemap for this color
			this._flashRect.width = this._pixels.width;
			this._flashRect.height = this._pixels.height;
			this._flashPoint.x = 0;
			this._flashPoint.y = 0;
			
			this._bbPixels.copyPixels(this._pixels,this._flashRect,this._flashPoint);
			this._flashRect.width = this._tileWidth;
			this._flashRect.height = this._tileHeight;
			
			//Check for an existing non-collide bounding box stamp
			var ov = this._solid;
			this._solid = false;
			bbc = this.getBoundingColor();
			key = "BBTILESTAMP"+ this._tileWidth + "X" + this._tileHeight + bbc;
			skipGen = FlxG.checkBitmapCache(key);
			var stamp1 = FlxG.createBitmap(this._tileWidth, this._tileHeight, 0, true, key);
			if(!skipGen)
			{
				//Generate a bounding boxes stamp for this color
				stamp1.fillRect(this._flashRect, bbc);
				this._flashRect.x = this._flashRect.y = 1;
				this._flashRect.width = this._flashRect.width - 2;
				this._flashRect.height = this._flashRect.height - 2;
				stamp1.fillRect(this._flashRect, 0);
				this._flashRect.x = this._flashRect.y = 0;
				this._flashRect.width = this._tileWidth;
				this._flashRect.height = this._tileHeight;
			}
			this._solid = ov;
			
			//Check for an existing collide bounding box
			bbc = this.getBoundingColor();
			key = "BBTILESTAMP" + this._tileWidth + "X" + this._tileHeight + bbc;
			skipGen = FlxG.checkBitmapCache(key);
			var stamp2 = FlxG.createBitmap(this._tileWidth, this._tileHeight, 0, true, key);
			if(!skipGen)
			{
				//Generate a bounding boxes stamp for this color
				stamp2.fillRect(this._flashRect, bbc);
				this._flashRect.x = this._flashRect.y = 1;
				this._flashRect.width = this._flashRect.width - 2;
				this._flashRect.height = this._flashRect.height - 2;
				stamp2.fillRect(this._flashRect,0);
				this._flashRect.x = this._flashRect.y = 0;
				this._flashRect.width = this._tileWidth;
				this._flashRect.height = this._tileHeight;
			}
			
			//Stamp the new tile bitmap with the bounding box border
			var r = 0;
			var c;
			var i = 0;
			while(r < this._bbPixels.height)
			{
				c = 0;
				while(c < this._bbPixels.width)
				{
					this._flashPoint.x = c;
					this._flashPoint.y = r;
					if(i++ < this.collideIndex)
						this._bbPixels.copyPixels(stamp1,this._flashRect,this._flashPoint,null,null,true);
					else
						this._bbPixels.copyPixels(stamp2,this._flashRect,this._flashPoint,null,null,true);
					c += this._tileWidth;
				}
				r += this._tileHeight;
			}
			
			this._flashRect.x = 0;
			this._flashRect.y = 0;
			this._flashRect.width = this._buffer.width;
			this._flashRect.height = this._buffer.height;
		}
	},

	renderTilemap: function() {

		this._buffer.fillRect(this._flashRect,0);
		
		//Bounding box display options
		var tileBitmap;
		if(FlxG.showBounds)
		{
			tileBitmap = this._bbPixels;
			this._boundsVisible = true;
		}
		else
		{
			tileBitmap = this._pixels;
			this._boundsVisible = false;
		}
		
		//Copy tile images into the tile buffer
		this.getScreenXY(this._point);
		this._flashPoint.x = this._point.x;
		this._flashPoint.y = this._point.y;
		var tx = Math.floor(-this._flashPoint.x/this._tileWidth);
		var ty = Math.floor(-this._flashPoint.y/this._tileHeight);
		if(tx < 0) tx = 0;
		if(tx > this.widthInTiles - this._screenCols) { tx = this.widthInTiles - this._screenCols };
		if(ty < 0) ty = 0;
		if(ty > this.heightInTiles - this._screenRows) { ty = this.heightInTiles - this._screenRows; }
		var ri = ty * this.widthInTiles + tx;
		this._flashPoint.y = 0;
		var r = 0;
		var c;
		var cri;
		while(r < this._screenRows)
		{
			cri = ri;
			c = 0;
			this._flashPoint.x = 0;
			while(c < this._screenCols)
			{
				this._flashRect = this._rects[cri++];
				if( (this._flashRect != null)) 
					this._buffer.copyPixels(tileBitmap,this._flashRect,this._flashPoint,null,null,true);
				this._flashPoint.x += this._tileWidth;
				c++;
			}
			ri += this.widthInTiles;
			this._flashPoint.y += this._tileHeight;
			r++;
		}
		this._flashRect = this._flashRect2;
		this._bufferLoc.x = tx * this._tileWidth;
		this._bufferLoc.y = ty * this._tileHeight;
	},

	update: function() {

		this.parent();
		this.getScreenXY(this._point);
		this._point.x += this._bufferLoc.x;
		this._point.y += this._bufferLoc.y;
		if((this._point.x > 0) || (this._point.y > 0) || (this._point.x + this._buffer.width < FlxG.width) || (this._point.y + this._buffer.height < FlxG.height)) {
			this.refresh = true;
		}
	},

	render: function() {
		if(FlxG.showBounds != this._boundsVisible)
			this.refresh = true;
		
		//Redraw the tilemap buffer if necessary
		if(this.refresh)
		{
			this.renderTilemap();
			this.refresh = false;
		}
		
		//Render the buffer no matter what
		this.getScreenXY(this._point);
		this._flashPoint.x = this._point.x + this._bufferLoc.x;
		this._flashPoint.y = this._point.y + this._bufferLoc.y;
		FlxG.buffer.copyPixels(this._buffer,this._flashRect,this._flashPoint,null,null,true);
	},

	setSolid: function(Solid) {
		this.parent(Solid);

		var os = this._solid;
		this._solid = Solid;
		if(os != this._solid)
			this.generateBoundingTiles();
	},

	setFixed: function(Fixed) {
		this.parent(Fixed);

		var of = this._fixed;
		this._fixed = Fixed;
		if(of != this._fixed)
			this.generateBoundingTiles();
	},

	overlaps: function(Core) {

		var d;
		
		var dd;
		var blocks = new Array();
		
		//First make a list of all the blocks we'll use for collision
		var ix = Math.floor((Core.x - this.x) / this._tileWidth);
		var iy = Math.floor((Core.y - this.y) / this._tileHeight);
		var iw = Math.ceil(Core.width / this._tileWidth) + 1;
		var ih = Math.ceil(Core.height / this._tileHeight) + 1;
		var r = 0;
		var c;
		while(r < ih)
		{
			if(r >= this.heightInTiles) break;
			d = (iy+r)*this.widthInTiles+ix;
			c = 0;
			while(c < iw)
			{
				if(c >= this.widthInTiles) break;
				dd = Math.floor(this._data[d+c]);
				if(dd >= this.collideIndex)
					blocks.push({
						x : this.x + (ix+c) * this._tileWidth,
						y : this.y + (iy+r) * this._tileHeight,
						data : dd
					});
				c++;
			}
			r++;
		}
		
		//Then check for overlaps
		var bl = blocks.length;
		var hx = false;
		var i = 0;
		while(i < bl)
		{
			this._block.x = blocks[i].x;
			this._block.y = blocks[i++].y;
			if(this._block.overlaps(Core))
				return true;
		}
		return false;
	},

	overlapsPoint: function(X, Y,PerPixel) {
		PerPixel = (PerPixel === undefined) ? false : PerPixel;
		var t = getTile(
				Math.floor( (X-this.x) / this._tileWidth ),
				Math.floor( (Y-this.y) / this._tileHeight)
		);
		return  t >= this.collideIndex;
	},

	refreshHulls: function()
	{
		this.colHullX.x = 0;
		this.colHullX.y = 0;
		this.colHullX.width = this._tileWidth;
		this.colHullX.height = this._tileHeight;
		this.colHullY.x = 0;
		this.colHullY.y = 0;
		this.colHullY.width = this._tileWidth;
		this.colHullY.height = this._tileHeight;
	},

	preCollide: function(Obj)
	{
		//Collision fix, in case updateMotion() is called
		this.colHullX.x = 0;
		this.colHullX.y = 0;
		this.colHullY.x = 0;
		this.colHullY.y = 0;
		
		var r;
		var c;
		var rs;
		var col = 0;
		var ix = FlxU.floor((Obj.x - this.x)/this._tileWidth);
		var iy = FlxU.floor((Obj.y - this.y)/this._tileHeight);
		var iw = ix + FlxU.ceil(Obj.width/this._tileWidth)+1;
		var ih = iy + FlxU.ceil(Obj.height/this._tileHeight)+1;
		if(ix < 0)
			ix = 0;
		if(iy < 0)
			iy = 0;
		if(iw > this.widthInTiles)
			iw = this.widthInTiles;
		if(ih > this.heightInTiles)
			ih = this.heightInTiles;
		rs = iy * this.widthInTiles;
		r = iy;
		while(r < ih)
		{
			c = ix;
			while(c < iw)
			{
				if(Math.floor(this._data[rs+c]) >= this.collideIndex)
					this.colOffsets[col++] = new FlxPoint(this.x + c * this._tileWidth, this.y + r * this._tileHeight);
				c++;
			}
			rs += this.widthInTiles;
			r++;
		}
		if(this.colOffsets.length != col)
			this.colOffsets.length = col;
	},

	getTile: function(X, Y)
	{
		return this.getTileByIndex(Y * this.widthInTiles + X);
	},

	getTileByIndex: function(Index)
	{
		return this._data[Index];
	},

	setTile: function(X, Y, Tile, UpdateGraphics)
	{
		UpdateGraphics = (UpdateGraphics === undefined) ? true : UpdateGraphics;
		if((X >= this.widthInTiles) || (Y >= this.heightInTiles))
			return false;
		return this.setTileByIndex(Y * this.widthInTiles + X,Tile,UpdateGraphics);
	},

	setTileByIndex: function(Index, Tile, UpdateGraphics)
	{
		UpdateGraphics = (UpdateGraphics === undefined) ? true : UpdateGraphics;
		if(Index >= this._data.length)
			return false;
		
		var ok = true;
		this._data[Index] = Tile;
		
		if(!UpdateGraphics)
			return ok;
		
		this.refresh = true;
		
		if(this.auto == FlxTilemap.OFF)
		{
			this.updateTile(Index);
			return ok;
		}
		
		//If this map is autotiled and it changes, locally update the arrangement
		var i;
		var r = Math.floor(Index/this.widthInTiles) - 1;
		var rl = r + 3;
		var c = Index % this.widthInTiles - 1;
		var cl = c + 3;
		while(r < rl)
		{
			c = cl - 3;
			while(c < cl)
			{
				if((r >= 0) && (r < this.heightInTiles) && (c >= 0) && (c < this.widthInTiles))
				{
					i = r * this.widthInTiles + c;
					this.autoTile(i);
					this.updateTile(i);
				}
				c++;
			}
			r++;
		}
		
		return ok;
	},

	setCallback: function(Tile, Callback, Range) {
		//NO CODE. "temporarily deprecated" in Flixel
	},

	follow: function(Border)
	{
		Border = isNaN(Border) ? 0 : Border;
		FlxG.followBounds(
				this.x + Border * this._tileWidth,
				this.y + Border * this._tileHeight,
				this.width - Border * this._tileWidth,
				this.height - Border * this._tileHeight
		);
	},

	ray: function(StartX, StartY, EndX, EndY, Result, Resolution) {
		Resolution = (Resolution === undefined) ? 1 : Resolution;

		var step = this._tileWidth;
		if(this._tileHeight < this._tileWidth) { step = this._tileHeight; }
		step /= Resolution;
		var dx = EndX - StartX;
		var dy = EndY - StartY;
		var distance = Math.sqrt(dx*dx + dy*dy);
		var steps = Math.ceil(distance/step);
		var stepX = dx/steps;
		var stepY = dy/steps;
		var curX = StartX - stepX;
		var curY = StartY - stepY;
		var tx;
		var ty;
		var i = 0;
		while(i < steps)
		{
			curX += stepX;
			curY += stepY;
			
			if((curX < 0) || (curX > width) || (curY < 0) || (curY > height))
			{
				i++;
				continue;
			}
			
			tx = curX/this._tileWidth;
			ty = curY/this._tileHeight;
			if((Math.floor(this._data[ty*this.widthInTiles+tx])) >= this.collideIndex)
			{
				//Some basic helper stuff
				tx *= this._tileWidth;
				ty *= this._tileHeight;
				var rx = 0;
				var ry = 0;
				var q;
				var lx = curX-stepX;
				var ly = curY-stepY;
				
				//Figure out if it crosses the X boundary
				q = tx;
				if(dx < 0)
					q += this._tileWidth;
				rx = q;
				ry = ly + stepY*((q-lx)/stepX);
				if((ry > ty) && (ry < ty + this._tileHeight))
				{
					if(Result === undefined)
						Result = new FlxPoint();
					Result.x = rx;
					Result.y = ry;
					return true;
				}
				
				//Else, figure out if it crosses the Y boundary
				q = ty;
				if(dy < 0)
					q += this._tileHeight;
				rx = lx + stepX*((q-ly)/stepY);
				ry = q;
				if((rx > tx) && (rx < tx + this._tileWidth))
				{
					if(Result === undefined)
						Result = new FlxPoint();
					Result.x = rx;
					Result.y = ry;
					return true;
				}
				return false;
			}
			i++;
		}
		return false;
	},

	//NOTE: arrayToCSV, bitmapToCSV, imageToCSV normally go here,
	//	but they're below the class definition because they're static

	autoTile: function(Index) {

		if(this._data[Index] == 0) return;
		this._data[Index] = 0;
		if((Index-this.widthInTiles < 0) || (this._data[Index-this.widthInTiles] > 0))					//UP
			this._data[Index] += 1;
		if((Index % this.widthInTiles >= this.widthInTiles-1) || (this._data[Index+1] > 0))				//RIGHT
			this._data[Index] += 2;
		if((Index + this.widthInTiles >= this.totalTiles) || (this._data[Index+this.widthInTiles] > 0)) //DOWN
			this._data[Index] += 4;
		if((Index % widthInTiles <= 0) || (this._data[Index-1] > 0))									//LEFT
			this._data[Index] += 8;
		if((this.auto == this.ALT) && (this._data[Index] == 15))	//The alternate algo checks for interior corners
		{
			if((Index % this.widthInTiles > 0) && (Index+this.widthInTiles < this.totalTiles) && (this._data[Index+this.widthInTiles-1] <= 0))
				this._data[Index] = 1;		//BOTTOM LEFT OPEN
			if((Index % this.widthInTiles > 0) && (Index-this.widthInTiles >= 0) && (this._data[Index-this.widthInTiles-1] <= 0))
				this._data[Index] = 2;		//TOP LEFT OPEN
			if((Index % this.widthInTiles < this.widthInTiles-1) && (Index-this.widthInTiles >= 0) && (this._data[Index-this.widthInTiles+1] <= 0))
				this._data[Index] = 4;		//TOP RIGHT OPEN
			if((Index % this.widthInTiles < this.widthInTiles-1) && (Index+this.widthInTiles < this.totalTiles) && (this._data[Index+this.widthInTiles+1] <= 0))
				this._data[Index] = 8; 		//BOTTOM RIGHT OPEN
		}
		this._data[Index] += 1;
	},

	updateTile: function(Index) {
		if(this._data[Index] < this.drawIndex) {
			this._rects[Index] = null;
			return;
		}
		var rx = (this._data[Index] - this.startingIndex) * this._tileWidth;
		var ry = 0;
		if(rx >= this._pixels.width)
		{
			ry = Math.floor(rx / this._pixels.width) * this._tileHeight;
			rx %= this._pixels.width;
		}
		this._rects[Index] = (new Rectangle(rx,ry,this._tileWidth,this._tileHeight));
	}

});

FlxTilemap.OFF =  0;
FlxTilemap.AUTO =  1;
FlxTilemap.ALT = 2;

FlxTilemap.arrayToCSV = function(Data, Width) {

	var r = 0;
	var c;
	var csv = "";
	var Height = Data.length / Width;
	while(r < Height)
	{
		c = 0;
		while(c < Width)
		{
			if(c == 0)
			{
				if(r == 0)
					csv += Data[0];
				else
					csv += "\n"+Data[r*Width];
			}
			else
				csv += ", "+Data[r*Width+c];
			c++;
		}
		r++;
	}
	return csv;
}

FlxTilemap.bitmapToCSV = function(bitmapData, Invert, Scale) {

	Invert = (Invert === undefined) ? false : Invert;
	Scale = (Scale === undefined) ? 1 : Scale;

	//Import and scale image if necessary
	if(Scale > 1)
	{
		var bd = bitmapData;
		bitmapData = new BitmapData(bitmapData.width * Scale, bitmapData.height * Scale);
		var mtx = new Matrix();
		mtx.scale(Scale,Scale);
		bitmapData.draw(bd,mtx);
	}
	
	//Walk image and export pixel values
	var r = 0;
	var c;
	var p;
	var csv;
	var w = bitmapData.width;
	var h = bitmapData.height;
	while(r < h)
	{
		c = 0;
		while(c < w)
		{
			//Decide if this pixel/tile is solid (1) or not (0)
			p = bitmapData.getPixel(c,r);
			if((Invert && (p > 0)) || (!Invert && (p == 0)))
				p = 1;
			else
				p = 0;
			
			//Write the result to the string
			if(c == 0)
			{
				if(r == 0)
					csv += p;
				else
					csv += "\n"+p;
			}
			else
				csv += ", "+p;
			c++;
		}
		r++;
	}
	return csv;
}

//FIXME: Revisit when resource handling is decided
FlxTilemap.imageToCSV = function(ImageFile, Invert, Scale) {
	return bitmapToCSV(ImageFile,Invert,Scale);
}
