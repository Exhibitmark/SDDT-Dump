const fs = require('fs');
const blam = require('./blam-lib.js');
const sddt = require('./definitions/sddt.js');
const struct = require('struct');
const util = require('util');
// Convert fs.readFile into Promise version of same    
const readFile = util.promisify(fs.readFile);

let map = process.argv[2];

const tag_groups_index = {}
let tag_groups = {}
let tag_instances = {}
let file_buf;
let map_name = map.replace('.map','')

read(map).then(data => {
    file_buf = data
    parse(output_soft_ceilings)
})

function parse(cb){
    const {groups, instances} = blam.map_metadata(file_buf)
    buildGroupsIndex(groups)
    tag_groups = groups
    tag_instances = instances
    cb()
}

function buildGroupsIndex(tag_groups){
    Object.keys(tag_groups).forEach(function (group) {
        tag_groups_index[tag_groups[group].magic] = Number(group)
    });
}

function getTag(t){
    //t = string of tag to find
    let mem = [];
    Object.keys(tag_instances).forEach(function(tag) {
        if(tag_instances[tag].tag_group_index == t){
            mem.push(blam.getTagAddress(tag_instances[tag].memory_address))
        }
    });
    return mem
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function output_soft_ceilings(){
    let sbspAddress = getTag(tag_groups_index['tdds'])
    sbspAddress.forEach(function(e){
        let sbsp_tag = file_buf.slice(e, e+1000)
        sddt.sddt_struct._setBuff(sbsp_tag)
        let f = sddt.sddt_struct.fields
        let soft_address = blam.getTagAddress(f.soft_ceilings.pointer)
        let soft_buffer = file_buf.slice(soft_address, soft_address+(20*(f.soft_ceilings.count)))
        let sc_tb = blam.read_tag_block(soft_buffer, f.soft_ceilings.count, sddt.soft_ceiling)
        Object.keys(sc_tb).forEach(function (e,i) {
            let tri_address = blam.getTagAddress(sc_tb[e].soft_ceiling_triangles.pointer)
            let tri_buffer = file_buf.slice(tri_address, tri_address+(68*(sc_tb[e].soft_ceiling_triangles.count)))
            object_builder(tri_buffer,`${map_name}_${getRandomInt(100)}.obj` )
        });
    })
}


const point3 = struct()
    .floatle('x')
    .floatle('y')
    .floatle('z')

const s = struct()
    .chars('unk',32)
    .array('vert',3,point3)

function buildObj(vert_buffer,count){
    const vert_struct = struct()
        .array('resources', count, s);

        vert_struct._setBuff(vert_buffer)
    return vert_struct.fields.resources
}

function object_builder(f, name){
    let nut = buildObj(f,f.length/68)
    let v_header = `# ${(f.length/68)*3} vertex positions`
    let obj = Buffer.from(v_header)

    let f_header = `# Mesh '-000' with ${f.length/68} faces`
    let f_head_buf =  Buffer.from(f_header)
    let faces = Buffer.from([0x0D, 0x0A, 0x0D, 0x0A])
    faces = Buffer.concat([faces, f_head_buf], f_head_buf.length + faces.length);
    let count = 1
    let vn = Buffer.from([])
    Object.keys(nut).forEach(function(tag) {
        Object.keys(nut[tag].vert).forEach(function(v){
            const buf = Buffer.from([0x0D, 0x0A, 0x76, 0x20, 0x20]);
            let ver = `${nut[tag].vert[v].x} ${nut[tag].vert[v].z} ${nut[tag].vert[v].y}`
            const buf1 = Buffer.from(ver);
            let totalLength = obj.length + buf1.length + buf.length;
            obj = Buffer.concat([obj, buf, buf1], totalLength);
            let vn_add = Buffer.from([0x0D, 0x0A, 0x76, 0x6E, 0x20, 0x30, 0x2E, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x30, 0x2E, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x2D, 0x31, 0x2E, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30])
            totalLength = vn.length + vn_add.length;
            vn = Buffer.concat([vn, vn_add], totalLength);
        });
        const buf = Buffer.from([0x0D, 0x0A, 0x66, 0x20, 0x20]);
        let f = `${count}//${count} ${count+1}//${count+1} ${count+2}//${count+2}`
        const buf1 = Buffer.from(f);
        let totalLength = faces.length + buf1.length + buf.length;
        faces = Buffer.concat([faces, buf, buf1], totalLength);
        count+=3
    });
    let totalLength = obj.length + vn.length + faces.length;
    let object = Buffer.concat([obj, vn, faces], totalLength);
    writeFile(name,object)
}


function read(file){
    return readFile(file);
}

function writeFile(name,buffer){
    fs.writeFile(name, buffer,  "binary",function(err) {
    });
}
