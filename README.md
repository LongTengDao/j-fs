# `require('@ltd/j-fs')`

原生文件系统模块的 `promisify` 扩展。

对于 `require('fs')` 模块的每一个有 `fs.xxxSync` 对应的 `fs.xxx` 方法，都生成一个 `promisify` 版本的 `fs.xxxAsync` 方法。

对于废弃的 `fs.exists` 方法，其 `promisify` 版本 `fs.existsAsync` 是基于 `fs.access` 方法实现的。

另外 `fs.createReadStream` 方法的 `promisify` 版本 `fs.createReadStreamAsync`，是在 `ready` 事件触发后，返回原始对象，并增加了异步遍历器接口。

而 `fs.createWriteStream` 方法的 `promisify` 版本 `fs.createWriteStreamAsync`，是在 `ready` 事件触发后，返回原始返回，并增加了 `writeAsync`、`endAsync` 方法。

在 `electron` 环境中，本模块是基于 `require('original-fs')` 实现的（等价于原始 `Node.js` 环境下的 `require('fs')` 模块），并增加了一个属性 `asar`，它的值是以与本模块同样方式扩展的 `require('fs')` 模块（额外支持了将路径中的 `.asar` 文件作为文件夹访问的能力）。

其它情况下，本模块是直接基于 `require('fs')` 实现扩展的。
