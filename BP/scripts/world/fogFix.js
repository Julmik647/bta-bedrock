import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Fog Fix Loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 20,
    FOG_ID: "beta"
});

const hasFog = new Set();

function* fogJob() {
    const players = world.getAllPlayers();
    
    for (const player of players) {
        try {
            const name = player.name;
            const dim = player.dimension.id;

            if (dim === "minecraft:overworld") {
                if (!hasFog.has(name)) {
                    player.runCommand(`fog @s push classic_water:default_fog ${CONFIG.FOG_ID}`);
                    hasFog.add(name);
                }
            } else {
                if (hasFog.has(name)) {
                    player.runCommand(`fog @s pop ${CONFIG.FOG_ID}`);
                    hasFog.delete(name);
                }
            }
        } catch (e) {
            console.warn(`[fogFix] error: ${e}`);
        }
        yield;
    }
}

system.runInterval(() => {
    system.runJob(fogJob());
}, CONFIG.CHECK_INTERVAL);

// cleanup on leave
world.afterEvents.playerLeave.subscribe((event) => {
    hasFog.delete(event.playerName);
});