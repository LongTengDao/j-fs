# `require('@ltd/j-fs')`

原生文件系统模块的 `promisify` 扩展。

对于 `require('fs')` 模块的每一个有 `fs.xxxSync` 对应的 `fs.xxx` 方法，都生成一个 `promisify` 版本的 `fs.xxxAsync` 方法。

为方便某些使用场景，所有 `fs.xxxSync` 都可以通过 `fs.sync.xxx` 获取，所有 `fs.xxxAsync` 都可以通过 `fs.async.xxx` 获取。

## 与原生 `require('util').promisify`、`require('fs').promises` 实现上的差别

1.  对于返回多个成功回调参数的 `fs.read` 和 `fs.write` 方法，其 `promisify` 版仅保留其中的第一个（与 `fs.readSync` 和 `fs.writeSync` 一致）。
    而在 `util.promisify` 中，会将多个回调参数作为一个对象的多个属性返回；`fs.promises` 中目前尚未提供这两个方法。
    注意：这并不意味着本模块今后默认对多成功返回参数的情况如此处理，而是考虑到 `fs.read` 和 `fs.write` 实际返回内容的必要性。

2.  对于废弃的 `fs.exists` 方法，其 `promisify` 版本 `fs.existsAsync` 是基于 `fs.access` 方法实现的。
    而这是 `util.promisify` 调用 `fs.exists` 无法实现的，`fs.promises` 中则很可能永远不会提供这个方法。

3.  另外，`fs.createReadStream` 方法的 `promisify` 版本 `fs.createReadStreamAsync`，是在 `ready` 事件触发后，返回原始对象，并增加了异步遍历器接口。
    而 `fs.createWriteStream` 方法的 `promisify` 版本 `fs.createWriteStreamAsync`，是在 `ready` 事件触发后，返回原始返回，并增加了 `writeAsync`、`endAsync` 方法。
    这两个方法无法通过 `util.promisify` 直接实现，`fs.promises` 中应该也不会提供这种实现。

4.  额外实现了 `readUTF(path[,BOM],callback)`（`BOM===null` 时将自动剔除开头 `BOM` 字符）、`readJSON(path[,reviver],callback)`、`writeJSON(path,data[,replacer[,space]],callback)` 三个方法（均有 `fs.xxx`、`fs.xxxAsync`、`fs.xxxSync` 三套）。

## 对 `.asar` 文件虚拟目录的支持

`electron` 环境下的 `require('fs')` 默认支持了将路径中的 `.asar` 文件作为文件夹访问的能力。

在 `electron` 环境中，本模块是基于 `require('original-fs')` 实现的（等价于原始 `Node.js` 环境下的 `require('fs')` 模块）；
同时增加了一个属性 `fs.asar`，用于存放 `electron` 扩展后的方法，它的值是以与本模块相同的形式构建的。

其它情况下，本模块是直接基于 `require('fs')` 实现扩展的，并且没有 `fs.asar` 属性。
