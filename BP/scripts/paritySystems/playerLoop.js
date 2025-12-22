// unified player loop - handles nosprint, nooffhand, water state
// optimized: single loop, single interval, minimal overhead

import { world, system, EquipmentSlot } from "@minecraft/server";
console.warn("[Betafied] Player Loop Loaded");

const playerWaterState = new Map();

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        try {
            const isCreative = player.getGameMode() === "creative";

            // --- no xp: reset level ---
            if (player.level > 0 || player.xpEarnedAtCurrentLevel > 0) {
                player.resetLevel();
            }
            
            // --- no sprint: keep hunger at 5 (below sprint threshold of 6) ---
            if (!isCreative) {
                const hunger = player.getComponent("minecraft:hunger");
                if (hunger?.currentValue !== 5) {
                    hunger?.setCurrentValue(5);
                }
            }
            
            // --- no offhand: clear offhand slot ---
            const equippable = player.getComponent("minecraft:equippable");
            if (equippable?.getEquipment(EquipmentSlot.Offhand)) {
                equippable.setEquipment(EquipmentSlot.Offhand, undefined);
            }
            
            // --- water state: clear actionbar when leaving water ---
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
        } catch (e) {}
    }
}, 20); // 20 ticks = 1s, responsive enough

// cleanup on leave
world.afterEvents.playerLeave.subscribe((event) => {
    playerWaterState.delete(event.playerId);
});
