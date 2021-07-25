const struct = require('struct');

module.exports = {
    //Sizeof 0xC (12)
    tagblock : struct()
        .word32Sle('count')
        .word32Ule('pointer')
        .word32Ule('pad'),
    //Sizeof 0x14 (20)
    dataref : struct()
        .word32Sle('size')
        .word64Sle('unused')
        .word32Ule('pointer')
        .word32Sle('padding'),
    //Sizeof 0x10 (16)
    tagref: struct()
        .word32Sle('tag_group_magic')
        .word64Sle('unused')
        .word32Sle('datum_index'),
    //Sizeof 0x8 (8)
    point2 : struct()
        .floatle('x')
        .floatle('y'),
    //Sizeof 0x8 (8)
    point3 : struct()
        .floatle('x')
        .floatle('y')
        .floatle('z'),
    //Sizeof 0xC (12)
    vector3 : struct()
        .floatle('x')
        .floatle('y')
        .floatle('z'),
    //Sizeof 0x10 (16)
    vector4 : struct()
        .floatle('i')
        .floatle('j')
        .floatle('k')
        .floatle('w'),

    get_bit: (number,bit) => {
        return (number>>bit) & 1   
    },
    read_tag_block: (buf, count, s) => {
        const b = struct()
            .array('block', count, s);
        b._setBuff(buf)
        return b.fields.block
    },
    read_tag_def: (buf, struct) => {
        struct._setBuff(buf)
        return struct.fields
    },
    read_struct: (struct) => {
        Object.keys(struct).forEach(function(e) {
            console.log(typeof struct[e], struct[e])
        });
    }

}