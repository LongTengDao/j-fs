'use strict';

const { asyncIterator } = Symbol;
const _resolve = Symbol('_resolve');
const _reject = Symbol('_reject');
const _error = Symbol('_error');
const _done = Symbol('_done');
const _readable = Symbol('_readable');
const { parse, stringify } = JSON;
const undefined = void null;

function toStringFollowBOM (buffer) {
	switch( buffer[0] ){
		case 0xEF: if( buffer[1]===0xBB && buffer[2]===0xBF ){ return buffer.slice(3).toString('utf8'); } break;
		case 0xFF: if( buffer[1]===0xFE ){ return buffer.slice(2).toString('ucs2'); } break;
		case 0xFE: if( buffer[1]===0xFF ){ return buffer.swap16().slice(2).toString('ucs2'); } break;
	}
	return buffer.toString();
}

function toStringWithBOM (buffer) {
	switch( buffer[0] ){
		case 0xEF: if( buffer[1]===0xBB && buffer[2]===0xBF ){ return buffer.toString('utf8'); } break;
		case 0xFF: if( buffer[1]===0xFE ){ return buffer.toString('ucs2'); } break;
		case 0xFE: if( buffer[1]===0xFF ){ return buffer.swap16().toString('ucs2'); } break;
	}
	return buffer.toString();
}

(({ ASync, Async, ExistsAsync, CreateReadStreamAsync, CreateWriteStreamAsync })=>{
	
	const { keys, prototype: { hasOwnProperty }, assign } = Object;

	if( 'electron' in process.versions ){
		require( 'electron' );
		module.exports = Fs( 'original-fs' );
		if( hasOwnProperty.call(module.exports,'asar') ){ throw new Error( '{@ltd/j-fs} 原生 `original-fs` 模块中已经存在 `asar` 属性，为防止误用，特此终止！' ); }
		module.exports.asar = Fs( 'fs' );
	}
	else{
		module.exports = Fs( 'fs' );
	}

	function Fs( name ){
		const FS = require( name );
		const fs = { async: { }, sync: { }, ...ASync( FS.readFile, FS.readFileSync, FS.writeFile, FS.writeFileSync ) };
		for ( const key of keys(fs) ) {
			if( hasOwnProperty.call(FS,key) ){ throw new Error( '{@ltd/j-fs} 原生 `'+name+'` 模块中已经存在 `'+key+'` 属性，为防止误用，特此终止！' ); }
		}
		const sync  = { readUTF: fs.readUTFSync,  readJSON: fs.readJSONSync,  writeJSON: fs.writeJSONSync  };
		const async = { readUTF: fs.readUTFAsync, readJSON: fs.readJSONAsync, writeJSON: fs.writeJSONAsync };
		for( const name of keys(FS) ){
			if( hasOwnProperty.call(FS,name+'Sync') ){
				sync[name] = FS[name+'Sync'];
				async[name] = fs[name+'Async'] = Async( FS[name] );
			}
		}
		async.exists = fs.existsAsync = ExistsAsync( FS.access );
		async.createReadStream = fs.createReadStreamAsync = CreateReadStreamAsync( FS.createReadStream );
		async.createWriteStream = fs.createWriteStreamAsync = CreateWriteStreamAsync( FS.createWriteStream );
		assign( fs.sync, sync );
		assign( fs.async, async );
		return assign( { }, fs, FS );
	}

})({
	
	ASync(readFile,readFileSync,writeFile,writeFileSync){
		
		return {
			
			readUTF(path,BOM,callback=BOM){
				return readFile(path,(error,data)=>
					error===null ? callback(null,(BOM===null?toStringFollowBOM:toStringWithBOM)(data)) : callback(error)
				);
			},
			readUTFSync(path,BOM){
				return (BOM===null?toStringFollowBOM:toStringWithBOM)(readFileSync(path),true);
			},
			readUTFAsync(path,BOM){
				return new Promise((resolve,reject)=>
					readFile(path,(error,data)=>
						error===null ? resolve((BOM===null?toStringFollowBOM:toStringWithBOM)(data)) : reject(error)
					)
				);
			},
			
			readJSON(path,reviver,callback){
				if ( callback===undefined ) { callback = reviver; reviver = undefined; }
				return readFile(path,'utf8',(error,data)=>
					error===null ? callback(null,parse(data,reviver)) : callback(error)
				);
			},
			readJSONSync(path,reviver){
				return parse(readFileSync(path,'utf8'),reviver);
			},
			readJSONAsync(path,reviver){
				return new Promise((resolve,reject)=>
					readFile(path,'utf8',(error,data)=>
						error===null ? resolve(parse(data,reviver)) : reject(error)
					)
				);
			},
			
			writeJSON(path,data,replacer,space,callback){
				if ( callback===undefined ) {
					if ( space===undefined ) { callback = replacer; replacer = undefined; }
					else { callback = space; space = undefined; }
				}
				return writeFile(path,stringify(data,replacer,space),callback);
			},
			writeJSONSync(path,data,replacer,space){
				return writeFileSync(path,stringify(data,replacer,space));
			},
			writeJSONAsync(path,data,replacer,space){
				return new Promise((resolve,reject)=>
					writeFile(path,stringify(data,replacer,space),(error)=>
						error===null ? resolve() : reject(error)
					)
				);
			},
			
		};
		
	},

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
