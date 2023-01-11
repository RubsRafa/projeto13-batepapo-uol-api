import express from 'express';
import cors from 'cors';

const app = express(); 
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.listen(PORT, () => console.log(`Servidor funcionando na porta ${PORT}`));

const participants = []; //name, lastStatus, //salvo no Mongo > from, to, text, type, time; 
const messages = []; //to, text, type; 

app.post('/participants', (req, res) => {
    const user = req.body; 
    if (!user || user.name === '') res.status(422).send('Name deve ser string não vazio')

    participants.push(user)
    res.status(201).send('OK')
});

app.get('/participants', (req, res) => {
    res.send(participants);
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