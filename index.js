import  express from 'express';
import 'dotenv/config'
import TonWeb from "tonweb";
import tonMnemonic from "tonweb-mnemonic";
var app = express();
const port = 5000;

app.use(express.json());
function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

const WORDS = process.env.WORDS;
const TO_ADDRESS = process.env.TO_ADDRESS;
app.post('/payed', async function (req, res) {
    console.log(req.body)
    const {ton} = req.body;
    const tonweb = new TonWeb();
    const seedA = await tonMnemonic.mnemonicToSeed(WORDS.split(' '));
    const keyPair = await tonMnemonic.mnemonicToKeyPair(seedA)
    const publicKey = toHexString(keyPair.publicKey);
    const secretKey = toHexString(keyPair.secretKey);
    const wallet = tonweb.wallet.create({publicKey});
    const address = await wallet.getAddress();
    const nonBounceableAddress = address.toString(true, true, false);
    const seqno = await wallet.methods.seqno().call();
    await wallet.deploy(secretKey).send(); // deploy wallet to blockchain
    const fee = await wallet.methods.transfer({
        secretKey,
        toAddress: TO_ADDRESS,
        amount: TonWeb.utils.toNano(ton), // 0.01 TON
        seqno: seqno,
        payload: 'Hello',
        sendMode: 3,
    }).estimateFee();

    const Cell = TonWeb.boc.Cell;
    const cell = new Cell();
    cell.bits.writeUint(0, 32);
    cell.bits.writeAddress(address);
    cell.bits.writeGrams(1);
    console.log(cell.print()); // print cell data like Fift
    const bocBytes = cell.toBoc();
    const history = await tonweb.getTransactions(address);
    const balance = await tonweb.getBalance(address);
    tonweb.sendBoc(bocBytes);
    res.send('ok');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})