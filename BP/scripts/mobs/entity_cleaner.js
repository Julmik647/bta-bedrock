import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Entity Cleaner Module Loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 100,
    CHECK_RADIUS: 32
});

// mobs that shouldnt exist in beta
const BANNED_MOBS = Object.freeze(new Set([
    // villagers and illagers
    "minecraft:villager",
    "minecraft:villager_v2",
    "minecraft:zombie_villager",
    "minecraft:zombie_villager_v2",
    "minecraft:wandering_trader",
    "minecraft:iron_golem",
    "minecraft:snow_golem",
    "minecraft:pillager",
    "minecraft:vindicator",
    "minecraft:evoker",
    "minecraft:ravager",
    "minecraft:vex",
    "minecraft:witch",
    "minecraft:illusioner",

    // modern monsters
    "minecraft:drowned",       
    "minecraft:husk",           
    "minecraft:stray",          
    "minecraft:phantom",        
    "minecraft:enderman",       
    "minecraft:cave_spider",  
    "minecraft:silverfish",     
    "minecraft:guardian",
    "minecraft:elder_guardian",
    "minecraft:wither_skeleton",
    "minecraft:wither",
    "minecraft:shulker",
    "minecraft:endermite",
    "minecraft:breeze",
    "minecraft:bogged",
    "minecraft:warden",

    // modern animals
    "minecraft:horse",
    "minecraft:donkey",
    "minecraft:mule",
    "minecraft:skeleton_horse",
    "minecraft:zombie_horse",
    "minecraft:llama",
    "minecraft:trader_llama",
    "minecraft:ocelot",
    "minecraft:cat",
    "minecraft:parrot",
    "minecraft:bat",
    "minecraft:polar_bear",
    "minecraft:panda",
    "minecraft:fox",
    "minecraft:bee",
    "minecraft:goat",
    "minecraft:axolotl",
    "minecraft:glow_squid",
    "minecraft:frog",
    "minecraft:tadpole",
    "minecraft:allay",
    "minecraft:sniffer",
    "minecraft:camel",
    "minecraft:armadillo",
    "minecraft:rabbit",
    "minecraft:turtle",
    "minecraft:dolphin",

    // nether update mobs 
    "minecraft:piglin",
    "minecraft:piglin_brute",
    "minecraft:hoglin",
    "minecraft:zoglin",
    "minecraft:strider",
    "minecraft:magma_cube"
]));

// generator for async entity cleanup
function* cleanerJob() {
    const players = world.getAllPlayers();
    
    for (const player of players) {
        if (!player.isValid()) continue;
        
        try {
            const entities = player.dimension.getEntities({
                location: player.location,
                maxDistance: CONFIG.CHECK_RADIUS
            });
            
            for (const ent of entities) {
                if (BANNED_MOBS.has(ent.typeId)) {
                    ent.remove();
                }
                yield;
            }
        } catch (e) {
            console.warn(`[entityCleaner] error: ${e}`);
        }
        
        yield;
    }
}

system.runInterval(() => {
    system.runJob(cleanerJob());
}, CONFIG.CHECK_INTERVAL);
