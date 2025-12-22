import { world, system } from "@minecraft/server";

console.warn("[Betafied] Beta Animal AI Loaded");

// beta 1.7.3 style animals randomly hop around
const PASSIVE_MOBS = new Set([
    "minecraft:pig",
    "minecraft:cow",
    "minecraft:sheep",
    "minecraft:chicken"
]);

// track jump cooldowns per entity
// track hurt cooldowns to prevent floating when spam-hit
const hurtCooldowns = new Map();
const jumpCooldowns = new Map();

world.afterEvents.entityHurt.subscribe((ev) => {
    if (PASSIVE_MOBS.has(ev.hurtEntity.typeId)) {
        // disable jumping for 8 seconds after being hit
        hurtCooldowns.set(ev.hurtEntity.id, Date.now() + 8000);
    }
});

// random hop behavior - less frequent, more natural
system.runInterval(() => {
    const entities = [...world.getDimension("overworld").getEntities()];
    const passiveMobs = entities.filter(e => PASSIVE_MOBS.has(e.typeId));
    
    for (const entity of passiveMobs) {
        const entityId = entity.id;
        const now = Date.now();
        
        // check hurt cooldown (stun)
        if (hurtCooldowns.has(entityId)) {
            if (now < hurtCooldowns.get(entityId)) continue;
            hurtCooldowns.delete(entityId);
        }

        // check jump cooldown
        const cooldownEnd = jumpCooldowns.get(entityId) || 0;
        if (now < cooldownEnd) continue;
        
        // count nearby animals
        const pos = entity.location;
        const nearbyCount = passiveMobs.filter(e => {
            if (e.id === entityId) return false;
            const dx = e.location.x - pos.x;
            const dz = e.location.z - pos.z;
            return (dx * dx + dz * dz) < 64;
        }).length;
        
        // base 15% chance, +10% per nearby animal (max 50%)
        const jumpChance = Math.min(0.15 + nearbyCount * 0.10, 0.50);
        if (Math.random() > jumpChance) continue;
        
        // check if on ground and moving
        try {
            const vel = entity.getVelocity();
            if (Math.abs(vel.y) > 0.1) continue; // skip if already in air
            
            // only jump if moving (horizontal velocity > 0.01)
            const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            if (horizontalSpeed < 0.01) continue;
            
        } catch (e) { continue; }
        
        // chickens 1 jump, others 1-3
        let jumpCount;
        if (entity.typeId === "minecraft:chicken") {
            jumpCount = 1;
        } else {
            jumpCount = 1 + Math.floor(Math.random() * 3); // 1-3
        }
        
        // natural jumps - wait for landing between each
        for (let i = 0; i < jumpCount; i++) {
            system.runTimeout(() => {
                try {
                    if (!entity.isValid()) return;
                    
                    // re-check hurt stun before executing delayed jumps
                    if (hurtCooldowns.has(entity.id) && Date.now() < hurtCooldowns.get(entity.id)) return;

                    // only jump if on ground
                    const v = entity.getVelocity();
                    if (Math.abs(v.y) < 0.1) {
                        entity.applyImpulse({ x: 0, y: 0.42, z: 0 });
                    }
                } catch (e) {}
            }, i * 15); // 15 ticks between jumps (gives time to land)
        }
        
        // longer cooldown (10-30 seconds)
        const nextJump = now + 10000 + Math.random() * 20000;
        jumpCooldowns.set(entityId, nextJump);
    }
}, 100); // check every 5 seconds

// cleanup dead entities
system.runInterval(() => {
    const allIds = new Set();
    const overworld = world.getDimension("overworld");
    if (overworld) { // safety check
        for (const entity of overworld.getEntities()) {
            allIds.add(entity.id);
        }
    }
    
    // clean jump cooldowns
    for (const id of jumpCooldowns.keys()) {
        if (!allIds.has(id)) jumpCooldowns.delete(id);
    }
    // clean hurt cooldowns
    for (const id of hurtCooldowns.keys()) {
        if (!allIds.has(id)) hurtCooldowns.delete(id);
    }
}, 600);
