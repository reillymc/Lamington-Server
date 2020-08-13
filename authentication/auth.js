var jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./sslcert/cert.key', 'utf8');
const secret = "SecureSecret123"

const createToken = () => {
    return token = jwt.sign({ foo: secret }, privateKey, { expiresIn: '1d' })
}

const verifyToken = (token) => {
    if (!token) {
        return false
    }
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }
    var decrypted = jwt.verify(token, privateKey);
    if (decrypted.foo === secret) {
        return true;
    } else {
        return false;
    }
}
module.exports = {
    createToken,
    verifyToken
}