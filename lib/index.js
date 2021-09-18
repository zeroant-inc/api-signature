/**
 * @author Michael Piper <hello@zeroant.co>
 * MIT Licensed
 */

const { availableAlgorithms } = require('./algorithm');
const parser = require('./parser');
const verify = require('./verify');
const { BadSignatureError, UnauthorizedError } = require('./errors');
const Signer = require('./signer');

/**
 * @function
 * @public
 * @description Create the middleware for api key based authentication
 * @param {Object} options An object with options.
 * @param {Function} options.getSecret The function to get the secret
 * @param {String} [options.requestProperty='credentials'] The request property's name used to attach credentials
 * @param {String[]} [options.requiredHeaders=[]] The required  HTTP header of a request
 * @param {Number|null} [options.requestLifetime=300] The lifetime of a request in second (set to null to disable it)
 * @return {Function} The middleware function
 * @throws {Error} The method "getSecret" must be defined
 */
function apiSignature(options) {
  if (!options || !options.getSecret) {
    throw new Error('The method "getSecret" must be defined');
  }
  /* Check if "requiredHeaders" param not exists use the date HTTP header by default */
  if (typeof options.requiredHeaders!=="undefined" && !Array.isArray(options.requiredHeaders)) {
    throw new Error('The object "requiredHeaders" must be a type of string[]');
  }
  const { getSecret, requestLifetime = 300, requestProperty = 'credentials', requiredHeaders=['date']  } = options;

  const middleware = async function middleware(req, res, next) {
    /* Don't check the signature for preflight request */
    if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
      const hasAuthInAccessControl =
        req.headers['access-control-request-headers']
          .split(',')
          .map(header => header.trim().toLowerCase())
          .indexOf('authorization') !== -1;
      if (hasAuthInAccessControl) {
        return await next();
      }
    }
    let signatureParams = null;
    try {
      signatureParams = parser.parseRequest(req, {
        algorithms: availableAlgorithms,
        requestLifetime,
        requiredHeaders
      });
    } catch (err) {
      return await next(err);
    }
    getSecret(signatureParams.keyid, (err, secret, credentials) => {
      if (err) {
        return await next(new UnauthorizedError(err.message));
      }
      if (!secret) {
        throw new Error('The method "getSecret" must return the secret key through the callback function');
      }
      if (!verify.verifySignature(signatureParams, secret)) {
        return await next(new BadSignatureError());
      }

      req[requestProperty] = credentials;
      return await next();
    });
  };

  return middleware;
}

/**
 * @module apiSignature
 * @description The middleware for api signature based authentication
 */
module.exports = apiSignature;
module.exports.Signer = Signer;
