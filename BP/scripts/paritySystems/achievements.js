import { world, system } from "@minecraft/server";

console.warn("[Betafied] Achievements System Loaded");

// definitions
const ACH = {
    TAKING_INVENTORY: "inv",
    GETTING_WOOD: "wood",
    BENCHMARKING: "bench",
    TIME_TO_STRIKE: "sword",
    TIME_TO_FARM: "hoe",
    TIME_TO_MINE: "pick",
    MONSTER_HUNTER: "kill",
    COW_TIPPER: "cow",
    WHEN_PIGS_FLY: "pig",
    BAKE_BREAD: "bread",
    THE_LIE: "cake",
    GETTING_UPGRADE: "stone",
    DELICIOUS_FISH: "fish",
    HOT_TOPIC: "furnace",
    ACQUIRE_HARDWARE: "iron",
    ON_A_RAIL: "rail"
};

// prerequisites map
const PARENTS = {
    [ACH.GETTING_WOOD]: ACH.TAKING_INVENTORY,
    [ACH.BENCHMARKING]: ACH.GETTING_WOOD,
    [ACH.TIME_TO_STRIKE]: ACH.BENCHMARKING,
    [ACH.TIME_TO_FARM]: ACH.BENCHMARKING,
    [ACH.TIME_TO_MINE]: ACH.BENCHMARKING,
    [ACH.MONSTER_HUNTER]: ACH.TIME_TO_STRIKE,
    [ACH.COW_TIPPER]: ACH.TIME_TO_STRIKE,
    [ACH.WHEN_PIGS_FLY]: ACH.COW_TIPPER,
    [ACH.BAKE_BREAD]: ACH.TIME_TO_FARM,
    [ACH.THE_LIE]: ACH.TIME_TO_FARM,
    [ACH.GETTING_UPGRADE]: ACH.TIME_TO_MINE,
    [ACH.HOT_TOPIC]: ACH.GETTING_UPGRADE,
    [ACH.DELICIOUS_FISH]: ACH.HOT_TOPIC,
    [ACH.ACQUIRE_HARDWARE]: ACH.HOT_TOPIC,
    [ACH.ON_A_RAIL]: ACH.ACQUIRE_HARDWARE
};

const TITLES = {
    [ACH.TAKING_INVENTORY]: "Taking Inventory",
    [ACH.GETTING_WOOD]: "Getting Wood",
    [ACH.BENCHMARKING]: "Benchmarking",
    [ACH.TIME_TO_STRIKE]: "Time to Strike!",
    [ACH.TIME_TO_FARM]: "Time to Farm!",
    [ACH.TIME_TO_MINE]: "Time to Mine!",
    [ACH.MONSTER_HUNTER]: "Monster Hunter",
    [ACH.COW_TIPPER]: "Cow Tipper",
    [ACH.WHEN_PIGS_FLY]: "When Pigs Fly",
    [ACH.BAKE_BREAD]: "Bake Bread",
    [ACH.THE_LIE]: "The Lie",
    [ACH.GETTING_UPGRADE]: "Getting an Upgrade",
    [ACH.DELICIOUS_FISH]: "Delicious Fish",
    [ACH.HOT_TOPIC]: "Hot Topic",
    [ACH.ACQUIRE_HARDWARE]: "Acquire Hardware",
    [ACH.ON_A_RAIL]: "On A Rail"
};

const TOTAL_ACHIEVEMENTS = Object.keys(ACH).length;

// core system
class AchievementSystem {
    
    constructor() {
        this.setupEvents();
    }

    setupEvents() {
        // chat commands
        if (world.beforeEvents && world.beforeEvents.chatSend) {
            world.beforeEvents.chatSend.subscribe((ev) => {
                const msg = ev.message.trim().toLowerCase();
                if (msg === "!achievements" || msg === "!ach") {
                    ev.cancel = true;
                    this.openUI(ev.sender);
                } else if (msg === "!achievements reset") {
                    ev.cancel = true;
                    this.resetAchievements(ev.sender);
                }
            });
        }

        // taking inventory: auto-grant on spawn
        world.afterEvents.playerSpawn.subscribe((ev) => {
            if (ev.initialSpawn) {
                this.grant(ev.player, ACH.TAKING_INVENTORY);
            }
        });

        // getting wood
        world.afterEvents.playerBreakBlock.subscribe((ev) => {
            if (ev.brokenBlockPermutation.type.id.includes("_log")) {
                this.grant(ev.player, ACH.GETTING_WOOD);
            }
        });

        // polling check for inventory items
        system.runInterval(() => {
            for (const player of world.getPlayers()) {
                this.checkInventory(player);
                this.checkRiding(player);
            }
        }, 100);

        // monster hunter (includes zombie pigman for beta)
        world.afterEvents.entityDie.subscribe((ev) => {
            if (ev.damageSource.damagingEntity?.typeId === "minecraft:player") {
                const victim = ev.deadEntity;
                const player = ev.damageSource.damagingEntity;
                
                const HOSTILES = [
                    "minecraft:zombie", 
                    "minecraft:skeleton", 
                    "minecraft:spider", 
                    "minecraft:creeper",
                    "minecraft:zombie_pigman",
                    "minecraft:zombified_piglin"
                ];
                if (HOSTILES.includes(victim.typeId)) {
                    this.grant(player, ACH.MONSTER_HUNTER);
                }
            }
        });

        // when pigs fly
        world.afterEvents.entityHurt.subscribe((ev) => {
            const { hurtEntity, damageSource } = ev;
            
            if (hurtEntity.typeId === "minecraft:pig" && damageSource.cause === "fall") {
                const rideable = hurtEntity.getComponent("minecraft:rideable");
                const riders = rideable?.getRiders();

                if (riders && riders.length > 0) {
                    riders.forEach(rider => {
                        if (rider.typeId === "minecraft:player") {
                            this.grant(rider, ACH.WHEN_PIGS_FLY);
                        }
                    });
                }
            }
        });
    }

