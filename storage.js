// This is the only file that accesses localStorage.
// Later, replace these two functions with Firebase storage operations.
const MATCH_STORAGE_KEY = "collegeCricketMatch";

async function saveMatch(match) {
    // Saving null removes the previous match completely.
    if (match === null) {
        localStorage.removeItem(MATCH_STORAGE_KEY);
        return;
    }

    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(match));
}

async function getMatch() {
    const savedMatch = localStorage.getItem(MATCH_STORAGE_KEY);

    if (savedMatch === null) {
        return null;
    }

    const match = JSON.parse(savedMatch);

    // Reject missing or damaged data rather than showing incorrect scores.
    if (!isValidMatch(match)) {
        throw new Error("The saved match is incomplete or damaged. Reset it from the operator page.");
    }

    return match;
}

function isValidMatch(match) {
    if (!match || typeof match !== "object") {
        return false;
    }

    const textFields = ["battingTeam", "oppositionTeam", "batsman", "bowler"];
    for (const field of textFields) {
        if (typeof match[field] !== "string" || match[field].trim() === "") {
            return false;
        }
    }

    const numberFields = ["runs", "wickets", "legalBalls", "extras"];
    for (const field of numberFields) {
        if (!Number.isSafeInteger(match[field]) || match[field] < 0) {
            return false;
        }
    }

    if (match.wickets > 10 || match.extras > match.runs || match.wickets > match.legalBalls) {
        return false;
    }

    if (match.status !== "In progress" && match.status !== "Innings ended") {
        return false;
    }

    if (match.wickets === 10 && match.status !== "Innings ended") {
        return false;
    }

    const allowedDeliveries = ["0", "1", "2", "3", "4", "6", "W", "Wd", "Nb"];
    if (!Array.isArray(match.recentDeliveries) || match.recentDeliveries.length > 12) {
        return false;
    }

    for (const delivery of match.recentDeliveries) {
        if (!allowedDeliveries.includes(delivery)) {
            return false;
        }
    }

    return true;
}
