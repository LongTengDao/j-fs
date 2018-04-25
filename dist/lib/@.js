'use strict';

const { asyncIterator } = Symbol;

(({ Async, ExistsAsync, CreateAsyncReadStream, CreateAsyncWriteStream })=>{

	try{
		require('electron');
		module.exports = Fs( 'original-fs' );
		module.exports.asar = Fs( 'fs' );
	}
	catch(error){
		module.exports = Fs( 'fs' );
	}

	function Fs( name ){
		const FS = require( name );
		const fs = Object.create(null);
		for( const name in FS ){
			if( name+'Sync' in FS ){
				fs[name+'Async'] = Async( FS[name] );
			}
		}
		fs['existsAsync'] = ExistsAsync( FS );
		fs['createAsyncReadStream'] = CreateAsyncReadStream( FS );
		fs['createAsyncWriteStream'] = CreateAsyncWriteStream( FS );
		return Object.assign( fs, FS );
	}

})({

	Async:method=>
		function(){
			return new Promise((resolve,reject)=>
				method(...arguments,(error,value)=>
					error===null ? resolve(value) : reject(error)
				)
			);
		},

	ExistsAsync:({ access })=>
		function(){
			return new Promise((resolve,reject)=>
				access(arguments[0],error=>
					error===null ? resolve(true) : ( error.code==='ENOENT' ? resolve(false) : reject(error) )
				)
			);
		},

	CreateAsyncReadStream:({ createReadStream })=>
		function(){
			const stream = createReadStream(...arguments).on('error',onError).on('readable',onReadable);
			stream[asyncIterator] = {
				stream,
				resolve:undefined,
				reject:undefined,
				error:null,
				readable:false,
				done:false,
				next,
			};
			stream.readAsync = readAsync;
			return stream;
		},

	CreateAsyncWriteStream:({ createWriteStream })=>
		function(){
			const stream = createWriteStream(...arguments).on('error',onError).on('drain',onDrain);
			stream[asyncIterator] = {
				stream,
				resolve:undefined,
				reject:undefined,
				error:null,
			};
			stream.writeAsync = writeAsync;
			return stream;
		},

});

async function readAsync(){
	return ( await this[asyncIterator].next() ).value || null;
}

function writeAsync(){
	return new Promise((resolve,reject)=>{
		const { error } = this[asyncIterator];
		if( error ){ return reject( error ); }
		if( this.write(...arguments) ){ return resolve(); }
		this[asyncIterator].resolve = resolve;
		this[asyncIterator].reject = reject;
	});
}

function onError(error){
	this.removeAllListeners();
	this[asyncIterator].error = error;
	const { reject } = this[asyncIterator];
	if( reject ){
		this[asyncIterator].reject = undefined;
		this[asyncIterator].resolve = undefined;
		return reject( error );
	}
}

function onDrain(){
	const { resolve } = this[asyncIterator];
	this[asyncIterator].reject = undefined;
	this[asyncIterator].resolve = undefined;
	return resolve();
}

function onReadable(){
	const { resolve } = this[asyncIterator];
	if( resolve ){
		this[asyncIterator].reject = undefined;
		this[asyncIterator].resolve = undefined;
		const chunk = this.read();
		if( chunk===null ){
			this.removeAllListeners();
			return resolve({ done:this[asyncIterator].done=true, value:undefined });
		}
		else{
			return resolve({ done:false, value:chunk });
		}
	}
	else{
		this[asyncIterator].readable = true;
	}
}

function next(){
	return new Promise((resolve,reject)=>{
		if( this.readable ){
			this.readable = false;
			const chunk = this.stream.read();
			if( chunk===null ){
				this.stream.removeAllListeners();
				return resolve({ done:this.done=true, value:undefined });
			}
			else{
				return resolve({ done:false, value:chunk });
			}
		}
		if( this.done ){ return resolve({ done:true }); }
		if( this.error ){ return reject( this.error ); }
		this.resolve = resolve;
		this.reject = reject;
	});
}