    checkRiding(player) {
        const rideable = player.getComponent("minecraft:riding");
        if (rideable && rideable.entityRidingOn) {
            const vehicle = rideable.entityRidingOn;
            if (vehicle.typeId === "minecraft:minecart") {
                this.grant(player, ACH.ON_A_RAIL);
            }
        }
    }

    checkInventory(player) {
        const inv = player.getComponent("inventory")?.container;
        if (!inv) return;

        this.grant(player, ACH.TAKING_INVENTORY); 

        let hasLog = false;
        let hasLeather = false;
        let hasBread = false;
        let hasCake = false; 
        let hasFish = false;
        let hasWoodPick = false;
        let hasStonePick = false;
        let hasBench = false;
        let hasSword = false;
        let hasHoe = false;
        let hasFurnace = false;
        let hasIron = false;

        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (!item) continue;
            const id = item.typeId;

            if (id.includes("_log")) hasLog = true;
            if (id === "minecraft:crafting_table" || id === "bh:crafting_table") hasBench = true;
            // any sword counts (wooden, stone, iron, gold, diamond)
            if (id.includes("_sword")) hasSword = true;
            // any hoe counts
            if (id.includes("_hoe")) hasHoe = true;
            // any pickaxe counts for time to mine
            if (id.includes("_pickaxe")) hasWoodPick = true;
            // stone+ pickaxe for upgrade
            if (id.includes("stone_pickaxe") || id.includes("iron_pickaxe") || 
                id.includes("golden_pickaxe") || id.includes("diamond_pickaxe")) hasStonePick = true;
            if (id === "minecraft:leather") hasLeather = true;
            if (id === "minecraft:bread") hasBread = true;
            if (id === "minecraft:cake") hasCake = true;
            if (id === "minecraft:cooked_cod" || id === "minecraft:cooked_salmon") hasFish = true;
            if (id === "minecraft:furnace") hasFurnace = true;
            if (id === "minecraft:iron_ingot") hasIron = true;
        }

        if (hasLog) this.grant(player, ACH.GETTING_WOOD);
        if (hasBench) this.grant(player, ACH.BENCHMARKING);
        if (hasSword) this.grant(player, ACH.TIME_TO_STRIKE);
        if (hasHoe) this.grant(player, ACH.TIME_TO_FARM);
        if (hasWoodPick) this.grant(player, ACH.TIME_TO_MINE);
        if (hasStonePick) this.grant(player, ACH.GETTING_UPGRADE);
        if (hasLeather) this.grant(player, ACH.COW_TIPPER);
        if (hasBread) this.grant(player, ACH.BAKE_BREAD);
        if (hasCake) this.grant(player, ACH.THE_LIE);
        if (hasFish) this.grant(player, ACH.DELICIOUS_FISH);
        if (hasFurnace) this.grant(player, ACH.HOT_TOPIC);
        if (hasIron) this.grant(player, ACH.ACQUIRE_HARDWARE);
    }

    has(player, key) {
        return player.getDynamicProperty(`ach:${key}`) === true;
    }

    getUnlockedCount(player) {
        let count = 0;
        Object.values(ACH).forEach(key => {
            if (this.has(player, key)) count++;
        });
        return count;
    }

    grant(player, key) {
        if (this.has(player, key)) return;

        const parent = PARENTS[key];
        if (parent && !this.has(player, parent)) return;

        player.setDynamicProperty(`ach:${key}`, true);
        this.toast(player, key);
    }

    toast(player, key) {
        const title = TITLES[key];
        player.sendMessage(`§eAchievement get!`);
        player.sendMessage(`§f${title}`);
        player.playSound("random.levelup");
    }

    resetAchievements(player) {
        Object.values(ACH).forEach(key => {
            player.setDynamicProperty(`ach:${key}`, undefined);
        });
        player.sendMessage("§cAchievements reset!");
    }

    openUI(player) {
        const count = this.getUnlockedCount(player);
        player.sendMessage(`§e--- Beta Achievements (${count}/${TOTAL_ACHIEVEMENTS}) ---`);
        
        Object.values(ACH).forEach(key => {
            const unlocked = this.has(player, key);
            const title = TITLES[key];
            const parent = PARENTS[key];
            const parentUnlocked = !parent || this.has(player, parent);
            
            if (unlocked) {
                player.sendMessage(`§a[✔] ${title}`);
            } else if (parentUnlocked) {
                 player.sendMessage(`§f[ ] ${title}`);
            } else {
                 const parentTitle = TITLES[parent];
                 player.sendMessage(`§7[?] ??? (Need: ${parentTitle})`);
            }
        });
    }
}

const achSystem = new AchievementSystem();
export default achSystem;

