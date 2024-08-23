class UploadManager {
    constructor() {
        if (!UploadManager.instance) {
            UploadManager.instance = this;
        }
        return UploadManager.instance;
    }

    async upload({ key, fileReference, contentType = 'application/octet-stream', acl = 'public-read', fileName }) {
        const uploadAddress = global.hostAddress + "uploads/";
        return new Promise(async (resolve, reject) => {
                // isEnabled = false;
                resolve({
                    Key: key,
                    Location: `${uploadAddress}${key}/${fileName}`,
                });
        });
    }
}

module.exports = new UploadManager();