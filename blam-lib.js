const struct = require('struct');
const {tagblock, tagref, data_ref, vector3, vector4, read_tag_block,read_tag_def} = require('./definitions/core.js')
const {zone_struct} = require('./definitions/zone.js')

const map_file = {}
let tag_groups;
const tag_groups_index = {}
let tag_instances = []

const namespaces = {
    0: 0xCDC -  0x4C3,
    1: 0x4C3 -  0x4C3,
    2: 0xACA -  0x4C3,
    3: 0xB5C -  0x4C3,
    4: 0xBB2 -  0x4C3,
    5: 0xBC2 -  0x4C3,
    6: 0xC0E -  0x4C3,
    7: 0xC47 -  0x4C3,
    8: 0xC5B -  0x4C3,
    9: 0xC68 -  0x4C3,
    10: 0xC69 -  0x4C3
}

//Structs
const tag_instance = struct()
    .word16Sle('tag_group_index')
    .word16Ule('datum_index_salt')
    .word32Ule('memory_address');

const tag_group = struct()
    .chars('magic',4)
    .word32Sle('parent_magic')
    .word32Sle('grandparent_magic')
    .word32Ule('string_id');

const partition_struct = struct()
    .word64Ule('load_address')
    .word64Ule('size');

const offset_mask_struct = struct()
    .word32Ule('mask');

const section_struct = struct()
    .word32Ule('offset')
    .word32Ule('size');

const map_header = struct()
    .chars('magic', 4)
    .word32Ule('file_version')
    .word64Ule('file_size')
    .word64Ule('index_header_address')
    .word32Ule('tag_buffer_offset')
    .word32Ule('virtual_size')
    .chars('unk', 292)
    .word16Sle('type')
    .chars('unk1', 22)
    .word32Sle('string_table_count')
    .word32Sle('string_table_size')
    .word32Sle('string_index_table_offset')
    .word32Sle('string_table_offset')
    .chars('unk2', 340)
    .word32Sle('file_table_count')
    .word32Sle('file_table_offset')
    .word32Sle('file_table_size')
    .word32Sle('file_index_table_offset')
    .chars('unk3', 40)
    .word64Ule('virtual_base')
    .chars('unk5', 436)
    .array('offset_masks', 4, offset_mask_struct)
    .array('sections', 4, section_struct);

const tag_header = struct()
    .word64Sle('tag_groups')
    .word64Ule('tag_group_address')
    .word64Sle('number_of_tags')
    .word64Ule('tag_table_address')
    .word64Sle('number_of_global_tags')
    .word64Ule('global_tag_table_address')
    .word64Sle('number_of_tag_interops')
    .word64Ule('tag_interop_table_address')
    .word32Sle('unk')
    .chars('magic',4)

function create_map_globals(header){
    let globals = {
        "virtual_base": header.virtual_base,
        "tags_header_address": header.index_header_address,
        "debug_offset_mask":header.offset_masks[0].mask,
        "offset_mask":header.offset_masks[2].mask,
        "debug_section": header.sections[0].offset,
        "debug_size":header.sections[0].size,
        "section": header.sections[2].offset
    }
    globals.tags_section_offset = globals.offset_mask + globals.section;
    globals.address_mask = globals.tags_section_offset - globals.virtual_base
    globals.tags_header_offset = globals.tags_header_address + globals.address_mask;

    globals.debug_section_offset = globals.debug_offset_mask + globals.debug_section;
    globals.string_index_table_address = (header.string_index_table_offset - globals.debug_section_offset) + globals.debug_section;
    globals.string_table_address = (header.string_table_offset - globals.debug_section_offset)+globals.debug_section;
    return globals
}

function tagHeaderFixup(header){
    const tag_header_offsets = {
        'tag_groups': header.tag_groups,
        'tag_group_address': header.tag_group_address + map_file.header.address_mask,
        'tag_count': header.number_of_tags,
        'tag_table_address': header.tag_table_address + map_file.header.address_mask
    }
    return tag_header_offsets
}

