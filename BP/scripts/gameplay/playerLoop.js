import { world, system, EquipmentSlot } from "@minecraft/server";
console.warn("[keirazelle] Player Loop Loaded");
const CONFIG = Object.freeze({
    TICK_INTERVAL: 20,
    HUNGER_LOCK: 5
});

const playerWaterState = new Map();

// generator fn to distribute player processing across ticks
function* processPlayers() {
    const players = world.getPlayers();
    
    for (const player of players) {
        try {
            const isCreative = player.getGameMode() === "creative";

            // xp removal
            if (player.level > 0 || player.xpEarnedAtCurrentLevel > 0) {
                player.resetLevel();
            }
            
            // no offhand
            const equippable = player.getComponent("minecraft:equippable");
            if (equippable?.getEquipment(EquipmentSlot.Offhand)) {
                equippable.setEquipment(EquipmentSlot.Offhand, undefined);
            }
            
            // water state
            const pos = player.location;
            const block = player.dimension.getBlock({
                x: Math.floor(pos.x),
                y: Math.floor(pos.y + 1.8),
                z: Math.floor(pos.z)
            });
            
            const inWater = block?.typeId?.includes("water") ?? false;
            const wasInWater = playerWaterState.get(player.id) ?? false;
            
            if (inWater) {
                playerWaterState.set(player.id, true);
            } else if (wasInWater) {
                player.onScreenDisplay.setActionBar("");
                playerWaterState.set(player.id, false);
            }
        } catch (e) {
            // log errors
            console.warn(`[playerLoop] error processing ${player?.name}: ${e}`);
        }
        
        yield;
    }
}

system.runInterval(() => {
    system.runJob(processPlayers());
}, CONFIG.TICK_INTERVAL);

// cleanup on leave
world.afterEvents.playerLeave.subscribe((event) => {
    playerWaterState.delete(event.playerId);
});
