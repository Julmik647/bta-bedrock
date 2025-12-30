import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Beta Animal AI Loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 100,
    CLEANUP_INTERVAL: 600,
    HURT_COOLDOWN_TICKS: 160, // 8 seconds
    JUMP_COOLDOWN_MIN: 200,   // 10 seconds
    JUMP_COOLDOWN_MAX: 600,   // 30 seconds
    NEARBY_RADIUS: 8,
    BASE_JUMP_CHANCE: 0.15,
    NEIGHBOR_BONUS: 0.10,
    MAX_JUMP_CHANCE: 0.50,
    JUMP_IMPULSE: 0.42
});

// beta passives
const PASSIVE_MOBS = Object.freeze(new Set([
    "minecraft:pig",
    "minecraft:cow",
    "minecraft:sheep",
    "minecraft:chicken"
]));

// tick based cooldowns
const hurtCooldowns = new Map();
const jumpCooldowns = new Map();
let currentTick = 0;

// track ticks
system.runInterval(() => { currentTick++; }, 1);

world.afterEvents.entityHurt.subscribe((ev) => {
    if (PASSIVE_MOBS.has(ev.hurtEntity.typeId)) {
        hurtCooldowns.set(ev.hurtEntity.id, currentTick + CONFIG.HURT_COOLDOWN_TICKS);
    }
});

// generator for entity processing
function* animalJumpJob() {
    const overworld = world.getDimension("overworld");
    const entities = overworld.getEntities();
    
    for (const entity of entities) {
        if (!PASSIVE_MOBS.has(entity.typeId)) continue;
        if (!entity.isValid()) continue;
        
        const entityId = entity.id;

        // hurt stun check
        const hurtEnd = hurtCooldowns.get(entityId);
        if (hurtEnd && currentTick < hurtEnd) continue;
        if (hurtEnd) hurtCooldowns.delete(entityId);

        // jump cooldown check
        const jumpEnd = jumpCooldowns.get(entityId);
        if (jumpEnd && currentTick < jumpEnd) continue;

        // spatial query for neighbors
        const nearby = overworld.getEntities({
            location: entity.location,
            maxDistance: CONFIG.NEARBY_RADIUS,
            excludeFamilies: ["inanimate", "player", "monster"]
        });
        
        // count passive neighbors
        let neighborCount = 0;
        for (const n of nearby) {
            if (n.id !== entityId && PASSIVE_MOBS.has(n.typeId)) {
                neighborCount++;
            }
        }

        // jump chance scales with neighbors
        const jumpChance = Math.min(
            CONFIG.BASE_JUMP_CHANCE + neighborCount * CONFIG.NEIGHBOR_BONUS,
            CONFIG.MAX_JUMP_CHANCE
        );
        if (Math.random() > jumpChance) continue;

        // physics check
        try {
            const vel = entity.getVelocity();
            if (Math.abs(vel.y) > 0.1) continue;
            const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            if (hSpeed < 0.01) continue;
        } catch { continue; }

        // do the jump
        doJump(entity);
        
        // set cooldown
        const cooldown = CONFIG.JUMP_COOLDOWN_MIN + 
            Math.floor(Math.random() * (CONFIG.JUMP_COOLDOWN_MAX - CONFIG.JUMP_COOLDOWN_MIN));
        jumpCooldowns.set(entityId, currentTick + cooldown);

        yield;
    }
}

function doJump(entity) {
    // chickens do single hop, others do 1 to 3
    const jumpCount = entity.typeId === "minecraft:chicken" ? 1 : 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < jumpCount; i++) {
        system.runTimeout(() => {
            try {
                if (entity.isValid()) {
                    const v = entity.getVelocity();
                    if (Math.abs(v.y) < 0.1) {
                        entity.applyImpulse({ x: 0, y: CONFIG.JUMP_IMPULSE, z: 0 });
                    }
                }
            } catch {}
        }, i * 15);
    }
}

system.runInterval(() => {
    system.runJob(animalJumpJob());
}, CONFIG.CHECK_INTERVAL);

// cleanup stale cooldowns
system.runInterval(() => {
    for (const [id, time] of jumpCooldowns) {
        if (time < currentTick) jumpCooldowns.delete(id);
    }
    for (const [id, time] of hurtCooldowns) {
        if (time < currentTick) hurtCooldowns.delete(id);
    }
}, CONFIG.CLEANUP_INTERVAL);
