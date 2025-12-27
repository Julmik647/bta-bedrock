import { world, system, BlockPermutation } from "@minecraft/server";

console.warn("[keirazelle] Beta Fence Loaded");

const DIRECTIONS = [
    { name: "north", offset: { x: 0, y: 0, z: -1 }, state: "bh:north" },
    { name: "south", offset: { x: 0, y: 0, z: 1 }, state: "bh:south" },
    { name: "east", offset: { x: 1, y: 0, z: 0 }, state: "bh:east" },
    { name: "west", offset: { x: -1, y: 0, z: 0 }, state: "bh:west" }
];

const CONNECTABLES = new Set([
    "bh:fence",
    "minecraft:fence_gate",
    "minecraft:wooden_door",
    "minecraft:trapdoor" 
]);

function updateFence(block) {
    if (!block || !block.isValid()) return;
    if (block.typeId !== "bh:fence") return;

    try {
        const currentPerm = block.permutation;
        const states = {};
        
    
        for (const dir of DIRECTIONS) {
            const neighbor = block.offset(dir.offset);
            let connects = false;
            
            if (neighbor && neighbor.isValid()) {
                if (CONNECTABLES.has(neighbor.typeId)) {
                    connects = true;
                }
            }
            states[dir.state] = connects;
        }

        block.setPermutation(currentPerm.withStates(states));
    } catch (e) {
    }
}

function updateNeighbors(centerBlock) {
    for (const dir of DIRECTIONS) {
        try {
            const neighbor = centerBlock.offset(dir.offset);
            if (neighbor?.typeId === "bh:fence") {
                updateFence(neighbor);
            }
        } catch {}
    }
}

world.afterEvents.blockPlace.subscribe((event) => {
    const block = event.block;
    
    if (block.typeId === "minecraft:fence") {
        // swap to bh:fence
        block.setPermutation(BlockPermutation.resolve("bh:fence"));
        // then update it
        updateFence(block);
        updateNeighbors(block);
        return;
    }

    // normal bh:fence logic
    if (block.typeId === "bh:fence") {
        updateFence(block);
        updateNeighbors(block);
    } else {
        // if gate:p
        updateNeighbors(block);
    }
});

// break logic
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const loc = event.block.location;
    const dim = event.dimension;
    
    for (const dir of DIRECTIONS) {
        try {
            const neighbor = dim.getBlock({ x: loc.x + dir.offset.x, y: loc.y, z: loc.z + dir.offset.z });
            if (neighbor?.typeId === "bh:fence") updateFence(neighbor);
        } catch {}
    }
});
