const {tagblock, tag_ref, data_ref, get_bit,vector3} = require('./core.js')
const struct = require('struct');

const sddt_struct = struct()
    .word32Sle('importer_version')
    .struct('soft_ceiling_mopp_codes',tagblock)
    .struct('soft_ceilings',tagblock)
    .struct('water_mopp_codes',tagblock)
    .struct('water_groups',tagblock)
    .struct('water_instances',tagblock)

const soft_ceiling_mopp = struct()
    .word64Sle('runtime_code_pointer')
    .word16Sle('size')
    .word16Sle('count')
    .word32Sle('unk')
    .struct('v',vector3)
    .floatle('wv')
    .word64Sle('runtime_mopp_code_pointer')
    .word32Sle('data_size')
    .word32Ule('data_capacity')
    .struct('mopp_data',tagblock)
    .word32Sle('unk2')

const soft_ceiling = struct()
    .word32Sle('name')
    .word16Sle('type')
    .word16Sle('unk')
    .struct('soft_ceiling_triangles',tagblock)

const soft_ceilings_triangles = struct()
    .chars('unk',16)
    .struct('bounding_sphere_center',vector3)
    .floatle('bounding_sphere_radius')
    .struct('vertex_0',vector3)
    .struct('vertex_1',vector3)
    .struct('vertex_2',vector3)

module.exports = {
    sddt_struct,
    soft_ceiling,
    soft_ceilings_triangles
}