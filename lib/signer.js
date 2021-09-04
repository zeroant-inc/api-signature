const crypto = require("crypto");
class Signer {
    constructor(apiKey, apiSecret) {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
    }
    signHeaders(data) {
      const headers = {};
      if (this.apiKey && this.apiKey) {
        const date = new Date().toUTCString();
        headers.Authorization = this.sign({ ...data, date });
        headers.date = date;
      }
      return headers;
    }
    encrypt(data) {
      const hash = crypto
        .createHmac("sha256", this.apiSecret)
        .update(data)
        .digest();
      //to lowercase hexits
      return hash;
    }
    sign(data = {}) {
      const signature = Buffer.from(
        this.encrypt(
          Object.entries(data)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        )
      ).toString("base64");
      console.log(data.date, signature);
      return `Signature keyId="${
        this.apiKey
      }",algorithm="hmac-sha256",headers="${Object.keys(data).join(
        " "
      )}",signature="${signature}"`;
    }
  }
module.exports = Signer;