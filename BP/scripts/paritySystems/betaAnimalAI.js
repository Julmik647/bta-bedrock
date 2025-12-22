import { world, system } from "@minecraft/server";

console.warn("[Betafied] Beta Animal AI Loaded");

// beta 1.7.3 style animals randomly hop around
const PASSIVE_MOBS = new Set([
    "minecraft:pig",
    "minecraft:cow",
    "minecraft:sheep",
    "minecraft:chicken"
]);

const hurtCooldowns = new Map();
const jumpCooldowns = new Map();

world.afterEvents.entityHurt.subscribe((ev) => {
    if (PASSIVE_MOBS.has(ev.hurtEntity.typeId)) {
        hurtCooldowns.set(ev.hurtEntity.id, Date.now() + 8000);
    }
});

// generator to process entities over multiple ticks
function* animalJumpJob() {
    const overworld = world.getDimension("overworld");
    const sentities = [...overworld.getEntities()]; // snapshot
    // filter first to avoid processing non-passives
    const candidates = sentities.filter(e => PASSIVE_MOBS.has(e.typeId));

    for (const entity of candidates) {
        if (!entity.isValid()) continue; // entity might have died since snapshot
        
        const now = Date.now();
        const entityId = entity.id;

        // check stuns
        if (hurtCooldowns.has(entityId)) {
            if (now < hurtCooldowns.get(entityId)) continue;
            hurtCooldowns.delete(entityId);
        }

        // check cooldown
        const cooldownEnd = jumpCooldowns.get(entityId) || 0;
        if (now < cooldownEnd) continue;

        // OPTIMIZATION: Use engine spatial query properly
        // getEntities with location + maxDistance is much faster than JS math
        const nearby = overworld.getEntities({
            location: entity.location,
            maxDistance: 8, // sqr(64) = 8
            excludeFamilies: ["inanimate", "player", "monster"] // minimal filtering
        });
        
        // Count how many are strictly our passive types (minus self)
        let nearbyCount = 0;
        for (const n of nearby) {
            if (n.id !== entityId && PASSIVE_MOBS.has(n.typeId)) {
                nearbyCount++;
            }
        }

        // base 15% + 10% per neighbor (max 50%)
        const jumpChance = Math.min(0.15 + nearbyCount * 0.10, 0.50);
        if (Math.random() > jumpChance) continue;

        // physics check
        try {
            const vel = entity.getVelocity();
            if (Math.abs(vel.y) > 0.1) continue;
            const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            if (hSpeed < 0.01) continue;
        } catch (e) { continue; }

        // execute jump
        doJump(entity);
        
        // set cooldown (10-30s)
        jumpCooldowns.set(entityId, now + 10000 + Math.random() * 20000);

        yield; // yield execution to next tick/frame to prevent lag
    }
}

function doJump(entity) {
    const jumpCount = entity.typeId === "minecraft:chicken" ? 1 : 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < jumpCount; i++) {
        system.runTimeout(() => {
            try {
                if (entity.isValid()) {
                    const v = entity.getVelocity();
                    if (Math.abs(v.y) < 0.1) {
                        entity.applyImpulse({ x: 0, y: 0.42, z: 0 });
                    }
                }
            } catch (e) {}
        }, i * 15);
    }
}

system.runInterval(() => {
    system.runJob(animalJumpJob());
}, 100); 

// cleanup dead entities
system.runInterval(() => {
    // simplified cleanup
    const now = Date.now();
    for (const [id, time] of jumpCooldowns) {
        if (time < now) jumpCooldowns.delete(id);
    }
    for (const [id, time] of hurtCooldowns) {
        if (time < now) hurtCooldowns.delete(id);
    }
}, 600);
