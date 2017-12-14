# `require('@ltd/j-fs')`

原生文件系统模块的 `promisify` 扩展。

对于 `require('fs')` 模块的每一个有 `*Sync` 对应的 `*` 方法，都生成一个 `promisify` 版本的 `*Async` 方法。

对于废弃的 `fs.exists` 方法，其 `promisify` 版本是基于 `fs.access` 方法实现的。