function buildGroupsIndex(tag_groups){
    Object.keys(tag_groups).forEach(function (group) {
        tag_groups_index[tag_groups[group].magic] = Number(group)
    });
}

module.exports = {
    map_header,
    tagblock,
    tag_header,
    tag_group,
    tag_instance,
    tag_instances,
    tag_groups,
    tag_groups_index,
    read_tag_block,
    read_tag_def,
    zone_struct,

    //Functions
    getTagAddress: (instance) => {
        return (instance * 4) + map_file.header.address_mask
    },

    readRawPage: (page_buffer) => {
        const raw_page = {
            "block_offset": page_buffer.readUInt32LE(8),
            "compressed_size":page_buffer.readUInt32LE(12),
            "uncompressed_size":page_buffer.readUInt32LE(16)
        }
        return raw_page
    },

    read_zone: (zone_buffer) => {
        const zone = read_tag_def(zone_buffer,zone_struct)
        return zone
    },

    read_tag_resource: (resource_buffer) => {
        const tag_resource = {
            "parent_tag": resource_buffer.readUInt32LE(0),
            "datum_index": resource_buffer.readUInt32LE(12),
            "salt": resource_buffer.readUInt16LE(16),
            "resource_type_index": resource_buffer.readUInt8LE(18),
            "flags": resource_buffer.readUInt8LE(19),
            "segment_index":resource_buffer.readUInt16LE(34),
        }
        return tag_resource
    },

    read_raw_page: (page_buffer) => {
        const raw_page = {
            "block_offset": page_buffer.readUInt32LE(8),
            "compressed_size":page_buffer.readUInt32LE(12),
        }
        return raw_page
    },

    readSegment: (seg_buffer) => {
        const segment = {
            "primary_page_index":seg_buffer.readUInt16LE(0),
            "secondary_page_index":seg_buffer.readUInt16LE(2),
        }
        return segment
    },

    calculateIndex: (datum_index) => {
        const datum = {
            "tag_instance_index": datum_index & 65535,
            "tag_instance_identifier": datum_index >>> 16
        }
        return datum
    },

    map_metadata: (file_buf)  => {
        map_header._setBuff(file_buf)
        map_file.header = create_map_globals(map_header.fields)
        //Read tag header struct
        let temp_tag_head = file_buf.slice(map_file.header.tags_header_offset, map_file.header.tags_header_offset + 72)
        tag_header._setBuff(temp_tag_head)
        map_file.tag_header = tagHeaderFixup(tag_header.fields)
        let group_size = map_file.tag_header.tag_groups * 16;
        let group_buf = file_buf.slice(map_file.tag_header.tag_group_address, map_file.tag_header.tag_group_address + group_size)
        let instance_size = map_file.tag_header.tag_count * 8;
        let instances_buf = file_buf.slice(map_file.tag_header.tag_table_address, map_file.tag_header.tag_table_address + instance_size)
        //Reads all tag groups into their own array to access later
        tag_groups = read_tag_block(group_buf, tag_header.get('tag_groups'),tag_group)
        //Reads all tag instances into their own array to access later
        tag_instances = read_tag_block(instances_buf,tag_header.get('number_of_tags'),tag_instance)
        buildGroupsIndex(tag_groups)
        return {
            groups:tag_groups,
            instances:tag_instances
        }
    },
    getTagResources: (zone_buffer,count)  => {
        const tag_resources_struct = struct()
            .array('resources', count, tag_resource_struct);
    
            tag_resources_struct._setBuff(zone_buffer)
        return tag_resources_struct.fields.resources
    },
    getPages: (raw_buffer,count)  => {
        const tag_resources_struct = struct()
            .array('resources', count, tag_resource_struct);
    
            tag_resources_struct._setBuff(raw_buffer)
        return tag_resources_struct.fields.resources
    },
    getBlocks: (buf,count)  => {
        const tag_resources_struct = struct()
            .array('resources', count, tagblock);
    
            tag_resources_struct._setBuff(buf)
        return tag_resources_struct.fields.resources
    }
    
}