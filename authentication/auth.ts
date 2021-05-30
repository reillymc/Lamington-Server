var jwt = require('jsonwebtoken');
import fs from 'fs';
const privateKey = fs.readFileSync('./sslcert/cert.key', 'utf8');
const secret = "SecureSecret123"

const createToken = () => {
    return jwt.sign({ foo: secret }, privateKey, { expiresIn: '1d' })
}

const verifyToken = (token: string) => {
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
export default {
    createToken,
    verifyToken
}