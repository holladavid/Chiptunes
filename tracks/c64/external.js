import { loadSidFile } from '../../js/parsers/sid-parser.js';

const mySidFiles = [
    "commando.sid",
    "monty_on_the_run.sid",
    "delta.sid",
    "wizball.sid", // Kannst du ebenfalls laden...
    "wizball.sid"  // Hier weisen wir Wizball zu!
];

// Ergänze in der "mySidFiles"-Liste einfach "wizball.sid" am Ende:
const mySidFilesUpdated = [
    "commando.sid",
    "monty_on_the_run.sid",
    "delta.sid",
    "wizball.sid" // NEU!
];

export const externalSidTracks = mySidFilesUpdated.map((filename, index) => {
    return {
        title: `${index + 3}. LOAD SID: ${filename}`,
        composerInfo: ``,
        generator: function() { return []; },
        loadAsync: async function() {
            return await loadSidFile(`tracks/c64/${filename}`);
        }
    };
});