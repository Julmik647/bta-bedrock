import { world, system, ItemStack } from "@minecraft/server";
console.warn("[keirazelle] Inventory Manager Loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 20,
    MESSAGE_COOLDOWN: 60,
    REMOVE_MSG: "§c[keirazelle] §7That item doesn't exist in Beta 1.7.3!"
});

const ALLOWED = Object.freeze(new Set([
    // tools & weapons
    "minecraft:wooden_pickaxe", "minecraft:stone_pickaxe", "minecraft:iron_pickaxe",
    "minecraft:golden_pickaxe", "minecraft:diamond_pickaxe",
    "minecraft:wooden_axe", "minecraft:stone_axe", "minecraft:iron_axe",
    "minecraft:golden_axe", "minecraft:diamond_axe",
    "minecraft:wooden_shovel", "minecraft:stone_shovel", "minecraft:iron_shovel",
    "minecraft:golden_shovel", "minecraft:diamond_shovel",
    "minecraft:wooden_hoe", "minecraft:stone_hoe", "minecraft:iron_hoe",
    "minecraft:golden_hoe", "minecraft:diamond_hoe",
    "minecraft:flint_and_steel", "minecraft:fishing_rod", "minecraft:shears",
    "minecraft:compass", "minecraft:clock", "minecraft:bow", "minecraft:arrow",
    "minecraft:wooden_sword", "minecraft:stone_sword", "minecraft:iron_sword",
    "minecraft:golden_sword", "minecraft:diamond_sword",

    // armor
    "minecraft:leather_helmet", "minecraft:leather_chestplate", "minecraft:leather_leggings", "minecraft:leather_boots",
    "minecraft:chainmail_helmet", "minecraft:chainmail_chestplate", "minecraft:chainmail_leggings", "minecraft:chainmail_boots",
    "minecraft:iron_helmet", "minecraft:iron_chestplate", "minecraft:iron_leggings", "minecraft:iron_boots",
    "minecraft:golden_helmet", "minecraft:golden_chestplate", "minecraft:golden_leggings", "minecraft:golden_boots",
    "minecraft:diamond_helmet", "minecraft:diamond_chestplate", "minecraft:diamond_leggings", "minecraft:diamond_boots",

    // food (vanilla + custom bh: versions)
    "minecraft:apple", "minecraft:golden_apple", "minecraft:mushroom_stew", "minecraft:bread",
    "minecraft:porkchop", "minecraft:cooked_porkchop", "minecraft:cod", "minecraft:cooked_cod",
    "minecraft:cookie", "minecraft:cake",
    "bh:apple", "bh:bread", "bh:porkchop", "bh:cooked_porkchop",
    "bh:cod", "bh:cooked_cod", "bh:golden_apple", "bh:cookie",

    // raw materials & dyes
    "minecraft:coal", "minecraft:charcoal", "minecraft:diamond", "minecraft:iron_ingot", "minecraft:gold_ingot",
    "minecraft:stick", "minecraft:bowl", "minecraft:string", "minecraft:feather", "minecraft:gunpowder",
    "minecraft:wheat_seeds", "minecraft:wheat", "minecraft:flint", "minecraft:leather", "minecraft:brick",
    "minecraft:clay_ball", "minecraft:sugar_cane", "minecraft:paper", "minecraft:book", "minecraft:slime_ball",
    "minecraft:egg", "minecraft:glowstone_dust", "minecraft:bone", "minecraft:sugar", "minecraft:redstone",
    "minecraft:lapis_lazuli", "minecraft:ink_sac", "minecraft:cocoa_beans", "minecraft:bone_meal",
    "minecraft:red_dye", "minecraft:green_dye", "minecraft:purple_dye", "minecraft:cyan_dye",
    "minecraft:light_gray_dye", "minecraft:gray_dye", "minecraft:pink_dye", "minecraft:lime_dye",
    "minecraft:yellow_dye", "minecraft:light_blue_dye", "minecraft:magenta_dye", "minecraft:orange_dye",

    // blocks
    "minecraft:stone", "minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:grass_block", "minecraft:dirt",
    "minecraft:oak_log", "minecraft:birch_log", "minecraft:spruce_log",
    "minecraft:oak_leaves", "minecraft:birch_leaves", "minecraft:spruce_leaves",
    "minecraft:oak_sapling", "minecraft:birch_sapling", "minecraft:spruce_sapling",
    "minecraft:sand", "minecraft:gravel", "minecraft:gold_ore", "minecraft:iron_ore", "minecraft:coal_ore",
    "minecraft:diamond_ore", "minecraft:redstone_ore", "minecraft:lapis_ore", "minecraft:glass", "minecraft:sandstone",
    "minecraft:cactus", "minecraft:clay", "minecraft:carved_pumpkin", "minecraft:lit_pumpkin", "minecraft:jack_o_lantern",
    "minecraft:pumpkin", "minecraft:snow", "minecraft:ice", "minecraft:snow_layer", "minecraft:netherrack", "minecraft:soul_sand",
    "minecraft:glowstone", "minecraft:bedrock", "minecraft:obsidian", "minecraft:sponge",
    "minecraft:red_mushroom", "minecraft:brown_mushroom",

    // construction
    "minecraft:oak_planks", "minecraft:birch_planks", "minecraft:spruce_planks",
    "minecraft:oak_stairs", "minecraft:oak_slab", "minecraft:oak_fence",
    "minecraft:cobblestone_stairs", "minecraft:stone_stairs", "minecraft:cobblestone_slab", "minecraft:stone_slab",
    "minecraft:brick_block", "minecraft:bricks", "minecraft:bookshelf",
    "minecraft:gold_block", "minecraft:iron_block", "minecraft:diamond_block", "minecraft:lapis_block", "minecraft:tnt",

    // redstone & machines
    "minecraft:redstone_torch", "minecraft:lever", "minecraft:stone_pressure_plate", "minecraft:wooden_pressure_plate",
    "minecraft:stone_button", "minecraft:rail", "minecraft:golden_rail", "minecraft:detector_rail",
    "minecraft:repeater", "minecraft:piston", "minecraft:sticky_piston",
    "minecraft:furnace", "minecraft:crafting_table", "minecraft:chest", "minecraft:jukebox",
    "minecraft:noteblock", "minecraft:dispenser", "minecraft:spawner",

    // deco & transport
    "minecraft:torch", "minecraft:ladder", "minecraft:oak_sign", "minecraft:wooden_door", "minecraft:iron_door",
    "minecraft:trapdoor", "minecraft:painting", "minecraft:bed", "minecraft:white_wool", "minecraft:orange_wool",
    "minecraft:magenta_wool", "minecraft:light_blue_wool", "minecraft:yellow_wool", "minecraft:lime_wool",
    "minecraft:pink_wool", "minecraft:gray_wool", "minecraft:light_gray_wool", "minecraft:cyan_wool",
    "minecraft:purple_wool", "minecraft:blue_wool", "minecraft:brown_wool", "minecraft:green_wool",
    "minecraft:red_wool", "minecraft:black_wool", "minecraft:poppy", "minecraft:dandelion", "minecraft:short_grass",
    "minecraft:fern", "minecraft:oak_boat", "minecraft:minecart", "minecraft:chest_minecart", "minecraft:furnace_minecart",
    "minecraft:saddle", "minecraft:bucket", "minecraft:water_bucket", "minecraft:lava_bucket", "minecraft:milk_bucket",
    "minecraft:snowball", "minecraft:filled_map", "minecraft:empty_map", "minecraft:music_disc_13", "minecraft:music_disc_cat",
    "minecraft:water", "minecraft:lava",

    // custom/meta
    "bh:bow", "bh:crafting_table", "bh:wooden_slab", "hrb:herobrine_settings", "hrb:script_openSettings", "minecraft:barrier"
]));

