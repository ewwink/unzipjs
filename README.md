# unzipjs
Unzip/decompress a zipped file in Browser or Node.js.
The method return array of object

```
[
  {
    name: "filename", 
    buffer: arrayBuffer, 
    toString: function() // convert buffer to string
  }
]
```

**Why not use available library?**

I use this on Cloudflare workers because CF workers not natively support node.js and not support full Browser API which is required by other library.

## Installation
Download the files in [**dist**](https://github.com/ewwink/unzipjs/tree/main/dist) directory

**Browser**

    <script src="unzipjs.min.js"></script>

**Nodejs**

    const unzipjs = require("/.unzipjs")
    # or
    import unzipjs from "/.unzipjs"
    
**Unzip File**

    const fs = equire("fs")
	const arraybuffer = fs.readFileSync('localfile.zip')
    
**Unzip HTTP Response buffer**

    const arraybuffer = await fetch('https://example/file.zip').then(
      res => res.arrayBuffer()
    );

**Then**

    let unzipped = unzipjs.parse(arraybuffer);
    for (let item of unzipped) {
       console.log(item.name)
       console.log(item.toString()) // if file not valid UTF8 return empty 
       console.log(item.buffer.length)
    }

### Limitation
- No create .zip function
- No save to file function

credit: [UZIP](https://github.com/photopea/UZIP.js)