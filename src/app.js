import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import joi from 'joi'
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


app.post('/participants', async (req, res) => {
    const { name } = req.body;

    try {
        if (name === '' || typeof (name) !== 'string') return res.sendStatus(422)

        const userExist = await db.collection('participants').findOne({ name });

        if (userExist) return res.sendStatus(409);

        await db.collection('participants').insertOne({ name, lastStatus: Date.now() })
        await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format(`HH:mm:ss`) })
        res.sendStatus(201)

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
        if (typeof (type) !== 'string' || type === '') return res.status(422).send('terceiro')
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

        const allMessages = await db.collection('messages').find().toArray();

        allMessages.filter((m) => {
            if (m.to === "Todos" || m.to === user || m.from === user) {
                return m;
            }
        })

        if (!limit) return res.send(allMessages)
        if (Number(limit) < 1) return res.sendStatus(422)

        const limitMessages = allMessages.slice((allMessages.length - Number(limit)), allMessages.length)
        return res.send(limitMessages)

    } catch (err) {
        console.log('erro no get do messages', err)
    }

});

app.post('/status', async (req, res) => {
    const { user } = req.headers;

    try {

        const userExist = await db.collection('participants').findOne({ name: user }).toArray();

        if (!userExist) return res.sendStatus(404)

        await db.collection('participants').insertOne({ name: user, lastStatus: Date.now() })

        return res.sendStatus(200)

    } catch (err) {
        console.log('erro no post do status', err)
    }
});

setInterval(async () => {

    try {
        const findUsers = await db.collection('participants').find({}).toArray();

        const newParticipants = findUsers.filter((u) => {
            if ((Date.now() - u.lastStatus) > 10000) {
                db.collection('message').insertOne({from: u.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format(`HH:mm:ss`)})
                db.collection('participants').deleteOne({ _id: ObjectId(u._id) })
            }
        })

        console.log('removendo usuarios')
        return newParticipants

    } catch (err) {
        console.log(err)
    }

}, 15000);