const CONVERSIONS = Object.freeze({
    // stone variants
    "minecraft:andesite": "minecraft:stone",
    "minecraft:granite": "minecraft:stone",
    "minecraft:diorite": "minecraft:stone",
    "minecraft:tuff": "minecraft:stone",
    "minecraft:calcite": "minecraft:stone",
    "minecraft:dripstone_block": "minecraft:stone",
    "minecraft:deepslate": "minecraft:stone",
    "minecraft:smooth_basalt": "minecraft:stone",
    "minecraft:cobbled_deepslate": "minecraft:cobblestone",

    // copper -> cobble
    "minecraft:copper_ingot": "minecraft:cobblestone",
    "minecraft:raw_copper": "minecraft:cobblestone",
    "minecraft:copper_ore": "minecraft:stone",
    "minecraft:deepslate_copper_ore": "minecraft:stone",
    "minecraft:raw_copper_block": "minecraft:cobblestone",
    "minecraft:copper_block": "minecraft:cobblestone",
    "minecraft:cut_copper": "minecraft:cobblestone",
    "minecraft:exposed_copper": "minecraft:cobblestone",
    "minecraft:weathered_copper": "minecraft:cobblestone",
    "minecraft:oxidized_copper": "minecraft:cobblestone",
    "minecraft:waxed_copper_block": "minecraft:cobblestone",
    "minecraft:waxed_cut_copper": "minecraft:cobblestone",
    "minecraft:waxed_exposed_copper": "minecraft:cobblestone",
    "minecraft:waxed_weathered_copper": "minecraft:cobblestone",
    "minecraft:waxed_oxidized_copper": "minecraft:cobblestone",

    // modern wood -> oak
    "minecraft:cherry_log": "minecraft:oak_log",
    "minecraft:mangrove_log": "minecraft:oak_log",
    "minecraft:bamboo_block": "minecraft:oak_log",
    "minecraft:crimson_stem": "minecraft:oak_log",
    "minecraft:warped_stem": "minecraft:oak_log",
    "minecraft:stripped_cherry_log": "minecraft:oak_log",
    "minecraft:stripped_mangrove_log": "minecraft:oak_log",
    "minecraft:stripped_bamboo_block": "minecraft:oak_log",
    "minecraft:pale_oak_log": "minecraft:oak_log",
    "minecraft:cherry_planks": "minecraft:oak_planks",
    "minecraft:mangrove_planks": "minecraft:oak_planks",
    "minecraft:bamboo_planks": "minecraft:oak_planks",
    "minecraft:crimson_planks": "minecraft:oak_planks",
    "minecraft:warped_planks": "minecraft:oak_planks",
    "minecraft:pale_oak_planks": "minecraft:oak_planks",

    // soil
    "minecraft:mud": "minecraft:dirt",
    "minecraft:muddy_mangrove_roots": "minecraft:dirt",
    "minecraft:suspicious_sand": "minecraft:sand",
    "minecraft:suspicious_gravel": "minecraft:gravel",

    // flowers -> poppy
    "minecraft:cornflower": "minecraft:poppy",
    "minecraft:lily_of_the_valley": "minecraft:poppy",
    "minecraft:blue_orchid": "minecraft:poppy",
    "minecraft:allium": "minecraft:poppy",
    "minecraft:azure_bluet": "minecraft:poppy",
    "minecraft:red_tulip": "minecraft:poppy",
    "minecraft:orange_tulip": "minecraft:poppy",
    "minecraft:white_tulip": "minecraft:poppy",
    "minecraft:pink_tulip": "minecraft:poppy",
    "minecraft:oxeye_daisy": "minecraft:poppy",
    "minecraft:wither_rose": "minecraft:poppy",
    "minecraft:peony": "minecraft:poppy",
    "minecraft:rose_bush": "minecraft:poppy",
    "minecraft:lilac": "minecraft:poppy",
    "minecraft:sunflower": "minecraft:poppy",
    "minecraft:pink_petals": "minecraft:poppy",
    "minecraft:torchflower": "minecraft:poppy",
    "minecraft:pitcher_plant": "minecraft:poppy",

    // flesh -> feathers
    "minecraft:rotten_flesh": "minecraft:feather",

    // bow & fence
    "minecraft:bow": "bh:bow",
    
    // slab
    "minecraft:oak_slab": "bh:wooden_slab"
});

