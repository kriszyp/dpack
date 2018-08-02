var PREFERRED_MAX_BUFFER_SIZE = 0x8000

function nodeCharEncoder(options) {
	var bufferSize = 0x100
	var offset = 0
	var outlet = options.outlet
	var buffer = Buffer.allocUnsafe(bufferSize)
	function makeRoom(bytesNeeded) {
		if (outlet) {
			outlet.writeBytes(buffer.slice(0, offset))
			if (bufferSize < PREFERRED_MAX_BUFFER_SIZE || bytesNeeded > PREFERRED_MAX_BUFFER_SIZE) {
				bufferSize = Math.max(bufferSize * 2, bytesNeeded)
			}
			buffer = Buffer.allocUnsafe(bufferSize)
			offset = 0
		} else {
			bufferSize = Math.max(bufferSize * 2, bufferSize + bytesNeeded)
			var oldBuffer = buffer
			buffer = Buffer.allocUnsafe(bufferSize)
			oldBuffer.copy(buffer, 0, 0, offset)
		}
	}
	function flush() {
		outlet.writeBytes(buffer.slice(0, offset))
		//if (offset + 2000 > buffer.length)
		buffer = Buffer.allocUnsafe(bufferSize = Math.min(Math.max(offset, 0x100), 0x8000)) // allocate a new buffer, don't want to overwrite the bytes in the old one while they are in use!
		/*else {// or continue to use the remaining space in this buffer, if there is a lot of room left
			buffer = buffer.slice(offset)
			end = buffer.length
		}*/
		offset = 0
	}
	var writeToken = options.utf8 ?
	function writeToken(type, number) {
		if (number >= 0x20000) {
			var token = ((number & 0x1ffff) << 2) + type + 0x80000
			offset += buffer.write(String.fromCodePoint(token), offset)
			offset += buffer.write(String.fromCodePoint(number >>> 17), offset)
		} else {
			var token = (number << 2) + type
			offset += buffer.write(String.fromCodePoint(token), offset)
		}
		if (offset > bufferSize - 8) {
			makeRoom(0)
		}
	} :
	function writeToken(type, number) {
		if (number < 0x10) { // 4 bits of number
			buffer[offset++] = (type << 4) + number + 0x40
		} else if (number < 0x400) { // 10 bits of number
			buffer[offset++] = (type << 4) + (number >>> 6)
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x10000) { // 16 bits of number
			buffer[offset++] = (type << 4) + (number >>> 12)
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x400000) { // 22 bits of number
			buffer[offset++] = (type << 4) + (number >>> 18)
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x10000000) { // 28 bits of number
			buffer[offset++] = (type << 4) + (number >>> 24)
			buffer[offset++] = (number >>> 18) & 0x3f
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x100000000) { // 32 bits of number
			buffer[offset++] = (type << 4) + (number >>> 30)
			buffer[offset++] = (number >>> 24) & 0x3f
			buffer[offset++] = (number >>> 18) & 0x3f
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x400000000) { // 34 bits of number
			buffer[offset++] = (type << 4) + (number / 0x40000000 >>> 0)
			buffer[offset++] = (number >>> 24) & 0x3f
			buffer[offset++] = (number >>> 18) & 0x3f
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x10000000000) { // 40 bits of number
			buffer[offset++] = (type << 4) + (number / 0x1000000000 >>> 0)
			buffer[offset++] = (number / 0x40000000) & 0x3f
			buffer[offset++] = (number >>> 24) & 0x3f
			buffer[offset++] = (number >>> 18) & 0x3f
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else if (number < 0x400000000000) { // 46 bits of number (needed for dates!)
			buffer[offset++] = (type << 4) + (number / 0x400000000000 >>> 0)
			buffer[offset++] = (number / 0x1000000000) & 0x3f
			buffer[offset++] = (number / 0x40000000) & 0x3f
			buffer[offset++] = (number >>> 24) & 0x3f
			buffer[offset++] = (number >>> 18) & 0x3f
			buffer[offset++] = (number >>> 12) & 0x3f
			buffer[offset++] = (number >>> 6) & 0x3f
			buffer[offset++] = (number & 0x3f) + 0x40
		} else {
			throw new Error('Too big of number')
		}
		if (offset > bufferSize - 6) {
			makeRoom(0)
		}
	}

	function writeBuffer(source) {
		var sourceLength = source.length
		if (sourceLength + offset + 6 > bufferSize) {
			makeRoom(sourceLength + 10)
		}
		source.copy(buffer, offset)
		offset += sourceLength
	}

	function writeString(string) {
		var maxStringLength = string.length * 3 + 10
		if (offset + maxStringLength > bufferSize) {
			makeRoom(maxStringLength)
		}
		var bytesWritten = buffer.write(string, offset)
		offset += bytesWritten
	}
	function getSerialized() {
		return buffer.slice(0, offset)
	}
	function insertBuffer(headerBuffer, position) {
		var headerLength = headerBuffer.length
		if (offset + headerLength > bufferSize) {
			makeRoom(headerLength)
		}
		buffer.copy(buffer, headerLength + position, position, offset)
		headerBuffer.copy(buffer, position)
		offset += headerLength
	}
	return {
		writeToken,
		writeString,
		writeBuffer,
		getSerialized,
		insertBuffer,
		flush,
		getOffset() {
			return offset
		}
	}
}
exports.nodeCharEncoder = nodeCharEncoder