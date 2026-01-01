import { world, system } from "@minecraft/server";

console.warn("[keirazelle] random spawn 2.0 loaded");

const CONFIG = Object.freeze({
    RANGE: 1000, // +/- x and z
    MAX_ATTEMPTS: 15,
    WAIT_TICKS: 40, 
    MIN_Y: 50,
    MAX_Y: 120
});

// no no spawn
const BAD_BLOCKS = Object.freeze(new Set([
    "minecraft:water", 
    "minecraft:flowing_water",
    "minecraft:lava", 
    "minecraft:flowing_lava",
    "minecraft:air",
    "minecraft:powder_snow",
    "minecraft:cactus",
    "minecraft:magma"
]));

// check if we already set the spawn once
function isSpawnSet() {
    return world.getDynamicProperty("betafied:spawn_init") === true;
}

function getRandomCoord() {
    return Math.floor(Math.random() * (CONFIG.RANGE * 2)) - CONFIG.RANGE;
}

// simple top down scan
function findSurface(dim, x, z) {
    for (let y = CONFIG.MAX_Y; y > CONFIG.MIN_Y; y--) {
        try {
            const block = dim.getBlock({ x, y, z });
            
            // skip air until we hit something
            if (!block || block.isAir) continue;
            
            // hit 
            const type = block.typeId;
            if (BAD_BLOCKS.has(type)) return null;
            
            // check space above for head
            const above1 = dim.getBlock({ x, y: y + 1, z });
            const above2 = dim.getBlock({ x, y: y + 2, z });
            
            if (above1?.isAir && above2?.isAir) {
                return y + 1;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function attemptSpawn(player, attempt = 1) {
    if (!player.isValid()) return;

    if (attempt > CONFIG.MAX_ATTEMPTS) {
        console.warn("[randomSpawn] gave up, using default 0,80,0");
        player.teleport({ x: 0.5, y: 80, z: 0.5 });
        player.addTag("spawned");
        
        // still mark spawn as set so others spawn here too
        world.setDynamicProperty("betafied:spawn_init", true);
        try {
            player.dimension.runCommand(`setworldspawn 0 80 0`);
        } catch(e) {}
        return;
    }

    const tx = getRandomCoord();
    const tz = getRandomCoord();

    // yeet player to load chunks
    player.teleport({ x: tx, y: 130, z: tz });
    
    // god mode so they dont die falling while loading
    player.addEffect("resistance", 200, { amplifier: 255, showParticles: false });

    // wait for chunk to load
    system.runTimeout(() => {
        if (!player.isValid()) return;

        const surfaceY = findSurface(player.dimension, tx, tz);

        if (surfaceY === null) {
            console.warn(`[randomSpawn] bad spot at ${tx},${tz} - trying again (${attempt})`);
            attemptSpawn(player, attempt + 1);
            return;
        }

        // set
        console.warn(`[randomSpawn] new world spawn set at ${tx}, ${surfaceY}, ${tz}`);
        
        // save persistence
        world.setDynamicProperty("betafied:spawn_init", true);
        
        // set this as the world spawn for everyone
        try {
            player.dimension.runCommand(`setworldspawn ${tx} ${surfaceY} ${tz}`);
        } catch(e) {}

        player.teleport({ x: tx + 0.5, y: surfaceY, z: tz + 0.5 });
        player.addTag("spawned");

    }, CONFIG.WAIT_TICKS);
}

world.afterEvents.playerSpawn.subscribe((ev) => {
    const { player, initialSpawn } = ev;
    
    if (!initialSpawn || player.hasTag("spawned")) return;

    // spawn already set by first player, just tag and let vanilla handle it
    if (isSpawnSet()) {
        player.addTag("spawned");
        return;
    }

    // first player finds a spot and sets world spawn
    attemptSpawn(player);
});