const FOOD_CONVERSIONS = Object.freeze({
    "minecraft:apple": "bh:apple",
    "minecraft:bread": "bh:bread",
    "minecraft:porkchop": "bh:porkchop",
    "minecraft:cooked_porkchop": "bh:cooked_porkchop",
    "minecraft:cod": "bh:cod",
    "minecraft:cooked_cod": "bh:cooked_cod",
    "minecraft:golden_apple": "bh:golden_apple",
    "minecraft:cookie": "bh:cookie",
    "minecraft:salmon": "bh:cod",
    "minecraft:cooked_salmon": "bh:cooked_cod"
});

const DELETE_ITEMS = Object.freeze(new Set([
    "minecraft:mutton", "minecraft:cooked_mutton",
    "minecraft:rabbit", "minecraft:cooked_rabbit",
    "minecraft:rabbit_hide", "minecraft:rabbit_stew", "minecraft:rabbit_foot"
]));

const msgCooldowns = new Map();

// generator for player processing
function* processPlayers() {
    const players = world.getPlayers();

    for (const player of players) {
        try {
            if (player.getGameMode() === "creative" || player.hasTag("builder_exempt")) {
                yield;
                continue;
            }
            processInventory(player);
        } catch (e) {
            console.warn(`[INV] error: ${e}`);
        }
        yield;
    }
}

