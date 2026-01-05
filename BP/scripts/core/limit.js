import { world } from "@minecraft/server";
console.warn("[keirazelle] Limit System Loaded");

// Height limit system - strict 128
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    try {
        const { player, block } = event;
        // Allow creative players to build above 128
        // if (player.getGameMode() === "creative") return; // enforce for all if strict beta

        const y = block.location.y;
        if (y >= 128) {
            event.cancel = true;
            player.sendMessage("§cHeight limit for building is 128 blocks");
        }
    } catch (e) {}
});