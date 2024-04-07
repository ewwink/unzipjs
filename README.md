# unzipjs
Simple javascript library to Unzip/decompress a zipped file in Browser or Node.js.

I use this on Cloudflare workers because CF not natively support node.js, even you can install node zip library on CF it produce large bundled file, around 300 kB.

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