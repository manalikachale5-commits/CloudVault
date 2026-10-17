
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

status.textContent =
    `Success! ${encryptedChunks.length} chunk(s) encrypted.`;

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
        status.textContent = "Decrypting and rebuilding your file...";

        const decryptedChunks = [];

        for (const chunk of encryptedChunks) {
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
            `Success! ${originalFileName} was reconstructed and downloaded.`;
    } catch (error) {
        console.error(error);
        status.textContent =
            "Decryption failed. Please encrypt the file again.";
    } finally {
        downloadBtn.disabled = false;
    }
});
