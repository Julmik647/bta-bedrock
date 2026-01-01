// admin moderation system for realm management
import { world, system } from "@minecraft/server";

console.warn("[keirazelle] Moderation System Loaded");

const CONFIG = Object.freeze({
    ADMIN_TAG: "admin",
    MOD_TAG: "moderator",
    VOIDED_TAG: "voided",
    BUILDER_EXEMPT: "builder_exempt"
});

// check if player has staff perms
function isStaff(player) {
    return player.hasTag(CONFIG.ADMIN_TAG) || player.hasTag(CONFIG.MOD_TAG);
}

// check if player is admin specifically
function isAdmin(player) {
    return player.hasTag(CONFIG.ADMIN_TAG);
}

// find player by partial name match
function findPlayer(name) {
    const lower = name.toLowerCase();
    const players = world.getAllPlayers();
    
    // exact match first
    for (const p of players) {
        if (p.name.toLowerCase() === lower) return p;
    }
    
    // partial match
    for (const p of players) {
        if (p.name.toLowerCase().includes(lower)) return p;
    }
    
    return null;
}

// command handler
function handleModCommand(sender, args) {
    if (!isStaff(sender)) {
        sender.sendMessage("§cYou don't have permission to use mod commands.");
        return;
    }

    if (args.length === 0) {
        showHelp(sender);
        return;
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
        case "help":
            showHelp(sender);
            break;

        case "list":
            listPlayers(sender);
            break;

        case "void":
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod void <player>");
                return;
            }
            voidPlayer(sender, args[1]);
            break;

        case "unvoid":
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod unvoid <player>");
                return;
            }
            unvoidPlayer(sender, args[1]);
            break;

        case "admin":
            if (!isAdmin(sender)) {
                sender.sendMessage("§cOnly admins can grant admin status.");
                return;
            }
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod admin <player>");
                return;
            }
            grantAdmin(sender, args[1]);
            break;

        case "unadmin":
            if (!isAdmin(sender)) {
                sender.sendMessage("§cOnly admins can remove admin status.");
                return;
            }
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod unadmin <player>");
                return;
            }
            removeAdmin(sender, args[1]);
            break;

        case "mod":
            if (!isAdmin(sender)) {
                sender.sendMessage("§cOnly admins can grant moderator status.");
                return;
            }
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod mod <player>");
                return;
            }
            grantMod(sender, args[1]);
            break;

        case "unmod":
            if (!isAdmin(sender)) {
                sender.sendMessage("§cOnly admins can remove moderator status.");
                return;
            }
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod unmod <player>");
                return;
            }
            removeMod(sender, args[1]);
            break;

        case "exempt":
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod exempt <player>");
                return;
            }
            toggleExempt(sender, args[1]);
            break;

        case "kick":
            if (args.length < 2) {
                sender.sendMessage("§cUsage: !mod kick <player>");
                return;
            }
            kickPlayer(sender, args[1]);
            break;

        case "role":
            if (args.length < 3) {
                sender.sendMessage("§cUsage: !mod role <player> <contributor|og|bug_hunter>");
                return;
            }
            toggleRole(sender, args[1], args[2]);
            break;

        default:
            sender.sendMessage(`§cUnknown subcommand: ${subCommand}`);
            showHelp(sender);
    }
}

function showHelp(player) {
    player.sendMessage("§e=== Moderation Commands ===");
    player.sendMessage("§b!mod list §7- List staff and voided players");
    player.sendMessage("§b!mod void <player> §7- Soft-ban player");
    player.sendMessage("§b!mod unvoid <player> §7- Remove soft-ban");
    player.sendMessage("§b!mod exempt <player> §7- Toggle builder exempt");
    player.sendMessage("§b!mod kick <player> §7- Disconnect player");
    player.sendMessage("§b!mod role <player> <role> §7- Toggle role (contributor/og/bug_hunter)");
    if (isAdmin(player)) {
        player.sendMessage("§6!mod admin <player> §7- Grant admin");
        player.sendMessage("§6!mod unadmin <player> §7- Remove admin");
        player.sendMessage("§6!mod mod <player> §7- Grant moderator");
        player.sendMessage("§6!mod unmod <player> §7- Remove moderator");
    }
}

function listPlayers(sender) {
    const players = world.getAllPlayers();
    
    const admins = [];
    const mods = [];
    const voided = [];
    const exempt = [];

    for (const p of players) {
        if (p.hasTag(CONFIG.ADMIN_TAG)) admins.push(p.name);
        if (p.hasTag(CONFIG.MOD_TAG)) mods.push(p.name);
        if (p.hasTag(CONFIG.VOIDED_TAG)) voided.push(p.name);
        if (p.hasTag(CONFIG.BUILDER_EXEMPT)) exempt.push(p.name);
    }

    sender.sendMessage("§e=== Player Status ===");
    sender.sendMessage(`§6Admins: §f${admins.join(", ") || "none"}`);
    sender.sendMessage(`§bModerators: §f${mods.join(", ") || "none"}`);
    sender.sendMessage(`§cVoided: §f${voided.join(", ") || "none"}`);
    sender.sendMessage(`§aExempt: §f${exempt.join(", ") || "none"}`);
}

