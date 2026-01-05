import { world, system, BlockPermutation } from "@minecraft/server";

console.warn("[keirazelle] Optimized Scrubber Loaded");

const CLEAN_CHUNKS = new Set();
const CHUNKS_PER_TICK_LIMIT = 1; 

// [target, replace]
const BULK_REPLACEMENTS = [
    // underground
    ["minecraft:deepslate", "minecraft:stone"],
    ["minecraft:tuff", "minecraft:gravel"],
    ["minecraft:cobbled_deepslate", "minecraft:cobblestone"],
    ["minecraft:andesite", "minecraft:stone"],
    ["minecraft:diorite", "minecraft:stone"],
    ["minecraft:granite", "minecraft:stone"],
    ["minecraft:smooth_basalt", "minecraft:stone"],
    ["minecraft:calcite", "minecraft:stone"],
    ["minecraft:amethyst_block", "minecraft:stone"],
    ["minecraft:budding_amethyst", "minecraft:stone"],
    ["minecraft:dripstone_block", "minecraft:stone"],
    ["minecraft:reinforced_deepslate", "minecraft:bedrock"],
    
    // ores
    ["minecraft:deepslate_iron_ore", "minecraft:iron_ore"],
    ["minecraft:deepslate_gold_ore", "minecraft:gold_ore"],
    ["minecraft:deepslate_copper_ore", "minecraft:stone"],
    ["minecraft:copper_ore", "minecraft:stone"],
    ["minecraft:raw_copper_block", "minecraft:stone"],
    ["minecraft:deepslate_coal_ore", "minecraft:coal_ore"],
    ["minecraft:deepslate_redstone_ore", "minecraft:redstone_ore"],
    ["minecraft:deepslate_lapis_ore", "minecraft:lapis_ore"],
    ["minecraft:deepslate_diamond_ore", "minecraft:diamond_ore"],
    ["minecraft:deepslate_emerald_ore", "minecraft:emerald_ore"],

    // surface
    ["minecraft:mud", "minecraft:gravel"],
    ["minecraft:packed_mud", "minecraft:gravel"],
    ["minecraft:muddy_mangrove_roots", "minecraft:gravel"],
    ["minecraft:powder_snow", "minecraft:snow"],
    ["minecraft:rooted_dirt", "minecraft:dirt"],
    ["minecraft:coarse_dirt", "minecraft:dirt"],
    ["minecraft:red_sand", "minecraft:sand"],
    ["minecraft:suspicious_sand", "minecraft:sand"],
    ["minecraft:suspicious_gravel", "minecraft:gravel"],

    // badlands
    ["minecraft:hardened_clay", "minecraft:sandstone"],
    ["minecraft:stained_hardened_clay", "minecraft:sandstone"],
    ["minecraft:terracotta", "minecraft:sandstone"],
    ["minecraft:red_terracotta", "minecraft:sandstone"],
    ["minecraft:orange_terracotta", "minecraft:sandstone"],
    ["minecraft:yellow_terracotta", "minecraft:sandstone"],
    ["minecraft:brown_terracotta", "minecraft:sandstone"],
    ["minecraft:white_terracotta", "minecraft:sandstone"],
    ["minecraft:light_gray_terracotta", "minecraft:sandstone"],
    ["minecraft:gray_terracotta", "minecraft:sandstone"],
    ["minecraft:black_terracotta", "minecraft:sandstone"],
    ["minecraft:light_blue_terracotta", "minecraft:sandstone"],
    ["minecraft:cyan_terracotta", "minecraft:sandstone"],
    ["minecraft:blue_terracotta", "minecraft:sandstone"],
    ["minecraft:purple_terracotta", "minecraft:sandstone"],
    ["minecraft:magenta_terracotta", "minecraft:sandstone"],
    ["minecraft:pink_terracotta", "minecraft:sandstone"],
    ["minecraft:lime_terracotta", "minecraft:sandstone"],
    ["minecraft:green_terracotta", "minecraft:sandstone"],
    ["minecraft:red_sandstone", "minecraft:sandstone"],

    // nether
    ["minecraft:blackstone", "minecraft:netherrack"],
    ["minecraft:basalt", "minecraft:netherrack"],
    ["minecraft:polished_basalt", "minecraft:netherrack"],
    ["minecraft:smooth_basalt", "minecraft:netherrack"],
    ["minecraft:crimson_nylium", "minecraft:netherrack"],
    ["minecraft:warped_nylium", "minecraft:netherrack"],
    ["minecraft:nether_gold_ore", "minecraft:netherrack"],
    ["minecraft:ancient_debris", "minecraft:netherrack"],
    ["minecraft:soul_soil", "minecraft:soul_sand"],
    
    // misc
    ["minecraft:magma_block", "minecraft:netherrack"], 
    ["minecraft:packed_ice", "minecraft:ice"],
    ["minecraft:blue_ice", "minecraft:ice"],
    ["minecraft:prismarine", "minecraft:stone"],
    ["minecraft:dark_prismarine", "minecraft:stone"],
    ["minecraft:sea_lantern", "minecraft:glowstone"],
    ["minecraft:melon_block", "minecraft:air"],
    
    // planks
    ["minecraft:mangrove_planks", "minecraft:planks"],
    ["minecraft:cherry_planks", "minecraft:planks"],
    ["minecraft:bamboo_planks", "minecraft:planks"],
    ["minecraft:crimson_planks", "minecraft:planks"],
    ["minecraft:warped_planks", "minecraft:planks"],
    ["minecraft:pale_oak_planks", "minecraft:planks"]
];

