import { world, system } from "@minecraft/server";

console.warn("[Betafied] Beta Animal AI Loaded");

// beta 1.7.3 style animals randomly hop around like dumb cuties
const PASSIVE_MOBS = new Set([
    "minecraft:pig",
    "minecraft:cow",
    "minecraft:sheep",
    "minecraft:chicken"
]);

// track jump cooldowns per entity
const jumpCooldowns = new Map();

// random hop behavior
system.runInterval(() => {
    const entities = [...world.getDimension("overworld").getEntities()];
    const passiveMobs = entities.filter(e => PASSIVE_MOBS.has(e.typeId));
    
    for (const entity of passiveMobs) {
        const entityId = entity.id;
        const now = Date.now();
        
        // check cooldown
        const cooldownEnd = jumpCooldowns.get(entityId) || 0;
        if (now < cooldownEnd) continue;
        
        // count nearby animals - more nearby = more likely to jump
        const pos = entity.location;
        const nearbyCount = passiveMobs.filter(e => {
            if (e.id === entityId) return false;
            const dx = e.location.x - pos.x;
            const dz = e.location.z - pos.z;
            return (dx * dx + dz * dz) < 64; // within 8 blocks
        }).length;
        
        // base 40% chance, +15% per nearby animal
        const jumpChance = Math.min(0.40 + nearbyCount * 0.15, 0.85);
        if (Math.random() > jumpChance) continue;
        
        // do 2-6 quick jumps (more when clumped)
        const baseJumps = 2 + Math.floor(Math.random() * 3); // 2-4
        const bonusJumps = Math.min(nearbyCount, 2); // up to 2 bonus
        const jumpCount = baseJumps + bonusJumps;
        
        for (let i = 0; i < jumpCount; i++) {
            system.runTimeout(() => {
                try {
                    if (!entity.isValid()) return;
                    entity.applyImpulse({ x: 0, y: 0.42, z: 0 });
                } catch (e) {}
            }, i * 8); // 8 ticks between each jump
        }
        
        // shorter cooldown (3-10 seconds)
        const nextJump = now + 3000 + Math.random() * 7000;
        jumpCooldowns.set(entityId, nextJump);
    }
}, 80); 

// cleanup dead entities
system.runInterval(() => {
    const allIds = new Set();
    for (const entity of world.getDimension("overworld").getEntities()) {
        allIds.add(entity.id);
    }
    for (const id of jumpCooldowns.keys()) {
        if (!allIds.has(id)) {
            jumpCooldowns.delete(id);
        }
    }
}, 600);