function voidPlayer(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (isStaff(target) && !isAdmin(sender)) {
        sender.sendMessage("§cCannot void staff members.");
        return;
    }

    if (target.hasTag(CONFIG.VOIDED_TAG)) {
        sender.sendMessage(`§c${target.name} is already voided.`);
        return;
    }

    target.addTag(CONFIG.VOIDED_TAG);
    target.sendMessage("§cYou have been soft-banned by a moderator.");
    sender.sendMessage(`§a${target.name} has been voided.`);
    
    // broadcast to staff
    for (const p of world.getAllPlayers()) {
        if (isStaff(p) && p.name !== sender.name) {
            p.sendMessage(`§e[MOD] ${sender.name} voided ${target.name}`);
        }
    }
}

function unvoidPlayer(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (!target.hasTag(CONFIG.VOIDED_TAG)) {
        sender.sendMessage(`§c${target.name} is not voided.`);
        return;
    }

    target.removeTag(CONFIG.VOIDED_TAG);
    target.sendMessage("§aYour soft-ban has been lifted.");
    sender.sendMessage(`§a${target.name} has been unvoided.`);
}

function grantAdmin(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (target.hasTag(CONFIG.ADMIN_TAG)) {
        sender.sendMessage(`§c${target.name} is already an admin.`);
        return;
    }

    target.addTag(CONFIG.ADMIN_TAG);
    target.removeTag(CONFIG.MOD_TAG);
    target.sendMessage("§6You have been granted admin privileges.");
    sender.sendMessage(`§a${target.name} is now an admin.`);
}

function removeAdmin(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (target.name === sender.name) {
        sender.sendMessage("§cYou cannot remove your own admin status.");
        return;
    }

    if (!target.hasTag(CONFIG.ADMIN_TAG)) {
        sender.sendMessage(`§c${target.name} is not an admin.`);
        return;
    }

    target.removeTag(CONFIG.ADMIN_TAG);
    target.sendMessage("§cYour admin privileges have been removed.");
    sender.sendMessage(`§a${target.name} is no longer an admin.`);
}

function grantMod(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (target.hasTag(CONFIG.ADMIN_TAG)) {
        sender.sendMessage(`§c${target.name} is an admin. Demote first.`);
        return;
    }

    if (target.hasTag(CONFIG.MOD_TAG)) {
        sender.sendMessage(`§c${target.name} is already a moderator.`);
        return;
    }

    target.addTag(CONFIG.MOD_TAG);
    target.sendMessage("§bYou have been granted moderator privileges.");
    sender.sendMessage(`§a${target.name} is now a moderator.`);
}

function removeMod(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (!target.hasTag(CONFIG.MOD_TAG)) {
        sender.sendMessage(`§c${target.name} is not a moderator.`);
        return;
    }

    target.removeTag(CONFIG.MOD_TAG);
    target.sendMessage("§cYour moderator privileges have been removed.");
    sender.sendMessage(`§a${target.name} is no longer a moderator.`);
}

function toggleExempt(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (target.hasTag(CONFIG.BUILDER_EXEMPT)) {
        target.removeTag(CONFIG.BUILDER_EXEMPT);
        target.sendMessage("§cBuilder exemption removed.");
        sender.sendMessage(`§a${target.name} is no longer exempt.`);
    } else {
        target.addTag(CONFIG.BUILDER_EXEMPT);
        target.sendMessage("§aBuilder exemption granted.");
        sender.sendMessage(`§a${target.name} is now exempt.`);
    }
}

function kickPlayer(sender, targetName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    if (isStaff(target) && !isAdmin(sender)) {
        sender.sendMessage("§cCannot kick staff members.");
        return;
    }

    if (target.name === sender.name) {
        sender.sendMessage("§cYou cannot kick yourself.");
        return;
    }

    try {
        // disconnect via teleport to unloaded chunk + kill
        target.runCommand("kick @s You have been kicked by a moderator.");
    } catch (e) {
        // fallback: damage loop
        target.addTag(CONFIG.VOIDED_TAG);
        sender.sendMessage(`§eKick failed, player was voided instead.`);
        return;
    }

    sender.sendMessage(`§a${target.name} has been kicked.`);
}

const VALID_ROLES = Object.freeze(new Set(["contributor", "og", "bug_hunter"]));

function toggleRole(sender, targetName, roleName) {
    const target = findPlayer(targetName);
    if (!target) {
        sender.sendMessage(`§cPlayer "${targetName}" not found.`);
        return;
    }

    const role = roleName.toLowerCase();
    if (!VALID_ROLES.has(role)) {
        sender.sendMessage(`§cInvalid role. Use: contributor, og, bug_hunter`);
        return;
    }

    if (target.hasTag(role)) {
        target.removeTag(role);
        target.sendMessage(`§c${role} role removed.`);
        sender.sendMessage(`§a${target.name} no longer has ${role} role.`);
    } else {
        target.addTag(role);
        target.sendMessage(`§a${role} role granted.`);
        sender.sendMessage(`§a${target.name} now has ${role} role.`);
    }
}

// chat listener
if (world.beforeEvents?.chatSend) {
    world.beforeEvents.chatSend.subscribe((event) => {
        const msg = event.message.trim();
        
        if (msg.toLowerCase().startsWith("!mod")) {
            event.cancel = true;
            const args = msg.substring(4).trim().split(/\s+/);
            system.run(() => {
                handleModCommand(event.sender, args);
            });
        }
    });
}
