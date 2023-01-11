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