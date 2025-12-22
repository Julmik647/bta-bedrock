import { world, system } from "@minecraft/server";
console.warn("[Betafied] Item Removal Loaded");

const CONFIG = Object.freeze({
  CHECK_INTERVAL_TICKS: 30,
  MESSAGE_COOLDOWN_TICKS: 60,
  CLEAR_MESSAGE: "§c[Betafied] §7That item doesn't exist in Beta 1.7.3!",
});

class ItemRestrictionSystem {
  constructor() {
    this.allowedItems = this.buildAllowedItemsSet();
    this.playerMessageCooldowns = new Map();
    this.initialize();
  }

  initialize() {
    system.runInterval(() => {
        system.runJob(this.checkAllPlayersGenerator());
    }, 100);

    world.afterEvents.playerLeave.subscribe((event) => {
      this.playerMessageCooldowns.delete(event.playerId);
    });
  }

  buildAllowedItemsSet() {
    return new Set([
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

      // food
      "minecraft:apple", "minecraft:golden_apple", "minecraft:mushroom_stew", "minecraft:bread",
      "minecraft:porkchop", "minecraft:cooked_porkchop", "minecraft:cod", "minecraft:cooked_cod",
      "minecraft:cookie", "minecraft:cake",

      // raw materials & old school dyes
      "minecraft:coal", "minecraft:charcoal", "minecraft:diamond", "minecraft:iron_ingot", "minecraft:gold_ingot",
      "minecraft:stick", "minecraft:bowl", "minecraft:string", "minecraft:feather", "minecraft:gunpowder",
      "minecraft:wheat_seeds", "minecraft:wheat", "minecraft:flint", "minecraft:leather", "minecraft:brick",
      "minecraft:clay_ball", "minecraft:sugar_cane", "minecraft:paper", "minecraft:book", "minecraft:slime_ball",
      "minecraft:egg", "minecraft:glowstone_dust", "minecraft:bone", "minecraft:sugar", "minecraft:redstone",
      "minecraft:lapis_lazuli", "minecraft:ink_sac", "minecraft:cocoa_beans", "minecraft:bone_meal",
      // keeping the other dye colors since bedrock treats them as items now
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
      "minecraft:snow", "minecraft:ice", "minecraft:snow_layer", "minecraft:netherrack", "minecraft:soul_sand",
      "minecraft:glowstone", "minecraft:bedrock", "minecraft:obsidian", "minecraft:sponge",
      "minecraft:red_mushroom", "minecraft:brown_mushroom", // added these back

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
      "bh:bow", "bh:crafting_table", "hrb:herobrine_settings", "hrb:script_openSettings", "minecraft:barrier",
    ]);
  }

  *checkAllPlayersGenerator() {
    for (const player of world.getPlayers()) {
      if (player.getGameMode() !== "creative" && !player.hasTag("builder_exempt")) {
        this.checkPlayerInventory(player);
      }
      yield;
    }
  }

  checkPlayerInventory(player) {
    try {
      const inventory = player.getComponent("minecraft:inventory")?.container;
      if (!inventory) return;

      let removed = false;
      for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && !this.allowedItems.has(item.typeId)) {
          inventory.setItem(i, undefined);
          removed = true;
          console.log(`[ITEMS] Rip ${item.typeId} from ${player.name}`);
        }
      }
      if (removed) this.notifyPlayer(player);
    } catch (e) {
      console.warn(`[ITEMS] fail: ${e.message}`);
    }
  }

  notifyPlayer(player) {
    const now = system.currentTick;
    const last = this.playerMessageCooldowns.get(player.id) ?? 0;
    if (now - last >= CONFIG.MESSAGE_COOLDOWN_TICKS) {
      player.sendMessage(CONFIG.CLEAR_MESSAGE);
      this.playerMessageCooldowns.set(player.id, now);
    }
  }
}

const itemRestriction = new ItemRestrictionSystem();
export default itemRestriction;