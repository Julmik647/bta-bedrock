import { world, ItemStack } from "@minecraft/server";
console.warn("[keirazelle] Entity Spawn Handler Loaded");

// beta 1.7.3 allowed mobs
const ALLOWED_MOBS = Object.freeze(new Set([
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
]));

// ore drops that need replacing
const ORE_REPLACEMENTS = Object.freeze({
    "minecraft:raw_iron": "minecraft:iron_ore",
    "minecraft:raw_gold": "minecraft:gold_ore",
    "minecraft:raw_copper": "minecraft:iron_ore"
});

// items that shouldnt drop naturally
const BANNED_ITEMS = Object.freeze(new Set([
    "minecraft:rotten_flesh"
]));

world.afterEvents.entitySpawn.subscribe((event) => {
    try {
        const entity = event.entity;
        if (!entity) return;
        
        const typeId = entity.typeId;

        // nuke xp orbs
        if (typeId === "minecraft:xp_orb") {
            entity.remove();
            return;
        }

        // item entity processing
        if (typeId === "minecraft:item") {
            const itemComp = entity.getComponent("minecraft:item");
            if (!itemComp?.itemStack) return;
            
            const itemId = itemComp.itemStack.typeId;
            const amount = itemComp.itemStack.amount;

            // banned items get deleted
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
            
            return;
        }

        // mob whitelist
        if (!ALLOWED_MOBS.has(typeId)) {
            entity.remove();
        }

    } catch (e) {
        console.warn(`[entitySpawnHandler] error: ${e}`);
    }
});

// zombie feather drops
world.afterEvents.entityDie.subscribe((event) => {
    try {
        const { deadEntity } = event;
        const type = deadEntity.typeId;
        
        // zombies drop feathers in beta
        if (type === "minecraft:zombie" || type === "minecraft:zombie_villager" || type === "minecraft:husk") {
            const count = Math.floor(Math.random() * 3);
            if (count > 0) {
                deadEntity.dimension.spawnItem(new ItemStack("minecraft:feather", count), deadEntity.location);
            }
        }
    } catch (e) {
        console.warn(`[entitySpawnHandler] death handler error: ${e}`);
    }
});
