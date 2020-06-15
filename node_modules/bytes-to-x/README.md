
# bytes-to-x
[![package version](https://img.shields.io/npm/v/bytes-to-x.svg?style=flat-square)](https://npmjs.org/package/bytes-to-x)
[![package downloads](https://img.shields.io/npm/dm/bytes-to-x.svg?style=flat-square)](https://npmjs.org/package/bytes-to-x)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/bytes-to-x.svg?style=flat-square)](https://npmjs.org/package/bytes-to-x)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Convert from bytes to another unit e.g. Mibit, KiB, Gibit, Gib

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#License)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install bytes-to-x
$ # OR
$ yarn add bytes-to-x
```

## Usage

```js
const converters = require('bytes-to-x')

console.log(converters)
// { toBits: [Function],
//     toGibibits: [Function],
//     toGibibytes: [Function],
//     toGigabits: [Function],
//     toGigabytes: [Function],
//     toKibibits: [Function],
//     toKibibytes: [Function],
//     toKilobits: [Function],
//     toKilobytes: [Function],
//     toMebibits: [Function],
//     toMegabits: [Function],
//     toMegabytes: [Function],
//     toPetabits: [Function],
//     toPetabytes: [Function],
//     toTerabits: [Function],
//     toTerabytes: [Function] }

console.log(converters.toBits(1)) // 8.000 b
console.log(converters.toBits(1, 0)) // 8 b
console.log(converters.toBits(1, (result, unit) => `${unit} ${result}`)) // b 8
console.log(converters.toGibibits(1, 15)) // 0.000000007450581 Gibit
console.log(converters.toGibibytes(1, 15)) // 0.000000000931323 Gib
console.log(converters.toGigabits(1, 15)) // 0.000000008000000 Gb
console.log(converters.toKibibits(1, 15)) // 0.007812500000000 Kibit
console.log(converters.toKibibytes(1)) // 0.001 KiB
console.log(converters.toKilobits(1)) // 0.008 kb
console.log(converters.toKilobytes(1)) // 0.001 kB
console.log(converters.toGigabytes(1)) // 0.000 GB
console.log(converters.toKilobits(1)) // 0.008 kb
console.log(converters.toMebibits(1, 15)) // 0.000007629394531 Mibit
console.log(converters.toMegabits(1, 15)) // 0.000008000000000 Mb
console.log(converters.toMegabytes(1, 15)) // 0.000001000000000 MB
console.log(converters.toPetabytes(1, 15)) // 0.000000000000001 PB
console.log(converters.toTerabits(1, 15)) // 0.000000000008000 Tb
console.log(converters.toTerabytes(1, 15)) // // 0.000000000001000 TB

```

## Contribute

1. Fork it and create your feature branch: git checkout -b my-new-feature
2. Commit your changes: git commit -am 'Add some feature'
3. Push to the branch: git push origin my-new-feature 
4. Submit a pull request

## License

MIT
    