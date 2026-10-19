
const SUPABASE_URL = "https://nniwbbbccgzqmzcrkaox.supabase.co";
const SUPABASE_KEY = "sb_publishable_4GOEpSwVp-ZnL7U1M1K96Q_bdRpo8jt";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const downloadBtn = document.getElementById("downloadBtn");
const status = document.getElementById("status");

let encryptedChunks = [];
let encryptionKey = null;
let originalFileName = "";
let originalFileType = "application/octet-stream";

uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
        status.textContent = "Please select a file first!";
        return;
    }

    try {
        uploadBtn.disabled = true;
        downloadBtn.disabled = true;
        status.textContent = "Encrypting file chunks...";

        encryptionKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        originalFileName = file.name;
        originalFileType =
            file.type || "application/octet-stream";

        const chunkSize = 1024 * 1024;
        encryptedChunks = [];

        for (let start = 0; start < file.size; start += chunkSize) {
            const chunk = file.slice(start, start + chunkSize);
            const data = await chunk.arrayBuffer();
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encryptedData = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                encryptionKey,
                data
            );

            encryptedChunks.push({
                data: encryptedData,
                iv: iv
            });
        }


const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

if (userError || !user) {
    throw new Error("Please log in before uploading.");
}

status.textContent = "Uploading encrypted chunks to cloud...";

for (let i = 0; i < encryptedChunks.length; i++) {
    const chunk = encryptedChunks[i];

    const filePath =
        `${user.id}/${Date.now()}_${i}.enc`;

    const encryptedBlob = new Blob([chunk.data], {
        type: "application/octet-stream"
    });

    const { error: uploadError } =
        await supabaseClient.storage
            .from("cloudvault-files")
            .upload(filePath, encryptedBlob);

    if (uploadError) {
        throw uploadError;
    }

    chunk.cloudPath = filePath;
}

status.textContent =
    `Success! ${encryptedChunks.length} encrypted chunk(s) uploaded to cloud.`;

document.getElementById("fileName").textContent = file.name;

document.getElementById("fileSize").textContent =
    (file.size / 1024).toFixed(2) + " KB";

document.getElementById("chunkCount").textContent =
    encryptedChunks.length;

document.getElementById("encryptionStatus").textContent =
    "Encrypted successfully";

downloadBtn.disabled = false;

} catch (error) {
    console.error(error);
    status.textContent = "Encryption failed. Please try again.";
} finally {
    uploadBtn.disabled = false;
}
});


downloadBtn.addEventListener("click", async () => {
    if (!encryptionKey || encryptedChunks.length === 0) {
        status.textContent = "Please encrypt a file first!";
        return;
    }

    try {
        downloadBtn.disabled = true;
        status.textContent = "Downloading encrypted chunks from cloud...";

        const cloudChunks = [];

        for (const chunk of encryptedChunks) {
            if (!chunk.cloudPath) {
                throw new Error("Cloud file path is missing. Upload the file again.");
            }

            const { data, error } = await supabaseClient.storage
                .from("cloudvault-files")
                .download(chunk.cloudPath);

            if (error) throw error;

            cloudChunks.push({
                data: await data.arrayBuffer(),
                iv: chunk.iv
            });
        }

        status.textContent = "Decrypting and rebuilding your file...";

        const decryptedChunks = [];

        for (const chunk of cloudChunks) {
            const decryptedData = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: chunk.iv },
                encryptionKey,
                chunk.data
            );

            decryptedChunks.push(decryptedData);
        }

        const restoredFile = new Blob(decryptedChunks, {
            type: originalFileType
        });

        const downloadURL = URL.createObjectURL(restoredFile);
        const link = document.createElement("a");

        link.href = downloadURL;
        link.download = originalFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);

        status.textContent =
            `Success! ${originalFileName} downloaded from cloud and decrypted.`;
    } catch (error) {
        console.error(error);
        status.textContent = "Cloud download failed: " + error.message;
    } finally {
        downloadBtn.disabled = false;
    }
});


async function signUp() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent = data.session
        ? "Signup successful! You are logged in."
        : "Signup successful! Check your email to confirm your account.";
}

async function signIn() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    message.textContent = error
        ? error.message
        : "Login successful!";
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    document.getElementById("authMessage").textContent = error
        ? error.message
        : "Logged out successfully.";
}
