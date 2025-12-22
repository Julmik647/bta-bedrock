import { world, system } from "@minecraft/server";

console.warn("[Betafied] Nether Ice System Loaded");

// beta: ice in nether turns to water on break

world.afterEvents.playerBreakBlock.subscribe((event) => {
    try {
        const { block, brokenBlockPermutation, dimension } = event;

        // nether only
        if (dimension.id !== "minecraft:the_nether") return;

        // ice only
        if (brokenBlockPermutation.type.id !== "minecraft:ice") return;

        // place water
        // wait 1 tick to ensure block is broken first
        const location = block.location;
        
        system.runTimeout(() => {
            try {
                // check if broken (air) then place water
                const currentBlock = dimension.getBlock(location);
                if (currentBlock && currentBlock.typeId === "minecraft:air") {
                    currentBlock.setType("minecraft:flowing_water");
                }
            } catch (e) {
                console.warn(`[NetherIce] Failed to place water: ${e}`);
            }
        }, 1);

    } catch (e) {
        console.warn(`[NetherIce] Error: ${e}`);
    }
});
