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
        return res.status(422).send(errors)
    }

    try {

        const userExist = await db.collection('participants').findOne({ name });
        if (userExist) return res.sendStatus(409);

        await db.collection('participants').insertOne({ name, lastStatus: Date.now() })
        await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format(`HH:mm:ss`) })
        res.sendStatus(201)

    } catch (err) {
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

        await db.collection('messages').insertOne({ to, text, type, from: user, time: dayjs().format(`HH:mm:ss`) })
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

        const filterMessages = allMessages.filter((m) => {
            if (m.type !== 'private_message') {
                return m; 
            }    
            if (m.to === "Todos" || m.to === user || m.from === user) {
                return m;
            }
                
        })

        if (!limit) return res.status(200).send(filterMessages)
        if (typeof (Number(limit)) !== 'number' || Number(limit) <= 0) return res.sendStatus(422)

        const limitMessages = filterMessages.reverse().slice((0, Number(limit)))
        // const limitMessages = filterMessages.slice((filterMessages.length - Number(limit)), filterMessages.length)
        return res.status(200).send(limitMessages)

    } catch (err) {
        return res.status(500).send(err)
    }

});

app.post('/status', async (req, res) => {
    const { user } = req.headers;
    let id;

    try {
        const userExist = await db.collection('participants').findOne({ name: user })
            .then((item) => id = item._id)
        if (!userExist) return res.sendStatus(404)

        await db.collection('participants').updateOne({ _id: ObjectId(id) }, { $set: { lastStatus: Date.now() } })

        return res.sendStatus(200)

    } catch (err) {
        return res.status(404).send(err)
    }
});

setInterval(async () => {

    try {
        const findUsers = await db.collection('participants').find().toArray()
        if (!findUsers || findUsers.length === 0) return; 

        let user;
        let id;
        findUsers.find((u) => {
            if ((Date.now() - u.lastStatus) > 10000) {
                user = u.name;
                id = u._id;
            }
        })
        if (user === undefined) return;

        await db.collection('messages').insertOne({ from: user, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format(`HH:mm:ss`) })
        await db.collection('participants').deleteOne({ _id: ObjectId(id) })

    } catch (err) {
        console.log(err)
    }

}, 15000);

app.delete('/messages/:ID', async (req, res) => {
    const { user } = req.headers;
    const { ID } = req.params;

    try {
        const messageExist = await db.collection('messages').findOne({ _id: ObjectId(ID) })
        if (!messageExist) return res.sendStatus(404)

        if (messageExist.from !== user) return res.sendStatus(401)

        await db.collection('messages').deleteOne({ _id: ObjectId(ID) })
        return res.sendStatus(200)

    } catch (err) {
        return res.status(500).send(err)
    }
})

app.put('/messages/:ID', async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;
    const { ID } = req.params;

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
            const errors = validation.error.details.map((e) => e.message)
            return res.status(422).send(errors)
        }

        const messageExist = await db.collection('messages').findOne({ _id: ObjectId(ID) })
        if (!messageExist) return res.sendStatus(404)
        if (messageExist.from !== user) return res.sendStatus(401)

        await db.collection('messages').updateOne({ _id: ObjectId(ID) }, { $set: { from: user, to, text, type, time: dayjs().format(`HH:mm:ss`) } })
        return res.sendStatus(200)

    } catch (err) {
        return res.status(500).send(err)
    }
})