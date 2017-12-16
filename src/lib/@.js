'use strict';

exports = module.exports = Object.create(null);

((Async,ExistsAsync)=>{

	const fs = require('fs');

	for( const name in fs ){
		if( name+'Sync' in fs ){
			exports[name+'Async'] = Async(fs[name]);
		}
	}

	exports['existsAsync'] = ExistsAsync(fs);

	Object.freeze(Object.assign(exports,fs));

})(

	(method)=>
		function(...args){
			return new Promise((resolve,reject)=>
				method(...args,(error,value)=>
					error===null ? resolve(value) : reject(error)
				)
			);
		},

	({access})=>
		function(arg){
			return new Promise((resolve,reject)=>
				access(arg,(error)=>
					error===null ? resolve(true) : ( error.code==='ENOENT' ? resolve(false) : reject(error) )
				)
			);
		},

);
