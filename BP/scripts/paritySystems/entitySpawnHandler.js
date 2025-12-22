import { world, ItemStack } from "@minecraft/server";
console.warn("[Betafied] Entity Spawn Handler Loaded");

// unified spawn handler - handles all entity spawn logic in one place
// replaces: mobSpawning.js, noExperience.js, oreDrops.js, betaLoot.js

// beta 1.7.3 allowed mobs
const ALLOWED_MOBS = new Set([
    "minecraft:item",
    "minecraft:minecart",
    "minecraft:chest_minecart",
    "minecraft:painting",
    "custom:furnace_minecart",
    "minecraft:boat",
    "minecraft:falling_block",
    "minecraft:arrow",
    "minecraft:chicken",
    "minecraft:cow",
    "minecraft:creeper",
    "minecraft:ghast",
    "minecraft:fireball",
    "minecraft:pig",
    "minecraft:tnt",
    "minecraft:player",
    "minecraft:sheep",
    "minecraft:skeleton",
    "minecraft:slime",
    "minecraft:spider",
    "minecraft:squid",
    "minecraft:wolf",
    "minecraft:zombie",
    "minecraft:zombie_pigman",
    "minecraft:lightning_bolt",
    "minecraft:snowball",
    "minecraft:egg",
    "minecraft:fishing_hook"
]);

// ore drop replacements (raw -> ore block)
const ORE_REPLACEMENTS = {
    "minecraft:raw_iron": "minecraft:iron_ore",
    "minecraft:raw_gold": "minecraft:gold_ore",
    "minecraft:raw_copper": "minecraft:iron_ore"
};

// banned item drops
const BANNED_ITEMS = new Set([
    "minecraft:rotten_flesh"
]);

world.afterEvents.entitySpawn.subscribe((event) => {
    try {
        const entity = event.entity;
        if (!entity) return;
        
        const typeId = entity.typeId;

        // 1. xp orb removal
        if (typeId === "minecraft:xp_orb") {
            entity.remove();
            return;
        }

        // 2. item entity processing
        if (typeId === "minecraft:item") {
            const itemComp = entity.getComponent("minecraft:item");
            if (!itemComp?.itemStack) return;
            
            const itemId = itemComp.itemStack.typeId;
            const amount = itemComp.itemStack.amount;

            // banned items (rotten flesh etc)
            if (BANNED_ITEMS.has(itemId)) {
                entity.remove();
                return;
            }

            // ore replacements
            if (ORE_REPLACEMENTS[itemId]) {
                const loc = entity.location;
                const dim = entity.dimension;
                entity.remove();
                dim.spawnItem(new ItemStack(ORE_REPLACEMENTS[itemId], amount), loc);
                return;
            }
            
            return; // items are allowed, stop here
        }

        // 3. mob whitelist check
        if (!ALLOWED_MOBS.has(typeId)) {
            entity.remove();
        }

    } catch {}
});
// 4. zombie feather drops (beta loot)
world.afterEvents.entityDie.subscribe((event) => {
    try {
        const { deadEntity } = event;
        const type = deadEntity.typeId;
        
        if (type === "minecraft:zombie" || type === "minecraft:zombie_villager" || type === "minecraft:husk") {
            // chance for feathers (0-2)
            const count = Math.floor(Math.random() * 3);
            if (count > 0) {
                deadEntity.dimension.spawnItem(new ItemStack("minecraft:feather", count), deadEntity.location);
            }
        }
    } catch (e) {}
});
