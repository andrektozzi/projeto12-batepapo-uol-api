import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';

const app = express();
app.use(express.json());
app.use(cors());

const participants = [];
const messages = [];

app.post("/participants", (req, res) => {
    const { name } = req.body

    if(!name) {
        res.sendStatus(422);
        return;
    }

    if(participants.some((participant) => participant.name === name)) {
        res.sendStatus(409);
        return;
    }

    participants.push({ name, lastStatus: Date.now() });
    messages.push({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:MM:SS") });

    res.sendStatus(201);
});

app.get("/participants", (req, res) => {
    res.send("OK");
});

app.post("/messages", (req, res) => {
    res.send("OK");
});

app.get("/messages", (req, res) => {
    res.send("OK");
});

app.post("/status", (req, res) => {
    res.send("OK");
});


app.listen(5000);