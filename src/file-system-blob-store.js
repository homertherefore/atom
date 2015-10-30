'use strict'

const fs = require('fs-plus')
const path = require('path')

module.exports =
class FileSystemBlobStore {
  static load (directory) {
    let instance = new FileSystemBlobStore(directory)
    instance.load()
    return instance
  }

  constructor (directory) {
    this.inMemoryBlobs = new Map()
    this.blobFilename = path.join(directory, 'BLOB')
    this.blobMapFilename = path.join(directory, 'MAP')
    this.storedBlob = new Buffer(0)
    this.storedBlobMap = {}
  }

  load () {
    if (!fs.existsSync(this.blobMapFilename)) {
      return
    }
    if (!fs.existsSync(this.blobFilename)) {
      return
    }
    this.storedBlob = fs.readFileSync(this.blobFilename)
    this.storedBlobMap = JSON.parse(fs.readFileSync(this.blobMapFilename))
  }

  save () {
    let dump = this.getDump()
    let blobToStore = Buffer.concat(dump[0])
    let mapToStore = JSON.stringify(dump[1])
    fs.writeFileSync(this.blobFilename, blobToStore)
    fs.writeFileSync(this.blobMapFilename, mapToStore)
  }

  has (key) {
    return this.inMemoryBlobs.hasOwnProperty(key) || this.storedBlobMap.hasOwnProperty(key)
  }

  get (key) {
    return this.getFromMemory(key) || this.getFromStorage(key)
  }

  set (key, buffer) {
    return this.inMemoryBlobs.set(key, buffer)
  }

  delete (key) {
    this.inMemoryBlobs.delete(key)
    delete this.storedBlobMap[key]
  }

  getFromMemory (key) {
    return this.inMemoryBlobs.get(key)
  }

  getFromStorage (key) {
    if (!this.storedBlobMap[key]) {
      return
    }

    return this.storedBlob.slice.apply(this.storedBlob, this.storedBlobMap[key])
  }

  getDump () {
    let buffers = []
    let blobMap = {}
    let currentBufferStart = 0

    function dump (key, getBufferByKey) {
      let buffer = getBufferByKey(key)
      buffers.push(buffer)
      blobMap[key] = [currentBufferStart, currentBufferStart + buffer.length]
      currentBufferStart += buffer.length
    }

    for (let key of this.inMemoryBlobs.keys()) {
      dump(key, this.getFromMemory.bind(this))
    }

    for (let key of Object.keys(this.storedBlobMap)) {
      if (!blobMap[key]) {
        dump(key, this.getFromStorage.bind(this))
      }
    }

    return [buffers, blobMap]
  }
}