const FINE_REPLACEMENTS = {
    "minecraft:tall_grass": "minecraft:air",
    "minecraft:seagrass": "minecraft:water",
    "minecraft:kelp": "minecraft:water",
    "minecraft:amethyst_cluster": "minecraft:air",
    "minecraft:glow_lichen": "minecraft:air",
    "minecraft:sculk": "minecraft:stone",
    "minecraft:sculk_vein": "minecraft:air",
    "minecraft:sculk_catalyst": "minecraft:stone",
    "minecraft:sculk_shrieker": "minecraft:stone",
    "minecraft:sculk_sensor": "minecraft:stone",
    "minecraft:calibrated_sculk_sensor": "minecraft:stone",
    "minecraft:moss_block": "minecraft:stone",
    "minecraft:moss_carpet": "minecraft:air",
    "minecraft:spore_blossom": "minecraft:air",
    "minecraft:azalea": "minecraft:air",
    "minecraft:flowering_azalea": "minecraft:air",
    "minecraft:mangrove_roots": "minecraft:gravel",
    "minecraft:bamboo": "minecraft:air",
    "minecraft:sweet_berry_bush": "minecraft:air",
    "minecraft:large_fern": "minecraft:air",
    "minecraft:vine": "minecraft:air",
    "minecraft:cave_vines": "minecraft:air",
    "minecraft:cave_vines_body": "minecraft:air",
    "minecraft:cave_vines_body_with_berries": "minecraft:air",
    "minecraft:cave_vines_head": "minecraft:air",
    "minecraft:cave_vines_head_with_berries": "minecraft:air",
    "minecraft:big_dripleaf": "minecraft:air",
    "minecraft:small_dripleaf_block": "minecraft:air",
    "minecraft:mangrove_propagule": "minecraft:air",
    "minecraft:cherry_sapling": "minecraft:air",
    "minecraft:azalea_leaves": "minecraft:leaves",
    "minecraft:azalea_leaves_flowered": "minecraft:leaves",
    "minecraft:pitcher_crop": "minecraft:air",
    "minecraft:torchflower_crop": "minecraft:air",
    "minecraft:pink_petals": "minecraft:air",
    "minecraft:leaf_litter": "minecraft:air",
    "minecraft:oak_leaf_litter": "minecraft:air",
    "minecraft:spruce_leaf_litter": "minecraft:air",
    "minecraft:birch_leaf_litter": "minecraft:air",
    "minecraft:jungle_leaf_litter": "minecraft:air",
    "minecraft:cherry_leaf_litter": "minecraft:air",
    "minecraft:pale_oak_leaf_litter": "minecraft:air",
    "minecraft:dark_oak_leaf_litter": "minecraft:air",
    "minecraft:infested_deepslate": "minecraft:stone",
    "minecraft:infested_stone": "minecraft:stone",
    "minecraft:brain_coral": "minecraft:water",
    "minecraft:bubble_coral": "minecraft:water",
    "minecraft:fire_coral": "minecraft:water",
    "minecraft:horn_coral": "minecraft:water",
    "minecraft:tube_coral": "minecraft:water",
    "minecraft:brain_coral_fan": "minecraft:water",
    "minecraft:bubble_coral_fan": "minecraft:water",
    "minecraft:fire_coral_fan": "minecraft:water",
    "minecraft:horn_coral_fan": "minecraft:water",
    "minecraft:tube_coral_fan": "minecraft:water",
    "minecraft:bee_nest": "minecraft:air",
    "minecraft:beehive": "minecraft:air"
};

