# api-signature

Express/Restify middleware to authenticate HTTP requests based on api key and signature.

[![npm version](https://badge.fury.io/js/api-signature.svg)](https://badge.fury.io/js/api-signature)
[![codebeat badge](https://codebeat.co/badges/8b9de4e3-0841-4a91-85fd-5a26f58901c3)](https://codebeat.co/projects/github-com-arkerone-api-signature-master)
[![Build Status](https://travis-ci.org/arkerone/api-signature.svg?branch=master)](https://travis-ci.org/arkerone/api-signature)
[![codecov](https://codecov.io/gh/arkerone/api-signature/branch/master/graph/badge.svg)](https://codecov.io/gh/arkerone/api-signature)
[![Greenkeeper badge](https://badges.greenkeeper.io/arkerone/api-signature.svg)](https://greenkeeper.io/)

## Installation

```
$ npm install --save api-signature
```

## Usage

This middleware authenticates callers using an api key and the signature of the request. If the api key and the signature are valid, `req.credentials` will be set with the calling application information.

### Example

This basic usage example should help you get started :

```javascript
const express = require('express');
const request = require('request');
const apiSignature = require('api-signature');
const crypto = require("crypto");
const app = express();

// Create the collection of api keys
const apiKeys = new Map();
apiKeys.set('123456789', {
  id: 1,
  name: 'app1',
  secret: 'secret1'
});
apiKeys.set('987654321', {
  id: 2,
  name: 'app2',
  secret: 'secret2'
});
class Signer{
    constructor(apiKey, apiSecret){
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }
    signHeaders(){
        const headers = {};
        if (this.apiKey  && this.apiKey){
            const date = new Date().toUTCString();
            headers.Authorization = this.sign(date);
            headers.date = date;
        }
        return headers;
    }
    encrypt(data){
        const hash = crypto.createHmac("sha256",this.apiSecret).update(data).digest();
        //to lowercase hexits
        return hash
    }
    sign(date){
        const signature = Buffer.from(this.encrypt(`date: ${date}`)).toString("base64");
        console.log(date, signature);
        return `Signature keyId="${this.apiKey}",algorithm="hmac-sha256",signature="${signature}"`;
    }
}

// Your function to get the secret associated to the key id
function getSecret(keyId, done) {
  if (!apiKeys.has(keyId)) {
    return done(new Error('Unknown api key'));
  }
  const clientApp = apiKeys.get(keyId);
  done(null, clientApp.secret, {
    id: clientApp.id,
    name: clientApp.name
  });
}

app.get('/unprotected', async (req, res) => {
  const signer = new Signer('123456789',apiKeys.get('123456789').secret);
  const response = await request.post(
      "http://localhost:8080/protected",{
        headers: signer.signHeaders(),
      }
  );
  console.log("Success");
  response.pipe(res);
});
app.post('/protected',apiSignature({ getSecret }),async (req, res) => {
  console.log("i got here");
  res.send(`Hello ${req.credentials.name}`);
});
app.listen(8080);
```

## API

### apiSignature(options)

Create an api key based authentication middleware function using the given `options` :

|       Name        |      Type       |     Default     | Description                                     |
| :---------------: | :-------------: | :-------------: | :---------------------------------------------- |
|    `getSecret`    |   `Function`    |       `-`       | Invoked to retrieve the secret from the `keyId` |
| `requestProperty` |    `String`     | `'credentials'` | The request property to attach the information  |
| `requestLifetime` | `Number | null` |      `300`      | The lifetime of a request in seconds            |
| `requiredHeaders` | `String[] | null` |      `['date']`      | The header that must be present in request signature |

#### options.getSecret (REQUIRED)

A function with signature `function(keyId, done)` to be invoked to retrieve the secret from the `keyId`.

- `keyId` (`String`) - The api key used to retrieve the secret.
- `done` (`Function`) - A function with signature `function(err, secret, credentials)` to be invoked when the secret is retrieved.

  - `err` (`Error`) - The error that occurred.
  - `secret` (`String`) - The secret to use to verify the signature.
  - `credentials` (`Object`) - `req.credentials` will be set with this object.

#### options.requestProperty (OPTIONAL)

By default, you can attach information about the client application on `req.credentials` but can be configured with the `requestProperty` option.

#### options.requestLifetime (OPTIONAL)

The lifetime of a request in second, by default is set to 300 seconds, set it to null to disable it. This options is used if HTTP header "date" is used to create the signature.
#### options.requiredHeaders (OPTIONAL)
The header that must be present in request signature example could be
`Signature keyId="${this.apiKey}",headers="(request-target) host date",algorithm="hmac-sha256",signature="${signature}"`
apiSignature({ getSecret, requiredHeaders:['date','host','(request-target)']})

```javascript
const express = require("express");
const request = require("request");
const apiSignature = require("api-signature");
const crypto = require("crypto");
const app = express();

// Create the collection of api keys
const apiKeys = new Map();
apiKeys.set("123456789", {
  id: 1,
  name: "app1",
  secret: "secret1",
});
apiKeys.set("987654321", {
  id: 2,
  name: "app2",
  secret: "secret2",
});
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

// Your function to get the secret associated to the key id
function getSecret(keyId, done) {
  if (!apiKeys.has(keyId)) {
    return done(new Error("Unknown api key"));
  }
  const clientApp = apiKeys.get(keyId);
  done(null, clientApp.secret, {
    id: clientApp.id,
    name: clientApp.name,
  });
}

app.get("/unprotected", async (req, res) => {
  const signer = new Signer("123456789", apiKeys.get("123456789").secret);
  const response = await request.post("http://localhost:8080/protected", {
    headers: {
      ...signer.signHeaders({
        "(request-target)": "post /protected",
        host: "http://localhost",
      }),
      host: "http://localhost",
    },
  });
  console.log("Success");
  response.pipe(res);
});
app.post(
  "/protected",
  apiSignature({
    getSecret,
    requiredHeaders: ["date", "host", "(request-target)"],
  }),
  async (req, res) => {
    console.log("i got here");
    res.send(`Hello ${req.credentials.name}`);
  }
);
app.listen(8080);
```
## HTTP signature scheme

Look ["HTTP signature scheme"](signature.md) to sign a HTTP request.

## License

The MIT License (MIT)

Copyright (c) 2021 Michael Piper <mailto:hello@zeroant.co>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.