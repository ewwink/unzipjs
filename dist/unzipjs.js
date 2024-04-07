"use strict";
/**
 * unzipjs: unzip file without external dependancy
 * repo: https://github.com/ewwink/unzipjs
 */
class unzipjs {
    constructor() {
        this.values = {
            next_code: new Uint16Array(16),
            bl_count: new Uint16Array(16),
            ordr: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
            of0: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999],
            exb: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0],
            ldef: new Uint16Array(32),
            df0: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535],
            dxb: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0],
            ddef: new Uint32Array(32),
            flmap: new Uint16Array(512), fltree: [],
            fdmap: new Uint16Array(32), fdtree: [],
            lmap: new Uint16Array(32768), ltree: [], ttree: [],
            dmap: new Uint16Array(32768), dtree: [],
            imap: new Uint16Array(512), itree: [],
            rev15: new Uint16Array(1 << 15),
            lhst: new Uint32Array(286), dhst: new Uint32Array(30), ihst: new Uint32Array(19),
            lits: new Uint32Array(15000),
            strt: new Uint16Array(1 << 16),
            prev: new Uint16Array(1 << 15)
        }
        this.init()
    }
    /**
     * 
     * @param {*} arrayBuffer 
     * @param {*} onlyNames | optional
     * @returns array of objects
     */
    parse(arrayBuffer, onlyNames = false)	// ArrayBuffer
    {
        var rUs = this.readUshort, rUi = this.readUint, o = 0, out = [];
        var data = new Uint8Array(arrayBuffer);
        var eocd = data.length - 4;

        while (rUi(data, eocd) != 0x06054b50) eocd--;

        o = eocd;
        o += 4;	// sign  = 0x06054b50
        o += 4;  // disks = 0;
        var cnu = rUs(data, o); o += 2;
        rUs(data, o); o += 2;

        var csize = rUi(data, o); o += 4;
        var coffs = rUi(data, o); o += 4;

        o = coffs;
        for (var i = 0; i < cnu; i++) {
            rUi(data, o); o += 4;
            o += 4;  // versions;
            o += 4;  // flag + compr
            o += 4;  // time

            rUi(data, o); o += 4;
            csize = rUi(data, o); o += 4;
            var usize = rUi(data, o); o += 4;

            var nl = rUs(data, o), el = rUs(data, o + 2), cl = rUs(data, o + 4); o += 6;  // name, extra, comment
            o += 8;  // disk, attribs

            var roff = rUi(data, o); o += 4;
            o += nl + el + cl;

            this.readLocal(data, roff, out, csize, usize, onlyNames);
        }
        return out;
    }

    readLocal(data, o, out, csize, usize, onlyNames) {
        var rUs = this.readUshort, rUi = this.readUint;
        rUi(data, o); o += 4;
        rUs(data, o); o += 2;
        rUs(data, o); o += 2;
        var cmpr = rUs(data, o); o += 2;
        rUi(data, o); o += 4;
        rUi(data, o); o += 4;
        o += 8;
        var nlen = rUs(data, o); o += 2;
        var elen = rUs(data, o); o += 2;

        var name = this.readUTF8(data, o, nlen); o += nlen;
        o += elen;
        if (onlyNames) { out[name] = { size: usize, csize: csize }; return; }
        var file = new Uint8Array(data.buffer, o);
        if (cmpr == 0) out[name] = new Uint8Array(file.buffer.slice(o, o + csize));
        else if (cmpr == 8) {
            var buf = new Uint8Array(usize); this.inflateRaw(file, buf);
            out.push({
                name: name,
                buffer: buf,
                toString: function () {
                    let text = ""
                    try {
                        text = new TextDecoder("utf8", { fatal: true }).decode(this.buffer)
                    }
                    // eslint-disable-next-line no-empty
                    catch { }
                    return text
                }
            })
        }
        else throw "unknown compression method: " + cmpr;
    }

    inflateRaw(file, buf) { return this.F_inflate(file, buf); }
    inflate(file, buf) {
        return this.inflateRaw(new Uint8Array(file.buffer, file.byteOffset + 2, file.length - 6), buf);
    }

    readUshort(buff, p) { return (buff[p]) | (buff[p + 1] << 8); }
    readUint(buff, p) { return (buff[p + 3] * (256 * 256 * 256)) + ((buff[p + 2] << 16) | (buff[p + 1] << 8) | buff[p]); }
    readASCII(buff, p, l) { var s = ""; for (var i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]); return s; }
    pad(n) { return n.length < 2 ? "0" + n : n; }
    readUTF8(buff, p, l) {
        var s = "", ns;
        for (var i = 0; i < l; i++) s += "%" + this.pad(buff[p + i].toString(16));
        try { ns = decodeURIComponent(s); }
        catch (e) { return this.readASCII(buff, p, l); }
        return ns;
    }

    F_inflate(data, buf) {
        var u8 = Uint8Array;
        if (data[0] == 3 && data[1] == 0) return (buf ? buf : new u8(0));
        var bitsF = this.bitsF, bitsE = this.bitsE, get17 = this.get17;
        var U = this.values;

        var noBuf = (buf == null);
        if (noBuf) buf = new u8((data.length >>> 2) << 3);

        var BFINAL = 0, BTYPE = 0, HLIT = 0, HDIST = 0, HCLEN = 0, ML = 0, MD = 0;
        var off = 0, pos = 0;
        var lmap, dmap;

        while (BFINAL == 0) {
            BFINAL = bitsF(data, pos, 1);
            BTYPE = bitsF(data, pos + 1, 2); pos += 3;
            //console.log(BFINAL, BTYPE);

            if (BTYPE == 0) {
                if ((pos & 7) != 0) pos += 8 - (pos & 7);
                var p8 = (pos >>> 3) + 4, len = data[p8 - 4] | (data[p8 - 3] << 8);  //console.log(len);//bitsF(data, pos, 16), 
                if (noBuf) buf = this._check(buf, off + len);
                buf.set(new u8(data.buffer, data.byteOffset + p8, len), off);
                pos = ((p8 + len) << 3); off += len; continue;
            }
            if (noBuf) buf = this._check(buf, off + (1 << 17));  // really not enough in many cases (but PNG and ZIP provide buffer in advance)
            if (BTYPE == 1) { lmap = U.flmap; dmap = U.fdmap; ML = (1 << 9) - 1; MD = (1 << 5) - 1; }
            if (BTYPE == 2) {
                HLIT = bitsE(data, pos, 5) + 257;
                HDIST = bitsE(data, pos + 5, 5) + 1;
                HCLEN = bitsE(data, pos + 10, 4) + 4; pos += 14;

                for (var i = 0; i < 38; i += 2) { U.itree[i] = 0; U.itree[i + 1] = 0; }
                var tl = 1;
                for (i = 0; i < HCLEN; i++) { var l = bitsE(data, pos + i * 3, 3); U.itree[(U.ordr[i] << 1) + 1] = l; if (l > tl) tl = l; } pos += 3 * HCLEN;
                this.makeCodes(U.itree, tl);
                this.codes2map(U.itree, tl, U.imap);

                lmap = U.lmap; dmap = U.dmap;

                pos = this._decodeTiny(U.imap, (1 << tl) - 1, HLIT + HDIST, data, pos, U.ttree);
                var mx0 = this._copyOut(U.ttree, 0, HLIT, U.ltree); ML = (1 << mx0) - 1;
                var mx1 = this._copyOut(U.ttree, HLIT, HDIST, U.dtree); MD = (1 << mx1) - 1;

                this.makeCodes(U.ltree, mx0);
                this.codes2map(U.ltree, mx0, lmap);

                this.makeCodes(U.dtree, mx1);
                this.codes2map(U.dtree, mx1, dmap);
            }
            // eslint-disable-next-line no-constant-condition
            while (true) {
                var code = lmap[get17(data, pos) & ML]; pos += code & 15;
                var lit = code >>> 4;  //U.lhst[lit]++;  
                if ((lit >>> 8) == 0) { buf[off++] = lit; }
                else if (lit == 256) { break; }
                else {
                    var end = off + lit - 254;
                    if (lit > 264) { var ebs = U.ldef[lit - 257]; end = off + (ebs >>> 3) + bitsE(data, pos, ebs & 7); pos += ebs & 7; }

                    var dcode = dmap[get17(data, pos) & MD]; pos += dcode & 15;
                    var dlit = dcode >>> 4;
                    var dbs = U.ddef[dlit], dst = (dbs >>> 4) + bitsF(data, pos, dbs & 15); pos += dbs & 15;

                    if (noBuf) buf = this._check(buf, off + (1 << 17));
                    while (off < end) { buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; }
                    off = end;
                }
            }
        }
        return buf.length == off ? buf : buf.slice(0, off);
    }
    _check(buf, len) {
        var bl = buf.length; if (len <= bl) return buf;
        var nbuf = new Uint8Array(Math.max(bl << 1, len)); nbuf.set(buf, 0);
        return nbuf;
    }

    _decodeTiny(lmap, LL, len, data, pos, tree) {
        var bitsE = this.bitsE, get17 = this.get17;
        var i = 0;
        while (i < len) {
            var code = lmap[get17(data, pos) & LL]; pos += code & 15;
            var lit = code >>> 4;
            if (lit <= 15) { tree[i] = lit; i++; }
            else {
                var ll = 0, n = 0;
                if (lit == 16) {
                    n = (3 + bitsE(data, pos, 2)); pos += 2; ll = tree[i - 1];
                }
                else if (lit == 17) {
                    n = (3 + bitsE(data, pos, 3)); pos += 3;
                }
                else if (lit == 18) {
                    n = (11 + bitsE(data, pos, 7)); pos += 7;
                }
                var ni = i + n;
                while (i < ni) { tree[i] = ll; i++; }
            }
        }
        return pos;
    }
    _copyOut(src, off, len, tree) {
        var mx = 0, i = 0, tl = tree.length >>> 1;
        while (i < len) { var v = src[i + off]; tree[(i << 1)] = 0; tree[(i << 1) + 1] = v; if (v > mx) mx = v; i++; }
        while (i < tl) { tree[(i << 1)] = 0; tree[(i << 1) + 1] = 0; i++; }
        return mx;
    }

    makeCodes(tree, MAX_BITS) {  // code, length
        var U = this.values;
        var max_code = tree.length;
        var code, bits, n, i, len;

        var bl_count = U.bl_count; for (i = 0; i <= MAX_BITS; i++) bl_count[i] = 0;
        for (i = 1; i < max_code; i += 2) bl_count[tree[i]]++;

        var next_code = U.next_code;	// smallest code for each length

        code = 0;
        bl_count[0] = 0;
        for (bits = 1; bits <= MAX_BITS; bits++) {
            code = (code + bl_count[bits - 1]) << 1;
            next_code[bits] = code;
        }

        for (n = 0; n < max_code; n += 2) {
            len = tree[n + 1];
            if (len != 0) {
                tree[n] = next_code[len];
                next_code[len]++;
            }
        }
    }
    codes2map(tree, MAX_BITS, map) {
        var max_code = tree.length;
        var r15 = this.values.rev15;
        for (var i = 0; i < max_code; i += 2) if (tree[i + 1] != 0) {
            var lit = i >> 1;
            var cl = tree[i + 1], val = (lit << 4) | cl;
            var rest = (MAX_BITS - cl), i0 = tree[i] << rest, i1 = i0 + (1 << rest);
            while (i0 != i1) {
                var p0 = r15[i0] >>> (15 - MAX_BITS);
                map[p0] = val; i0++;
            }
        }
    }
    FrevCodes(tree, MAX_BITS) {
        var r15 = this.values.rev15, imb = 15 - MAX_BITS;
        for (var i = 0; i < tree.length; i += 2) { var i0 = (tree[i] << (MAX_BITS - tree[i + 1])); tree[i] = r15[i0] >>> imb; }
    }

    bitsE(dt, pos, length) { return ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8)) >>> (pos & 7)) & ((1 << length) - 1); }
    bitsF(dt, pos, length) { return ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8) | (dt[(pos >>> 3) + 2] << 16)) >>> (pos & 7)) & ((1 << length) - 1); }

    get17(dt, pos) {	// return at least 17 meaningful bytes
        return (dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8) | (dt[(pos >>> 3) + 2] << 16)) >>> (pos & 7);
    }
    init() {
        var U = this.values;
        var len = 1 << 15;
        for (var i = 0; i < len; i++) {
            var x = i;
            x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
            x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
            x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
            x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
            U.rev15[i] = (((x >>> 16) | (x << 16))) >>> 17;
        }

        function pushV(tgt, n, sv) { while (n-- != 0) tgt.push(0, sv); }

        for (i = 0; i < 32; i++) { U.ldef[i] = (U.of0[i] << 3) | U.exb[i]; U.ddef[i] = (U.df0[i] << 4) | U.dxb[i]; }

        pushV(U.fltree, 144, 8); pushV(U.fltree, 255 - 143, 9); pushV(U.fltree, 279 - 255, 7); pushV(U.fltree, 287 - 279, 8);
        this.makeCodes(U.fltree, 9);
        this.codes2map(U.fltree, 9, U.flmap);
        this.FrevCodes(U.fltree, 9)

        pushV(U.fdtree, 32, 5);
        this.makeCodes(U.fdtree, 5);
        this.codes2map(U.fdtree, 5, U.fdmap);
        this.FrevCodes(U.fdtree, 5)

        pushV(U.itree, 19, 0); pushV(U.ltree, 286, 0); pushV(U.dtree, 30, 0); pushV(U.ttree, 320, 0);
    }
}

if (typeof module == "object")
    module.exports = new unzipjs();