system.runInterval(() => {
    system.runJob(processPlayers());
}, CONFIG.CHECK_INTERVAL);

function processInventory(player) {
    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;

    let removed = false;

    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item) continue;
        const id = item.typeId;

        // 1. food conversions - spawn extras as drops instead of loop
        if (FOOD_CONVERSIONS[id]) {
            const newId = FOOD_CONVERSIONS[id];
            const amount = item.amount;

            inv.setItem(i, new ItemStack(newId, 1));

            // spawn rest as ground items (no loop per item)
            if (amount > 1) {
                for (let k = 1; k < amount; k++) {
                    const added = inv.addItem(new ItemStack(newId, 1));
                    if (added?.amount > 0) {
                        player.dimension.spawnItem(added, player.location);
                    }
                }
            }
            continue;
        }

        // 2. delete items with no equivalent
        if (DELETE_ITEMS.has(id)) {
            inv.setItem(i, undefined);
            removed = true;
            continue;
        }

        // 3. convert modern -> beta
        if (CONVERSIONS[id]) {
            const newItem = new ItemStack(CONVERSIONS[id], item.amount);
            
            // preserve durability if item has it
            const oldDur = item.getComponent("durability");
            const newDur = newItem.getComponent("durability");
            if (oldDur && newDur) {
                newDur.damage = oldDur.damage;
            }
            
            inv.setItem(i, newItem);
            continue;
        }

        // 4. delete if not in allowed list
        if (!ALLOWED.has(id)) {
            inv.setItem(i, undefined);
            removed = true;
            console.log(`[INV] Removed ${id} from ${player.name}`);
        }
    }

    if (removed) notifyPlayer(player);
}

function notifyPlayer(player) {
    const now = system.currentTick;
    const last = msgCooldowns.get(player.id) ?? 0;
    if (now - last >= CONFIG.MESSAGE_COOLDOWN) {
        player.sendMessage(CONFIG.REMOVE_MSG);
        msgCooldowns.set(player.id, now);
    }
}

// cleanup on leave
world.afterEvents.playerLeave.subscribe((ev) => {
    msgCooldowns.delete(ev.playerId);
});
