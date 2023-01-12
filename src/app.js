import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb'
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
        if (name === '' || typeof(name) !== 'string') return res.sendStatus(422)
        
        const userExist = await db.collection('participants').findOne({ name })

        if (userExist) return res.sendStatus(409);

        await db.collection('participants').insertOne({ name })
        res.status(201).send('OK')

    } catch (err) {
        console.log(err)
        return res.sendStatus(500)
    }

});

app.get('/participants', async (req, res) => {
    const participants = await db.collection('participants').find().toArray()

    if (!participants) return res.sendStatus(404)

    res.send(participants)
});

app.post('/messages', (req, res) => {
    const message = req.body;
    messages.push(message);
    res.sendStatus(201);
});

app.get('/messages', (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;
    if (!limit) res.send(messages)

    const limitMessages = messages.slice((messages.length - limit), messages.length)
    res.send(limitMessages)
});

app.post('/status', (req, res) => {
    const { user } = req.headers;

    if (!user) res.sendStatus(404)

    const findUser = participants.find((p) => p.name === user);
    if (!findUser) res.sendStatus(404)

    res.sendStatus(200)
});