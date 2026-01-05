import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Nightmares Loaded");

// config
const CONFIG = Object.freeze({
    NIGHT_START: 13000,
    NIGHT_END: 23000,
    CHECK_RADIUS: 13,
    Y_RANGE_DOWN: 3,
    Y_RANGE_UP: 7,
    INTERACTION_WINDOW: 20,
    SPAWN_DELAY: 1
});

// lights that cancel nightmare spawns
const LIGHT_SOURCES = Object.freeze(new Set([
    "minecraft:torch",
    "minecraft:soul_torch",
    "minecraft:wall_torch",
    "minecraft:soul_wall_torch",
    "minecraft:lantern",
    "minecraft:soul_lantern",
    "minecraft:glowstone",
    "minecraft:sea_lantern",
    "minecraft:lit_redstone_lamp",
    "minecraft:shroomlight",
    "minecraft:jack_o_lantern",
    "minecraft:campfire",
    "minecraft:soul_campfire"
]));

const NIGHTMARE_MOBS = Object.freeze(["minecraft:zombie", "minecraft:skeleton"]);

// track bed clicks
const bedInteractions = new Map();

// async light check results
const pendingChecks = new Map();

function isNight() {
    const time = world.getTimeOfDay();
    return time >= CONFIG.NIGHT_START && time <= CONFIG.NIGHT_END;
}

function isNearBed(player, bedLoc) {
    const pos = player.location;
    return (
        Math.abs(pos.x - bedLoc.x) <= 1 &&
        Math.abs(pos.y - bedLoc.y) <= 1 &&
        Math.abs(pos.z - bedLoc.z) <= 1
    );
}

// async light scanner, yields every 50 blocks so we dont tank tps
function* lightCheckGenerator(block, bedKey) {
    const { x: bx, y: by, z: bz } = block.location;
    const dim = block.dimension;
    const yMin = by - CONFIG.Y_RANGE_DOWN;
    const yMax = by + CONFIG.Y_RANGE_UP;
    
    let checked = 0;
    
    for (let dx = -CONFIG.CHECK_RADIUS; dx <= CONFIG.CHECK_RADIUS; dx++) {
        for (let dz = -CONFIG.CHECK_RADIUS; dz <= CONFIG.CHECK_RADIUS; dz++) {
            // skip corners outside manhattan radius
            if (Math.abs(dx) + Math.abs(dz) > CONFIG.CHECK_RADIUS) continue;
            
            for (let dy = yMin; dy <= yMax; dy++) {
                try {
                    const nearbyBlock = dim.getBlock({ x: bx + dx, y: dy, z: bz + dz });
                    if (nearbyBlock && LIGHT_SOURCES.has(nearbyBlock.typeId)) {
                        // found light, no nightmare lol
                        pendingChecks.set(bedKey, true);
                        return;
                    }
                } catch {
                    // chunk not loaded
                }
                
                checked++;
                if (checked % 50 === 0) yield;
            }
        }
    }
    
    // nightmare time
    pendingChecks.set(bedKey, false);
}

function getSpawnOffset(bedBlock) {
    const facing = bedBlock.permutation.getState("minecraft:cardinal_direction");
    
    const offsets = {
        north: [[-1, 0], [1, 0]],
        south: [[1, 0], [-1, 0]],
        east: [[0, -1], [0, 1]],
        west: [[0, 1], [0, -1]]
    };
    
    const [left, right] = offsets[facing] || [[0, 0], [0, 0]];
    const offset = Math.random() < 0.5 ? left : right;
    const base = bedBlock.location;
    
    return {
        x: base.x + offset[0],
        y: base.y,
        z: base.z + offset[1]
    };
}

function spawnNightmare(player, block) {
    try {
        // wake up call
        player.applyDamage(1);
        
        const mob = NIGHTMARE_MOBS[Math.floor(Math.random() * NIGHTMARE_MOBS.length)];
        const spawnLoc = getSpawnOffset(block);
        
        block.dimension.spawnEntity(mob, spawnLoc);
    } catch (e) {
        console.warn(`[nightmares] spawn failed: ${e}`);
    }
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    if (!block || !block.typeId.includes("bed")) return;
    
    const bedKey = `${block.location.x},${block.location.y},${block.location.z}`;
    const current = bedInteractions.get(bedKey);
    
    if (!current) {
        // first click, start tracking
        bedInteractions.set(bedKey, { count: 1, player, block });
        
        // kick off async light scan
        system.runJob(lightCheckGenerator(block, bedKey));
        
        // check result after window
        system.runTimeout(() => {
            const record = bedInteractions.get(bedKey);
            if (!record) return;
            
            const { count, player: lastPlayer, block: bedBlock } = record;
            const hasLight = pendingChecks.get(bedKey);
            
            // cleanup
            bedInteractions.delete(bedKey);
            pendingChecks.delete(bedKey);
            
            // single click + night + near bed + no light = nightmare
            if (count === 1 && isNight() && isNearBed(lastPlayer, bedBlock.location) && hasLight === false) {
                system.runTimeout(() => {
                    spawnNightmare(lastPlayer, bedBlock);
                }, CONFIG.SPAWN_DELAY);
            }
        }, CONFIG.INTERACTION_WINDOW);
    } else {
        // double click, cancel nightmare
        current.count += 1;
    }
});

// cleanup when player dips
world.afterEvents.playerLeave.subscribe((event) => {
    for (const [key, record] of bedInteractions) {
        if (record.player?.name === event.playerName) {
            bedInteractions.delete(key);
            pendingChecks.delete(key);
        }
    }
});