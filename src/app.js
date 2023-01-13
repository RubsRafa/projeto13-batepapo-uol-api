import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
dotenv.config();


const mongoClient = new MongoClient(process.env.DATABASE_URL);

await mongoClient.connect()
const db = mongoClient.db()


const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.listen(PORT, () => console.log(`Servidor funcionando na porta ${PORT}`));

//participants = name, lastStatus, 
//messages = from, to, text, type, time; // reccebe to, text, type; 

app.post('/participants', async (req, res) => {
    const { name } = req.body;

    try {
        if (name === '' || typeof (name) !== 'string') return res.sendStatus(422)

        const userExist = await db.collection('participants').findOne({ name });

        if (userExist) return res.sendStatus(409);

        await db.collection('participants').insertOne({ name, lastStatus: Date.now() })
        res.status(201).send('OK')

    } catch (err) {
        console.log('erro no post participants', err)
        return res.sendStatus(500)
    }
});

app.get('/participants', async (req, res) => {

    try {
        const participants = await db.collection('participants').find().toArray()

        if (!participants) return res.sendStatus(404)

        res.send(participants)
    } catch (err) {
        console.log('erro no get do participants', err)
    }
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    try {
        const userExist = await db.collection('participants').findOne({ name: user })

        if (typeof (to) !== 'string' || to === '') return res.status(422).send('primeiro')
        if (typeof (text) !== 'string' || text === '') return res.status(422).send('segundo')
        //if (type.length === 0 || type !== "message" || type !== "private_message") return res.status(422).send('terceiro')
        if (!userExist) return res.status(422).send('quarto')

        await db.collection('messages').insertOne({ from: user, to, text, type, time: dayjs().format(`HH:mm:ss`) })
        return res.sendStatus(201)

    } catch (err) {
        console.log('erro no messages do post', err)
        return res.sendStatus(500)
    }

});

app.get('/messages', async (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    try {

        const allMessages = await db.collection('messages').find({}).toArray();
        if (!limit) res.send(allMessages)

        const limitMessages = allMessages.slice((allMessages.length - limit), allMessages.length)
        res.send(limitMessages)

    } catch (err) {

    }

});

app.post('/status', (req, res) => {
    const { user } = req.headers;

    if (!user) res.sendStatus(404)

    const findUser = participants.find((p) => p.name === user);
    if (!findUser) res.sendStatus(404)

    res.sendStatus(200)
});