'use strict';

const { asyncIterator } = Symbol;
const _resolve = Symbol('_resolve');
const _reject = Symbol('_reject');
const _error = Symbol('_error');
const _done = Symbol('_done');
const _readable = Symbol('_readable');

(({ Async, ExistsAsync, CreateReadStreamAsync, CreateWriteStreamAsync })=>{

	if( 'electron' in process.versions ){
		require( 'electron' );
		module.exports = Fs( 'original-fs' );
		if( 'asar' in module.exports ){ throw new Error( '{@ltd/j-fs} 原生 `fs` 模块中已经存在 `asar` 属性，为防止误用，特此终止！' ); }
		module.exports.asar = Fs( 'fs' );
	}
	else{
		module.exports = Fs( 'fs' );
	}

	function Fs( name ){
		const FS = require( name );
		if( 'async' in FS ){ throw new Error( '{@ltd/j-fs} 原生 `fs` 模块中已经存在 `async` 属性，为防止误用，特此终止！' ); }
		if( 'sync' in FS ){ throw new Error( '{@ltd/j-fs} 原生 `fs` 模块中已经存在 `sync` 属性，为防止误用，特此终止！' ); }
		const fs = { async:{}, sync:{} };
		const sync = {};
		const async = {};
		for( const name in FS ){
			if( name+'Sync' in FS ){
				sync[name] = FS[name+'Sync'];
				async[name] = fs[name+'Async'] = Async( FS[name] );
			}
		}
		fs.existsAsync = ExistsAsync( FS.access );
		fs.createReadStreamAsync = CreateReadStreamAsync( FS.createReadStream );
		fs.createWriteStreamAsync = CreateWriteStreamAsync( FS.createWriteStream );
		Object.assign( fs.sync, sync );
		Object.assign( fs.async, async );
		return Object.assign( {}, fs, FS );
	}

})({

	Async(method){
		return function(){
			return new Promise((resolve,reject)=>
				method(...arguments,(error,value)=>
					error===null ? resolve(value) : reject(error)
				)
			);
		};
	},

	ExistsAsync(access){
		return function existsAsync(path){
			return new Promise((resolve,reject)=>
				access(path,error=>
					error===null ? resolve(true) : error.code==='ENOENT' ? resolve(false) : reject(error)
				)
			);
		};
	},

	CreateReadStreamAsync(createReadStream){
		return function createReadStreamAsync(){
			return new Promise((resolve,reject)=>{
				const stream = createReadStream(...arguments);
				stream.writeAsync = writeAsync;
				stream.endAsync = endAsync;
				stream[_resolve] = resolve;
				stream[_reject] = reject;
				stream[_error] = null;
				stream.on( 'error', onError );
				stream.on( 'ready', onResolve );
				stream.on( 'readable', onReadable );
				stream.on( 'end', onEnd );
			});
		};
	},

	CreateWriteStreamAsync(createWriteStream){
		return function createWriteStreamAsync(){
			return new Promise((resolve,reject)=>{
				const stream = createWriteStream(...arguments);
				stream.next = next;
				stream[asyncIterator] = AsyncGenerator;
				stream[_resolve] = resolve;
				stream[_reject] = reject;
				stream[_error] = null;
				stream[_readable] = false;
				stream[_done] = false;
				stream.on( 'error', onError );
				stream.on( 'ready', onResolve );
				stream.on( 'drain', onResolve );
				stream.on( 'finish', onResolve );
			});
		};
	},

});

function writeAsync(){
	return new Promise((resolve,reject)=>{
		if( this[_error] ){ return reject( this[_error] ); }
		if( this.write(...arguments) ){
			return resolve();
		}
		this[_resolve] = resolve;
		this[_reject] = reject;
	});
}

function endAsync(){
	return new Promise((resolve,reject)=>{
		if( this[_error] ){ return reject( this[_error] ); }
		this[_resolve] = resolve;
		this[_reject] = reject;
		this.end(...arguments);
	});
}

function next(){
	return new Promise((resolve,reject)=>{
		if( this[_readable] ){
			this[_readable] = false;
			return resolve({ done:false, value:this.read() });
		}
		if( this[_done] ){
			return resolve({ done:true, value:undefined });
		}
		if( this[_error] ){
			return reject( this[_error] );
		}
		this.resolve = resolve;
		this.reject = reject;
	});
}

function onError(error){
	this[_error] = error;
	const reject = this[_reject];
	if( reject ){
		this[_resolve] = undefined;
		this[_reject] = undefined;
		return reject( error );
	}
}

function onResolve(){
	const resolve = this[_resolve];
	this[_resolve] = undefined;
	this[_reject] = undefined;
	return resolve();
}

function onReadable(){
	const resolve = this[_resolve];
	if( resolve ){
		this[_resolve] = undefined;
		this[_reject] = undefined;
		return resolve({ done:false, value:this.read() });
	}
	else{
		this[_readable] = true;
	}
}

function onEnd(){
	this[_done] = true;
	const resolve = this[_resolve];
	if( resolve ){
		this[_resolve] = undefined;
		this[_reject] = undefined;
		return resolve({ done:true, value:undefined });
	}
}

function AsyncGenerator(){
	return this;
}
