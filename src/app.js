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

    const nameSchema = joi.object({ name: joi.string().required() });
    const validation = nameSchema.validate({ name }, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((d) => d.message);
        console.log(errors)
        return res.status(422).send(errors)
    }

    try {

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

        return res.send(participants)
    } catch (err) {
        console.log('erro no get do participants', err)
        return res.sendStatus(500)
    }
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    try {
        const userExist = await db.collection('participants').findOne({ name: user })
        if (!userExist) return res.sendStatus(422)

        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().valid('message', 'private_message').required()
        })
        const validation = messageSchema.validate({ to, text, type })
        if (validation.error) {
            const errors = validation.error.details.map((d) => d.message);
            return res.status(422).send(errors)
        }

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
        return res.status(500).send(err)
        console.log('erro no get do messages', err)
    }

});

app.post('/status', async (req, res) => {
    const { user } = req.headers;

    try {

        let id; 
        const userExist = await db.collection('participants').findOne({ name: user })
        .then((item) => id = item._id)
        if (!userExist) return res.sendStatus(404)

        await db.collection('participants').updateOne({ _id: ObjectId(id)}, { $set: { lastStatus: Date.now() } })

        return res.sendStatus(200)

    } catch (err) {
        return res.status(500).send(err)
    }
});

setInterval(async () => {

    try {
        const findUsers = await db.collection('participants').find({}).toArray();

        const newParticipants = findUsers.filter((u) => {
            if ((Date.now() - u.lastStatus) > 10000) {
                db.collection('message').insertOne({ from: u.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format(`HH:mm:ss`) })
                db.collection('participants').deleteOne({ _id: ObjectId(u._id) })
            }
        })

        console.log('removendo usuarios')
        return newParticipants

    } catch (err) {
        console.log(err)
    }

}, 15000);

