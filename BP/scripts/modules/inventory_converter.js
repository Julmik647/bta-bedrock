import { world, system, ItemStack } from "@minecraft/server";

console.warn("[Betafied] Inventory Converter Module Loaded");

// blocks to convert to Stone
const STONE_CONVERSIONS = new Set([
    "minecraft:andesite",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:tuff",
    "minecraft:calcite",
    "minecraft:dripstone_block",
    "minecraft:deepslate",
    "minecraft:smooth_basalt"
]);

const COBBLE_CONVERSIONS = new Set([
    "minecraft:cobbled_deepslate"
]);

// copper items (convert to useless stone/cobble to prevent exploits)
const COPPER_CONVERSIONS = new Set([
    "minecraft:copper_ingot",
    "minecraft:raw_copper",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:raw_copper_block",
    "minecraft:copper_block",
    "minecraft:cut_copper",
    "minecraft:exposed_copper",
    "minecraft:weathered_copper",
    "minecraft:oxidized_copper",
    "minecraft:waxed_copper_block",
    "minecraft:waxed_cut_copper",
    "minecraft:waxed_exposed_copper",
    "minecraft:waxed_weathered_copper",
    "minecraft:waxed_oxidized_copper"
]);

const WOOD_CONVERSIONS = new Set([
    "minecraft:cherry_log", "minecraft:mangrove_log", "minecraft:bamboo_block",
    "minecraft:crimson_stem", "minecraft:warped_stem", "minecraft:stripped_cherry_log",
    "minecraft:stripped_mangrove_log", "minecraft:stripped_bamboo_block",
    "minecraft:cherry_planks", "minecraft:mangrove_planks", "minecraft:bamboo_planks",
    "minecraft:crimson_planks", "minecraft:warped_planks", "minecraft:pale_oak_log", 
    "minecraft:pale_oak_planks"
]);

const SOIL_CONVERSIONS = new Set([
    "minecraft:mud", "minecraft:muddy_mangrove_roots", 
    "minecraft:suspicious_sand", "minecraft:suspicious_gravel"
]);

const FLOWER_CONVERSIONS = new Set([
    "minecraft:cornflower", "minecraft:lily_of_the_valley", "minecraft:blue_orchid",
    "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip", 
    "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip",
    "minecraft:oxeye_daisy", "minecraft:wither_rose", "minecraft:peony",
    "minecraft:rose_bush", "minecraft:lilac", "minecraft:sunflower",
    "minecraft:pink_petals", "minecraft:torchflower", "minecraft:pitcher_plant"
]);

// beta food: vanilla -> custom unstackable
const FOOD_CONVERSIONS = {
    "minecraft:apple": "bh:apple",
    "minecraft:bread": "bh:bread",
    "minecraft:porkchop": "bh:porkchop",
    "minecraft:cooked_porkchop": "bh:cooked_porkchop",
    "minecraft:cod": "bh:cod",
    "minecraft:cooked_cod": "bh:cooked_cod",
    "minecraft:golden_apple": "bh:golden_apple",
    "minecraft:cookie": "bh:cookie"
};

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const inv = player.getComponent("inventory")?.container;
        if (!inv) continue;

        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (!item) continue;
            const typeId = item.typeId;

            // food conversions (must be first to catch before other checks)
            if (FOOD_CONVERSIONS[typeId]) {
                const newId = FOOD_CONVERSIONS[typeId];
                // spawn individual items for each in stack
                for (let k = 0; k < item.amount; k++) {
                    inv.addItem(new ItemStack(newId, 1));
                }
                inv.setItem(i, undefined);
                continue;
            }

            // Copper Logic (Anti-Exploit)
            if (COPPER_CONVERSIONS.has(typeId)) {
                if (typeId.includes("ore")) {
                    inv.setItem(i, new ItemStack("minecraft:stone", item.amount));
                } else {
                    inv.setItem(i, new ItemStack("minecraft:cobblestone", item.amount));
                }
            }
            // Beta Parity: Flesh -> Feathers
            else if (typeId === "minecraft:rotten_flesh") {
                inv.setItem(i, new ItemStack("minecraft:feather", item.amount));
            }
            // Beta Parity: No Mutton/Rabbit (Delete)
            else if (typeId === "minecraft:mutton" || typeId === "minecraft:cooked_mutton" ||
                     typeId === "minecraft:rabbit" || typeId === "minecraft:cooked_rabbit" ||
                     typeId === "minecraft:rabbit_hide" || typeId === "minecraft:rabbit_stew" ||
                     typeId === "minecraft:rabbit_foot") {
                inv.setItem(i, undefined);
            }
            // Beta Parity: Salmon -> Fish (Cod) - now converts to bh:cod
            else if (typeId === "minecraft:salmon" || typeId === "minecraft:cooked_salmon") {
                const newId = typeId.includes("cooked") ? "bh:cooked_cod" : "bh:cod";
                for (let k = 0; k < item.amount; k++) {
                    inv.addItem(new ItemStack(newId, 1));
                }
                inv.setItem(i, undefined);
            }
            
            else if (STONE_CONVERSIONS.has(typeId)) {
                inv.setItem(i, new ItemStack("minecraft:stone", item.amount));
            } else if (COBBLE_CONVERSIONS.has(typeId)) {
                inv.setItem(i, new ItemStack("minecraft:cobblestone", item.amount));
            } else if (FLOWER_CONVERSIONS.has(typeId)) {
                inv.setItem(i, new ItemStack("minecraft:poppy", item.amount));
            } else if (WOOD_CONVERSIONS.has(typeId)) {
                if (typeId.includes("planks")) {
                    inv.setItem(i, new ItemStack("minecraft:oak_planks", item.amount));
                } else {
                    inv.setItem(i, new ItemStack("minecraft:oak_log", item.amount));
                }
            } else if (SOIL_CONVERSIONS.has(typeId)) {
                if (typeId.includes("sand")) inv.setItem(i, new ItemStack("minecraft:sand", item.amount));
                else if (typeId.includes("gravel")) inv.setItem(i, new ItemStack("minecraft:gravel", item.amount));
                else inv.setItem(i, new ItemStack("minecraft:dirt", item.amount));
            }
        }
    }
}, 10);