const PERM_CACHE = new Map();
function getPermutation(typeId) {
    if (PERM_CACHE.has(typeId)) return PERM_CACHE.get(typeId);
    try {
        const perm = BlockPermutation.resolve(typeId);
        PERM_CACHE.set(typeId, perm);
        return perm;
    } catch (e) { return null; }
}

// chunk scanning generator
function* chunkScanJob() {
    let chunksProcessed = 0;

    for (const player of world.getPlayers()) {
        if (chunksProcessed >= CHUNKS_PER_TICK_LIMIT) return;

        const dim = player.dimension;
        const { x: px, z: pz } = player.location;
        const cx = Math.floor(px / 16);
        const cz = Math.floor(pz / 16);

        // scan 3x3
        for (let dx = -1; dx <= 1; dx++) {
            if (chunksProcessed >= CHUNKS_PER_TICK_LIMIT) return;

            for (let dz = -1; dz <= 1; dz++) {
                const chunkX = cx + dx;
                const chunkZ = cz + dz;
                const key = `${chunkX},${chunkZ}`;

                if (CLEAN_CHUNKS.has(key)) continue;

                // 1. bulk nuke (heavy command usage)
                runBulkCommands(dim, chunkX, chunkZ);
                
                // 2. fine scrub (job system)
                system.runJob(scrubFineDetails(dim, chunkX, chunkZ));

                CLEAN_CHUNKS.add(key);
                chunksProcessed++;
            }
        }
        yield;
    }
}

system.runInterval(() => {
    system.runJob(chunkScanJob());
}, 3); // every 3 ticks

function runBulkCommands(dim, cx, cz) {
    const x1 = cx * 16;
    const z1 = cz * 16;
    const x2 = x1 + 15;
    const z2 = z1 + 15;

    let yMin = -64;
    let yMax = 320;
    
    if (dim.id === "minecraft:the_nether") {
        yMin = 0;
        yMax = 128;
    }

    const slices = dim.id === "minecraft:the_nether" ? [
        { min: 0, max: 64 },
        { min: 65, max: 128 }
    ] : [
        { min: yMin, max: 0 },       // deepslate
        { min: 1, max: 100 },        // surface
        { min: 101, max: 200 },      // low mountain
        { min: 201, max: yMax }      // high mountain
    ];

    for (const pair of BULK_REPLACEMENTS) {
        const target = pair[0];
        const replace = pair[1];
        
        // skip invalid dimension blocks
        if (target.includes("deepslate") && dim.id === "minecraft:the_nether") continue;
        
        // magma in overworld (ruins) -> stone
        if (target === "minecraft:magma_block" && dim.id !== "minecraft:the_nether") {
             try { dim.runCommand(`fill ${x1} ${yMin} ${z1} ${x2} ${yMax} ${z2} minecraft:stone replace minecraft:magma_block`); } catch (e) {}
             continue;
        }

        for (const slice of slices) {
            if (slice.min >= slice.max) continue;
            try {
                dim.runCommand(`fill ${x1} ${slice.min} ${z1} ${x2} ${slice.max} ${z2} ${replace} replace ${target}`);
            } catch (e) { }
        }
    }
}

function* scrubFineDetails(dimension, cx, cz) {
    const startX = cx * 16;
    const startZ = cz * 16;
    
    // only scan relevant heights
    const minY = dimension.id === "minecraft:the_nether" ? 0 : -8;
    const maxY = 128; 

    for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
            for (let y = minY; y < maxY; y++) {
                try {
                    const block = dimension.getBlock({ x: startX + x, y: y, z: startZ + z });
                    if (!block) continue;
                    
                    const typeId = block.typeId;

                    // fast skip: most blocks are air/stone/water
                    if (typeId === "minecraft:air" || typeId === "minecraft:stone" || typeId === "minecraft:water") continue;

                    if (FINE_REPLACEMENTS[typeId]) {
                        const target = FINE_REPLACEMENTS[typeId];
                        if (target === "minecraft:air") block.setType("minecraft:air");
                        else if (target === "minecraft:water") block.setType("minecraft:water");
                        else {
                            const p = getPermutation(target);
                            if (p) block.setPermutation(p);
                        }
                    } else if (typeId === "minecraft:planks") {
                        const perm = block.permutation;
                        if (perm.getState("wood_type") !== "oak") {
                             block.setPermutation(BlockPermutation.resolve("minecraft:planks").withState("wood_type", "oak"));
                        }
                    }
                } catch (e) {}
            }
            // yield every column to let server breathe
            yield; 
        }
    }
}
