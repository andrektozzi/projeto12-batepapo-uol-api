import express, { json } from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("bate-papo-uol");
})


app.post("/participants", (req, res) => {
    const { name } = req.body;

    if(!name) return res.sendStatus(422);

    const find = db.collection("participants").findOne({name: name});
    find.then(participant => {
        if(!participant){
            const insert = db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            });
            insert.then(() => {
                const message = db.collection("messages").insertOne({
                    from: name,
                    to: 'Todos',
                    text: 'entra na sala...',
                    type: 'status',
                    time: dayjs().format('HH:MM:SS')
                });
                message.then(() => res.sendStatus(201));
            });
        } else return res.sendStatus(409);
    });
});

app.get("/participants", (req, res) => {
    const promise = db.collection("participants").find({}).toArray();
    promise.then(participants => res.send(participants));
});

app.post("/messages", (req, res) => {
    const { to, text, type} = req.body;
    const user = req.headers;

    if(!to || !text || !type) return res.sendStatus(422);
    if(type !== 'message' && type !== 'private_message') return res.sendStatus(422);

    const find = db.collection("participants").findOne({name: user});
    find.then(participant => {
        if(!participant) return res.sendStatus(422);
        else {
            const message = db.collection("messages").insertOne({
                from: user,
                to: to,
                text: text,
                type: type,
                time: dayjs().format('HH:MM:SS')
            });
            message.then(() => res.sendStatus(201));
        }
    });
});

app.get("/messages", (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    const promise = db.collection("messages").find({}).toArray();
    promise.then(messages => {
        const limit_messages = messages.filter(value => value.type === "messages" || value.from === user || value.to === user || value.to === "Todos");
        res.send((!limit) ? (limit_messages.reverse()) : (limit_messages.reverse().slice(0, limit)));
    });
});

app.post("/status", (req, res) => {
    res.send("OK");
});


app.listen(5000);