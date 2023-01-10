import express from 'express'
import cors from 'cors'

const app = express(); 
app.use(cors())
app.use(express.json())

const PORT = 5000;

app.listen(PORT, () => console.log(`Servidor funcionando na porta ${PORT}`))

const participants = [];

app.post('/participants', (req, res) => {
    const { name } = req.body; 
    if (!name || name === '') res.status(422).send('Name deve ser string não vazio')

    participants.push(name)
})